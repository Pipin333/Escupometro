import { XMLParser } from 'fast-xml-parser';
import crypto from 'node:crypto';
import type { NoticiaScrapeada } from '../../src/types/escupo.js';
import { normalizarTexto } from '../../src/motor/detector.js';

export interface FuenteRSS {
  nombre: string;
  url: string;
  esGoogleNews?: boolean;
}

export const FUENTES_PRENSA_CHILE: FuenteRSS[] = [
  {
    nombre: 'Google Noticias CL (Kast)',
    url: 'https://news.google.com/rss/search?q=Jose+Antonio+Kast&hl=es-419&gl=CL&ceid=CL:es-419',
    esGoogleNews: true,
  },
  {
    nombre: 'Google Noticias CL (Gobierno)',
    url: 'https://news.google.com/rss/search?q=Kast+gobierno+Chile+polemica&hl=es-419&gl=CL&ceid=CL:es-419',
    esGoogleNews: true,
  },
  {
    nombre: 'CIPER Chile',
    url: 'https://www.ciperchile.cl/feed/',
  },
  {
    nombre: 'The Clinic',
    url: 'https://www.theclinic.cl/feed/',
  },
  {
    nombre: 'El Ciudadano',
    url: 'https://www.elciudadano.com/feed/',
  },
];

const TERMINOS_RELEVANCIA = [
  'kast',
  'republicano',
  'republicanos',
  'moneda',
  'rabat',
  'sedini',
  'urruticoechea',
  'ojeda',
  'gira',
  'camioneros',
];

/**
 * Limpia etiquetas HTML y decodifica entidades comunes y numéricas en titulares/bajadas RSS.
 *
 * @param html Texto o fragmento HTML crudo del feed.
 * @returns Texto plano normalizado.
 */
export function limpiarHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#39;|&apos;|&lsquo;|&rsquo;/g, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parsearFechaISO(pubDate?: string): { fecha: string; publicadoEn: string } {
  if (!pubDate) {
    const ahora = new Date().toISOString();
    return { fecha: ahora.split('T')[0], publicadoEn: ahora };
  }
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) {
    const ahora = new Date().toISOString();
    return { fecha: ahora.split('T')[0], publicadoEn: ahora };
  }
  const iso = parsed.toISOString();
  return { fecha: iso.split('T')[0], publicadoEn: iso };
}

function generarIdEstable(titulo: string, fecha: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${fecha}::${normalizarTexto(titulo)}`)
    .digest('hex')
    .slice(0, 10);
  return `news-${fecha}-${hash}`;
}

const REGEX_ALFABETO_NO_LATINO =
  /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/;

const REGEX_RUTA_IDIOMA_EXTRANJERO =
  /^https?:\/\/[^/]+\/(en|de|fr|pt|it|zh|ru|ar)(\/|$)/i;

const REGEX_MARCADOR_TRADUCCION =
  /\b(originalbeitrag|original article|article original|artigo original)\s*:/i;

const PALABRAS_ESPANOL = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'en', 'y', 'que', 'por', 'para', 'con', 'su', 'sus', 'se', 'no', 'pero',
  'tras', 'ante', 'sobre', 'como', 'mas', 'ya', 'sin', 'fue', 'son', 'ser',
  'esta', 'este', 'ese', 'esa', 'contra', 'entre', 'hacia', 'desde', 'donde',
]);

const PALABRAS_EXTRANJERAS = new Set([
  // Inglés
  'the', 'and', 'of', 'to', 'in', 'for', 'with', 'amid', 'after', 'claims',
  'says', 'that', 'from', 'this', 'his', 'her', 'their', 'was', 'were',
  'are', 'not', 'could', 'would', 'policy', 'shift', 'sentence', 'reductions',
  // Alemán
  'der', 'die', 'das', 'und', 'ein', 'eine', 'einer', 'nicht', 'nach',
  'bei', 'mit', 'von', 'zu', 'im', 'am', 'als', 'doch', 'er', 'sie', 'es',
  'sein', 'seine', 'wies', 'behauptet', 'sei', 'dass', 'vor', 'gegen',
  // Francés / Portugués
  'les', 'des', 'dans', 'sur', 'pour', 'avec', 'qui', 'est', 'sont', 'pas',
  'aux', 'nao', 'dos', 'pelo', 'pela', 'apos', 'mais', 'tambem',
]);

/**
 * Verifica que una noticia esté redactada en español y no corresponda a traducciones automáticas.
 *
 * @param titulo Titular limpio de la noticia.
 * @param bajada Bajada o resumen limpio.
 * @param url URL del artículo (opcional).
 * @returns `true` si el texto corresponde a español.
 */
export function esNoticiaEnEspanol(titulo: string, bajada: string, url = ''): boolean {
  if (REGEX_ALFABETO_NO_LATINO.test(titulo) || REGEX_ALFABETO_NO_LATINO.test(bajada)) {
    return false;
  }
  if (url && REGEX_RUTA_IDIOMA_EXTRANJERO.test(url)) {
    return false;
  }
  if (REGEX_MARCADOR_TRADUCCION.test(bajada) || REGEX_MARCADOR_TRADUCCION.test(titulo)) {
    return false;
  }

  const tokens = normalizarTexto(`${titulo} ${bajada}`).split(/\s+/).filter(Boolean);
  let hitsEs = 0;
  let hitsExt = 0;

  for (const token of tokens) {
    if (PALABRAS_ESPANOL.has(token)) hitsEs++;
    if (PALABRAS_EXTRANJERAS.has(token)) hitsExt++;
  }

  if (hitsExt >= 2 && hitsExt >= hitsEs) {
    return false;
  }
  if (hitsEs === 0 && hitsExt >= 1) {
    return false;
  }

  return true;
}

/**
 * Determina si una noticia está en español y trata sobre los actores monitoreados.
 *
 * @param titulo Titular de la noticia.
 * @param bajada Bajada o descripción.
 * @param url URL original del artículo.
 * @returns `true` si debe incluirse en el feed.
 */
export function esNoticiaRelevante(titulo: string, bajada: string, url = ''): boolean {
  if (!esNoticiaEnEspanol(titulo, bajada, url)) {
    return false;
  }
  const texto = normalizarTexto(`${titulo} ${bajada}`);
  return TERMINOS_RELEVANCIA.some((termino) => texto.includes(termino));
}

async function fetchConTimeout(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ObservatorioCoherenciaBot/1.0 (+https://github.com)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} en ${url}`);
    }
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

