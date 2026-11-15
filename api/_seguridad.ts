import {
  ejecutarPipelineRedis,
  jsonResponse,
  type CredencialesRedis,
} from './_upstash.js';

const NOMBRE_COOKIE_VOTANTE = 'ck_votante';
const TTL_COOKIE_SEGUNDOS = 60 * 60 * 24 * 180; // 180 días
const MAX_BYTES_JSON_DEFECTO = 2048;
const REGEX_UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REGEX_HEX_SHA256 = /^[0-9a-f]{64}$/i;
const CODIFICADOR_UTF8 = new TextEncoder();

const LUA_RATE_LIMIT_VENTANA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return c
`;

function obtenerEnvProceso(): Record<string, string | undefined> {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env ?? {};
}

function bytesAHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let hex = '';
  for (const byte of arr) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function hexABytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function importarClaveHmac(
  clave: string,
  usos: ('sign' | 'verify')[]
): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    CODIFICADOR_UTF8.encode(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usos
  );
}

async function hmacSha256Hex(clave: string, mensaje: string): Promise<string> {
  const cryptoKey = await importarClaveHmac(clave, ['sign']);
  const firma = await globalThis.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    CODIFICADOR_UTF8.encode(mensaje)
  );
  return bytesAHex(firma);
}

function obtenerHostsPermitidos(request: Request): Set<string> {
  const hosts = new Set<string>();

  const agregarHost = (valor?: string | null) => {
    if (!valor) return;
    for (const parte of valor.split(',')) {
      const limpio = parte.trim().toLowerCase();
      if (!limpio) continue;
      if (limpio.startsWith('http://') || limpio.startsWith('https://')) {
        try {
          hosts.add(new URL(limpio).host.toLowerCase());
        } catch {
          // Ignorar entrada malformada
        }
      } else {
        hosts.add(limpio);
      }
    }
  };

  agregarHost(request.headers.get('x-forwarded-host'));
  agregarHost(request.headers.get('host'));

  try {
    hosts.add(new URL(request.url).host.toLowerCase());
  } catch {
    // URL relativa o no estándar
  }

  const env = obtenerEnvProceso();
  agregarHost(env.VERCEL_URL);
  agregarHost(env.VERCEL_PROJECT_PRODUCTION_URL);
  agregarHost(env.ALLOWED_ORIGINS);

  return hosts;
}

/**
 * Valida política de mismo origen (`Sec-Fetch-Site`, `Origin`, `Referer`) y `Content-Type: application/json`
 * en mutaciones `POST` para bloquear ataques CSRF y envíos desde sitios externos.
 *
 * @param request Petición HTTP entrante.
 * @returns `Response` de rechazo (403/415) o `null` si la petición es válida.
 */
export function validarOrigenYMetodoJson(request: Request): Response | null {
  const secFetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return jsonResponse({ error: 'Solicitud bloqueada por política de origen.' }, 403);
  }

  const hostsPermitidos = obtenerHostsPermitidos(request);
  const origin = request.headers.get('origin')?.trim();

  if (origin) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      return jsonResponse({ error: 'Encabezado Origin inválido.' }, 403);
    }

    if (
      (parsedOrigin.protocol !== 'https:' && parsedOrigin.protocol !== 'http:') ||
      !hostsPermitidos.has(parsedOrigin.host.toLowerCase())
    ) {
      return jsonResponse({ error: 'Origen no autorizado.' }, 403);
    }
  } else {
    const referer = request.headers.get('referer')?.trim();
    if (referer) {
      let parsedReferer: URL;
      try {
        parsedReferer = new URL(referer);
      } catch {
        return jsonResponse({ error: 'Encabezado Referer inválido.' }, 403);
      }

      if (
        (parsedReferer.protocol !== 'https:' && parsedReferer.protocol !== 'http:') ||
        !hostsPermitidos.has(parsedReferer.host.toLowerCase())
      ) {
        return jsonResponse({ error: 'Referencia de origen no autorizada.' }, 403);
      }
    }
  }

  const contentType = request.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase();

  if (contentType !== 'application/json') {
    return jsonResponse(
      { error: 'Tipo de contenido no soportado; se requiere application/json.' },
      415
    );
  }

  return null;
}

/**
 * Lee y parsea un cuerpo JSON con límite estricto de bytes para evitar agotamiento de memoria.
 *
 * @param request Petición HTTP entrante.
 * @param maxBytes Tamaño máximo permitido en bytes (por defecto 2048).
 * @returns Objeto plano parseado o una respuesta HTTP de error (400/413).
 */
export async function leerJsonAcotado(
  request: Request,
  maxBytes = MAX_BYTES_JSON_DEFECTO
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; response: Response }> {
  const contentLengthRaw = request.headers.get('content-length');
  if (contentLengthRaw !== null) {
    const contentLength = Number(contentLengthRaw);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maxBytes) {
      return {
        ok: false,
        response: jsonResponse({ error: 'Tamaño de carga no permitido.' }, 413),
      };
    }
  }

  let texto = '';
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => undefined);
            return {
              ok: false,
              response: jsonResponse({ error: 'Carga JSON excede el límite permitido.' }, 413),
            };
          }
          chunks.push(value);
        }
      }

      const combinado = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combinado.set(chunk, offset);
        offset += chunk.byteLength;
      }
      texto = new TextDecoder('utf-8', { fatal: false }).decode(combinado);
    } else {
      texto = await request.text();
      if (CODIFICADOR_UTF8.encode(texto).byteLength > maxBytes) {
        return {
          ok: false,
          response: jsonResponse({ error: 'Carga JSON excede el límite permitido.' }, 413),
        };
      }
    }
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: 'No se pudo leer el cuerpo de la solicitud.' }, 400),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(texto);
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400),
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      response: jsonResponse({ error: 'El cuerpo JSON debe ser un objeto.' }, 400),
    };
  }

  const limpio: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(parsed as Record<string, unknown>)) {
    if (clave === '__proto__' || clave === 'constructor' || clave === 'prototype') {
      continue;
    }
    limpio[clave] = valor;
  }

  return { ok: true, data: limpio };
}

/**
 * Calcula un identificador criptográfico anónimo (HMAC-SHA256 truncado) para limitar tasa por IP
 * sin almacenar nunca direcciones IP en texto plano en Redis.
 *
 * @param request Petición HTTP entrante.
 * @param tokenRedis Token REST de Upstash usado como base de derivación si no hay `RATE_LIMIT_SALT`.
 * @returns Hash hexadecimal anónimo de 24 caracteres.
 */
export async function obtenerHashIp(request: Request, tokenRedis: string): Promise<string> {
  const realIp = request.headers.get('x-real-ip')?.trim();
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  const ip = (realIp || vercelIp || forwardedIp || 'anon').slice(0, 64);
  const env = obtenerEnvProceso();
  const claveSal =
    env.RATE_LIMIT_SALT?.trim() ||
    (await hmacSha256Hex('contadorkast:rl-salt:v1', tokenRedis));

  return (await hmacSha256Hex(claveSal, ip)).slice(0, 24);
}

function esPeticionHttps(request: Request): boolean {
  const protoHeader = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (protoHeader === 'https') return true;
  if (protoHeader === 'http') return false;

  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return true;
  }
}

function leerCookie(request: Request, nombre: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;

  for (const segmento of header.split(';')) {
    const idx = segmento.indexOf('=');
    if (idx <= 0) continue;
    const clave = segmento.slice(0, idx).trim();
    if (clave !== nombre) continue;
    return segmento.slice(idx + 1).trim();
  }
  return null;
}

/**
 * Resuelve o emite la cookie técnica `HttpOnly` firmada con HMAC-SHA256 que identifica
 * al navegador de forma anónima para evitar manipulaciones o reversiones falsas de votos.
 *
 * @param request Petición HTTP entrante.
 * @param tokenRedis Token REST de Upstash usado como raíz si no existe `VOTE_COOKIE_SECRET`.
 * @returns `voterId` validado y cabecera `Set-Cookie` si corresponde emitir una nueva.
 */
export async function resolverCookieVotante(
  request: Request,
  tokenRedis: string
): Promise<{ voterId: string; setCookieHeader: string | null }> {
  const env = obtenerEnvProceso();
  const claveFirma =
    env.VOTE_COOKIE_SECRET?.trim() ||
    (await hmacSha256Hex('contadorkast:cookie-key:v1', tokenRedis));

  const cruda = leerCookie(request, NOMBRE_COOKIE_VOTANTE);
  if (cruda) {
    const partes = cruda.split('.');
    if (partes.length === 2) {
      const [idCandidato, firmaCandidata] = partes;
      if (REGEX_UUID_V4.test(idCandidato) && REGEX_HEX_SHA256.test(firmaCandidata)) {
        const keyVerificar = await importarClaveHmac(claveFirma, ['verify']);
        const valida = await globalThis.crypto.subtle.verify(
          'HMAC',
          keyVerificar,
          hexABytes(firmaCandidata),
          CODIFICADOR_UTF8.encode(idCandidato)
        );
        if (valida) {
          return { voterId: idCandidato, setCookieHeader: null };
        }
      }
    }
  }

  const nuevoId = globalThis.crypto.randomUUID();
  const nuevaFirma = await hmacSha256Hex(claveFirma, nuevoId);
  const seguro = esPeticionHttps(request) ? '; Secure' : '';
  const setCookieHeader = `${NOMBRE_COOKIE_VOTANTE}=${nuevoId}.${nuevaFirma}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${TTL_COOKIE_SEGUNDOS}${seguro}`;

  return { voterId: nuevoId, setCookieHeader };
}

/**
 * Aplica límite de tasa ligero para lecturas `GET` evitando drenar la cuota de Redis ante ráfagas.
 *
 * @param credenciales Credenciales REST de Upstash Redis.
 * @param ambito Identificador del endpoint (`encuesta` o `votos`).
 * @param hashIp Hash anónimo de la IP cliente.
 * @param maxPeticiones Límite por ventana.
 * @param ventanaSegundos Duración de ventana en segundos.
 * @returns `true` si la lectura está permitida, `false` si excedió el límite.
 */
export async function verificarRateLimitLectura(
  credenciales: CredencialesRedis,
  ambito: string,
  hashIp: string,
  maxPeticiones = 60,
  ventanaSegundos = 60
): Promise<boolean> {
  const clave = `contadorkast:rl:get:${ambito}:${hashIp}`;
  const [res] = await ejecutarPipelineRedis(credenciales, [
    ['EVAL', LUA_RATE_LIMIT_VENTANA, 1, clave, ventanaSegundos],
  ]);

  const conteo = Number(res?.result ?? 0);
  return Number.isFinite(conteo) && conteo <= maxPeticiones;
}
