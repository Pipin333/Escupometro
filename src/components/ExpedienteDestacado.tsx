import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Escupo } from '../types/escupo';

interface ExpedienteDestacadoProps {
  incidente: Escupo;
}

/**
 * Presentación en portada del incidente más reciente en formato comparativo editorial de dos columnas.
 */
export const ExpedienteDestacado: React.FC<ExpedienteDestacadoProps> = ({ incidente }) => {
  return (
    <section aria-labelledby="titulo-ultimo-impacto" className="py-8 sm:py-10 border-b border-[#dcd7cc]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <h2 id="titulo-ultimo-impacto" className="text-sm font-semibold uppercase tracking-wider text-[#b91c1c]">
          Último impacto registrado
        </h2>
        <span className="font-tabular text-xs text-[#4a4843]">
          Fecha de impacto: {incidente.fechaIncidente}
        </span>
      </div>

      <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141413] leading-[1.2] tracking-[-0.02em] mb-6 max-w-[42ch]">
        {incidente.titulo}
      </h3>

      {/* Hoja comparativa de dos columnas con divisoria hairline de 1px */}
      <div className="bg-[#ffffff] border border-[#dcd7cc] rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Columna A: El Dicho */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-[#4a4843] pb-3 border-b border-[#dcd7cc]">
                <span className="font-semibold uppercase tracking-wider text-[#141413]">
                  Lo que dijo
                </span>
                <span className="font-tabular">{incidente.pasado.fecha}</span>
              </div>

              <div className="text-xs text-[#4a4843]">
                {incidente.pasado.rol}
                {incidente.pasado.usuarioTweet && (
                  <span className="font-tabular ml-1.5 text-[#141413]">
                    {incidente.pasado.usuarioTweet}
                  </span>
                )}
              </div>

              <blockquote className="font-editorial text-lg sm:text-xl text-[#141413] leading-relaxed">
                «{incidente.pasado.cita}»
              </blockquote>
            </div>

            {incidente.pasado.fuenteUrl && (
              <div className="pt-2">
                <a
                  href={incidente.pasado.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#4a4843] hover:text-[#141413] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
                >
                  <span>Archivo de declaración</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>

          {/* Columna B: El Hecho */}
          <div className="p-6 sm:p-8 border-t md:border-t-0 md:border-l border-[#dcd7cc] flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-[#4a4843] pb-3 border-b border-[#dcd7cc]">
                <span className="font-semibold uppercase tracking-wider text-[#b91c1c]">
                  Lo que ocurrió
                </span>
                <span className="font-tabular">{incidente.presente.fecha}</span>
              </div>

              <h4 className="font-semibold text-base sm:text-lg text-[#141413] leading-snug">
                {incidente.presente.titulo}
              </h4>

              <p className="text-sm text-[#4a4843] leading-relaxed max-w-[65ch]">
                {incidente.presente.descripcion}
              </p>

              <p className="text-sm text-[#141413] pt-1">
                <span className="font-semibold">Consecuencia: </span>
                {incidente.presente.impacto}
              </p>
            </div>

            {incidente.presente.fuenteUrl && (
              <div className="pt-2">
                <a
                  href={incidente.presente.fuenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#b91c1c] hover:text-[#991b1b] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]"
                >
                  <span>
                    Leer en {incidente.presente.medio || 'prensa'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Pie editorial único */}
        <div className="px-6 sm:px-8 py-4 bg-[#efeae0]/60 border-t border-[#dcd7cc]">
          <p className="font-editorial italic text-sm sm:text-base text-[#141413]">
            {incidente.veredictoSatirico}
          </p>
        </div>
      </div>
    </section>
  );
};
