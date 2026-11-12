import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface LineaTranscripcion {
  inicio: number;
  fin: number;
  texto: string;
}

export interface SegmentoTranscripcion {
  inicio: number;
  fin: number;
  texto: string;
}

export interface OpcionesSegmentacion {
  maxSegundos?: number;
  maxCaracteres?: number;
  minCaracteres?: number;
}

export interface Tramo {
  desde: number;
  hasta: number;
}

export interface VideoInfoYtDlp {
  id: string;
  title?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  upload_date?: string | null;
  release_timestamp?: number | null;
  timestamp?: number | null;
  webpage_url?: string;
}

export interface ResultadoTranscripcionYoutube {
  videoId: string;
  titulo: string;
  canal: string;
  fecha: string;
  duracionSegundos: number;
  urlBase: string;
  origen: 'subtitulos-vtt' | 'whisper-local';
  lineas: LineaTranscripcion[];
}

const PYTHON_BIN = process.env.PYTHON_BIN?.trim() || 'python';
const SCRIPT_WHISPER = path.join(
  process.cwd(),
  'pipeline/scripts/transcribir_whisper.py'
);

const REGEX_RANGO_VTT =
  /^((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}\.\d{3})(?:\s+.*)?$/;

function parsearMarcaVtt(marca: string): number {
  const partes = marca.trim().split(':');
  if (partes.length === 2) {
    const min = Number(partes[0]);
    const seg = Number(partes[1]);
    return min * 60 + seg;
  }
  if (partes.length === 3) {
    const hrs = Number(partes[0]);
    const min = Number(partes[1]);
    const seg = Number(partes[2]);
    return hrs * 3600 + min * 60 + seg;
  }
  return 0;
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

function limpiarLineaVtt(cruda: string): string {
  const sinEtiquetas = cruda.replace(/<[^>]*>/g, '');
  const sinAnotaciones = sinEtiquetas.replace(/\[[^\]]*\]/g, ' ');
  return decodificarEntidadesHtml(sinAnotaciones).replace(/\s+/g, ' ').trim();
}

/**
 * Parsea un archivo WebVTT de YouTube (manual o auto-generado con líneas rolling)
 * eliminando etiquetas de tiempo internas, anotaciones `[música]` y duplicados consecutivos.
 *
 * @param contenido Texto completo del archivo `.vtt`.
 * @returns Líneas limpias con marcas de tiempo en segundos.
 */
export function parsearVttYoutube(contenido: string): LineaTranscripcion[] {
  const lineasRaw = contenido.replace(/^\uFEFF/, '').split(/\r?\n/);
  const resultado: LineaTranscripcion[] = [];
  let ultimaEmitida = '';

  let i = 0;
  while (i < lineasRaw.length) {
    const linea = lineasRaw[i].trim();
    const match = linea.match(REGEX_RANGO_VTT);
    if (!match) {
      i += 1;
      continue;
    }

    const inicio = parsearMarcaVtt(match[1]);
    const fin = parsearMarcaVtt(match[2]);
    i += 1;

    while (i < lineasRaw.length && lineasRaw[i] !== '' && !REGEX_RANGO_VTT.test(lineasRaw[i].trim())) {
      const limpia = limpiarLineaVtt(lineasRaw[i]);
      if (limpia && limpia !== ultimaEmitida) {
        resultado.push({ inicio, fin, texto: limpia });
        ultimaEmitida = limpia;
      }
      i += 1;
    }
  }

  return resultado;
}

/**
 * Agrupa líneas breves de subtítulos o Whisper en pasajes coherentes acotados
 * por duración máxima, largo máximo y cierre natural de oración.
 *
 * @param lineas Líneas cronológicas de transcripción.
 * @param opciones Límites configurables de segmentación.
 * @returns Pasajes consolidados listos para clasificación y búsqueda.
 */
