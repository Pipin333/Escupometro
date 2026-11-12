import React from 'react';
import { PlusCircle, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  onAbrirReporte: () => void;
}

/**
 * Cabecera institucional satírica con advertencia de riesgo de gravedad.
 */
export const Header: React.FC<HeaderProps> = ({ onAbrirReporte }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                Física Política Cuántica
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline whitespace-nowrap">
                Boletín de Trayectoria Salival
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100 truncate">
              Contador de Escupos al Cielo
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onAbrirReporte}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 whitespace-nowrap shadow-sm shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Denunciar Contradicción</span>
          </button>
        </div>
      </div>
      <div className="h-1 w-full hazard-stripes opacity-70" aria-hidden="true" />
    </header>
  );
};
