import React, { useState } from 'react';
import { ArrowUpRight, ThumbsUp } from 'lucide-react';
import type { Escupo } from '../types/escupo';

interface HistorialEscuposProps {
  incidentes: Escupo[];
}

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  impuestos: 'Impuestos y bencinas',
  nepotismo: 'Cargos y pitutos',
  seguridad: 'Seguridad e indultos',
  constitucion: 'Constitución',
  'gasto-publico': 'Gasto y viajes',
  libertades: 'Derechos y ONU',
};

/**
 * Listado cronológico de expedientes documentados en formato editorial limpio.
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
      <div className="py-12 text-center border-t border-b border-[#dcd7cc]">
        <h3 className="font-editorial text-lg font-semibold text-[#141413] mb-1">
          Sin coincidencias en el archivo
        </h3>
        <p className="text-sm text-[#4a4843]">
          No hay registros que coincidan con los términos o la categoría seleccionada.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Registros históricos" className="divide-y divide-[#dcd7cc] border-t border-b border-[#dcd7cc]">
      {incidentes.map((item) => {
        const totalVotos = votos[item.id] !== undefined ? votos[item.id] : (item.votosComunidad || 0);
        const haVotado = !!votados[item.id];

        return (
          <article key={item.id} className="py-8 space-y-5">
            {/* Metadatos de registro en una sola línea limpia */}
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[#4a4843]">
              <div className="flex items-center gap-3">
                <span className="font-tabular font-semibold text-[#141413]">
                  {item.fechaIncidente}
                </span>
                <span>·</span>
                <span>{ETIQUETAS_CATEGORIA[item.categoria] || item.categoria}</span>
              </div>
              <span className="font-tabular">
                Racha previa interrumpida: {item.diasSinEscupoPrevios} días
              </span>
            </div>

            {/* Titular */}
            <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#141413] leading-snug max-w-[52ch]">
              {item.titulo}
            </h3>

            {/* Grilla comparativa limpia sin cajas anidadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between text-xs text-[#4a4843]">
                  <span className="font-semibold text-[#141413]">Declaración previa</span>
                  <span className="font-tabular">{item.pasado.fecha}</span>
                </div>
                <blockquote className="font-editorial text-base text-[#141413] leading-relaxed">
                  «{item.pasado.cita}»
                </blockquote>
                <p className="text-xs text-[#4a4843]">
                  {item.pasado.rol}
                  {item.pasado.usuarioTweet ? ` · ${item.pasado.usuarioTweet}` : ''}
                </p>
              </div>

              <div className="space-y-2 md:border-l md:border-[#dcd7cc] md:pl-8">
                <div className="flex items-baseline justify-between text-xs text-[#4a4843]">
                  <span className="font-semibold text-[#b91c1c]">Hecho documentado</span>
                  <span className="font-tabular">{item.presente.fecha}</span>
                </div>
                <p className="text-sm text-[#141413] leading-relaxed">
                  {item.presente.descripcion}
                </p>
                <p className="text-xs text-[#4a4843]">
                  <span className="font-semibold text-[#141413]">Consecuencia: </span>
                  {item.presente.impacto}
                </p>
              </div>
            </div>

            {/* Pie del registro: Veredicto + Fuente + Respaldo */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="font-editorial italic text-sm text-[#4a4843] max-w-[65ch]">
                {item.veredictoSatirico}
              </p>

              <div className="flex items-center gap-3 flex-shrink-0">
                {item.presente.fuenteUrl && (
                  <a
                    href={item.presente.fuenteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#141413] underline underline-offset-4 hover:text-[#b91c1c]"
                  >
                    <span>{item.presente.medio || 'Fuente de prensa'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => toggleVoto(item.id, item.votosComunidad)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-tabular border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
                    haVotado
                      ? 'bg-[#141413] text-[#f7f5f0] border-[#141413]'
                      : 'bg-[#ffffff] text-[#4a4843] border-[#dcd7cc] hover:text-[#141413]'
                  }`}
                  aria-label={`Respaldar registro. Total: ${totalVotos}`}
                >
                  <ThumbsUp className="w-3 h-3" aria-hidden="true" />
                  <span>{totalVotos}</span>
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
};
