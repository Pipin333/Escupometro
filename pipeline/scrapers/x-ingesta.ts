import fs from 'node:fs/promises';
import path from 'node:path';
import type { RegistroDichoCrudo } from '../../src/motor/clasificador-dichos';
import {
  extraerIdTweetDesdeUrl,
  normalizarFechaIso,
} from '../../src/motor/clasificador-dichos';

export interface ResultadoIngestaFuente {
  fuente: string;
  registros: RegistroDichoCrudo[];
  errores: string[];
}

const USUARIO_DEFECTO = 'joseantoniokast';
const TIMEOUT_RED_MS = 12000;

function limpiarHandle(usuario?: string): string {
  return (usuario ?? USUARIO_DEFECTO).replace(/^@+/, '').trim() || USUARIO_DEFECTO;
}

function decodificarEntidadesHtml(texto: string): string {
  return texto
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function convertirValorString(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarRegistroGenerico(
  crudo: Record<string, unknown>,
  usuarioPorDefecto: string
): RegistroDichoCrudo | null {
  const anidado =
    crudo.tweet && typeof crudo.tweet === 'object'
      ? (crudo.tweet as Record<string, unknown>)
      : crudo;

  const texto =
    convertirValorString(anidado.full_text) ||
    convertirValorString(anidado.text) ||
    convertirValorString(anidado.texto) ||
    convertirValorString(anidado.cita) ||
    convertirValorString(anidado.content);

  const fechaCruda =
    convertirValorString(anidado.created_at) ||
    convertirValorString(anidado.createdAt) ||
    convertirValorString(anidado.fecha) ||
    convertirValorString(anidado.date) ||
    convertirValorString(anidado.timestamp);

  const idCrudo =
    convertirValorString(anidado.id_str) ||
    (typeof anidado.id === 'number'
      ? String(anidado.id)
      : convertirValorString(anidado.id));

  const authorObj =
    anidado.author && typeof anidado.author === 'object'
      ? (anidado.author as Record<string, unknown>)
      : anidado.user && typeof anidado.user === 'object'
        ? (anidado.user as Record<string, unknown>)
        : undefined;

  const usuarioExtraido =
    convertirValorString(anidado.username) ||
    convertirValorString(anidado.usuario) ||
    convertirValorString(authorObj?.userName) ||
    convertirValorString(authorObj?.username) ||
    convertirValorString(authorObj?.screen_name) ||
    usuarioPorDefecto;

  const handleLimpio = limpiarHandle(usuarioExtraido);
  const urlCruda =
    convertirValorString(anidado.url) ||
    convertirValorString(anidado.tweetUrl) ||
    convertirValorString(anidado.link) ||
    convertirValorString(anidado.fuenteUrl) ||
    (idCrudo ? `https://x.com/${handleLimpio}/status/${idCrudo}` : '');

  const rol = convertirValorString(anidado.rol) || undefined;
  const fechaIso = normalizarFechaIso(fechaCruda);
  const idFinal = idCrudo || extraerIdTweetDesdeUrl(urlCruda) || '';

  if (!texto || !fechaIso || !urlCruda) {
    return null;
  }

  return {
    id: idFinal ? `tweet-${idFinal}` : undefined,
    fecha: fechaIso,
    texto,
    url: urlCruda,
    usuario: `@${handleLimpio}`,
    rol,
    tipoMedio: 'tweet',
  };
}

/**
 * Parsea contenido CSV respetando comillas dobles, comas internas y saltos de línea.
 *
 * @param contenido Contenido completo del archivo CSV.
 * @returns Matriz de filas y columnas.
 */
export function parsearCsvTabla(contenido: string): string[][] {
  const primeraLinea = contenido.split(/\r?\n/, 1)[0] ?? '';
  const delimitador =
    primeraLinea.includes(';') && !primeraLinea.includes(',') ? ';' : ',';

  const filas: string[][] = [];
  let filaActual: string[] = [];
  let campoActual = '';
  let enComillas = false;

  for (let i = 0; i < contenido.length; i += 1) {
    const ch = contenido[i];
    const siguiente = contenido[i + 1];

    if (enComillas) {
      if (ch === '"' && siguiente === '"') {
        campoActual += '"';
        i += 1;
      } else if (ch === '"') {
        enComillas = false;
      } else {
        campoActual += ch;
      }
      continue;
    }

    if (ch === '"') {
      enComillas = true;
    } else if (ch === delimitador) {
      filaActual.push(campoActual.trim());
      campoActual = '';
    } else if (ch === '\r' && siguiente === '\n') {
      filaActual.push(campoActual.trim());
      if (filaActual.some((celda) => celda !== '')) filas.push(filaActual);
      filaActual = [];
      campoActual = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      filaActual.push(campoActual.trim());
      if (filaActual.some((celda) => celda !== '')) filas.push(filaActual);
      filaActual = [];
      campoActual = '';
    } else {
      campoActual += ch;
    }
  }

  if (campoActual !== '' || filaActual.length > 0) {
    filaActual.push(campoActual.trim());
    if (filaActual.some((celda) => celda !== '')) filas.push(filaActual);
  }

  return filas;
}

/**
 * Convierte el texto de un archivo de exportación (`.json`, `.js` del archivo oficial de X o `.csv`)
 * en registros crudos listos para clasificación.
 *
 * @param contenido Contenido textual del archivo exportado.
 * @param extension Extensión del archivo (`.json`, `.js` o `.csv`).
 * @param usuarioPorDefecto Usuario atribuido cuando las filas no especifican autor.
 * @returns Lista normalizada de `RegistroDichoCrudo`.
 */
export function parsearContenidoExportacionTweets(
  contenido: string,
  extension: string,
  usuarioPorDefecto = USUARIO_DEFECTO
): RegistroDichoCrudo[] {
  const ext = extension.toLowerCase();
  const registros: RegistroDichoCrudo[] = [];

  if (ext === '.csv') {
    const tabla = parsearCsvTabla(contenido);
    if (tabla.length < 2) return [];

    const encabezados = tabla[0].map((h) => h.toLowerCase().trim());
    for (const fila of tabla.slice(1)) {
      const obj: Record<string, unknown> = {};
      encabezados.forEach((col, idx) => {
        if (col) obj[col] = fila[idx] ?? '';
      });
      const normalizado = normalizarRegistroGenerico(obj, usuarioPorDefecto);
      if (normalizado) registros.push(normalizado);
    }
    return registros;
  }

  const cuerpoJson =
    ext === '.js'
      ? contenido.replace(/^\s*window\.YTD\.[^=]+=\s*/, '').trim().replace(/;$/, '')
      : contenido.trim();

  if (!cuerpoJson) return [];

  const parsed: unknown = JSON.parse(cuerpoJson);
  const lista: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? ((parsed as Record<string, unknown>).tweets as unknown[]) ??
        ((parsed as Record<string, unknown>).data as unknown[]) ??
        []
      : [];

  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const normalizado = normalizarRegistroGenerico(
      item as Record<string, unknown>,
      usuarioPorDefecto
    );
    if (normalizado) registros.push(normalizado);
  }

  return registros;
}

/**
 * Lee un archivo local desde `pipeline/imports/` en formato `.json`, `.js` o `.csv`.
 *
 * @param rutaArchivo Ruta absoluta o relativa al archivo exportado.
 * @param usuarioPorDefecto Usuario a usar cuando el archivo omite el handle.
 * @returns Registros extraídos junto a posibles errores de lectura/formato.
 */
export async function ingestarDesdeArchivoLocal(
  rutaArchivo: string,
  usuarioPorDefecto = USUARIO_DEFECTO
): Promise<ResultadoIngestaFuente> {
  const nombre = path.basename(rutaArchivo);
  try {
    const contenido = await fs.readFile(rutaArchivo, 'utf-8');
    const ext = path.extname(rutaArchivo);
    const registros = parsearContenidoExportacionTweets(
      contenido,
      ext,
      usuarioPorDefecto
    );
    return {
      fuente: `archivo:${nombre}`,
      registros,
      errores: [],
    };
  } catch (err) {
    return {
      fuente: `archivo:${nombre}`,
      registros: [],
      errores: [`Error al procesar ${nombre}: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/**
 * Obtiene tweets históricos mediante la API oficial de X v2 usando `X_BEARER_TOKEN`.
 *
 * @param usuario Handle objetivo sin `@` (por defecto `joseantoniokast`).
 * @param bearerToken Token OAuth 2.0 Bearer de X Developer Portal.
 * @param maxResultados Límite máximo de tweets a recuperar por ejecución.
 * @returns Registros recuperados o diagnóstico de error de cuota/permisos.
 */
export async function ingestarDesdeXApiV2(
  usuario: string,
  bearerToken: string,
  maxResultados = 500
): Promise<ResultadoIngestaFuente> {
  const handle = limpiarHandle(usuario);
  const headers = {
    Authorization: `Bearer ${bearerToken}`,
    Accept: 'application/json',
  };

  try {
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_RED_MS) }
    );

    if (!userRes.ok) {
      return {
        fuente: 'x-api-v2',
        registros: [],
        errores: [`X API v2 (/users/by/username) respondió HTTP ${userRes.status}`],
      };
    }

    const userJson = (await userRes.json()) as { data?: { id?: string } };
    const userId = userJson.data?.id;
    if (!userId) {
      return {
        fuente: 'x-api-v2',
        registros: [],
        errores: [`X API v2 no devolvió id para @${handle}`],
      };
    }

    const registros: RegistroDichoCrudo[] = [];
    let paginationToken: string | undefined;

    while (registros.length < maxResultados) {
      const batch = Math.min(100, maxResultados - registros.length);
      const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
      url.searchParams.set('max_results', String(Math.max(5, batch)));
      url.searchParams.set('exclude', 'retweets,replies');
      url.searchParams.set('tweet.fields', 'created_at,text');
      if (paginationToken) {
        url.searchParams.set('pagination_token', paginationToken);
      }

      const tweetsRes = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_RED_MS),
      });

      if (!tweetsRes.ok) {
        return {
          fuente: 'x-api-v2',
          registros,
          errores: [`X API v2 (/tweets) detuvo paginación con HTTP ${tweetsRes.status}`],
        };
      }

      const payload = (await tweetsRes.json()) as {
        data?: Array<{ id: string; text: string; created_at?: string }>;
        meta?: { next_token?: string };
      };

      for (const tweet of payload.data ?? []) {
        const normalizado = normalizarRegistroGenerico(
          { ...tweet, username: handle },
          handle
        );
        if (normalizado) registros.push(normalizado);
      }

      paginationToken = payload.meta?.next_token;
      if (!paginationToken || !(payload.data?.length ?? 0)) {
        break;
      }
    }

    return { fuente: 'x-api-v2', registros, errores: [] };
  } catch (err) {
    return {
      fuente: 'x-api-v2',
      registros: [],
      errores: [`Fallo de red en X API v2: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/**
 * Obtiene tweets históricos vía SocialData API (`SOCIALDATA_API_KEY`) usando búsqueda `from:<usuario>`.
 *
 * @param usuario Handle objetivo sin `@` (por defecto `joseantoniokast`).
 * @param apiKey Clave de SocialData Tools.
 * @param maxPaginas Número máximo de páginas de resultados a recorrer.
 * @returns Registros extraídos y posibles advertencias de API.
 */
export async function ingestarDesdeSocialData(
  usuario: string,
  apiKey: string,
  maxPaginas = 10
): Promise<ResultadoIngestaFuente> {
  const handle = limpiarHandle(usuario);
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };

  const registros: RegistroDichoCrudo[] = [];
  let cursor: string | undefined;

  try {
    for (let pagina = 0; pagina < maxPaginas; pagina += 1) {
      const url = new URL('https://api.socialdata.tools/twitter/search');
      url.searchParams.set('query', `from:${handle} -filter:retweets`);
      url.searchParams.set('type', 'Latest');
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const res = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_RED_MS),
      });

      if (!res.ok) {
        return {
          fuente: 'socialdata',
          registros,
          errores: [`SocialData respondió HTTP ${res.status} en página ${pagina + 1}`],
        };
      }

      const payload = (await res.json()) as {
        tweets?: Array<Record<string, unknown>>;
        next_cursor?: string;
      };

      const lote = payload.tweets ?? [];
      for (const item of lote) {
        const normalizado = normalizarRegistroGenerico(item, handle);
        if (normalizado) registros.push(normalizado);
      }

      if (!payload.next_cursor || lote.length === 0) {
        break;
      }
      cursor = payload.next_cursor;
    }

    return { fuente: 'socialdata', registros, errores: [] };
  } catch (err) {
    return {
      fuente: 'socialdata',
      registros,
      errores: [`Fallo de red en SocialData: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

/**
 * Hidrata una URL individual de tweet usando el endpoint público oficial de oEmbed de X/Twitter,
 * sin requerir token ni saltarse controles de acceso.
 *
 * @param tweetUrl URL completa de un tweet existente en `x.com` o `twitter.com`.
 * @returns Registro normalizado con cita y fecha extraídas del blockquote oEmbed, o `null` si no existe.
 */
export async function hidratarTweetOEmbed(
  tweetUrl: string
): Promise<RegistroDichoCrudo | null> {
  const tweetId = extraerIdTweetDesdeUrl(tweetUrl);
  if (!tweetId) {
    return null;
  }

  try {
    const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
      tweetUrl
    )}&omit_script=true`;
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_RED_MS),
    });

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as {
      html?: string;
      author_url?: string;
      url?: string;
    };

    const html = payload.html ?? '';
    const parrafoMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!parrafoMatch) {
      return null;
    }

    const enlaces = [...html.matchAll(/<a [^>]*>([^<]+)<\/a>/gi)];
    const textoUltimaFecha = enlaces.at(-1)?.[1] ?? '';
    const fechaIso = normalizarFechaIso(textoUltimaFecha);
    const cita = decodificarEntidadesHtml(parrafoMatch[1]);
    const handleMatch = (payload.author_url ?? tweetUrl).match(
      /(?:twitter\.com|x\.com)\/([^/?#]+)/i
    );
    const handle = limpiarHandle(handleMatch?.[1]);

    if (!cita || !fechaIso) {
      return null;
    }

    return {
      id: `tweet-${tweetId}`,
      fecha: fechaIso,
      texto: cita,
      url: payload.url ?? tweetUrl,
      usuario: `@${handle}`,
      tipoMedio: 'tweet',
    };
  } catch {
    return null;
  }
}
