import {
  aEnteroNoNegativo,
  ejecutarPipelineRedis,
  jsonResponse,
  obtenerCredencialesRedis,
} from './_upstash.js';

const CLAVE_HASH_ENCUESTA = 'contadorkast:encuesta:v1';
const OPCIONES_VALIDAS = ['aprueba', 'desaprueba', 'neutral'] as const;
type OpcionEncuesta = (typeof OPCIONES_VALIDAS)[number];

interface ConteosEncuesta {
  aprueba: number;
  desaprueba: number;
  neutral: number;
}

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
export async function GET(): Promise<Response> {
  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de encuesta no configurada.' },
      503
    );
  }

  try {
    const [hmgetResp] = await ejecutarPipelineRedis(credenciales, [
      ['HMGET', CLAVE_HASH_ENCUESTA, 'aprueba', 'desaprueba', 'neutral'],
    ]);

    return jsonResponse({
      configurada: true,
      conteos: parsearConteosDesdeHmget(hmgetResp?.result),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo consultar la encuesta global.',
        detalle: err instanceof Error ? err.message : String(err),
      },
      502
    );
  }
}

/**
 * Registra o actualiza un voto en el contador global compartido.
 */
export async function POST(request: Request): Promise<Response> {
  const credenciales = obtenerCredencialesRedis();
  if (!credenciales) {
    return jsonResponse(
      { configurada: false, error: 'Base global de encuesta no configurada.' },
      503
    );
  }

  let body: { opcion?: unknown; votoAnterior?: unknown };
  try {
    body = (await request.json()) as { opcion?: unknown; votoAnterior?: unknown };
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
  }

  if (!esOpcionValida(body.opcion)) {
    return jsonResponse({ error: 'Opción de voto inválida.' }, 400);
  }

  const opcion = body.opcion;
  const votoAnterior = esOpcionValida(body.votoAnterior) ? body.votoAnterior : null;

  try {
    const comandos: unknown[][] = [];

    if (votoAnterior !== opcion) {
      if (votoAnterior) {
        comandos.push(['HINCRBY', CLAVE_HASH_ENCUESTA, votoAnterior, -1]);
      }
      comandos.push(['HINCRBY', CLAVE_HASH_ENCUESTA, opcion, 1]);
    }

    comandos.push(['HMGET', CLAVE_HASH_ENCUESTA, 'aprueba', 'desaprueba', 'neutral']);

    const resultados = await ejecutarPipelineRedis(credenciales, comandos);
    const ultimo = resultados[resultados.length - 1];

    return jsonResponse({
      configurada: true,
      conteos: parsearConteosDesdeHmget(ultimo?.result),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse(
      {
        configurada: true,
        error: 'No se pudo registrar el voto global.',
        detalle: err instanceof Error ? err.message : String(err),
      },
      502
    );
  }
}