interface RawRssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { '#text'?: string };
}

/**
 * Extrae y normaliza artículos políticos desde un feed RSS específico.
 */
export async function scrapearFeed(fuente: FuenteRSS): Promise<NoticiaScrapeada[]> {
  const xml = await fetchConTimeout(fuente.url);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: RawRssItem | RawRssItem[] } };
  };

  const rawItems = parsed?.rss?.channel?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const noticias: NoticiaScrapeada[] = [];

  for (const item of items) {
    const tituloBruto = typeof item.title === 'string' ? limpiarHtml(item.title) : '';
    const url = typeof item.link === 'string' ? item.link.trim() : '';
    if (!tituloBruto || !url) continue;

    let medio = fuente.nombre;
    let tituloLimpio = tituloBruto;

    if (fuente.esGoogleNews) {
      if (typeof item.source === 'string') {
        medio = item.source;
      } else if (item.source && typeof item.source['#text'] === 'string') {
        medio = item.source['#text'];
      }
      // Google News suele anexar " - Nombre Medio" al final del título
      const sufijo = ` - ${medio}`;
      if (tituloLimpio.endsWith(sufijo)) {
        tituloLimpio = tituloLimpio.slice(0, -sufijo.length).trim();
      }
    }

    const bajada = typeof item.description === 'string' ? limpiarHtml(item.description) : '';
    if (!esNoticiaRelevante(tituloLimpio, bajada, url)) continue;

    const { fecha, publicadoEn } = parsearFechaISO(item.pubDate);

    noticias.push({
      id: generarIdEstable(tituloLimpio, fecha),
      titulo: tituloLimpio,
      bajada: bajada.slice(0, 420),
      medio,
      fecha,
      publicadoEn,
      url,
    });
  }

  return noticias;
}

/**
 * Ejecuta el scraping concurrente sobre todos los medios configurados y deduplica por titular.
 */
export async function scrapearPrensaChilena(
  fuentes: FuenteRSS[] = FUENTES_PRENSA_CHILE
): Promise<{ noticias: NoticiaScrapeada[]; errores: string[] }> {
  const resultados = await Promise.allSettled(fuentes.map((f) => scrapearFeed(f)));
  const todas: NoticiaScrapeada[] = [];
  const errores: string[] = [];

  resultados.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      todas.push(...res.value);
    } else {
      errores.push(`${fuentes[idx].nombre}: ${String(res.reason)}`);
    }
  });

  // Deduplicación por titular normalizado
  const vistos = new Set<string>();
  const unicas: NoticiaScrapeada[] = [];
  for (const noticia of todas) {
    const clave = normalizarTexto(noticia.titulo);
    if (!vistos.has(clave)) {
      vistos.add(clave);
      unicas.push(noticia);
    }
  }

  // Ordenar por fecha/hora más reciente primero
  unicas.sort((a, b) =>
    (b.publicadoEn ?? b.fecha).localeCompare(a.publicadoEn ?? a.fecha)
  );

  return { noticias: unicas, errores };
}
