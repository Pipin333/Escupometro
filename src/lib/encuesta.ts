import type { OpcionEncuesta } from '../types/escupo';

export interface EstadoEncuesta {
  conteos: Record<OpcionEncuesta, number>;
  votoUsuario: OpcionEncuesta | null;
  actualizadoEn: string | null;
}

export const CLAVE_STORAGE_ENCUESTA = 'contadorKast.encuesta.v1';

/**
 * Crea un estado inicial limpio y sin votos prefabricados para la encuesta local.
 *
 * @returns Estado inicial en cero.
 */
export function crearEstadoInicialEncuesta(): EstadoEncuesta {
  return {
    conteos: {
      aprueba: 0,
      desaprueba: 0,
      neutral: 0,
    },
    votoUsuario: null,
    actualizadoEn: null,
  };
}

/**
 * Registra o cambia el voto del lector sin duplicar conteos en el navegador.
 *
 * @param actual Estado actual de la encuesta.
 * @param opcion Opción elegida (`aprueba`, `desaprueba` o `neutral`).
 * @param fechaIso Marca temporal ISO opcional para pruebas deterministas.
 * @returns Nuevo estado actualizado.
 */
export function registrarVotoEncuesta(
  actual: EstadoEncuesta,
  opcion: OpcionEncuesta,
  fechaIso = new Date().toISOString()
): EstadoEncuesta {
  if (actual.votoUsuario === opcion) {
    return actual;
  }

  const siguientesConteos: Record<OpcionEncuesta, number> = {
    ...actual.conteos,
  };

  if (actual.votoUsuario) {
    siguientesConteos[actual.votoUsuario] = Math.max(
      0,
      siguientesConteos[actual.votoUsuario] - 1
    );
  }

  siguientesConteos[opcion] += 1;

  return {
    conteos: siguientesConteos,
    votoUsuario: opcion,
    actualizadoEn: fechaIso,
  };
}

/**
 * Calcula el total de votos y el porcentaje entero por opción.
 *
 * @param conteos Mapa de votos acumulados.
 * @returns Total y porcentajes por categoría (`0` cuando no hay votos).
 */
export function calcularResumenEncuesta(
  conteos: Record<OpcionEncuesta, number>
): {
  total: number;
  porcentajes: Record<OpcionEncuesta, number>;
} {
  const total = conteos.aprueba + conteos.desaprueba + conteos.neutral;
  if (total <= 0) {
    return {
      total: 0,
      porcentajes: {
        aprueba: 0,
        desaprueba: 0,
        neutral: 0,
      },
    };
  }

  return {
    total,
    porcentajes: {
      aprueba: Math.round((conteos.aprueba / total) * 100),
      desaprueba: Math.round((conteos.desaprueba / total) * 100),
      neutral: Math.round((conteos.neutral / total) * 100),
    },
  };
}

/**
 * Lee de forma segura el estado de la encuesta desde `localStorage`.
 *
 * @returns Estado recuperado o estado inicial en cero si no existe o es inválido.
 */
export function leerEncuestaLocal(): EstadoEncuesta {
  if (typeof window === 'undefined') {
    return crearEstadoInicialEncuesta();
  }

  try {
    const raw = window.localStorage.getItem(CLAVE_STORAGE_ENCUESTA);
    if (!raw) return crearEstadoInicialEncuesta();

    const parsed = JSON.parse(raw) as Partial<EstadoEncuesta>;
    const aprueba = Number(parsed.conteos?.aprueba);
    const desaprueba = Number(parsed.conteos?.desaprueba);
    const neutral = Number(parsed.conteos?.neutral);

    if (
      !Number.isFinite(aprueba) ||
      !Number.isFinite(desaprueba) ||
      !Number.isFinite(neutral) ||
      aprueba < 0 ||
      desaprueba < 0 ||
      neutral < 0
    ) {
      return crearEstadoInicialEncuesta();
    }

    const voto = parsed.votoUsuario;
    const votoValido: OpcionEncuesta | null =
      voto === 'aprueba' || voto === 'desaprueba' || voto === 'neutral'
        ? voto
        : null;

    return {
      conteos: { aprueba, desaprueba, neutral },
      votoUsuario: votoValido,
      actualizadoEn:
        typeof parsed.actualizadoEn === 'string' ? parsed.actualizadoEn : null,
    };
  } catch {
    return crearEstadoInicialEncuesta();
  }
}

