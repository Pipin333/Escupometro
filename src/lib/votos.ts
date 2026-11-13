const CLAVE_LOCAL_VOTADOS = 'contadorkast:expedientes-votados:v1';

/**
 * Lee el mapa de expedientes respaldados por este navegador desde `localStorage`.
 *
 * @returns Diccionario `{ [id]: true }` con los expedientes votados localmente.
 */
export function leerVotadosLocales(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const crudo = window.localStorage.getItem(CLAVE_LOCAL_VOTADOS);
    if (!crudo) return {};
    const parsed = JSON.parse(crudo) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const limpio: Record<string, boolean> = {};
    for (const [clave, valor] of Object.entries(parsed as Record<string, unknown>)) {
      if (valor === true) {
        limpio[clave] = true;
      }
    }
    return limpio;
  } catch {
    return {};
  }
}

/**
 * Persiste en `localStorage` los expedientes marcados por este navegador.
 *
 * @param votados Mapa de expedientes respaldados.
 */
export function guardarVotadosLocales(votados: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    const activos: Record<string, boolean> = {};
    for (const [clave, valor] of Object.entries(votados)) {
      if (valor) activos[clave] = true;
    }
    window.localStorage.setItem(CLAVE_LOCAL_VOTADOS, JSON.stringify(activos));
  } catch {
    // Modo privado o cuota agotada: el estado sigue en memoria durante la sesión.
  }
}

/**
 * Normaliza el mapa `{ [id]: conteo }` recibido desde `/api/votos`.
 *
 * @param raw Objeto crudo entregado por la API.
 * @returns Mapa validado con enteros no negativos o `null` si el formato es inválido.
 */
export function normalizarVotosApi(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const limpio: Record<string, number> = {};
  for (const [clave, valor] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0) {
      limpio[clave] = Math.floor(valor);
    }
  }
  return limpio;
}

/**
 * Consulta los respaldos globales acumulados por expediente desde `/api/votos`.
 * Retorna `null` si el backend global no está disponible o configurado.
 *
 * @param fetchImpl Implementación de fetch inyectable para pruebas.
 * @returns Mapa de deltas globales por expediente o `null`.
 */
export async function cargarVotosGlobales(
  fetchImpl: typeof fetch = fetch
): Promise<Record<string, number> | null> {
  try {
    const resp = await fetchImpl('./api/votos', {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;

    const payload = (await resp.json()) as {
      configurada?: unknown;
      votos?: unknown;
    };

    const votos = normalizarVotosApi(payload.votos);
    if (payload.configurada !== true || !votos) {
      return null;
    }

    return votos;
  } catch {
    return null;
  }
}

/**
 * Envía un respaldo o retiro de respaldo para un expediente hacia `/api/votos`.
 * Retorna el nuevo conteo global acumulado para ese `id`, o `null` si no hay backend activo.
 *
 * @param id Identificador del expediente.
 * @param accion Operación (`sumar` o `restar`).
 * @param fetchImpl Implementación de fetch inyectable para pruebas.
 * @returns Total global actualizado para el expediente o `null`.
 */
export async function enviarVotoExpedienteGlobal(
  id: string,
  accion: 'sumar' | 'restar',
  fetchImpl: typeof fetch = fetch
): Promise<number | null> {
  try {
    const resp = await fetchImpl('./api/votos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ id, accion }),
    });
    if (!resp.ok) return null;

    const payload = (await resp.json()) as {
      configurada?: unknown;
      votos?: unknown;
    };

    if (
      payload.configurada !== true ||
      typeof payload.votos !== 'number' ||
      !Number.isFinite(payload.votos) ||
      payload.votos < 0
    ) {
      return null;
    }

    return Math.floor(payload.votos);
  } catch {
    return null;
  }
}

/**
 * Calcula el total visible de respaldos combinando base histórica, conteo global y delta local.
 *
 * @param votosBase Conteo base registrado en `escupos.json`.
 * @param deltaGlobal Conteo global almacenado en Upstash (si existe).
 * @param deltaLocal Ajuste local en sesión cuando no hay backend global.
 * @returns Total entero no negativo para mostrar en UI.
 */
export function calcularTotalVotosExpediente(
  votosBase: number | undefined,
  deltaGlobal: number | undefined,
  deltaLocal = 0
): number {
  const suma = (votosBase || 0) + (deltaGlobal ?? 0) + deltaLocal;
  return suma > 0 ? Math.floor(suma) : 0;
}
