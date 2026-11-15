import datosEscupos from '../src/data/escupos.json';
import {
  aEnteroNoNegativo,
  ejecutarPipelineRedis,
  jsonResponse,
  obtenerCredencialesRedis,
} from './_upstash.js';
import {
  leerJsonAcotado,
  obtenerHashIp,
  resolverCookieVotante,
  validarOrigenYMetodoJson,
  verificarRateLimitLectura,
} from './_seguridad.js';

const CLAVE_HASH_VOTOS = 'contadorkast:votos-expedientes:v1';
const TTL_VOTANTE_SEGUNDOS = 60 * 60 * 24 * 180;
const PATRON_ID_VALIDO = /^[a-z0-9][a-z0-9_-]{0,119}$/i;
const ACCIONES_VALIDAS = ['sumar', 'restar'] as const;
type AccionVoto = (typeof ACCIONES_VALIDAS)[number];

let idsValidosCache: Set<string> | null = null;

function obtenerIdsExpedientesValidos(): Set<string> {
  if (idsValidosCache) return idsValidosCache;

  const lista = datosEscupos as Array<{ id?: unknown }>;
  const ids = new Set<string>();

  if (Array.isArray(lista)) {
    for (const item of lista) {
      if (typeof item?.id === 'string' && PATRON_ID_VALIDO.test(item.id)) {
        ids.add(item.id);
      }
    }
  }

  idsValidosCache = ids;
  return ids;
}

const LUA_VOTAR_EXPEDIENTE = `
local c1 = redis.call('INCR', KEYS[3])
if c1 == 1 then redis.call('EXPIRE', KEYS[3], tonumber(ARGV[4])) end
local c2 = redis.call('INCR', KEYS[4])
if c2 == 1 then redis.call('EXPIRE', KEYS[4], tonumber(ARGV[5])) end
if c1 > tonumber(ARGV[6]) or c2 > tonumber(ARGV[7]) then
  return { -1, 0 }
end

local id = ARGV[1]
local accion = ARGV[2]
local campo = 'caso:' .. id
local yaVoto = redis.call('HGET', KEYS[2], campo)

if accion == 'sumar' then
  if yaVoto ~= '1' then
    redis.call('HINCRBY', KEYS[1], id, 1)
    redis.call('HSET', KEYS[2], campo, '1')
  end
elseif accion == 'restar' then
  if yaVoto == '1' then
    local cur = tonumber(redis.call('HGET', KEYS[1], id) or '0') or 0
    if cur > 0 then
      redis.call('HINCRBY', KEYS[1], id, -1)
    end
    redis.call('HDEL', KEYS[2], campo)
  end
end

redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3]))
local total = tonumber(redis.call('HGET', KEYS[1], id) or '0') or 0
if total < 0 then
  redis.call('HSET', KEYS[1], id, 0)
  total = 0
end
return { 1, total }
`;

/**
 * Convierte la respuesta de `HGETALL` en Upstash REST a un mapa `{ [id]: votos }`.
 *
 * @param resultado Arreglo alternado `[clave, valor, ...]` u objeto plano devuelto por Upstash.
 * @returns Diccionario normalizado con conteos enteros no negativos.
 */
export function parsearVotosDesdeHgetall(resultado: unknown): Record<string, number> {
  const mapa: Record<string, number> = {};

  if (Array.isArray(resultado)) {
    for (let i = 0; i + 1 < resultado.length; i += 2) {
      const clave = resultado[i];
      if (typeof clave === 'string' && PATRON_ID_VALIDO.test(clave)) {
        mapa[clave] = aEnteroNoNegativo(resultado[i + 1]);
      }
    }
    return mapa;
  }

  if (resultado && typeof resultado === 'object') {
    for (const [clave, valor] of Object.entries(resultado as Record<string, unknown>)) {
      if (PATRON_ID_VALIDO.test(clave)) {
        mapa[clave] = aEnteroNoNegativo(valor);
      }
    }
  }

  return mapa;
}

/**
 * Obtiene los respaldos globales acumulados por expediente desde Upstash Redis.
 */
