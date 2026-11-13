export interface CredencialesRedis {
  url: string;
  token: string;
}

export interface ResultadoPipelineRedis {
  result?: unknown;
  error?: string;
}

/**
 * Lee las credenciales REST de Upstash Redis / Vercel KV desde variables de entorno.
 *
 * @returns Credenciales normalizadas o `null` si no están configuradas.
 */
export function obtenerCredencialesRedis(): CredencialesRedis | null {
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

/**
 * Convierte un valor crudo de Redis en un entero no negativo seguro.
 *
 * @param raw Valor devuelto por Upstash REST.
 * @returns Entero mayor o igual a cero.
 */
export function aEnteroNoNegativo(raw: unknown): number {
  const num = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : 0;
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

/**
 * Ejecuta un lote de comandos contra el endpoint `/pipeline` de Upstash Redis.
 *
 * @param credenciales URL y token REST de Upstash.
 * @param comandos Lista de comandos Redis serializados.
 * @param fetchImpl Implementación de fetch inyectable para pruebas.
 * @returns Arreglo de resultados por comando.
 */
export async function ejecutarPipelineRedis(
  credenciales: CredencialesRedis,
  comandos: unknown[][],
  fetchImpl: typeof fetch = fetch
): Promise<ResultadoPipelineRedis[]> {
  const resp = await fetchImpl(`${credenciales.url}/pipeline`, {
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

  const data = (await resp.json()) as ResultadoPipelineRedis[];
  if (!Array.isArray(data)) {
    throw new Error('Respuesta inesperada de Upstash');
  }

  return data;
}

/**
 * Construye una respuesta JSON sin caché para endpoints serverless.
 *
 * @param payload Datos serializables.
 * @param status Código HTTP.
 * @returns Objeto Response estándar.
 */
export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
