import {
  aEnteroNoNegativo,
  ejecutarPipelineRedis,
  jsonResponse,
  obtenerCredencialesRedis,
} from './_upstash.js';

const CLAVE_HASH_VOTOS = 'contadorkast:votos-expedientes:v1';
const PATRON_ID_VALIDO = /^[a-z0-9][a-z0-9_-]{0,119}$/i;
const ACCIONES_VALIDAS = ['sumar', 'restar'] as const;
type AccionVoto = (typeof ACCIONES_VALIDAS)[number];

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
export async function GET(): Promise<Response> {
  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de votos no configurada.' },
      503
    );
  }

  try {
    const [hgetallResp] = await ejecutarPipelineRedis(credenciales, [
      ['HGETALL', CLAVE_HASH_VOTOS],
    ]);

    return jsonResponse({
      configurada: true,
      votos: parsearVotosDesdeHgetall(hgetallResp?.result),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo consultar los respaldos globales.',
        detalle: err instanceof Error ? err.message : String(err),
      },
      502
    );
  }
}

/**
 * Incrementa o revierte un voto de respaldo global para un expediente específico.
 */
export async function POST(request: Request): Promise<Response> {
  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de votos no configurada.' },
      503
    );
  }

  let body: { id?: unknown; accion?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; accion?: unknown };
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
  }

  if (typeof body.id !== 'string' || !PATRON_ID_VALIDO.test(body.id)) {
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
  const incremento = accion === 'sumar' ? 1 : -1;

  try {
    const [incrResp] = await ejecutarPipelineRedis(credenciales, [
      ['HINCRBY', CLAVE_HASH_VOTOS, id, incremento],
    ]);

    const crudo = typeof incrResp?.result === 'number' || typeof incrResp?.result === 'string'
      ? Number(incrResp.result)
      : 0;
    const totalSeguro = aEnteroNoNegativo(crudo);

    if (Number.isFinite(crudo) && crudo < 0) {
      await ejecutarPipelineRedis(credenciales, [['HSET', CLAVE_HASH_VOTOS, id, 0]]);
    }

    return jsonResponse({
      configurada: true,
      id,
      votos: totalSeguro,
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo registrar el respaldo global.',
        detalle: err instanceof Error ? err.message : String(err),
      },
      502
    );
  }
}
