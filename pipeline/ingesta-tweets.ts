import fs from 'node:fs/promises';
import path from 'node:path';
import {
  construirDichoHistorico,
  esTweetSustantivo,
  fusionarDichosSinDuplicados,
  type RegistroDichoCrudo,
} from '../src/motor/clasificador-dichos';
import type { DichoHistorico } from '../src/types/escupo';
import { cargarEnvLocal } from './lib/env';
import {
  hidratarTweetOEmbed,
  ingestarDesdeArchivoLocal,
  ingestarDesdeSocialData,
  ingestarDesdeXApiV2,
} from './scrapers/x-ingesta';

interface OpcionesCliIngesta {
  usuario: string;
  urls: string[];
  archivos: string[];
  maxResultados: number;
  maxPaginas: number;
  incluirTodo: boolean;
  dryRun: boolean;
}

const EXTENSIONES_SOPORTADAS = new Set(['.json', '.js', '.csv']);
const ROOT_DIR = process.cwd();
const DICHOS_PATH = path.join(ROOT_DIR, 'src/data/archivo-dichos.json');
const IMPORTS_DIR = path.join(ROOT_DIR, 'pipeline/imports');

function parsearArgumentos(argv: string[]): OpcionesCliIngesta {
  const opciones: OpcionesCliIngesta = {
    usuario:
      process.env.npm_config_usuario?.trim() ||
      process.env.X_TARGET_USER?.trim() ||
      'joseantoniokast',
    urls: [],
    archivos: [],
    maxResultados: 500,
    maxPaginas: 10,
    incluirTodo: process.env.npm_config_incluir_todo === 'true',
    dryRun: process.env.npm_config_dry_run === 'true',
  };

  if (process.env.npm_config_url?.trim()) {
    opciones.urls.push(process.env.npm_config_url.trim());
  }
  if (process.env.npm_config_archivo?.trim()) {
    opciones.archivos.push(
      path.resolve(ROOT_DIR, process.env.npm_config_archivo.trim())
    );
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
    console.log('  1. Exportación local (.json / tweets.js / .csv): guárdala en pipeline/imports/');
    console.log('  2. X API v2 oficial: define X_BEARER_TOKEN en .env');
    console.log('  3. SocialData API: define SOCIALDATA_API_KEY en .env');
    console.log(
      '  4. URL individual pública (oEmbed sin clave): npm run ingesta:tweets https://x.com/joseantoniokast/status/ID'
    );
    return;
  }

  const registrosCrudos: RegistroDichoCrudo[] = [];

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
  const clasificados: DichoHistorico[] = [];

  for (const registro of filtrados) {
    const dicho = construirDichoHistorico(registro);
    if (dicho) clasificados.push(dicho);
  }

  const actualesRaw = await fs.readFile(DICHOS_PATH, 'utf-8');
  const actuales = JSON.parse(actualesRaw) as DichoHistorico[];

  const fusion = fusionarDichosSinDuplicados(actuales, clasificados);

  console.log(
    `[Ingesta X] Crudos: ${registrosCrudos.length} | Descartados por ruido/RT: ${omitidosRuido} | Clasificados: ${clasificados.length}`
  );
  console.log(
    `[Ingesta X] Nuevos agregados: ${fusion.agregados} | Duplicados omitidos: ${fusion.omitidosDuplicados} | Total en archivo: ${fusion.dichos.length}`
  );

  if (opciones.dryRun) {
    console.log('[Ingesta X] Modo --dry-run activo: no se modificó src/data/archivo-dichos.json.');
    return;
  }

  if (fusion.agregados > 0) {
    await fs.writeFile(DICHOS_PATH, `${JSON.stringify(fusion.dichos, null, 2)}\n`, 'utf-8');
    console.log('[Ingesta X] Archivo histórico actualizado en src/data/archivo-dichos.json.');
  } else {
    console.log('[Ingesta X] Sin cambios nuevos para persistir.');
  }
}

ejecutarIngestaTweets().catch((err) => {
  console.error('[Ingesta X] Error fatal:', err);
  process.exit(1);
});
