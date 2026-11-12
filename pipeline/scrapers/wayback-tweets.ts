import type { RegistroDichoCrudo } from '../../src/motor/clasificador-dichos.js';

export interface CapturaTweet {
  tweetId: string;
  timestamp: string;
  original: string;
}

export interface ResultadoWayback {
  usuario: string;
  tweetsDescubiertos: number;
  capturasConsultadas: number;
  registros: RegistroDichoCrudo[];
  errores: string[];
  resumeKeySiguiente?: string;
}

const SNOWFLAKE_EPOCH_MS = 1288834974657n;
const UMBRAL_MINIMO_SNOWFLAKE = 29700859247n;
const USER_AGENT_ARCHIVO =
  'ContadorDelEscupo/1.0 (+https://github.com/Pipin333/Escupometro; archivo documental)';

const PRIORIDAD_HOST: Record<string, number> = {
  'twitter.com': 0,
  'www.twitter.com': 0,
  'mobile.twitter.com': 1,
  'x.com': 2,
};

function limpiarHandle(usuario: string): string {
  return usuario.replace(/^@+/, '').trim().toLowerCase() || 'joseantoniokast';
}

function decodificarEntidadesHtml(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function limpiarTextoFragmentoHtml(fragmento: string): string {
  const sinOcultos = fragmento.replace(
    /<a\b[^>]*class=["'][^"']*\bu-hidden\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
    ''
  );
  const sinEtiquetas = sinOcultos.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
  return decodificarEntidadesHtml(sinEtiquetas).replace(/\s+/g, ' ').trim();
}

/**
 * Filtra filas del índice CDX de Wayback Machine para un usuario específico,
 * elimina duplicados exactos y agrupa por `tweetId` priorizando capturas de Twitter clásico.
 *
 * @param filasCdx Matriz JSON devuelta por `web.archive.org/cdx/search/cdx`.
 * @param usuario Handle objetivo sin `@` (insensible a mayúsculas).
 * @returns Mapa `tweetId -> CapturaTweet[]` ordenado por viabilidad de extracción HTML.
 */
export function extraerCapturasPorTweet(
  filasCdx: string[][],
  usuario: string
): Map<string, CapturaTweet[]> {
  const handleObjetivo = limpiarHandle(usuario);
  const grupos = new Map<string, CapturaTweet[]>();
  const vistos = new Set<string>();

  for (const fila of filasCdx) {
    if (!Array.isArray(fila) || fila.length < 2) continue;
    const timestamp = String(fila[0] ?? '').trim();
    const original = String(fila[1] ?? '').trim();

    if (!timestamp || !original || (timestamp === 'timestamp' && original === 'original')) {
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(original);
    } catch {
      continue;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
    const host = parsed.hostname.toLowerCase();
    if (!(host in PRIORIDAD_HOST)) continue;

    const segmentos = parsed.pathname.split('/').filter(Boolean);
    if (segmentos.length < 3) continue;

    const [handleUrl, segmentoStatus, tweetId] = segmentos;
    if (
      handleUrl.toLowerCase() !== handleObjetivo ||
      segmentoStatus.toLowerCase() !== 'status' ||
      !/^\d+$/.test(tweetId)
    ) {
      continue;
    }

    const claveUnica = `${timestamp}|${original}`;
    if (vistos.has(claveUnica)) continue;
    vistos.add(claveUnica);

    const lista = grupos.get(tweetId) ?? [];
    lista.push({ tweetId, timestamp, original });
    grupos.set(tweetId, lista);
  }

  for (const lista of grupos.values()) {
    lista.sort((a, b) => {
      const hostA = PRIORIDAD_HOST[new URL(a.original).hostname.toLowerCase()] ?? 9;
      const hostB = PRIORIDAD_HOST[new URL(b.original).hostname.toLowerCase()] ?? 9;
      if (hostA !== hostB) return hostA - hostB;
      return a.timestamp.localeCompare(b.timestamp);
    });
  }

  return grupos;
}

/**
 * Calcula la fecha UTC `YYYY-MM-DD` exacta contenida dentro de un Twitter Snowflake ID.
 *
 * @param tweetId Identificador numérico del tweet.
 * @returns Fecha `YYYY-MM-DD` o `null` si el ID es inválido o anterior a la era Snowflake.
 */
export function fechaDesdeSnowflake(tweetId: string): string | null {
  if (!/^\d+$/.test(tweetId)) return null;
  const idBig = BigInt(tweetId);
  if (idBig < UMBRAL_MINIMO_SNOWFLAKE) return null;

  const ms = Number((idBig >> 22n) + SNOWFLAKE_EPOCH_MS);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Construye la URL directa a una captura preservada en Wayback Machine.
 *
 * @param captura Captura individual de tweet.
 * @returns Enlace verificable en `web.archive.org`.
 */
export function construirUrlArchivo(captura: CapturaTweet): string {
  return `https://web.archive.org/web/${captura.timestamp}/${captura.original}`;
}

function extraerMetaContent(html: string, propiedad: string): string | null {
  const tags = html.matchAll(/<meta\b([^>]+)>/gi);
  for (const tag of tags) {
    const attrs = tag[1];
    const propMatch = attrs.match(/(?:property|name)=["']([^"']+)["']/i);
    if (propMatch?.[1]?.toLowerCase() !== propiedad.toLowerCase()) continue;
    const contentMatch = attrs.match(/content=["']([\s\S]*?)["']/i);
    if (contentMatch) return contentMatch[1];
  }
  return null;
}

function extraerLinkCanonical(html: string): string | null {
  const links = html.matchAll(/<link\b([^>]+)>/gi);
  for (const link of links) {
    const attrs = link[1];
    const relMatch = attrs.match(/rel=["']([^"']+)["']/i);
    if (relMatch?.[1]?.toLowerCase() !== 'canonical') continue;
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) return hrefMatch[1];
  }
  return null;
}

function extraerTextoDesdeTitle(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const rawTitle = match[1];
  const inicioMatch = rawTitle.match(/\bon\s+Twitter:\s*(&quot;|")/i);
  if (!inicioMatch || inicioMatch.index === undefined) return null;

  const delimitador = inicioMatch[1];
  const inicioTexto = inicioMatch.index + inicioMatch[0].length;
  const finTexto = rawTitle.lastIndexOf(delimitador);
  if (finTexto <= inicioTexto) return null;

  const limpio = decodificarEntidadesHtml(rawTitle.slice(inicioTexto, finTexto))
    .replace(/\s+/g, ' ')
    .trim();
  return limpio || null;
}

function extraerFechaDataTime(html: string, tweetId: string): string | null {
  const patronId = new RegExp(`data-tweet-id=["']${tweetId}["']`, 'i');
  const matchId = html.match(patronId);
  if (!matchId || matchId.index === undefined) return null;

  const resto = html.slice(matchId.index);
  const matchTime = resto.match(/data-time=["'](\d+)["']/i);
  if (!matchTime) return null;

  const segundos = Number(matchTime[1]);
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  return new Date(segundos * 1000).toISOString().slice(0, 10);
}

/**
 * Extrae texto y fecha de un tweet desde el HTML archivado en Wayback Machine,
 * descartando páginas cuyo enlace canónico pertenezca a otro autor.
 *
 * @param html Código HTML completo de la captura archivada.
 * @param tweetId ID numérico esperado del tweet.
 * @param usuario Handle esperado del autor sin `@`.
 * @returns Texto y fecha `YYYY-MM-DD` (o `null`), o `null` si la captura no corresponde al tweet/autor.
 */
export function extraerTweetDesdeHtmlArchivado(
  html: string,
  tweetId: string,
  usuario: string
): { texto: string; fecha: string | null } | null {
  const handleObjetivo = limpiarHandle(usuario);
  const canonical = extraerLinkCanonical(html);

  if (canonical) {
    const matchAutor = canonical.match(/(?:twitter\.com|x\.com)\/([^/?#]+)\/status\//i);
    if (matchAutor && matchAutor[1].toLowerCase() !== handleObjetivo) {
      return null;
    }
  }

  let texto = '';
  const matchJumbo = html.match(
    /<p\b[^>]*class=["'][^"']*\bTweetTextSize--jumbo\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i
  );
  if (matchJumbo) {
    texto = limpiarTextoFragmentoHtml(matchJumbo[1]);
  }

  if (!texto) {
    const ogDesc = extraerMetaContent(html, 'og:description');
    if (ogDesc) {
      texto = decodificarEntidadesHtml(ogDesc.trim().replace(/^“/, '').replace(/”$/, ''))
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  if (!texto) {
    texto = extraerTextoDesdeTitle(html) ?? '';
  }

  if (!texto) {
    return null;
  }

  const fecha = fechaDesdeSnowflake(tweetId) ?? extraerFechaDataTime(html, tweetId);
  return { texto, fecha };
}

function esperarMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWaybackConReintento(
  url: string,
  timeoutMs = 30000,
  reintentos = 2
): Promise<Response> {
  let ultimoError: unknown;

  for (let intento = 0; intento <= reintentos; intento += 1) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT_ARCHIVO },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (resp.status === 429 || resp.status === 503) {
        if (intento < reintentos) {
          await esperarMs(2000 * (intento + 1));
          continue;
        }
      }
      return resp;
    } catch (err) {
      ultimoError = err;
      if (intento < reintentos) {
        await esperarMs(1500 * (intento + 1));
      }
    }
  }

  throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
}

/**
 * Consulta la API CDX pública de Wayback Machine para descubrir tweets archivados
 * de una cuenta pública sin tocar la API de X.
 *
 * @param usuario Handle objetivo sin `@`.
 * @param opciones Rango de fechas (`from`/`to`), límite de filas y cursor de reanudación.
 * @returns Filas CDX crudas y `resumeKeySiguiente` si la respuesta fue truncada.
 */
export async function consultarIndiceCdxWayback(
  usuario: string,
  opciones: {
    desde?: string;
    hasta?: string;
    limiteFilas?: number;
    resumeKey?: string;
  } = {}
): Promise<{ filas: string[][]; resumeKeySiguiente?: string }> {
  const handle = limpiarHandle(usuario);
  const limite = Math.max(10, Math.min(2000, opciones.limiteFilas ?? 250));

  const endpoint = new URL('https://web.archive.org/cdx/search/cdx');
  endpoint.searchParams.set('url', `twitter.com/${handle}/status/*`);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('fl', 'timestamp,original,statuscode');
  endpoint.searchParams.set('filter', 'statuscode:200');
  endpoint.searchParams.set('collapse', 'urlkey');
  endpoint.searchParams.set('limit', String(limite));
  endpoint.searchParams.set('showResumeKey', 'true');
  if (opciones.desde) endpoint.searchParams.set('from', opciones.desde);
  if (opciones.hasta) endpoint.searchParams.set('to', opciones.hasta);
  if (opciones.resumeKey) endpoint.searchParams.set('resumeKey', opciones.resumeKey);

  const resp = await fetchWaybackConReintento(endpoint.toString(), 45000, 2);
  if (!resp.ok) {
    throw new Error(`Wayback CDX respondió HTTP ${resp.status}`);
  }

  const filas = (await resp.json()) as string[][];
  let resumeKeySiguiente: string | undefined;

  if (
    filas.length >= 2 &&
    Array.isArray(filas[filas.length - 2]) &&
    filas[filas.length - 2].length === 0 &&
    Array.isArray(filas[filas.length - 1]) &&
    filas[filas.length - 1].length === 1
  ) {
    resumeKeySiguiente = filas[filas.length - 1][0];
  }

  return { filas, resumeKeySiguiente };
}

/**
 * Descubre tweets archivados en Wayback Machine y recupera sus citas e enlaces
 * preservados respetando pausas corteses entre solicitudes.
 *
 * @param usuario Handle objetivo sin `@` (por defecto `joseantoniokast`).
 * @param opciones Límites de tweets a hidratar, rango temporal, pausa y filtro de ya conocidos.
 * @returns Registros crudos listos para clasificación junto a diagnóstico y cursor CDX.
 */
export async function ingestarDesdeWayback(
  usuario: string,
  opciones: {
    desde?: string;
    hasta?: string;
    maxTweets?: number;
    limiteCdx?: number;
    resumeKey?: string;
    pausaMs?: number;
    idsExistentes?: Set<string>;
  } = {}
): Promise<ResultadoWayback> {
  const handle = limpiarHandle(usuario);
  const maxTweets = opciones.maxTweets ?? 40;
  const pausaMs = opciones.pausaMs ?? 1200;
  const errores: string[] = [];

  let cdx: { filas: string[][]; resumeKeySiguiente?: string };
  try {
    cdx = await consultarIndiceCdxWayback(handle, {
      desde: opciones.desde,
      hasta: opciones.hasta,
      limiteFilas: opciones.limiteCdx ?? Math.max(maxTweets * 3, 120),
      resumeKey: opciones.resumeKey,
    });
  } catch (err) {
    return {
      usuario: handle,
      tweetsDescubiertos: 0,
      capturasConsultadas: 0,
      registros: [],
      errores: [`Error en Wayback CDX: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const porTweet = extraerCapturasPorTweet(cdx.filas, handle);
  const registros: RegistroDichoCrudo[] = [];
  let capturasConsultadas = 0;
  let tweetsProcesados = 0;

  for (const [tweetId, capturas] of porTweet.entries()) {
    if (tweetsProcesados >= maxTweets) break;
    if (opciones.idsExistentes?.has(`tweet-${tweetId}`)) continue;

    tweetsProcesados += 1;

    for (const captura of capturas.slice(0, 2)) {
      capturasConsultadas += 1;
      const snapshotRawUrl = `https://web.archive.org/web/${captura.timestamp}id_/${captura.original}`;

      try {
        const resp = await fetchWaybackConReintento(snapshotRawUrl, 30000, 1);
        if (!resp.ok) {
          errores.push(`Tweet ${tweetId} (${captura.timestamp}): HTTP ${resp.status}`);
        } else {
          const html = await resp.text();
          const extraido = extraerTweetDesdeHtmlArchivado(html, tweetId, handle);
          if (extraido && extraido.fecha) {
            registros.push({
              id: `tweet-${tweetId}`,
              fecha: extraido.fecha,
              texto: extraido.texto,
              url: `https://x.com/${handle}/status/${tweetId}`,
              archivoUrl: construirUrlArchivo(captura),
              usuario: `@${handle}`,
              tipoMedio: 'tweet',
            });
            break;
          }
        }
      } catch (err) {
        errores.push(
          `Tweet ${tweetId} (${captura.timestamp}): ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (pausaMs > 0) {
        await esperarMs(pausaMs);
      }
    }

    if (pausaMs > 0) {
      await esperarMs(pausaMs);
    }
  }

  return {
    usuario: handle,
    tweetsDescubiertos: porTweet.size,
    capturasConsultadas,
    registros,
    errores,
    resumeKeySiguiente: cdx.resumeKeySiguiente,
  };
}
