import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Carga variables desde `.env` en la raíz del proyecto hacia `process.env`
 * sin sobrescribir variables ya definidas por el entorno o CI.
 *
 * @param rootDir Directorio raíz donde buscar `.env`.
 */
export async function cargarEnvLocal(rootDir = process.cwd()): Promise<void> {
  const envPath = path.join(rootDir, '.env');
  let contenido = '';
  try {
    contenido = await fs.readFile(envPath, 'utf-8');
  } catch {
    return;
  }

  for (const lineaCruda of contenido.split(/\r?\n/)) {
    const linea = lineaCruda.trim();
    if (!linea || linea.startsWith('#')) continue;

    const separador = linea.indexOf('=');
    if (separador <= 0) continue;

    const clave = linea.slice(0, separador).trim();
    let valor = linea.slice(separador + 1).trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    if (clave && process.env[clave] === undefined) {
      process.env[clave] = valor;
    }
  }
}

/**
 * Lee el valor textual de una bandera `--clave=valor` pasada vía `npm run` sin confundir
 * indicadores booleanos (`"true"`/`"false"`) con valores reales cuando PowerShell omite `--`.
 *
 * @param nombreNombre Clave en formato snake_case tras `npm_config_`.
 * @returns Valor textual limpio o `undefined`.
 */
export function leerValorNpm(nombreClave: string): string | undefined {
  const raw = process.env[`npm_config_${nombreClave}`]?.trim();
  if (!raw || raw === 'true' || raw === 'false') return undefined;
  return raw;
}