export function agruparEnSegmentos(
  lineas: LineaTranscripcion[],
  opciones: OpcionesSegmentacion = {}
): SegmentoTranscripcion[] {
  if (lineas.length === 0) return [];

  const maxSegundos = opciones.maxSegundos ?? 45;
  const maxCaracteres = opciones.maxCaracteres ?? 320;
  const minCaracteres = opciones.minCaracteres ?? 120;

  const segmentos: SegmentoTranscripcion[] = [];
  let actual: SegmentoTranscripcion | null = null;

  for (const linea of lineas) {
    const textoLinea = linea.texto.trim();
    if (!textoLinea) continue;

    if (actual !== null) {
      const longitudCombinada = actual.texto.length + 1 + textoLinea.length;
      const duracionCombinada = linea.fin - actual.inicio;
      if (longitudCombinada > maxCaracteres || duracionCombinada > maxSegundos) {
        segmentos.push(actual);
        actual = null;
      }
    }

    if (actual === null) {
      actual = { inicio: linea.inicio, fin: linea.fin, texto: textoLinea };
    } else {
      actual = {
        inicio: actual.inicio,
        fin: linea.fin,
        texto: `${actual.texto} ${textoLinea}`,
      };
    }

    if (actual.texto.length >= minCaracteres && /[.?!]$/.test(actual.texto)) {
      segmentos.push(actual);
      actual = null;
    }
  }

  if (actual !== null) {
    segmentos.push(actual);
  }

  return segmentos;
}

function parsearSegundoTramo(crudo: string): number {
  const limpio = crudo.trim();
  if (!/^\d+(?::\d{1,2}){0,2}$/.test(limpio)) {
    throw new Error(`Marca de tiempo inválida en tramo: "${crudo}"`);
  }

  const partes = limpio.split(':').map((p) => Number.parseInt(p, 10));
  if (partes.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error(`Marca de tiempo inválida en tramo: "${crudo}"`);
  }

  if (partes.length === 1) return partes[0];
  if (partes.length === 2) {
    const [min, seg] = partes;
    if (seg >= 60) throw new Error(`Segundos fuera de rango en tramo: "${crudo}"`);
    return min * 60 + seg;
  }
  const [hrs, min, seg] = partes;
  if (min >= 60 || seg >= 60) {
    throw new Error(`Minutos o segundos fuera de rango en tramo: "${crudo}"`);
  }
  return hrs * 3600 + min * 60 + seg;
}

/**
 * Parsea una lista de tramos de intervención separados por comas (ej. `12:30-14:10, 1:02:05-1:03:00`).
 *
 * @param texto Especificación textual de intervalos.
 * @returns Arreglo de tramos validados con `desde < hasta` en segundos.
 */
export function parsearTramos(texto: string): Tramo[] {
  const limpio = texto.trim();
  if (!limpio) return [];

  return limpio.split(',').map((bloque) => {
    const partes = bloque.split('-');
    if (partes.length !== 2) {
      throw new Error(`Formato de tramo inválido: "${bloque.trim()}"`);
    }
    const desde = parsearSegundoTramo(partes[0]);
    const hasta = parsearSegundoTramo(partes[1]);
    if (desde >= hasta) {
      throw new Error(`El tramo debe ser creciente (desde < hasta): "${bloque.trim()}"`);
    }
    return { desde, hasta };
  });
}

/**
 * Filtra segmentos cuyo punto medio temporal cae dentro de alguno de los tramos indicados.
 *
 * @param segmentos Segmentos agrupados de la transcripción.
 * @param tramos Intervalos permitidos (extremos inclusivos).
 * @returns Subconjunto de segmentos comprendidos dentro de los tramos.
 */
export function filtrarPorTramos(
  segmentos: SegmentoTranscripcion[],
  tramos: Tramo[]
): SegmentoTranscripcion[] {
  if (tramos.length === 0) return [];

  return segmentos.filter((seg) => {
    const medio = (seg.inicio + seg.fin) / 2;
    return tramos.some((t) => medio >= t.desde && medio <= t.hasta);
  });
}

/**
 * Extrae el ID de 11 caracteres de un video desde cualquier variante oficial de URL de YouTube.
 *
 * @param url Enlace del video en YouTube.
 * @returns ID de 11 caracteres o `null` si no corresponde a YouTube.
 */
