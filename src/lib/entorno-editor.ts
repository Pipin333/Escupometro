export interface ContextoNavegador {
  isDev: boolean;
  search: string;
  hash: string;
}

/**
 * Determina si la vista editorial interna (`Mesa de Redacción`) debe exponerse en la interfaz.
 * En desarrollo local siempre está activa; en despliegues estáticos públicos requiere
 * habilitarla explícitamente mediante `?editor=1`, `?redaccion=1` o `#redaccion`.
 *
 * @param contexto Parámetros de entorno y URL actual.
 * @returns `true` si el modo redacción está habilitado.
 */
export function puedeAccederRedaccion(contexto: ContextoNavegador): boolean {
  if (contexto.isDev) {
    return true;
  }

  const params = new URLSearchParams(contexto.search);
  if (params.get('editor') === '1' || params.get('redaccion') === '1') {
    return true;
  }

  const hashLimpio = contexto.hash.toLowerCase();
  return hashLimpio === '#redaccion' || hashLimpio === '#editor';
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
