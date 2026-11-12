import fs from 'node:fs/promises';
import path from 'node:path';
import {
  construirDichoHistorico,
  fusionarDichosSinDuplicados,
  type RegistroDichoCrudo,
} from '../../src/motor/clasificador-dichos.js';
import type { DichoHistorico } from '../../src/types/escupo.js';

export const RUTA_ARCHIVO_DICHOS = path.join(process.cwd(), 'src/data/archivo-dichos.json');

export interface ResultadoPersistenciaDichos {
  clasificados: number;
  agregados: number;
  omitidosDuplicados: number;
  total: number;
}

/**
 * Lee el archivo histórico de dichos publicado en `src/data/archivo-dichos.json`.
 *
 * @returns Dichos actualmente indexados.
 */
export async function leerArchivoDichos(): Promise<DichoHistorico[]> {
  const raw = await fs.readFile(RUTA_ARCHIVO_DICHOS, 'utf-8');
  return JSON.parse(raw) as DichoHistorico[];
}

/**
 * Clasifica registros crudos y los fusiona sin duplicados en el archivo histórico.
 *
 * @param registros Registros crudos (tweets, segmentos de debate, etc.).
 * @param dryRun Si es `true`, calcula el resultado sin escribir en disco.
 * @returns Conteos de clasificación, incorporación y duplicados.
 */
export async function incorporarRegistrosAlArchivo(
  registros: RegistroDichoCrudo[],
  dryRun: boolean
): Promise<ResultadoPersistenciaDichos> {
  const clasificados: DichoHistorico[] = [];
  for (const registro of registros) {
    const dicho = construirDichoHistorico(registro);
    if (dicho) clasificados.push(dicho);
  }

  const actuales = await leerArchivoDichos();
  const fusion = fusionarDichosSinDuplicados(actuales, clasificados);

  if (!dryRun && fusion.agregados > 0) {
    await fs.writeFile(
      RUTA_ARCHIVO_DICHOS,
      `${JSON.stringify(fusion.dichos, null, 2)}\n`,
      'utf-8'
    );
  }

  return {
    clasificados: clasificados.length,
    agregados: fusion.agregados,
    omitidosDuplicados: fusion.omitidosDuplicados,
    total: fusion.dichos.length,
  };
}
