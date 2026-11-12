import React, { useState } from 'react';
import { ThumbsUp, Calendar, ExternalLink, BookOpen, AlertCircle } from 'lucide-react';
import type { Escupo } from '../types/escupo';

interface HistorialEscuposProps {
  incidentes: Escupo[];
}

/**
 * Listado histórico de contradicciones y escupos al cielo documentados.
 */
export const HistorialEscupos: React.FC<HistorialEscuposProps> = ({ incidentes }) => {
  const [votos, setVotos] = useState<Record<string, number>>({});
  const [votados, setVotados] = useState<Record<string, boolean>>({});

  const toggleVoto = (id: string, votosBase = 0) => {
    const yaVotado = votados[id];
    setVotados((prev) => ({ ...prev, [id]: !yaVotado }));
    setVotos((prev) => {
      const actual = prev[id] !== undefined ? prev[id] : votosBase;
      return {
        ...prev,
        [id]: yaVotado ? actual - 1 : actual + 1,
      };
    });
  };

  if (incidentes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" aria-hidden="true" />
        <h3 className="text-lg font-bold text-slate-100 mb-2">
          No se encontraron escupos con estos criterios
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Prueba con otros términos de búsqueda o selecciona otra categoría en el menú superior.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-archivo-historico" className="my-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-5 h-5 text-amber-400" aria-hidden="true" />
        <h3 id="titulo-archivo-historico" className="text-lg sm:text-xl font-bold text-slate-100 uppercase tracking-wide">
          Archivo Histórico de la Ley de Gravedad Retórica
        </h3>
      </div>

      <div className="space-y-6">
        {incidentes.map((item) => {
          const totalVotos = votos[item.id] !== undefined ? votos[item.id] : (item.votosComunidad || 0);
          const haVotado = !!votados[item.id];

          return (
            <article
              key={item.id}
              className="border border-slate-800 bg-slate-900/90 rounded-2xl p-5 sm:p-6 hover:border-slate-700 transition-colors duration-150"
            >
              {/* Encabezado del ítem */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-xs font-mono uppercase bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                  Categoría: {item.categoria}
                </span>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>Impacto: {item.fechaIncidente}</span>
                  </div>
                  <span>•</span>
                  <span>Récord previo quebrado: {item.diasSinEscupoPrevios} días</span>
                </div>
              </div>

              <h4 className="text-base sm:text-xl font-bold text-slate-100 mb-4">
                {item.titulo}
              </h4>

              {/* Contraste en 2 columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Lo que dijo antes */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                  <div className="text-xs font-mono text-amber-400/90 mb-2 font-bold uppercase flex items-center justify-between">
                    <span>1. El Tweet / Cita Pasada</span>
                    <span className="text-slate-400 font-normal">{item.pasado.fecha}</span>
                  </div>
                  <blockquote className="text-xs sm:text-sm text-slate-300 italic mb-3 pl-2.5 border-l-2 border-amber-500/40">
                    «{item.pasado.cita}»
                  </blockquote>
                  <div className="text-xs text-slate-400 font-mono">
                    En calidad de: <span className="text-slate-300">{item.pasado.rol}</span>
                  </div>
                </div>

                {/* Lo que hizo después */}
                <div className="bg-slate-950/70 border border-red-950/40 rounded-xl p-4">
                  <div className="text-xs font-mono text-red-400/90 mb-2 font-bold uppercase flex items-center justify-between">
                    <span>2. El Hecho / Contradicción</span>
                    <span className="text-slate-400 font-normal">{item.presente.fecha}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mb-2">
                    {item.presente.descripcion}
                  </p>
                  <div className="text-xs text-red-300/90 bg-red-950/30 px-2 py-1 rounded">
                    <strong>Impacto: </strong>{item.presente.impacto}
                  </div>
                </div>
              </div>

              {/* Veredicto y pie de la tarjeta */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-slate-300 italic">
                  <span className="font-semibold text-amber-400 not-italic mr-1.5">Veredicto:</span>
                  "{item.veredictoSatirico}"
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  {item.presente.fuenteUrl && (
                    <a
                      href={item.presente.fuenteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                    >
                      <span>Prensa</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleVoto(item.id, item.votosComunidad)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      haVotado
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                    }`}
                    aria-label={`Votar por esta contradicción. Total de votos: ${totalVotos}`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${haVotado ? 'fill-slate-950' : ''}`} aria-hidden="true" />
                    <span>{totalVotos}</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