/**
 * Persiste el estado de la encuesta en `localStorage` cuando está disponible.
 *
 * @param estado Estado actual a guardar.
 */
export function guardarEncuestaLocal(estado: EstadoEncuesta): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_STORAGE_ENCUESTA, JSON.stringify(estado));
  } catch {
    // Almacenamiento bloqueado en navegación privada
  }
}

export interface RespuestaEncuestaGlobal {
  configurada: boolean;
  conteos: Record<OpcionEncuesta, number>;
  actualizadoEn: string | null;
}

function normalizarConteosApi(raw: unknown): Record<OpcionEncuesta, number> | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const aprueba = Number(obj.aprueba);
  const desaprueba = Number(obj.desaprueba);
  const neutral = Number(obj.neutral);

  if (
    !Number.isFinite(aprueba) ||
    !Number.isFinite(desaprueba) ||
    !Number.isFinite(neutral) ||
    aprueba < 0 ||
    desaprueba < 0 ||
    neutral < 0
  ) {
    return null;
  }

  return {
    aprueba: Math.floor(aprueba),
    desaprueba: Math.floor(desaprueba),
    neutral: Math.floor(neutral),
  };
}

/**
 * Consulta los conteos globales compartidos desde `/api/encuesta`.
 * Retorna `null` si el backend global no está disponible o configurado.
 *
 * @param fetchImpl Implementación de fetch inyectable para pruebas.
 * @returns Conteos globales o `null` para mantener modo local.
 */
export async function cargarEncuestaGlobal(
  fetchImpl: typeof fetch = fetch
): Promise<RespuestaEncuestaGlobal | null> {
  try {
    const resp = await fetchImpl('./api/encuesta', {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;

    const payload = (await resp.json()) as {
      configurada?: unknown;
      conteos?: unknown;
      actualizadoEn?: unknown;
    };

    const conteos = normalizarConteosApi(payload.conteos);
    if (payload.configurada !== true || !conteos) {
      return null;
    }

    return {
      configurada: true,
      conteos,
      actualizadoEn:
        typeof payload.actualizadoEn === 'string' ? payload.actualizadoEn : null,
    };
  } catch {
    return null;
  }
}

/**
 * Envía un voto al endpoint global `/api/encuesta` y devuelve los totales actualizados.
 * Retorna `null` si el backend global no está disponible.
 *
 * @param opcion Opción elegida por el lector.
 * @param votoAnterior Opción previa del mismo navegador, si existía.
 * @param fetchImpl Implementación de fetch inyectable para pruebas.
 * @returns Totales globales actualizados o `null` si falla.
 */
export async function enviarVotoGlobal(
  opcion: OpcionEncuesta,
  votoAnterior: OpcionEncuesta | null,
  fetchImpl: typeof fetch = fetch
): Promise<RespuestaEncuestaGlobal | null> {
  try {
    const resp = await fetchImpl('./api/encuesta', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ opcion, votoAnterior }),
    });
    if (!resp.ok) return null;

    const payload = (await resp.json()) as {
      configurada?: unknown;
      conteos?: unknown;
      actualizadoEn?: unknown;
    };

    const conteos = normalizarConteosApi(payload.conteos);
    if (payload.configurada !== true || !conteos) {
      return null;
    }

    return {
      configurada: true,
      conteos,
      actualizadoEn:
        typeof payload.actualizadoEn === 'string' ? payload.actualizadoEn : null,
    };
  } catch {
    return null;
  }
}
