import React from 'react';
import { ArrowRight, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import type { NoticiaScrapeada } from '../types/escupo';
import { formatearTiempoRelativo } from '../lib/noticias';

interface UltimasNoticiasWidgetProps {
  noticias: readonly NoticiaScrapeada[];
  cargando: boolean;
  error: string | null;
  esFallbackEstatico: boolean;
  onVerTodas: () => void;
  onRecargar: () => void;
}

export const UltimasNoticiasWidget: React.FC<UltimasNoticiasWidgetProps> = ({
  noticias,
  cargando,
  error,
  esFallbackEstatico,
  onVerTodas,
  onRecargar,
}) => {
  const titularesPortada = noticias.slice(0, 5);

  return (
    <section
      aria-labelledby="titulo-ultimas-noticias"
      className="py-10 border-t border-[#dcd7cc]"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b91c1c] mb-1">
            Prensa Política en Vivo
          </p>
          <h2
            id="titulo-ultimas-noticias"
            className="font-editorial text-2xl sm:text-3xl font-bold text-[#141413]"
          >
            Últimas noticias del monitoreo
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-tabular text-[#4a4843]">
            {esFallbackEstatico ? 'Archivo estático' : 'Caché RSS · 15 min'}
          </span>
          <button
            type="button"
            onClick={onVerTodas}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#141413] bg-[#ffffff] text-[#141413] text-xs sm:text-sm font-medium hover:bg-[#141413] hover:text-[#ffffff] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
          >
            <span>Ver todas las noticias</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {cargando && titularesPortada.length === 0 ? (
        <div
          aria-busy="true"
          aria-label="Cargando últimas noticias"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 rounded-lg border border-[#dcd7cc] bg-[#ffffff] p-4 animate-pulse"
            >
              <div className="h-3 w-24 bg-[#efeae0] rounded mb-3" />
              <div className="h-4 w-5/6 bg-[#efeae0] rounded mb-2" />
              <div className="h-3 w-2/3 bg-[#efeae0] rounded" />
            </div>
          ))}
        </div>
      ) : error && titularesPortada.length === 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-[#b91c1c]/30 bg-[#ffffff] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="text-sm text-[#141413]">
            No fue posible cargar los titulares de prensa en este momento.
          </div>
          <button
            type="button"
            onClick={onRecargar}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141413] text-[#ffffff] text-xs font-medium hover:bg-[#2a2926] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      ) : titularesPortada.length === 0 ? (
        <div className="rounded-lg border border-[#dcd7cc] bg-[#ffffff] p-6 flex items-center gap-3 text-sm text-[#4a4843]">
          <Newspaper className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Sin titulares políticos recientes en los feeds monitoreados.</span>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {titularesPortada.map((noticia, idx) => (
            <li
              key={noticia.id}
              className={idx === 0 ? 'md:col-span-2' : undefined}
            >
              <a
                href={noticia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-lg border border-[#dcd7cc] bg-[#ffffff] p-4 hover:border-[#141413] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-tabular text-[#4a4843] mb-1.5">
                  <span className="font-semibold uppercase tracking-wider text-[#b91c1c]">
                    {noticia.medio}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {formatearTiempoRelativo(noticia.publicadoEn ?? noticia.fecha)}
                    <ExternalLink
                      className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </span>
                </div>
                <h3 className="font-editorial text-base sm:text-lg font-bold text-[#141413] group-hover:underline leading-snug">
                  {noticia.titulo}
                </h3>
                {idx === 0 && noticia.bajada && (
                  <p className="mt-1.5 text-sm text-[#4a4843] line-clamp-2">
                    {noticia.bajada}
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