export function extraerIdVideoYoutube(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  let candidato: string | null = null;

  if (host === 'youtu.be') {
    candidato = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com') {
    const segmentos = parsed.pathname.split('/').filter(Boolean);
    if (segmentos[0] === 'watch') {
      candidato = parsed.searchParams.get('v');
    } else if (
      (segmentos[0] === 'live' ||
        segmentos[0] === 'shorts' ||
        segmentos[0] === 'embed') &&
      segmentos[1]
    ) {
      candidato = segmentos[1];
    }
  }

  if (!candidato || !/^[A-Za-z0-9_-]{11}$/.test(candidato)) {
    return null;
  }
  return candidato;
}

/**
 * Construye el enlace corto `youtu.be/<id>?t=<segundos>` truncado a entero no negativo.
 *
 * @param videoId Identificador de 11 caracteres del video.
 * @param segundos Marca de tiempo inicial en segundos.
 * @returns URL canónica con salto directo al segundo exacto.
 */
export function construirUrlConTiempo(videoId: string, segundos: number): string {
  const seg = Math.max(0, Math.floor(segundos));
  return `https://youtu.be/${videoId}?t=${seg}`;
}

/**
 * Convierte metadatos temporales de `yt-dlp` a fecha calendario `YYYY-MM-DD` en zona `America/Santiago`.
 *
 * @param info Metadatos `release_timestamp`, `timestamp` o `upload_date` del video.
 * @returns Fecha `YYYY-MM-DD` o cadena vacía si no hay marca utilizable.
 */
export function fechaPublicacionVideo(info: {
  release_timestamp?: number | null;
  timestamp?: number | null;
  upload_date?: string | null;
}): string {
  const ts = info.release_timestamp ?? info.timestamp;
  if (typeof ts === 'number' && Number.isFinite(ts) && ts > 0) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ts * 1000));
  }

  const upload = info.upload_date?.trim() ?? '';
  if (/^\d{8}$/.test(upload)) {
    return `${upload.slice(0, 4)}-${upload.slice(4, 6)}-${upload.slice(6, 8)}`;
  }

  return '';
}

async function seleccionarArchivoPorPreferencia(
  dir: string,
  preferencias: string[],
  extension: string
): Promise<string | null> {
  const archivos = await fs.readdir(dir);
  for (const pref of preferencias) {
    const hallado = archivos.find((a) => a === pref);
    if (hallado) return path.join(dir, hallado);
  }
  const cualquiera = archivos.find((a) => a.endsWith(extension));
  return cualquiera ? path.join(dir, cualquiera) : null;
}

/**
 * Obtiene metadatos y subtítulos en español de un video público de YouTube vía `yt-dlp`.
 * Si no existen subtítulos y `usarWhisper` es `true`, descarga el audio y lo transcribe
 * localmente mediante `pipeline/scripts/transcribir_whisper.py`.
 *
 * @param url Enlace del video en YouTube.
 * @param opciones Opciones de idioma, respaldo Whisper y directorio temporal.
 * @returns Metadata normalizada del video junto a las líneas cronológicas transcritas.
 */
