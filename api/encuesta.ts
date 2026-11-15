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

const CLAVE_HASH_ENCUESTA = 'contadorkast:encuesta:v1';
const TTL_VOTANTE_SEGUNDOS = 60 * 60 * 24 * 180;
const OPCIONES_VALIDAS = ['aprueba', 'desaprueba', 'neutral'] as const;
type OpcionEncuesta = (typeof OPCIONES_VALIDAS)[number];

interface ConteosEncuesta {
  aprueba: number;
  desaprueba: number;
  neutral: number;
}

const LUA_VOTAR_ENCUESTA = `
local c1 = redis.call('INCR', KEYS[3])
if c1 == 1 then redis.call('EXPIRE', KEYS[3], tonumber(ARGV[3])) end
local c2 = redis.call('INCR', KEYS[4])
if c2 == 1 then redis.call('EXPIRE', KEYS[4], tonumber(ARGV[4])) end
if c1 > tonumber(ARGV[5]) or c2 > tonumber(ARGV[6]) then
  return { -1 }
end

local opcion = ARGV[1]
local prev = redis.call('HGET', KEYS[2], 'encuesta')
if prev ~= opcion then
  if prev and (prev == 'aprueba' or prev == 'desaprueba' or prev == 'neutral') then
    local curPrev = tonumber(redis.call('HGET', KEYS[1], prev) or '0') or 0
    if curPrev > 0 then
      redis.call('HINCRBY', KEYS[1], prev, -1)
    end
  end
  redis.call('HINCRBY', KEYS[1], opcion, 1)
  redis.call('HSET', KEYS[2], 'encuesta', opcion)
end
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))

local vals = redis.call('HMGET', KEYS[1], 'aprueba', 'desaprueba', 'neutral')
return { 1, vals[1] or '0', vals[2] or '0', vals[3] or '0' }
`;

function esOpcionValida(valor: unknown): valor is OpcionEncuesta {
  return (
    typeof valor === 'string' &&
    (OPCIONES_VALIDAS as readonly string[]).includes(valor)
  );
}

function parsearConteosDesdeHmget(resultado: unknown): ConteosEncuesta {
  const valores = Array.isArray(resultado) ? resultado : [];
  return {
    aprueba: aEnteroNoNegativo(valores[0]),
    desaprueba: aEnteroNoNegativo(valores[1]),
    neutral: aEnteroNoNegativo(valores[2]),
  };
}

/**
 * Obtiene los conteos globales actuales de la encuesta desde Upstash Redis / Vercel KV.
 */
export async function GET(request?: Request): Promise<Response> {
  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de encuesta no configurada.' },
      503
    );
  }

  try {
    if (request) {
      const hashIp = await obtenerHashIp(request, credenciales.token);
      const permitido = await verificarRateLimitLectura(credenciales, 'encuesta', hashIp);
      if (!permitido) {
        return jsonResponse(
          { configurada: true, error: 'Demasiadas consultas. Intenta en un minuto.' },
          429,
          { 'Retry-After': '60' }
        );
      }
    }

    const [hmgetResp] = await ejecutarPipelineRedis(credenciales, [
      ['HMGET', CLAVE_HASH_ENCUESTA, 'aprueba', 'desaprueba', 'neutral'],
    ]);

    return jsonResponse({
      configurada: true,
      conteos: parsearConteosDesdeHmget(hmgetResp?.result),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/encuesta GET] Fallo al consultar Redis:', err instanceof Error ? err.message : 'error');
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo consultar la encuesta global.',
      },
      502
    );
  }
}

/**
 * Registra o actualiza un voto en el contador global compartido con validación de origen,
 * límite de tasa por hash de IP y verificación criptográfica de estado del votante.
 */
export async function POST(request: Request): Promise<Response> {
  const rechazoOrigen = validarOrigenYMetodoJson(request);
  if (rechazoOrigen) return rechazoOrigen;

  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de encuesta no configurada.' },
      503
    );
  }

  const lectura = await leerJsonAcotado(request, 2048);
  if (!lectura.ok) return lectura.response;

  const body = lectura.data;
  if (!esOpcionValida(body.opcion)) {
    return jsonResponse({ error: 'Opción de voto inválida.' }, 400);
  }

  const opcion = body.opcion;
  const hashIp = await obtenerHashIp(request, credenciales.token);
  const { voterId, setCookieHeader } = await resolverCookieVotante(request, credenciales.token);
  const claveVotante = `contadorkast:votante:${voterId}:v1`;
  const claveRlMin = `contadorkast:rl:post:encuesta:1m:${hashIp}`;
  const claveRlHora = `contadorkast:rl:post:encuesta:1h:${hashIp}`;

  try {
    const [evalResp] = await ejecutarPipelineRedis(credenciales, [
      [
        'EVAL',
        LUA_VOTAR_ENCUESTA,
        4,
        CLAVE_HASH_ENCUESTA,
        claveVotante,
        claveRlMin,
        claveRlHora,
        opcion,
        TTL_VOTANTE_SEGUNDOS,
        60,
        3600,
        10,
        40,
      ],
    ]);

    const res = Array.isArray(evalResp?.result) ? evalResp.result : [];
    if (Number(res[0]) === -1) {
      return jsonResponse(
        { configurada: true, error: 'Demasiados votos desde esta conexión. Intenta más tarde.' },
        429,
        { 'Retry-After': '60' }
      );
    }

    const headersExtra = setCookieHeader ? { 'Set-Cookie': setCookieHeader } : undefined;
    return jsonResponse(
      {
        configurada: true,
        conteos: parsearConteosDesdeHmget(res.slice(1)),
        actualizadoEn: new Date().toISOString(),
      },
      200,
      headersExtra
    );
  } catch (err) {
    console.error('[api/encuesta POST] Fallo al registrar voto:', err instanceof Error ? err.message : 'error');
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo registrar el voto global.',
      },
      502
    );
  }
}
