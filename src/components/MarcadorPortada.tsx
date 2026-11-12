import React, { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import type { Escupo } from '../types/escupo';

interface MarcadorPortadaProps {
  diasActuales: number;
  recordHistorico: number;
  totalIncidentes: number;
  ultimoIncidente: Escupo | null;
}

/**
 * Portada editorial con el conteo principal de días y métricas de referencia.
 */
export const MarcadorPortada: React.FC<MarcadorPortadaProps> = ({
  diasActuales,
  recordHistorico,
  totalIncidentes,
  ultimoIncidente,
}) => {
  const [copiado, setCopiado] = useState(false);

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin acceso a portapapeles
    }
  };

  const textoCompartir = `Llevamos ${diasActuales} días sin que a Kast le caiga su propio escupo en la cara (récord histórico: ${recordHistorico} días). Archivo documental:`;
  const urlTwitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCompartir)}&url=${encodeURIComponent(window.location.href)}`;

  const numeroFormateado = String(diasActuales).padStart(2, '0');
  const esCero = diasActuales === 0;

  return (
    <section aria-label="Marcador de días" className="py-8 sm:py-12 border-b-2 border-[#141413]">
      <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        {/* Cifra principal en escala editorial */}
        <div className="flex items-baseline gap-4 flex-shrink-0">
          <div
            className={`font-tabular font-semibold text-7xl sm:text-[5.5rem] leading-none tracking-[-0.04em] select-none ${
              esCero ? 'text-[#b91c1c]' : 'text-[#141413]'
            }`}
            aria-label={`${diasActuales} días`}
          >
            {numeroFormateado}
          </div>
          {esCero && (
            <span className="font-tabular text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
              Reiniciado hoy
            </span>
          )}
        </div>

        {/* Titular y contexto */}
        <div className="flex-1 min-w-0 space-y-3">
          <h2 className="font-editorial text-2xl sm:text-4xl font-bold text-[#141413] leading-[1.15] tracking-[-0.02em]">
            Días sin que a Kast le caiga su propio escupo en la cara
          </h2>

          <p className="text-sm sm:text-base text-[#4a4843] max-w-[65ch] leading-relaxed">
            Conteo automático calculado a partir de la fecha del último hecho documentado en prensa que contradice de forma directa una declaración o promesa previa.
          </p>

          {/* Línea tabular de métricas y acciones */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#dcd7cc]">
            <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-[#4a4843]">
              <div className="flex items-baseline gap-1.5">
                <dt>Récord sin incidentes:</dt>
                <dd className="font-tabular font-semibold text-[#141413]">{recordHistorico} días</dd>
              </div>
              {ultimoIncidente && (
                <div className="flex items-baseline gap-1.5">
                  <dt>Último impacto:</dt>
                  <dd className="font-tabular font-semibold text-[#141413]">{ultimoIncidente.fechaIncidente}</dd>
                </div>
              )}
              <div className="flex items-baseline gap-1.5">
                <dt>Casos en archivo:</dt>
                <dd className="font-tabular font-semibold text-[#141413]">{totalIncidentes}</dd>
              </div>
            </dl>

            <div className="flex items-center gap-2">
              <a
                href={urlTwitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#141413] text-[#f7f5f0] hover:bg-[#2c2b28] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f0]"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Compartir en X</span>
              </a>

              <button
                type="button"
                onClick={copiarEnlace}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#dcd7cc] bg-[#ffffff] text-[#141413] hover:bg-[#efeae0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
              >
                {copiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#166534]" aria-hidden="true" />
                    <span className="text-[#166534]">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
