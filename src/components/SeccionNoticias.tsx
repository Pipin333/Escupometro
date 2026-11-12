import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { NoticiaScrapeada } from '../types/escupo';
import {
  filtrarNoticiasPorMedioYTexto,
  formatearTiempoRelativo,
  obtenerMediosDisponibles,
} from '../lib/noticias';

interface SeccionNoticiasProps {
  noticias: readonly NoticiaScrapeada[];
  cargando: boolean;
  error: string | null;
  actualizadoEn: string | null;
  esFallbackEstatico: boolean;
  onRecargar: () => void;
}

const formatearHoraLocal = (iso: string | null): string => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
};

export const SeccionNoticias: React.FC<SeccionNoticiasProps> = ({
  noticias,
  cargando,
  error,
  actualizadoEn,
  esFallbackEstatico,
  onRecargar,
}) => {
  const [medioSeleccionado, setMedioSeleccionado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  const mediosDisponibles = useMemo(
    () => obtenerMediosDisponibles(noticias),
    [noticias],
  );

  const noticiasFiltradas = useMemo(
    () => filtrarNoticiasPorMedioYTexto(noticias, medioSeleccionado, busqueda),
    [noticias, medioSeleccionado, busqueda],
  );

  const limpiarFiltros = () => {
    setMedioSeleccionado('todos');
    setBusqueda('');
  };

  return (
    <section aria-labelledby="titulo-seccion-noticias" className="py-10">
      <div className="border-b border-[#dcd7cc] pb-6 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b91c1c] mb-1">
            Monitor de Prensa Chilena
          </p>
          <h1
            id="titulo-seccion-noticias"
            className="font-editorial text-3xl sm:text-4xl font-bold text-[#141413]"
          >
            Noticias Políticas en Vivo
          </h1>
          <p className="mt-2 text-sm text-[#4a4843] max-w-2xl">
            Titulares filtrados por relevancia política nacional desde feeds RSS públicos
            de medios chilenos. Cada enlace dirige a la nota original en su medio.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          <button
            type="button"
            onClick={onRecargar}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#141413] bg-[#ffffff] text-[#141413] text-xs sm:text-sm font-medium hover:bg-[#141413] hover:text-[#ffffff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{cargando ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
          <p className="text-xs font-tabular text-[#4a4843]">
            Actualizado {formatearHoraLocal(actualizadoEn)} · Refresco automático cada 15 min
          </p>
        </div>
      </div>

      {esFallbackEstatico && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-[#dcd7cc] bg-[#efeae0] px-4 py-3 text-xs sm:text-sm text-[#141413] flex items-center justify-between gap-3"
        >
          <span>
            Mostrando el archivo estático local de noticias (el endpoint en vivo{' '}
            <code className="font-mono text-xs">/api/rss</code> no está disponible en este
            alojamiento).
          </span>
          <button
            type="button"
            onClick={onRecargar}
            className="text-xs font-semibold underline hover:text-[#b91c1c] whitespace-nowrap"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="relative">
          <label htmlFor="busqueda-noticias" className="sr-only">
            Buscar titulares o medios
          </label>
          <Search
            className="w-4 h-4 text-[#4a4843] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="busqueda-noticias"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por titular, bajada o medio..."
            className="w-full rounded-lg border border-[#dcd7cc] bg-[#ffffff] pl-10 pr-10 py-2.5 text-sm text-[#141413] placeholder:text-[#6e6a63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4843] hover:text-[#141413] p-1"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filtrar noticias por medio"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setMedioSeleccionado('todos')}
            aria-pressed={medioSeleccionado === 'todos'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
              medioSeleccionado === 'todos'
                ? 'bg-[#141413] text-[#ffffff] border-[#141413]'
                : 'bg-[#ffffff] text-[#4a4843] border-[#dcd7cc] hover:border-[#141413] hover:text-[#141413]'
            }`}
          >
            Todos ({noticias.length})
          </button>

          {mediosDisponibles.map((medio) => {
            const activo = medioSeleccionado === medio;
            return (
              <button
                key={medio}
                type="button"
                onClick={() => setMedioSeleccionado(medio)}
                aria-pressed={activo}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
                  activo
                    ? 'bg-[#141413] text-[#ffffff] border-[#141413]'
                    : 'bg-[#ffffff] text-[#4a4843] border-[#dcd7cc] hover:border-[#141413] hover:text-[#141413]'
                }`}
              >
                {medio}
              </button>
            );
          })}
        </div>
      </div>

      {cargando && noticias.length === 0 ? (
        <div
          aria-busy="true"
          aria-label="Cargando noticias de prensa chilena"
          className="space-y-3"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-lg border border-[#dcd7cc] bg-[#ffffff] p-5 animate-pulse"
            >
              <div className="h-3 w-28 bg-[#efeae0] rounded mb-3" />
              <div className="h-5 w-4/5 bg-[#efeae0] rounded mb-2" />
              <div className="h-3.5 w-3/5 bg-[#efeae0] rounded" />
            </div>
          ))}
        </div>
      ) : error && noticias.length === 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-[#b91c1c]/40 bg-[#ffffff] p-8 text-center space-y-3"
        >
          <AlertCircle className="w-8 h-8 text-[#b91c1c] mx-auto" aria-hidden="true" />
          <h2 className="font-editorial text-xl font-bold text-[#141413]">
            Error al consultar los feeds RSS
          </h2>
          <p className="text-sm text-[#4a4843] max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={onRecargar}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#141413] text-[#ffffff] text-sm font-medium hover:bg-[#2a2926] transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : noticiasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-[#dcd7cc] bg-[#ffffff] p-8 text-center space-y-3">
          <Newspaper className="w-8 h-8 text-[#4a4843] mx-auto" aria-hidden="true" />
          <h2 className="font-editorial text-xl font-bold text-[#141413]">
            Sin coincidencias para este filtro
          </h2>
          <p className="text-sm text-[#4a4843]">
            No hay titulares que coincidan con la búsqueda o el medio seleccionado.
          </p>
          {(medioSeleccionado !== 'todos' || busqueda) && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#141413] text-sm font-medium text-[#141413] hover:bg-[#141413] hover:text-[#ffffff] transition-colors"
            >
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {noticiasFiltradas.map((noticia) => (
            <li key={noticia.id}>
              <article className="rounded-lg border border-[#dcd7cc] bg-[#ffffff] p-5 hover:border-[#141413] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-tabular text-[#4a4843] mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[#b91c1c]">
                    {noticia.medio}
                  </span>
                  <time dateTime={noticia.publicadoEn ?? noticia.fecha}>
                    {formatearTiempoRelativo(noticia.publicadoEn ?? noticia.fecha)}
                  </time>
                </div>

                <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#141413] leading-snug">
                  <a
                    href={noticia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline inline-flex items-baseline gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] rounded"
                  >
                    <span>{noticia.titulo}</span>
                    <ExternalLink
                      className="w-3.5 h-3.5 text-[#4a4843] flex-shrink-0 translate-y-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </h2>

                {noticia.bajada && (
                  <p className="mt-2 text-sm text-[#4a4843] leading-relaxed">
                    {noticia.bajada}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
