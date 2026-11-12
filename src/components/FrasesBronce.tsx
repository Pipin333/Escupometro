import React from 'react';
import { ExternalLink, Quote } from 'lucide-react';
import type { FraseBronce } from '../types/escupo';

interface FrasesBronceProps {
  frases: FraseBronce[];
}

/**
 * Sección editorial "Frases para el bronce" con citas textuales destacadas y fuente de prensa.
 */
export const FrasesBronce: React.FC<FrasesBronceProps> = ({ frases }) => {
  return (
    <section
      id="frases-bronce"
      aria-labelledby="titulo-frases-bronce"
      className="py-10 border-t border-[#dcd7cc]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <div>
          <p className="font-tabular text-xs uppercase tracking-[0.12em] text-[#b91c1c] font-semibold">
            Archivo de declaraciones
          </p>
          <h2
            id="titulo-frases-bronce"
            className="font-editorial text-2xl sm:text-3xl font-bold text-[#141413] tracking-[-0.02em]"
          >
            Frases para el bronce
          </h2>
        </div>
        <span className="font-tabular text-xs text-[#4a4843]">
          {frases.length} {frases.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {frases.length === 0 ? (
        <p className="text-sm text-[#4a4843] bg-[#ffffff] border border-[#dcd7cc] rounded-lg p-6">
          Aún no hay frases registradas en esta sección.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {frases.map((item) => (
            <article
              key={item.id}
              className="bg-[#ffffff] border border-[#dcd7cc] rounded-lg p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a4843]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#141413]">{item.autor}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.cargo}</span>
                </div>
                <time
                  dateTime={item.fecha}
                  className="font-tabular px-2 py-0.5 rounded bg-[#efeae0] text-[#141413]"
                >
                  {item.fecha}
                </time>
              </div>

              <blockquote className="relative pl-5 border-l-2 border-[#b91c1c]">
                <Quote
                  className="w-4 h-4 text-[#b91c1c] mb-2"
                  aria-hidden="true"
                />
                <p className="font-editorial text-lg sm:text-xl leading-relaxed text-[#141413]">
                  «{item.cita}»
                </p>
              </blockquote>

              <p className="text-sm text-[#4a4843] leading-relaxed">
                {item.contexto}
              </p>

              <div className="pt-2 border-t border-[#efeae0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a4843]">
                <span>Fuente: {item.medio}</span>
                <a
                  href={item.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#141413] hover:text-[#b91c1c] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] rounded"
                >
                  <span>Ver medio</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