export async function obtenerTranscripcionYoutube(
  url: string,
  opciones: {
    usarWhisper?: boolean;
    modeloWhisper?: string;
    idioma?: string;
  } = {}
): Promise<ResultadoTranscripcionYoutube> {
  const videoId = extraerIdVideoYoutube(url);
  if (!videoId) {
    throw new Error(`URL de YouTube inválida: ${url}`);
  }

  const idioma = opciones.idioma ?? 'es';
  const dirTemp = await fs.mkdtemp(path.join(os.tmpdir(), `esc-yt-${videoId}-`));

  try {
    const plantillaSalida = path.join(dirTemp, '%(id)s.%(ext)s');
    try {
      await execFileAsync(
        PYTHON_BIN,
        [
          '-m',
          'yt_dlp',
          '--no-playlist',
          '--skip-download',
          '--write-auto-subs',
          '--write-subs',
          '--sub-langs',
          `${idioma}.*,${idioma}`,
          '--sub-format',
          'vtt',
          '--write-info-json',
          '-o',
          plantillaSalida,
          url,
        ],
        { maxBuffer: 20 * 1024 * 1024 }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/No module named yt_dlp|ENOENT/i.test(msg)) {
        throw new Error(
          `yt-dlp no está disponible (${PYTHON_BIN} -m yt_dlp). Instálalo con: ${PYTHON_BIN} -m pip install yt-dlp`
        );
      }
      throw new Error(`Error al ejecutar yt-dlp para ${videoId}: ${msg}`);
    }

    const rutaInfo = path.join(dirTemp, `${videoId}.info.json`);
    const infoRaw = await fs.readFile(rutaInfo, 'utf-8');
    const info = JSON.parse(infoRaw) as VideoInfoYtDlp;

    const rutaVtt = await seleccionarArchivoPorPreferencia(
      dirTemp,
      [`${videoId}.${idioma}.vtt`, `${videoId}.${idioma}-orig.vtt`],
      '.vtt'
    );

    if (rutaVtt) {
      const vtt = await fs.readFile(rutaVtt, 'utf-8');
      const lineas = parsearVttYoutube(vtt);
      if (lineas.length > 0) {
        return {
          videoId,
          titulo: info.title?.trim() || `Video ${videoId}`,
          canal: info.channel?.trim() || info.uploader?.trim() || 'YouTube',
          fecha: fechaPublicacionVideo(info),
          duracionSegundos: Math.round(info.duration ?? 0),
          urlBase: `https://youtu.be/${videoId}`,
          origen: 'subtitulos-vtt',
          lineas,
        };
      }
    }

    if (!opciones.usarWhisper) {
      throw new Error(
        `El video ${videoId} no tiene subtítulos en español disponibles. Reintenta con --whisper para transcribir el audio en local.`
      );
    }

    await execFileAsync(
      PYTHON_BIN,
      [
        '-m',
        'yt_dlp',
        '--no-playlist',
        '-f',
        'bestaudio[ext=m4a]/bestaudio',
        '-o',
        plantillaSalida,
        url,
      ],
      { maxBuffer: 20 * 1024 * 1024 }
    );

    const archivosTemp = await fs.readdir(dirTemp);
    const audioArchivo = archivosTemp.find(
      (f) => f.startsWith(`${videoId}.`) && !f.endsWith('.json') && !f.endsWith('.vtt')
    );
    if (!audioArchivo) {
      throw new Error(`No se pudo descargar pista de audio para ${videoId}.`);
    }

    const { stdout } = await execFileAsync(
      PYTHON_BIN,
      [
        SCRIPT_WHISPER,
        path.join(dirTemp, audioArchivo),
        '--modelo',
        opciones.modeloWhisper ?? 'small',
        '--idioma',
        idioma,
      ],
      { maxBuffer: 50 * 1024 * 1024 }
    );

    const lineas = JSON.parse(stdout) as LineaTranscripcion[];
    return {
      videoId,
      titulo: info.title?.trim() || `Video ${videoId}`,
      canal: info.channel?.trim() || info.uploader?.trim() || 'YouTube',
      fecha: fechaPublicacionVideo(info),
      duracionSegundos: Math.round(info.duration ?? 0),
      urlBase: `https://youtu.be/${videoId}`,
      origen: 'whisper-local',
      lineas,
    };
  } finally {
    await fs.rm(dirTemp, { recursive: true, force: true });
  }
}

/**
 * Busca videos recientes en YouTube usando `yt-dlp --flat-playlist ytsearchN:...`.
 *
 * @param consulta Texto de búsqueda (ej. `"José Antonio Kast debate presidencial 2025"`).
 * @param limite Cantidad máxima de resultados (entre 1 y 20).
 * @returns Lista con ID, título, canal, duración y enlace por video.
 */
export async function buscarVideosYoutube(
  consulta: string,
  limite = 6
): Promise<Array<{ id: string; titulo: string; canal: string; duracion: string; url: string }>> {
  const n = Math.max(1, Math.min(20, Math.floor(limite)));
  const { stdout } = await execFileAsync(
    PYTHON_BIN,
    [
      '-m',
      'yt_dlp',
      '--flat-playlist',
      '--print',
      '%(id)s\t%(duration_string)s\t%(channel)s\t%(title)s',
      `ytsearch${n}:${consulta}`,
    ],
    { maxBuffer: 5 * 1024 * 1024 }
  );

  return stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const [id = '', duracion = '', canal = '', ...tituloPartes] = linea.split('\t');
      return {
        id,
        duracion,
        canal,
        titulo: tituloPartes.join('\t'),
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v.id));
}
