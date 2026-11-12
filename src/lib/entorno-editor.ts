export interface ContextoNavegador {
  isDev: boolean;
  search: string;
  hash: string;
}

/**
 * Determina si la vista editorial interna (`Mesa de Redacción`) debe exponerse en la interfaz.
 * Está habilitada únicamente en desarrollo local (`import.meta.env.DEV === true`),
 * bloqueando cualquier desbloqueo por URL/hash en compilaciones de producción.
 *
 * @param contexto Parámetros de entorno y URL actual.
 * @returns `true` únicamente en desarrollo local.
 */
export function puedeAccederRedaccion(contexto: ContextoNavegador): boolean {
  return contexto.isDev === true;
}

/**
 * Resuelve la vista inicial al cargar la aplicación según la URL y permisos de editor.
 *
 * @param contexto Parámetros de entorno y URL actual.
 * @returns `'redaccion'` únicamente si está autorizado y se solicita por URL/hash; si no, `'archivo'`.
 */
export function determinarVistaInicial(
  contexto: ContextoNavegador
): 'archivo' | 'redaccion' {
  if (!puedeAccederRedaccion(contexto)) {
    return 'archivo';
  }

  const params = new URLSearchParams(contexto.search);
  const hashLimpio = contexto.hash.toLowerCase();
  if (params.get('redaccion') === '1' || hashLimpio === '#redaccion') {
    return 'redaccion';
  }

  return 'archivo';
}
