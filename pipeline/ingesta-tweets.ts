import fs from 'node:fs/promises';
import path from 'node:path';
import {
  esTweetSustantivo,
  type RegistroDichoCrudo,
} from '../src/motor/clasificador-dichos.js';
import {
  incorporarRegistrosAlArchivo,
  leerArchivoDichos,
} from './lib/archivo-dichos.js';
import { cargarEnvLocal, leerValorNpm } from './lib/env.js';
import { ingestarDesdeWayback } from './scrapers/wayback-tweets.js';
import {
  hidratarTweetOEmbed,
  ingestarDesdeArchivoLocal,
  ingestarDesdeSocialData,
  ingestarDesdeXApiV2,
} from './scrapers/x-ingesta.js';

interface OpcionesCliIngesta {
  usuario: string;
  urls: string[];
  archivos: string[];
  maxResultados: number;
  maxPaginas: number;
  usarWayback: boolean;
  desde?: string;
  hasta?: string;
  resumeKey?: string;
  pausaMs?: number;
  prefijoId?: string;
  incluirTodo: boolean;
  dryRun: boolean;
}

const EXTENSIONES_SOPORTADAS = new Set(['.json', '.js', '.csv']);
const ROOT_DIR = process.cwd();
const IMPORTS_DIR = path.join(ROOT_DIR, 'pipeline/imports');

