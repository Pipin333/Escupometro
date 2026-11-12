import {
  esTweetSustantivo,
  inferirRolPorFecha,
  type RegistroDichoCrudo,
} from '../src/motor/clasificador-dichos.js';
import type { DichoHistorico } from '../src/types/escupo.js';
import { incorporarRegistrosAlArchivo } from './lib/archivo-dichos.js';
import { cargarEnvLocal, leerValorNpm } from './lib/env.js';
import {
  agruparEnSegmentos,
  buscarVideosYoutube,
  construirUrlConTiempo,
  extraerIdVideoYoutube,
  obtenerTranscripcionYoutube,
  parsearTramos,
  type SegmentoTranscripcion,
} from './scrapers/youtube-transcripciones.js';

interface OpcionesCliDebates {
  urls: string[];
  consultaBusqueda: string;
  tramosTexto: string;
  rol?: string;
  fechaForzada?: string;
  tipoMedio: DichoHistorico['tipoMedio'];
  usarWhisper: boolean;
  modeloWhisper: string;
  idioma: string;
  maxSegmentos: number;
  incluirTodo: boolean;
  dryRun: boolean;
}

const TIPOS_MEDIO_VALIDOS = new Set<DichoHistorico['tipoMedio']>([
  'debate',
  'prensa',
  'congreso',
  'tweet',
]);

function parsearArgumentos(argv: string[]): OpcionesCliDebates {
  const opciones: OpcionesCliDebates = {
    urls: [],
    consultaBusqueda: leerValorNpm('buscar') || '',
    tramosTexto: leerValorNpm('tramos') || '',
    rol: leerValorNpm('rol'),
    fechaForzada: leerValorNpm('fecha'),
    tipoMedio: 'debate',
    usarWhisper: process.env.npm_config_whisper === 'true',
    modeloWhisper: leerValorNpm('modelo') || 'small',
    idioma: leerValorNpm('idioma') || 'es',
    maxSegmentos: 80,
    incluirTodo: process.env.npm_config_incluir_todo === 'true',
    dryRun: process.env.npm_config_dry_run === 'true',
  };

  const urlNpm = leerValorNpm('url');
  if (urlNpm) {
    opciones.urls.push(urlNpm);
  }
  const maxNpm = leerValorNpm('max');
  if (maxNpm) {
    const n = Number.parseInt(maxNpm, 10);
    if (Number.isFinite(n) && n > 0) opciones.maxSegmentos = n;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const valor = argv[i + 1];

    if (arg.startsWith('--buscar=')) {
      opciones.consultaBusqueda = arg.slice('--buscar='.length).trim();
    } else if ((arg === '--buscar' || arg === '--search') && valor) {
      opciones.consultaBusqueda = valor.trim();
      i += 1;
    } else if (arg.startsWith('--url=')) {
      const v = arg.slice('--url='.length).trim();
      if (v) opciones.urls.push(v);
    } else if (arg === '--url' && valor) {
      opciones.urls.push(valor.trim());
      i += 1;
    } else if (arg.startsWith('--tramos=')) {
      opciones.tramosTexto = arg.slice('--tramos='.length).trim();
    } else if (arg === '--tramos' && valor) {
      opciones.tramosTexto = valor.trim();
      i += 1;
    } else if (arg.startsWith('--rol=')) {
      opciones.rol = arg.slice('--rol='.length).trim() || undefined;
    } else if (arg === '--rol' && valor) {
      opciones.rol = valor.trim();
      i += 1;
    } else if (arg.startsWith('--fecha=')) {
      opciones.fechaForzada = arg.slice('--fecha='.length).trim() || undefined;
    } else if (arg === '--fecha' && valor) {
      opciones.fechaForzada = valor.trim();
      i += 1;
    } else if (arg.startsWith('--medio=')) {
      const m = arg.slice('--medio='.length).trim() as DichoHistorico['tipoMedio'];
      if (TIPOS_MEDIO_VALIDOS.has(m)) opciones.tipoMedio = m;
    } else if (arg === '--medio' && valor) {
      const m = valor.trim() as DichoHistorico['tipoMedio'];
      if (TIPOS_MEDIO_VALIDOS.has(m)) opciones.tipoMedio = m;
      i += 1;
    } else if (arg === '--whisper') {
      opciones.usarWhisper = true;
    } else if (arg.startsWith('--modelo=')) {
      const v = arg.slice('--modelo='.length).trim();
      if (v) opciones.modeloWhisper = v;
    } else if (arg === '--modelo' && valor) {
      opciones.modeloWhisper = valor.trim();
      i += 1;
    } else if (arg.startsWith('--idioma=')) {
      const v = arg.slice('--idioma='.length).trim();
      if (v) opciones.idioma = v;
    } else if (arg === '--idioma' && valor) {
      opciones.idioma = valor.trim();
      i += 1;
    } else if (arg.startsWith('--max=')) {
      const n = Number.parseInt(arg.slice('--max='.length), 10);
      if (Number.isFinite(n) && n > 0) opciones.maxSegmentos = n;
    } else if (arg === '--max' && valor) {
      const n = Number.parseInt(valor, 10);
      if (Number.isFinite(n) && n > 0) opciones.maxSegmentos = n;
      i += 1;
    } else if (arg === '--incluir-todo') {
      opciones.incluirTodo = true;
    } else if (arg === '--dry-run') {
      opciones.dryRun = true;
    } else if (extraerIdVideoYoutube(arg)) {
      opciones.urls.push(arg);
    } else if (
      process.env.npm_config_tramos === 'true' &&
      !opciones.tramosTexto &&
      /^\d+(?::\d{1,2}){0,2}\s*-\s*\d+(?::\d{1,2}){0,2}/.test(arg)
    ) {
      opciones.tramosTexto = arg;
    } else if (
      process.env.npm_config_buscar === 'true' &&
      !opciones.consultaBusqueda &&
      !arg.startsWith('-')
    ) {
      opciones.consultaBusqueda = arg;
    } else if (
      process.env.npm_config_max === 'true' &&
      /^\d+$/.test(arg)
    ) {
      const n = Number.parseInt(arg, 10);
      if (Number.isFinite(n) && n > 0) opciones.maxSegmentos = n;
    }
  }

  return opciones;
}

