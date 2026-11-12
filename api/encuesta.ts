const CLAVE_HASH_ENCUESTA = 'contadorkast:encuesta:v1';
const OPCIONES_VALIDAS = ['aprueba', 'desaprueba', 'neutral'] as const;
type OpcionEncuesta = (typeof OPCIONES_VALIDAS)[number];

interface ConteosEncuesta {
  aprueba: number;
  desaprueba: number;
  neutral: number;
}

function obtenerCredencialesRedis(): { url: string; token: string } | null {
  const env =
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env ?? {};

  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL ?? '';
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN ?? '';

  if (!url.trim() || !token.trim()) {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ''),
    token: token.trim(),
  };
}

function esOpcionValida(valor: unknown): valor is OpcionEncuesta {
  return (
    typeof valor === 'string' &&
    (OPCIONES_VALIDAS as readonly string[]).includes(valor)
  );
}

function parsearConteosDesdeHmget(resultado: unknown): ConteosEncuesta {
  const valores = Array.isArray(resultado) ? resultado : [];
  const aEnteroSeguro = (raw: unknown): number => {
    const num = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : 0;
    return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
  };

  return {
    aprueba: aEnteroSeguro(valores[0]),
    desaprueba: aEnteroSeguro(valores[1]),
    neutral: aEnteroSeguro(valores[2]),
  };
}

async function ejecutarPipelineRedis(
  credenciales: { url: string; token: string },
  comandos: unknown[][]
): Promise<Array<{ result?: unknown; error?: string }>> {
  const resp = await fetch(`${credenciales.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credenciales.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comandos),
  });

  if (!resp.ok) {
    throw new Error(`Upstash HTTP ${resp.status}`);
  }

  const data = (await resp.json()) as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(data)) {
    throw new Error('Respuesta inesperada de Upstash');
  }

  return data;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
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