function parsearArgumentos(argv: string[]): OpcionesCliIngesta {
  const opciones: OpcionesCliIngesta = {
    usuario:
      leerValorNpm('usuario') ||
      process.env.X_TARGET_USER?.trim() ||
      'joseantoniokast',
    urls: [],
    archivos: [],
    maxResultados: 500,
    maxPaginas: 10,
    usarWayback: process.env.npm_config_wayback === 'true',
    desde: leerValorNpm('desde'),
    hasta: leerValorNpm('hasta'),
    resumeKey: leerValorNpm('resume_key'),
    prefijoId: leerValorNpm('prefijo'),
    incluirTodo: process.env.npm_config_incluir_todo === 'true',
    dryRun: process.env.npm_config_dry_run === 'true',
  };

  const maxNpm = leerValorNpm('max');
  if (maxNpm) {
    const parsed = Number.parseInt(maxNpm, 10);
    if (Number.isFinite(parsed) && parsed > 0) opciones.maxResultados = parsed;
  }
  const urlNpm = leerValorNpm('url');
  if (urlNpm) {
    opciones.urls.push(urlNpm);
  }
  const archivoNpm = leerValorNpm('archivo');
  if (archivoNpm) {
    opciones.archivos.push(path.resolve(ROOT_DIR, archivoNpm));
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const valor = argv[i + 1];

    if (arg.startsWith('--usuario=')) {
      const v = arg.slice('--usuario='.length).trim();
      if (v) opciones.usuario = v;
    } else if (arg === '--usuario' && valor) {
      opciones.usuario = valor;
      i += 1;
    } else if (arg.startsWith('--url=')) {
      const v = arg.slice('--url='.length).trim();
      if (v) opciones.urls.push(v);
    } else if (arg === '--url' && valor) {
      opciones.urls.push(valor);
      i += 1;
    } else if (arg.startsWith('--archivo=')) {
      const v = arg.slice('--archivo='.length).trim();
      if (v) opciones.archivos.push(path.resolve(ROOT_DIR, v));
    } else if (arg === '--archivo' && valor) {
      opciones.archivos.push(path.resolve(ROOT_DIR, valor));
      i += 1;
    } else if (arg.startsWith('--max=')) {
      const parsed = Number.parseInt(arg.slice('--max='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) opciones.maxResultados = parsed;
    } else if (arg === '--max' && valor) {
      const parsed = Number.parseInt(valor, 10);
      if (Number.isFinite(parsed) && parsed > 0) opciones.maxResultados = parsed;
      i += 1;
    } else if (arg.startsWith('--paginas=')) {
      const parsed = Number.parseInt(arg.slice('--paginas='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) opciones.maxPaginas = parsed;
    } else if (arg === '--paginas' && valor) {
      const parsed = Number.parseInt(valor, 10);
      if (Number.isFinite(parsed) && parsed > 0) opciones.maxPaginas = parsed;
      i += 1;
    } else if (arg === '--wayback') {
      opciones.usarWayback = true;
    } else if (arg.startsWith('--desde=')) {
      opciones.desde = arg.slice('--desde='.length).trim() || undefined;
    } else if (arg === '--desde' && valor) {
      opciones.desde = valor.trim();
      i += 1;
    } else if (arg.startsWith('--hasta=')) {
      opciones.hasta = arg.slice('--hasta='.length).trim() || undefined;
    } else if (arg === '--hasta' && valor) {
      opciones.hasta = valor.trim();
      i += 1;
    } else if (arg.startsWith('--resume-key=')) {
      opciones.resumeKey = arg.slice('--resume-key='.length).trim() || undefined;
    } else if (arg === '--resume-key' && valor) {
      opciones.resumeKey = valor.trim();
      i += 1;
    } else if (arg.startsWith('--pausa-ms=')) {
      const parsed = Number.parseInt(arg.slice('--pausa-ms='.length), 10);
      if (Number.isFinite(parsed) && parsed >= 0) opciones.pausaMs = parsed;
    } else if (arg.startsWith('--prefijo=')) {
      opciones.prefijoId = arg.slice('--prefijo='.length).trim() || undefined;
    } else if (arg === '--prefijo' && valor) {
      opciones.prefijoId = valor.trim();
      i += 1;
    } else if (arg === '--incluir-todo') {
      opciones.incluirTodo = true;
    } else if (arg === '--dry-run') {
      opciones.dryRun = true;
    } else if (/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i.test(arg)) {
      opciones.urls.push(arg);
    } else if (
      !arg.startsWith('-') &&
      EXTENSIONES_SOPORTADAS.has(path.extname(arg).toLowerCase())
    ) {
      opciones.archivos.push(path.resolve(ROOT_DIR, arg));
    } else if (
      process.env.npm_config_max === 'true' &&
      /^\d+$/.test(arg)
    ) {
      const parsed = Number.parseInt(arg, 10);
      if (Number.isFinite(parsed) && parsed > 0) opciones.maxResultados = parsed;
    }
  }

  return opciones;
}

async function listarArchivosImports(): Promise<string[]> {
  try {
    const entradas = await fs.readdir(IMPORTS_DIR, { withFileTypes: true });
    return entradas
      .filter(
        (entry) =>
          entry.isFile() &&
          EXTENSIONES_SOPORTADAS.has(path.extname(entry.name).toLowerCase())
      )
      .map((entry) => path.join(IMPORTS_DIR, entry.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Orquesta la recolección histórica de tweets desde fuentes autorizadas y exportaciones
 * locales, los clasifica y los consolida sin duplicados en `src/data/archivo-dichos.json`.
 */
async function ejecutarIngestaTweets(): Promise<void> {
  await cargarEnvLocal(ROOT_DIR);
  const opciones = parsearArgumentos(process.argv.slice(2));

  console.log(`[Ingesta X] Objetivo configurado: @${opciones.usuario.replace(/^@/, '')}`);

  const archivosEnImports = await listarArchivosImports();
  const todosLosArchivos = [...new Set([...opciones.archivos, ...archivosEnImports])];
  const bearerToken = process.env.X_BEARER_TOKEN?.trim() || '';
  const socialDataKey = process.env.SOCIALDATA_API_KEY?.trim() || '';

  const hayAlgunaFuente =
    opciones.usarWayback ||
    opciones.urls.length > 0 ||
    todosLosArchivos.length > 0 ||
    bearerToken !== '' ||
    socialDataKey !== '';

  if (!hayAlgunaFuente) {
    console.log(
      '[Ingesta X] X/Twitter bloquea el scraping masivo anónimo tras muros de login y API paga.'
    );
    console.log(
      '[Ingesta X] No se detectaron archivos en pipeline/imports/ ni credenciales en .env.'
    );
    console.log('Opciones listas para ingestar tweets históricos:');
    console.log('  1. Wayback Machine (gratis y público): npm run ingesta:wayback -- --max 25 --dry-run');
    console.log('  2. Exportación local (.json / tweets.js / .csv): guárdala en pipeline/imports/');
    console.log('  3. X API v2 oficial: define X_BEARER_TOKEN en .env');
    console.log('  4. SocialData API: define SOCIALDATA_API_KEY en .env');
    console.log(
      '  5. URL individual pública (oEmbed sin clave): npm run ingesta:tweets https://x.com/joseantoniokast/status/ID'
    );
    return;
  }

  const registrosCrudos: RegistroDichoCrudo[] = [];

  if (opciones.usarWayback) {
    const existentes = await leerArchivoDichos();
    const idsExistentes = new Set(existentes.map((d) => d.id));
    const limiteWayback = opciones.maxResultados === 500 ? 40 : opciones.maxResultados;

    console.log(
      `[Ingesta X] Consultando Wayback Machine (máx. ${limiteWayback} tweets nuevos${
        opciones.desde ? `, desde ${opciones.desde}` : ''
      }${opciones.hasta ? `, hasta ${opciones.hasta}` : ''})...`
    );

    const resultadoWb = await ingestarDesdeWayback(opciones.usuario, {
      desde: opciones.desde,
      hasta: opciones.hasta,
      maxTweets: limiteWayback,
      resumeKey: opciones.resumeKey,
      pausaMs: opciones.pausaMs,
      prefijoId: opciones.prefijoId,
      idsExistentes,
    });

    for (const err of resultadoWb.errores) console.warn(`[Ingesta X] Wayback: ${err}`);
    console.log(
      `[Ingesta X] Wayback: ${resultadoWb.tweetsDescubiertos} URLs en índice CDX | ${resultadoWb.capturasConsultadas} capturas leídas | ${resultadoWb.registros.length} tweets recuperados`
    );
    if (resultadoWb.resumeKeySiguiente) {
      console.log(
        `[Ingesta X] Para continuar paginando Wayback usa: --resume-key "${resultadoWb.resumeKeySiguiente}"`
      );
    }
    registrosCrudos.push(...resultadoWb.registros);
  }

  for (const url of opciones.urls) {
    const hidratado = await hidratarTweetOEmbed(url);
    if (hidratado) {
      registrosCrudos.push(hidratado);
      console.log(`[Ingesta X] oEmbed hidratado: ${url}`);
    } else {
      console.warn(`[Ingesta X] No se pudo hidratar vía oEmbed: ${url}`);
    }
  }

  for (const rutaArchivo of todosLosArchivos) {
    const resultado = await ingestarDesdeArchivoLocal(rutaArchivo, opciones.usuario);
    for (const err of resultado.errores) console.warn(`[Ingesta X] ${err}`);
    console.log(
      `[Ingesta X] ${resultado.fuente}: ${resultado.registros.length} filas leídas`
    );
    registrosCrudos.push(...resultado.registros);
  }

  if (bearerToken) {
    const resultado = await ingestarDesdeXApiV2(
      opciones.usuario,
      bearerToken,
      opciones.maxResultados
    );
    for (const err of resultado.errores) console.warn(`[Ingesta X] ${err}`);
    console.log(`[Ingesta X] X API v2: ${resultado.registros.length} tweets obtenidos`);
    registrosCrudos.push(...resultado.registros);
  }

  if (socialDataKey) {
    const resultado = await ingestarDesdeSocialData(
      opciones.usuario,
      socialDataKey,
      opciones.maxPaginas
    );
    for (const err of resultado.errores) console.warn(`[Ingesta X] ${err}`);
    console.log(`[Ingesta X] SocialData: ${resultado.registros.length} tweets obtenidos`);
    registrosCrudos.push(...resultado.registros);
  }

  const filtrados = opciones.incluirTodo
    ? registrosCrudos
    : registrosCrudos.filter((registro) => esTweetSustantivo(registro.texto));

  const omitidosRuido = registrosCrudos.length - filtrados.length;
  const resultado = await incorporarRegistrosAlArchivo(filtrados, opciones.dryRun);

  console.log(
    `[Ingesta X] Crudos: ${registrosCrudos.length} | Descartados por ruido/RT: ${omitidosRuido} | Clasificados: ${resultado.clasificados}`
  );
  console.log(
    `[Ingesta X] Nuevos agregados: ${resultado.agregados} | Duplicados omitidos: ${resultado.omitidosDuplicados} | Total en archivo: ${resultado.total}`
  );

  if (opciones.dryRun) {
    for (const r of filtrados.slice(0, 10)) {
      console.log(
        `  [${r.fecha}] ${r.texto.slice(0, 110)}${r.texto.length > 110 ? '...' : ''}`
      );
    }
    console.log('[Ingesta X] Modo --dry-run activo: no se modificó src/data/archivo-dichos.json.');
  } else if (resultado.agregados > 0) {
    console.log('[Ingesta X] Archivo histórico actualizado en src/data/archivo-dichos.json.');
  } else {
    console.log('[Ingesta X] Sin cambios nuevos para persistir.');
  }
}

ejecutarIngestaTweets().catch((err) => {
  console.error('[Ingesta X] Error fatal:', err);
  process.exit(1);
});
