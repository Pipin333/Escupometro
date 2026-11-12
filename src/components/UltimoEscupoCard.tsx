import React from 'react';
import { ArrowDownRight, Calendar, ExternalLink, Quote, Sparkles } from 'lucide-react';
import type { Escupo } from '../types/escupo';

interface UltimoEscupoCardProps {
  incidente: Escupo;
}

/**
 * Tarjeta de contraste destacado para el último escupo que provocó el reinicio del contador.
 */
export const UltimoEscupoCard: React.FC<UltimoEscupoCardProps> = ({ incidente }) => {
  return (
    <section aria-labelledby="titulo-ultimo-incidente" className="my-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-red-400" aria-hidden="true" />
        <h3 id="titulo-ultimo-incidente" className="text-lg sm:text-xl font-bold text-slate-100 uppercase tracking-wide">
          Último Incidente Registrado (El que reseteó el marcador)
        </h3>
      </div>

      <div className="border border-red-500/40 bg-gradient-to-b from-red-950/20 to-slate-900 rounded-2xl p-5 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 border-b border-slate-800 pb-4">
          <span className="text-xs font-mono uppercase bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1 rounded-full font-bold">
            Impacto Nivel: {incidente.gravedad}
          </span>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 font-mono">
            <Calendar className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Fecha del impacto: <strong className="text-slate-200">{incidente.fechaIncidente}</strong></span>
          </div>
        </div>

        <h4 className="text-lg sm:text-2xl font-bold text-slate-100 mb-6">
          {incidente.titulo}
        </h4>

        {/* Comparativa Lado a Lado (Pasado vs Presente) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative">
          {/* LADO A: EL ESCUPO AL CIELO (PASADO) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-amber-400 mb-3 pb-2 border-b border-slate-900">
                <span className="font-bold flex items-center gap-1.5 uppercase">
                  <Quote className="w-3.5 h-3.5" aria-hidden="true" />
                  El Escupo al Cielo (Pasado)
                </span>
                <span className="text-slate-400">{incidente.pasado.fecha}</span>
              </div>

              <div className="text-xs text-slate-400 mb-2 font-mono">
                Rol: <span className="text-slate-200">{incidente.pasado.rol}</span>
                {incidente.pasado.usuarioTweet && (
                  <span className="text-blue-400 ml-1.5">({incidente.pasado.usuarioTweet})</span>
                )}
              </div>

              <blockquote className="text-sm sm:text-base text-slate-200 italic leading-relaxed pl-3 border-l-2 border-amber-500/50 my-3">
                «{incidente.pasado.cita}»
              </blockquote>
            </div>

            {incidente.pasado.fuenteUrl && (
              <a
                href={incidente.pasado.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 mt-3 pt-2 border-t border-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 w-fit"
              >
                <span>Ver fuente original</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {/* LADO B: EL IMPACTO EN LA CARA (PRESENTE) */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-red-400 mb-3 pb-2 border-b border-red-950/60">
                <span className="font-bold flex items-center gap-1.5 uppercase">
                  <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                  El Aterrizaje Forzoso (Hecho)
                </span>
                <span className="text-slate-400">{incidente.presente.fecha}</span>
              </div>

              <h5 className="text-sm sm:text-base font-semibold text-slate-100 mb-2">
                {incidente.presente.titulo}
              </h5>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
                {incidente.presente.descripcion}
              </p>

              <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-2.5 text-xs text-red-200">
                <strong className="text-red-300 font-semibold">Impacto en la realidad: </strong>
                {incidente.presente.impacto}
              </div>
            </div>

            {incidente.presente.fuenteUrl && (
              <a
                href={incidente.presente.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 mt-3 pt-2 border-t border-red-950/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 w-fit"
              >
                <span>Comprobar noticia en prensa</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {/* Veredicto Satírico */}
        <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-xs font-mono uppercase bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded font-bold whitespace-nowrap">
            Veredicto de la Física Salival:
          </span>
          <p className="text-sm sm:text-base text-slate-200 font-medium italic">
            "{incidente.veredictoSatirico}"
          </p>
        </div>
      </div>
    </section>
  );
};
