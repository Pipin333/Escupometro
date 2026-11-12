import type { RegistroDichoCrudo } from '../../src/motor/clasificador-dichos.js';
import { hidratarTweetOEmbed } from './x-ingesta.js';

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
 * Normaliza un límite temporal flexible (`YYYY`, `YYYYMM`, `YYYY-MM`, `YYYY-MM-DD`, `YYYYMMDD`)
 * al formato ISO `YYYY-MM-DD` para comparar fechas de creación de tweets.
 */
function normalizarLimiteFecha(
  valor: string | undefined,
  finDePeriodo: boolean
): string | undefined {
  const limpio = valor?.trim();
  if (!limpio) return undefined;

  if (/^\d{4}$/.test(limpio)) {
    return `${limpio}-${finDePeriodo ? '12-31' : '01-01'}`;
  }

  const matchMes = limpio.match(/^(\d{4})-?(\d{2})$/);
  if (matchMes) {
    const [, anio, mes] = matchMes;
    const mesNum = Number.parseInt(mes, 10);
    if (mesNum < 1 || mesNum > 12) return undefined;
    if (!finDePeriodo) return `${anio}-${mes}-01`;
    const ultimoDia = new Date(Date.UTC(Number.parseInt(anio, 10), mesNum, 0)).getUTCDate();
    return `${anio}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
  }

  const matchDia = limpio.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (matchDia) {
    return `${matchDia[1]}-${matchDia[2]}-${matchDia[3]}`;
  }

  return undefined;
}

/**
 * Calcula los prefijos Snowflake de 2 dígitos que cubren un rango temporal (`>= 2019`),
 * ordenados del más reciente al más antiguo para priorizar tweets contemporáneos en CDX.
 *
 * @param desde Fecha mínima (`YYYY` o `YYYY-MM-DD`).
 * @param hasta Fecha máxima (`YYYY` o `YYYY-MM-DD`).
 * @returns Lista descendente de prefijos de 2 dígitos (`['19', '18', ...]`) o vacío si no aplica.
 */
export function prefijosSnowflakeParaRango(desde?: string, hasta?: string): string[] {
  const desdeIso = normalizarLimiteFecha(desde, false);
  if (!desdeIso || desdeIso < '2019-01-01') return [];

  const hastaIso = normalizarLimiteFecha(hasta, true);
  const msInicio = Date.parse(`${desdeIso}T00:00:00Z`);
  const msFinCrudo = hastaIso ? Date.parse(`${hastaIso}T23:59:59Z`) : Date.now();
  const msFin = hastaIso ? msFinCrudo : Math.max(msInicio, msFinCrudo);

  if (!Number.isFinite(msInicio) || !Number.isFinite(msFin) || msFin < msInicio) {
    return [];
  }

  const idInicio = ((BigInt(msInicio) - SNOWFLAKE_EPOCH_MS) << 22n).toString();
  const idFin = ((BigInt(msFin) - SNOWFLAKE_EPOCH_MS) << 22n).toString();
  if (idInicio.length !== 19 || idFin.length !== 19) return [];

  const prefInicio = Number.parseInt(idInicio.slice(0, 2), 10);
  const prefFin = Number.parseInt(idFin.slice(0, 2), 10);
  if (!Number.isFinite(prefInicio) || !Number.isFinite(prefFin) || prefFin < prefInicio) {
    return [];
  }

  const prefijos: string[] = [];
  for (let p = prefFin; p >= prefInicio && prefijos.length < 15; p -= 1) {
    prefijos.push(String(p));
  }
  return prefijos;
}

/**
 * Determina si un `tweetId` cae dentro del rango temporal solicitado según su Snowflake ID.
 */
export function tweetDentroDeRango(
  tweetId: string,
  desdeIso?: string,
  hastaIso?: string
): boolean {
  if (!desdeIso && !hastaIso) return true;
  const fecha = fechaDesdeSnowflake(tweetId);
  if (!fecha) {
    return !(desdeIso && desdeIso > '2010-11-04');
  }
  if (desdeIso && fecha < desdeIso) return false;
  if (hastaIso && fecha > hastaIso) return false;
  return true;
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
    prefijoId?: string;
    soloSnowflakes19Digitos?: boolean;
    host?: 'twitter.com' | 'x.com';
  } = {}
): Promise<{ filas: string[][]; resumeKeySiguiente?: string }> {
  const handle = limpiarHandle(usuario);
  const limite = Math.max(10, Math.min(2000, opciones.limiteFilas ?? 250));
  const host = opciones.host ?? 'twitter.com';
  const prefijoLimpio = opciones.prefijoId?.replace(/\D+/g, '') ?? '';
  const patronUrl = `${host}/${handle}/status/${prefijoLimpio}*`;

  const endpoint = new URL('https://web.archive.org/cdx/search/cdx');
  endpoint.searchParams.set('url', patronUrl);
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('fl', 'timestamp,original,statuscode');
  endpoint.searchParams.append('filter', 'statuscode:200');
  if (opciones.soloSnowflakes19Digitos) {
    endpoint.searchParams.append('filter', 'original:.*[Ss]tatus/[0-9]{19}([^0-9].*)?$');
  }
  endpoint.searchParams.set('collapse', 'urlkey');
  endpoint.searchParams.set('limit', String(limite));
  endpoint.searchParams.set('showResumeKey', 'true');
  const desdeDigits = opciones.desde?.replace(/\D+/g, '');
  const hastaDigits = opciones.hasta?.replace(/\D+/g, '');
  if (desdeDigits) endpoint.searchParams.set('from', desdeDigits);
  if (hastaDigits) endpoint.searchParams.set('to', hastaDigits);
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

function intercalarPorPrefijo(
  gruposPorPrefijo: Map<string, CapturaTweet[]>[]
): Map<string, CapturaTweet[]> {
  const combinado = new Map<string, CapturaTweet[]>();
  const iteradores = gruposPorPrefijo.map((grupo) => Array.from(grupo.entries()));
  let indice = 0;

  while (true) {
    let agregoAlguno = false;
    for (const lista of iteradores) {
      if (indice >= lista.length) continue;
      agregoAlguno = true;
      const [tweetId, capturas] = lista[indice];
      if (!combinado.has(tweetId)) {
        combinado.set(tweetId, capturas);
      }
    }
    if (!agregoAlguno) break;
    indice += 1;
  }

  return combinado;
}

async function hidratarDesdeOEmbedConArchivo(
  tweetId: string,
  handle: string,
  capturas: CapturaTweet[],
  fechaSnowflake: string | null
): Promise<RegistroDichoCrudo | null> {
  const urlCanonica = `https://x.com/${handle}/status/${tweetId}`;
  try {
    const hidratado = await hidratarTweetOEmbed(urlCanonica);
    if (!hidratado || !hidratado.texto.trim()) return null;
    return {
      ...hidratado,
      id: `tweet-${tweetId}`,
      fecha: fechaSnowflake ?? hidratado.fecha,
      url: urlCanonica,
      archivoUrl: construirUrlArchivo(capturas[0]),
      usuario: `@${handle}`,
      tipoMedio: 'tweet',
    };
  } catch {
    return null;
  }
}

async function hidratarDesdeSnapshotsWayback(
  tweetId: string,
  handle: string,
  capturas: CapturaTweet[],
  pausaMs: number,
  errores: string[],
  opcionesSnapshot: {
    maxSnapshots?: number;
    timeoutMs?: number;
    reintentos?: number;
  } = {}
): Promise<{ registro: RegistroDichoCrudo | null; consultadas: number }> {
  let consultadas = 0;
  const maxSnapshots = opcionesSnapshot.maxSnapshots ?? 2;
  const timeoutMs = opcionesSnapshot.timeoutMs ?? 30000;
  const reintentos = opcionesSnapshot.reintentos ?? 1;

  for (const captura of capturas.slice(0, maxSnapshots)) {
    consultadas += 1;
    const snapshotRawUrl = `https://web.archive.org/web/${captura.timestamp}id_/${captura.original}`;

    try {
      const resp = await fetchWaybackConReintento(snapshotRawUrl, timeoutMs, reintentos);
      if (!resp.ok) {
        errores.push(`Tweet ${tweetId} (${captura.timestamp}): HTTP ${resp.status}`);
      } else {
        const html = await resp.text();
        const extraido = extraerTweetDesdeHtmlArchivado(html, tweetId, handle);
        if (extraido && extraido.fecha) {
          return {
            registro: {
              id: `tweet-${tweetId}`,
              fecha: extraido.fecha,
              texto: extraido.texto,
              url: `https://x.com/${handle}/status/${tweetId}`,
              archivoUrl: construirUrlArchivo(captura),
              usuario: `@${handle}`,
              tipoMedio: 'tweet',
            },
            consultadas,
          };
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

  return { registro: null, consultadas };
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
    prefijoId?: string;
    idsExistentes?: Set<string>;
  } = {}
): Promise<ResultadoWayback> {
  const handle = limpiarHandle(usuario);
  const maxTweets = opciones.maxTweets ?? 40;
  const pausaMs = opciones.pausaMs ?? 1200;
  const errores: string[] = [];
  const desdeIso = normalizarLimiteFecha(opciones.desde, false);
  const hastaIso = normalizarLimiteFecha(opciones.hasta, true);
  const prefijosAuto =
    opciones.resumeKey || opciones.prefijoId
      ? []
      : prefijosSnowflakeParaRango(opciones.desde, opciones.hasta);

  let porTweet = new Map<string, CapturaTweet[]>();
  let resumeKeySiguiente: string | undefined;

  if (prefijosAuto.length > 0) {
    const limitePorPrefijo = Math.max(
      30,
      Math.ceil((opciones.limiteCdx ?? Math.max(maxTweets * 6, 240)) / prefijosAuto.length)
    );
    const mapas: Map<string, CapturaTweet[]>[] = [];

    for (const prefijo of prefijosAuto) {
      const hostPrimario: 'twitter.com' | 'x.com' =
        Number(prefijo) >= 19 ? 'x.com' : 'twitter.com';
      const hostSecundario: 'twitter.com' | 'x.com' =
        hostPrimario === 'x.com' ? 'twitter.com' : 'x.com';

      try {
        const cdxPrimario = await consultarIndiceCdxWayback(handle, {
          desde: opciones.desde,
          limiteFilas: limitePorPrefijo,
          prefijoId: prefijo,
          soloSnowflakes19Digitos: true,
          host: hostPrimario,
        });
        const mapaPrefijo = extraerCapturasPorTweet(cdxPrimario.filas, handle);

        if (Number(prefijo) >= 17 && Number(prefijo) < 20 && mapaPrefijo.size === 0) {
          const cdxAlt = await consultarIndiceCdxWayback(handle, {
            desde: opciones.desde,
            limiteFilas: limitePorPrefijo,
            prefijoId: prefijo,
            soloSnowflakes19Digitos: true,
            host: hostSecundario,
          });
          for (const [id, caps] of extraerCapturasPorTweet(cdxAlt.filas, handle)) {
            if (!mapaPrefijo.has(id)) mapaPrefijo.set(id, caps);
          }
        }

        if (mapaPrefijo.size > 0) mapas.push(mapaPrefijo);
      } catch (err) {
        errores.push(
          `Prefijo CDX ${prefijo}: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      if (pausaMs > 0) {
        await esperarMs(Math.min(pausaMs, 350));
      }
    }

    porTweet = intercalarPorPrefijo(mapas);
  } else {
    let cdx: { filas: string[][]; resumeKeySiguiente?: string };
    try {
      cdx = await consultarIndiceCdxWayback(handle, {
        desde: opciones.desde,
        hasta: opciones.prefijoId ? undefined : opciones.hasta,
        limiteFilas: opciones.limiteCdx ?? Math.max(maxTweets * 3, 120),
        resumeKey: opciones.resumeKey,
        prefijoId: opciones.prefijoId,
        soloSnowflakes19Digitos: Boolean(
          opciones.prefijoId && opciones.prefijoId.replace(/\D+/g, '').length >= 2 && Number(opciones.prefijoId) >= 10
        ),
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
    porTweet = extraerCapturasPorTweet(cdx.filas, handle);
    resumeKeySiguiente = cdx.resumeKeySiguiente;
  }

  const registros: RegistroDichoCrudo[] = [];
  let capturasConsultadas = 0;
  let tweetsProcesados = 0;

  for (const [tweetId, capturas] of porTweet.entries()) {
    if (tweetsProcesados >= maxTweets) break;
    if (opciones.idsExistentes?.has(`tweet-${tweetId}`)) continue;
    if (!tweetDentroDeRango(tweetId, desdeIso, hastaIso)) continue;

    tweetsProcesados += 1;
    const fechaSnowflake = fechaDesdeSnowflake(tweetId);
    const esEpocaSpaModerna = Boolean(fechaSnowflake && fechaSnowflake >= '2021-01-01');

    let recuperado: RegistroDichoCrudo | null = null;

    if (esEpocaSpaModerna) {
      recuperado = await hidratarDesdeOEmbedConArchivo(tweetId, handle, capturas, fechaSnowflake);
      if (!recuperado) {
        const resSnap = await hidratarDesdeSnapshotsWayback(
          tweetId,
          handle,
          capturas,
          pausaMs,
          errores,
          { maxSnapshots: 1, timeoutMs: 10000, reintentos: 0 }
        );
        capturasConsultadas += resSnap.consultadas;
        recuperado = resSnap.registro;
      }
    } else {
      const resSnap = await hidratarDesdeSnapshotsWayback(tweetId, handle, capturas, pausaMs, errores);
      capturasConsultadas += resSnap.consultadas;
      recuperado = resSnap.registro;
      if (!recuperado && fechaSnowflake) {
        recuperado = await hidratarDesdeOEmbedConArchivo(tweetId, handle, capturas, fechaSnowflake);
      }
    }

    if (recuperado) {
      registros.push(recuperado);
    }

    if (pausaMs > 0) {
      await esperarMs(esEpocaSpaModerna ? Math.min(pausaMs, 250) : pausaMs);
    }
  }

  return {
    usuario: handle,
    tweetsDescubiertos: porTweet.size,
    capturasConsultadas,
    registros,
    errores,
    resumeKeySiguiente,
  };
}