export async function GET(request?: Request): Promise<Response> {
  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de votos no configurada.' },
      503
    );
  }

  try {
    if (request) {
      const hashIp = await obtenerHashIp(request, credenciales.token);
      const permitido = await verificarRateLimitLectura(credenciales, 'votos', hashIp);
      if (!permitido) {
        return jsonResponse(
          { configurada: true, error: 'Demasiadas consultas. Intenta en un minuto.' },
          429,
          { 'Retry-After': '60' }
        );
      }
    }

    const [hgetallResp] = await ejecutarPipelineRedis(credenciales, [
      ['HGETALL', CLAVE_HASH_VOTOS],
    ]);

    const crudo = parsearVotosDesdeHgetall(hgetallResp?.result);
    const idsValidos = obtenerIdsExpedientesValidos();
    const votosFiltrados: Record<string, number> = {};
    for (const [id, conteo] of Object.entries(crudo)) {
      if (idsValidos.has(id)) {
        votosFiltrados[id] = conteo;
      }
    }

    return jsonResponse({
      configurada: true,
      votos: votosFiltrados,
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/votos GET] Fallo al consultar Redis:', err instanceof Error ? err.message : 'error');
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo consultar los respaldos globales.',
      },
      502
    );
  }
}

/**
 * Incrementa o revierte un voto de respaldo global para un expediente publicado válido,
 * aplicando validación de origen, límite de tasa y verificación criptográfica de estado.
 */
export async function POST(request: Request): Promise<Response> {
  const rechazoOrigen = validarOrigenYMetodoJson(request);
  if (rechazoOrigen) return rechazoOrigen;

  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de votos no configurada.' },
      503
    );
  }

  const lectura = await leerJsonAcotado(request, 2048);
  if (!lectura.ok) return lectura.response;

  const body = lectura.data;
  const idsValidos = obtenerIdsExpedientesValidos();
  if (
    typeof body.id !== 'string' ||
    !PATRON_ID_VALIDO.test(body.id) ||
    !idsValidos.has(body.id)
  ) {
    return jsonResponse({ error: 'Identificador de expediente inválido.' }, 400);
  }

  if (
    typeof body.accion !== 'string' ||
    !(ACCIONES_VALIDAS as readonly string[]).includes(body.accion)
  ) {
    return jsonResponse({ error: 'Acción de voto inválida.' }, 400);
  }

  const id = body.id;
  const accion = body.accion as AccionVoto;
  const hashIp = await obtenerHashIp(request, credenciales.token);
  const { voterId, setCookieHeader } = await resolverCookieVotante(request, credenciales.token);
  const claveVotante = `contadorkast:votante:${voterId}:v1`;
  const claveRlMin = `contadorkast:rl:post:votos:1m:${hashIp}`;
  const claveRlHora = `contadorkast:rl:post:votos:1h:${hashIp}`;

  try {
    const [evalResp] = await ejecutarPipelineRedis(credenciales, [
      [
        'EVAL',
        LUA_VOTAR_EXPEDIENTE,
        4,
        CLAVE_HASH_VOTOS,
        claveVotante,
        claveRlMin,
        claveRlHora,
        id,
        accion,
        TTL_VOTANTE_SEGUNDOS,
        60,
        3600,
        30,
        120,
      ],
    ]);

    const res = Array.isArray(evalResp?.result) ? evalResp.result : [];
    if (Number(res[0]) === -1) {
      return jsonResponse(
        { configurada: true, error: 'Demasiados respaldos desde esta conexión. Intenta más tarde.' },
        429,
        { 'Retry-After': '60' }
      );
    }

    const totalSeguro = aEnteroNoNegativo(res[1]);
    const headersExtra = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : undefined;

    return jsonResponse(
      {
        configurada: true,
        id,
        votos: totalSeguro,
        actualizadoEn: new Date().toISOString(),
      },
      200,
      headersExtra
    );
  } catch (err) {
    console.error('[api/votos POST] Fallo al registrar respaldo:', err instanceof Error ? err.message : 'error');
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo registrar el respaldo global.',
      },
      502
    );
  }
}
