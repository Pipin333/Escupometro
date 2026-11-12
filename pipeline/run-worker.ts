import fs from 'node:fs/promises';
import path from 'node:path';
import { scrapearPrensaChilena } from './scrapers/rss-prensa';
import { detectarContradiccionesEnLote } from '../src/motor/detector';
import { verificarConLLM } from './motor/llm-verifier';
import { cargarEnvLocal } from './lib/env';
import type {
  CandidatoContradiccion,
  DichoHistorico,
} from '../src/types/escupo';

const ROOT_DIR = process.cwd();
const DICHOS_PATH = path.join(ROOT_DIR, 'src/data/archivo-dichos.json');
const NOTICIAS_PATH = path.join(ROOT_DIR, 'src/data/noticias-recientes.json');
const CANDIDATOS_PATH = path.join(ROOT_DIR, 'src/data/candidatos.json');

interface OpcionesWorker {
  watch: boolean;
  intervaloMinutos: number;
}

function parsearOpcionesWorker(argv: string[]): OpcionesWorker {
  const envMinutos = Number.parseInt(
    process.env.npm_config_interval ?? process.env.WORKER_INTERVAL_MINUTES ?? '',
    10
  );
  let intervaloMinutos =
    Number.isFinite(envMinutos) && envMinutos > 0 ? envMinutos : 30;
  let watch = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--watch') {
      watch = true;
    } else if (arg.startsWith('--interval=')) {
      const parsed = Number.parseInt(arg.slice('--interval='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        intervaloMinutos = parsed;
      }
    } else if (arg === '--interval' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        intervaloMinutos = parsed;
      }
      i += 1;
    }
  }

  return { watch, intervaloMinutos };
}

async function leerCandidatosPrevios(): Promise<CandidatoContradiccion[]> {
  try {
    const raw = await fs.readFile(CANDIDATOS_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CandidatoContradiccion[]) : [];
  } catch {
    return [];
  }
}

async function ejecutarCicloWorker(): Promise<void> {
  const marcaTiempo = new Date().toISOString();
  console.log(`[Worker ${marcaTiempo}] Iniciando ingesta de prensa chilena...`);

  const dichosRaw = await fs.readFile(DICHOS_PATH, 'utf-8');
  const dichos = JSON.parse(dichosRaw) as DichoHistorico[];
  const candidatosPrevios = await leerCandidatosPrevios();
  const idsPrevios = new Set(candidatosPrevios.map((c) => c.id));

  const { noticias, errores } = await scrapearPrensaChilena();
  if (errores.length > 0) {
    console.warn('[Worker] Advertencias de scraping:', errores);
  }
  console.log(
    `[Worker] Noticias políticas recolectadas: ${noticias.length} (dichos cargados: ${dichos.length})`
  );

  await fs.writeFile(
    NOTICIAS_PATH,
    `${JSON.stringify(noticias.slice(0, 30), null, 2)}\n`,
    'utf-8'
  );

  const candidatosIniciales = detectarContradiccionesEnLote(noticias, dichos, 42);
  console.log(
    `[Motor] Candidatos preliminares detectados: ${candidatosIniciales.length}`
  );

  const candidatosRefinados: CandidatoContradiccion[] = [];
  for (const candidato of candidatosIniciales.slice(0, 12)) {
    const verificado = await verificarConLLM(candidato);
    candidatosRefinados.push(verificado);
  }

  candidatosRefinados.sort(
    (a, b) => b.scoreContradiccion - a.scoreContradiccion
  );

  await fs.writeFile(
    CANDIDATOS_PATH,
    `${JSON.stringify(candidatosRefinados, null, 2)}\n`,
    'utf-8'
  );

  const nuevosCandidatos = candidatosRefinados.filter(
    (c) => !idsPrevios.has(c.id)
  );
  if (nuevosCandidatos.length > 0) {
    console.log(
      `[Worker] Nuevas posibles contradicciones respecto al ciclo anterior: ${nuevosCandidatos.length}`
    );
    for (const nuevo of nuevosCandidatos.slice(0, 5)) {
      console.log(
        `  - [${nuevo.scoreContradiccion}%] ${nuevo.noticia.titulo} (${nuevo.noticia.medio}) <-> "${nuevo.dicho.cita.slice(0, 72)}..."`
      );
    }
  } else {
    console.log('[Worker] Sin nuevos candidatos respecto al ciclo anterior.');
  }

  console.log(
    `[Worker] Ciclo finalizado. Guardados ${candidatosRefinados.length} candidatos en src/data/candidatos.json`
  );
}

/**
 * Ejecuta el monitoreo RSS una vez o de forma continua (`--watch`) cada N minutos.
 */
async function iniciarWorker(): Promise<void> {
  await cargarEnvLocal(ROOT_DIR);
  const opciones = parsearOpcionesWorker(process.argv.slice(2));

  if (!opciones.watch) {
    await ejecutarCicloWorker();
    return;
  }

  console.log(
    `[Worker] Modo continuo (--watch) activo. Frecuencia: cada ${opciones.intervaloMinutos} minutos.`
  );

  let enEjecucion = false;
  let detenido = false;

  const correrConProteccion = async (): Promise<void> => {
    if (enEjecucion || detenido) return;
    enEjecucion = true;
    try {
      await ejecutarCicloWorker();
    } catch (err) {
      console.error(
        '[Worker] Error transitorio en ciclo continuo (se reintentará en el próximo intervalo):',
        err
      );
    } finally {
      enEjecucion = false;
    }
  };

  await correrConProteccion();

  const timer = setInterval(() => {
    void correrConProteccion();
  }, opciones.intervaloMinutos * 60_000);

  const cerrar = (): void => {
    detenido = true;
    clearInterval(timer);
    console.log('[Worker] Vigilancia RSS detenida limpiamente.');
    process.exit(0);
  };

  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciarWorker().catch((err) => {
  console.error('[Worker] Error fatal:', err);
  process.exit(1);
});
