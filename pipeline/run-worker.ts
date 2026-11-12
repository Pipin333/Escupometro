import fs from 'node:fs/promises';
import path from 'node:path';
import { scrapearPrensaChilena } from './scrapers/rss-prensa';
import { detectarContradiccionesEnLote } from '../src/motor/detector';
import { verificarConLLM } from './motor/llm-verifier';
import type { DichoHistorico } from '../src/types/escupo';

const ROOT_DIR = process.cwd();
const DICHOS_PATH = path.join(ROOT_DIR, 'src/data/archivo-dichos.json');
const NOTICIAS_PATH = path.join(ROOT_DIR, 'src/data/noticias-recientes.json');
const CANDIDATOS_PATH = path.join(ROOT_DIR, 'src/data/candidatos.json');

async function ejecutarWorker(): Promise<void> {
  console.log('[Worker] Iniciando ingesta de prensa chilena...');
  const dichosRaw = await fs.readFile(DICHOS_PATH, 'utf-8');
  const dichos = JSON.parse(dichosRaw) as DichoHistorico[];

  const { noticias, errores } = await scrapearPrensaChilena();
  if (errores.length > 0) {
    console.warn('[Worker] Advertencias de scraping:', errores);
  }
  console.log(`[Worker] Noticias políticas recolectadas: ${noticias.length}`);

  // Persistir últimas 30 noticias recolectadas para inspección en Mesa de Redacción
  await fs.writeFile(
    NOTICIAS_PATH,
    JSON.stringify(noticias.slice(0, 30), null, 2),
    'utf-8'
  );

  // Ejecutar Motor de Detección Determinista
  const candidatosIniciales = detectarContradiccionesEnLote(noticias, dichos, 42);
  console.log(`[Motor] Candidatos preliminares detectados: ${candidatosIniciales.length}`);

  // Refinar los top 8 con LLM si hay configuración en entorno (.env)
  const candidatosRefinados = [];
  for (const candidato of candidatosIniciales.slice(0, 12)) {
    const verificado = await verificarConLLM(candidato);
    candidatosRefinados.push(verificado);
  }

  candidatosRefinados.sort((a, b) => b.scoreContradiccion - a.scoreContradiccion);

  await fs.writeFile(
    CANDIDATOS_PATH,
    JSON.stringify(candidatosRefinados, null, 2),
    'utf-8'
  );

  console.log(`[Worker] Finalizado. Guardados ${candidatosRefinados.length} candidatos en src/data/candidatos.json`);
}

ejecutarWorker().catch((err) => {
  console.error('[Worker] Error fatal:', err);
  process.exit(1);
});
