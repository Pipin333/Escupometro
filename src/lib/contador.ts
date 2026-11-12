import type { Escupo, CategoriaEscupo } from '../types/escupo';

/**
 * Obtiene la fecha actual en huso horario de Chile (`America/Santiago`) en formato `YYYY-MM-DD`,
 * evitando desfasar el contador tras las 21:00 horas respecto a UTC.
 *
 * @param fecha Instante de referencia (por defecto, la hora actual).
 * @returns Fecha local chilena en formato `YYYY-MM-DD`.
 */
export function obtenerFechaHoySantiago(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

/**
 * Calcula la diferencia en días enteros entre dos fechas en formato YYYY-MM-DD.
 * @param fechaInicio Fecha inicial en formato YYYY-MM-DD
 * @param fechaFin Fecha final en formato YYYY-MM-DD
 * @returns Número de días transcurridos
 */
export function calcularDiasEntreFechas(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(`${fechaInicio}T00:00:00Z`);
  const fin = new Date(`${fechaFin}T00:00:00Z`);
  const milisegundosPorDia = 1000 * 60 * 60 * 24;
  const diferencia = Math.floor((fin.getTime() - inicio.getTime()) / milisegundosPorDia);
  return Math.max(0, diferencia);
}

/**
 * Obtiene el incidente más reciente según la fecha del incidente.
 * @param lista Lista de incidentes
 * @returns El incidente más reciente o null si está vacía
 */
export function obtenerUltimoIncidente(lista: Escupo[]): Escupo | null {
  if (!lista || lista.length === 0) return null;
  const ordenada = [...lista].sort((a, b) => 
    new Date(b.fechaIncidente).getTime() - new Date(a.fechaIncidente).getTime()
  );
  return ordenada[0];
}

/**
 * Calcula los días transcurridos desde el último incidente hasta una fecha de referencia.
 * @param lista Lista de incidentes
 * @param fechaHoy Fecha de referencia (YYYY-MM-DD)
 * @returns Número de días transcurridos desde el último incidente
 */
export function calcularDiasSinEscupo(lista: Escupo[], fechaHoy: string): number {
  const ultimo = obtenerUltimoIncidente(lista);
  if (!ultimo) return 0;
  return calcularDiasEntreFechas(ultimo.fechaIncidente, fechaHoy);
}

/**
 * Calcula el récord histórico de días consecutivos sin incidentes.
 * @param lista Lista de incidentes
 * @param diasActuales Días acumulados en el periodo actual
 * @returns Máximo de días sin incidentes
 */
export function calcularRecordHistorico(lista: Escupo[], diasActuales: number): number {
  const recordsPrevios = lista.map((e) => e.diasSinEscupoPrevios || 0);
  const maxPrevio = recordsPrevios.length > 0 ? Math.max(...recordsPrevios) : 0;
  return Math.max(maxPrevio, diasActuales);
}

/**
 * Filtra los incidentes por categoría y término de búsqueda de texto.
 * @param lista Lista completa de incidentes
 * @param categoria Categoría seleccionada o 'todas'
 * @param busqueda Texto de búsqueda libre
 * @returns Lista filtrada
 */
export function filtrarIncidentes(
  lista: Escupo[],
  categoria: CategoriaEscupo | 'todas',
  busqueda: string
): Escupo[] {
  const query = busqueda.trim().toLowerCase();
  
  return lista.filter((item) => {
    const coincideCategoria = categoria === 'todas' || item.categoria === categoria;
    if (!coincideCategoria) return false;
    
    if (!query) return true;
    
    const textoBuscar = [
      item.titulo,
      item.pasado.cita,
      item.presente.titulo,
      item.presente.descripcion,
      item.presente.impacto,
      item.veredictoSatirico,
      item.pasado.rol,
    ].join(' ').toLowerCase();

    return textoBuscar.includes(query);
  });
}
