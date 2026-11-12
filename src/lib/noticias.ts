import type { NoticiaScrapeada } from '../types/escupo';

export interface RespuestaNoticiasEnVivo {
  items: NoticiaScrapeada[];
  fetchedAt: string;
  esFallbackEstatico: boolean;
}

const normalizarCadena = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Formatea una fecha ISO o YYYY-MM-DD en tiempo relativo legible en español.
 * @param fechaIso Fecha de publicación ISO 8601 o YYYY-MM-DD.
 * @param ahoraMs Marca de tiempo de referencia en milisegundos.
 * @returns Etiqueta relativa (ej. "Hace 15 min") o fecha corta si supera 7 días.
 */
export function formatearTiempoRelativo(
  fechaIso: string,
  ahoraMs: number = Date.now(),
): string {
  const marca = Date.parse(fechaIso);
  if (Number.isNaN(marca)) {
    return fechaIso;
  }

  const diffMin = Math.floor((ahoraMs - marca) / 60_000);
  if (diffMin < 1) return 'Recién';
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h`;

  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias === 1) return 'Ayer';
  if (diffDias <= 7) return `Hace ${diffDias} días`;

  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(marca));
}

/**
 * Extrae la lista ordenada de medios únicos presentes en el feed.
 * @param noticias Lista de noticias scrapeadas.
 * @returns Nombres de medios ordenados alfabéticamente.
 */
export function obtenerMediosDisponibles(noticias: readonly NoticiaScrapeada[]): string[] {
  const medios = new Set<string>();
  for (const noticia of noticias) {
    if (noticia.medio.trim()) {
      medios.add(noticia.medio.trim());
    }
  }
  return Array.from(medios).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Filtra noticias por medio seleccionado y búsqueda de texto libre sin distinguir acentos ni mayúsculas.
 * @param noticias Colección completa de noticias.
 * @param medioSeleccionado Nombre del medio o "todos".
 * @param busqueda Texto libre de búsqueda en título, bajada o medio.
 * @returns Subconjunto de noticias que cumplen ambos filtros.
 */
export function filtrarNoticiasPorMedioYTexto(
  noticias: readonly NoticiaScrapeada[],
  medioSeleccionado: string,
  busqueda: string,
): NoticiaScrapeada[] {
  const consulta = normalizarCadena(busqueda);

  return noticias.filter((noticia) => {
    if (medioSeleccionado !== 'todos' && noticia.medio !== medioSeleccionado) {
      return false;
    }

    if (!consulta) return true;

    const pajar = normalizarCadena(`${noticia.titulo} ${noticia.bajada} ${noticia.medio}`);
    return pajar.includes(consulta);
  });
}

function esNoticiaValida(item: unknown): item is NoticiaScrapeada {
  if (!item || typeof item !== 'object') return false;
  const candidato = item as Record<string, unknown>;
  return (
    typeof candidato.id === 'string' &&
    typeof candidato.titulo === 'string' &&
    typeof candidato.bajada === 'string' &&
    typeof candidato.medio === 'string' &&
    typeof candidato.fecha === 'string' &&
    typeof candidato.url === 'string'
  );
}

/**
 * Consulta el endpoint serverless `/api/rss` con fallback automático al snapshot estático
 * cuando el sitio se sirve sin backend (ej. GitHub Pages) o ante error transitorio.
 * @param fetchImpl Implementación de fetch inyectable para pruebas.
 * @returns Noticias normalizadas, timestamp de actualización y bandera de fallback.
 */
export async function cargarNoticiasEnVivo(
  fetchImpl: typeof fetch = fetch,
): Promise<RespuestaNoticiasEnVivo> {
  try {
    const respuesta = await fetchImpl('./api/rss', {
      headers: { Accept: 'application/json' },
    });

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const payload = (await respuesta.json()) as {
      items?: unknown;
      fetchedAt?: unknown;
    };

    if (!Array.isArray(payload.items)) {
      throw new Error('Formato de respuesta RSS inválido');
    }

    const items = payload.items.filter(esNoticiaValida);
    const fetchedAt =
      typeof payload.fetchedAt === 'string' ? payload.fetchedAt : new Date().toISOString();

    return {
      items,
      fetchedAt,
      esFallbackEstatico: false,
    };
  } catch {
    const modulo = await import('../data/noticias-recientes.json');
    const items = Array.isArray(modulo.default)
      ? modulo.default.filter(esNoticiaValida)
      : [];

    return {
      items,
      fetchedAt: new Date().toISOString(),
      esFallbackEstatico: true,
    };
  }
}