function imprimirAyudaUso(): void {
  console.log('[Ingesta Debates] Uso:');
  console.log('  1. Buscar debates/entrevistas en YouTube:');
  console.log('     npm run ingesta:debates -- --buscar "Jose Antonio Kast debate Anatel 2025"');
  console.log('  2. Transcribir un video completo (subtítulos yt-dlp + marcas ?t=SEG):');
  console.log('     npm run ingesta:debates -- https://www.youtube.com/watch?v=VIDEO_ID --dry-run');
  console.log('  3. Acotar sólo a los minutos donde habla Kast:');
  console.log('     npm run ingesta:debates -- https://youtu.be/VIDEO_ID --tramos "14:20-18:45, 42:10-46:00"');
  console.log('  4. Respaldo local con faster-whisper si el video no trae subtítulos:');
  console.log('     npm run ingesta:debates -- https://youtu.be/VIDEO_ID --whisper --modelo small');
}

function formatearMmSs(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

async function ejecutarIngestaDebates(): Promise<void> {
  await cargarEnvLocal(process.cwd());
  const opciones = parsearArgumentos(process.argv.slice(2));

  if (opciones.consultaBusqueda) {
    console.log(`[Ingesta Debates] Buscando en YouTube: "${opciones.consultaBusqueda}"`);
    const videos = await buscarVideosYoutube(opciones.consultaBusqueda, 8);
    if (videos.length === 0) {
      console.log('[Ingesta Debates] No se encontraron videos.');
      return;
    }
    for (const video of videos) {
      console.log(`  - [${video.duracion || '?'}] ${video.canal} | ${video.titulo}`);
      console.log(`    ${video.url}`);
    }
    return;
  }

  if (opciones.urls.length === 0) {
    imprimirAyudaUso();
    return;
  }

  const tramos = opciones.tramosTexto ? parsearTramos(opciones.tramosTexto) : [];
  const registrosCrudos: RegistroDichoCrudo[] = [];

  for (const url of opciones.urls) {
    console.log(`[Ingesta Debates] Procesando ${url}...`);
    const transcripcion = await obtenerTranscripcionYoutube(url, {
      usarWhisper: opciones.usarWhisper,
      modeloWhisper: opciones.modeloWhisper,
      idioma: opciones.idioma,
    });

    const fechaFinal = opciones.fechaForzada || transcripcion.fecha;
    if (!fechaFinal) {
      console.warn(
        `[Ingesta Debates] No se pudo determinar fecha para ${transcripcion.videoId}; usa --fecha=YYYY-MM-DD.`
      );
      continue;
    }

    const segmentosSeleccionados: SegmentoTranscripcion[] =
      tramos.length > 0
        ? tramos.flatMap((tramo) =>
            agruparEnSegmentos(
              transcripcion.lineas.filter(
                (linea) => linea.inicio >= tramo.desde && linea.inicio <= tramo.hasta
              )
            )
          )
        : agruparEnSegmentos(transcripcion.lineas);

    const sustantivos = opciones.incluirTodo
      ? segmentosSeleccionados
      : segmentosSeleccionados.filter((seg) => esTweetSustantivo(seg.texto));

    const limitados = sustantivos.slice(0, opciones.maxSegmentos);
    const rolFinal =
      opciones.rol || `${inferirRolPorFecha(fechaFinal)} (${transcripcion.canal})`;

    console.log(
      `[Ingesta Debates] ${transcripcion.titulo} | origen=${transcripcion.origen} | fecha=${fechaFinal} | líneas=${transcripcion.lineas.length} | segmentos=${limitados.length}`
    );

    for (const seg of limitados) {
      const inicioSeg = Math.max(0, Math.floor(seg.inicio));
      registrosCrudos.push({
        id: `yt-${transcripcion.videoId}-t${inicioSeg}`,
        fecha: fechaFinal,
        texto: seg.texto,
        url: construirUrlConTiempo(transcripcion.videoId, inicioSeg),
        rol: rolFinal,
        tipoMedio: opciones.tipoMedio,
      });

      if (opciones.dryRun) {
        console.log(
          `  [${formatearMmSs(inicioSeg)}] (${construirUrlConTiempo(
            transcripcion.videoId,
            inicioSeg
          )}) ${seg.texto.slice(0, 120)}${seg.texto.length > 120 ? '...' : ''}`
        );
      }
    }
  }

  const resultado = await incorporarRegistrosAlArchivo(registrosCrudos, opciones.dryRun);
  console.log(
    `[Ingesta Debates] Clasificados: ${resultado.clasificados} | Nuevos agregados: ${resultado.agregados} | Duplicados omitidos: ${resultado.omitidosDuplicados} | Total en archivo: ${resultado.total}`
  );
  if (opciones.dryRun) {
    console.log('[Ingesta Debates] Modo --dry-run activo: no se modificó src/data/archivo-dichos.json.');
  }
}

ejecutarIngestaDebates().catch((err) => {
  console.error('[Ingesta Debates] Error fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
