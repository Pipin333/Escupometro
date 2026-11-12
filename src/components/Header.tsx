import React from 'react';
import { FileText, Cpu } from 'lucide-react';

export type VistaActiva = 'archivo' | 'redaccion';

interface HeaderProps {
  vistaActiva: VistaActiva;
  onCambiarVista: (vista: VistaActiva) => void;
  totalCandidatos: number;
  fechaEdicion: string;
}

/**
 * Cabecera editorial tipo periódico y expediente de archivo público.
 */
export const Header: React.FC<HeaderProps> = ({
  vistaActiva,
  onCambiarVista,
  totalCandidatos,
  fechaEdicion,
}) => {
  return (
    <header className="border-b border-[#dcd7cc] bg-[#f7f5f0]/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="font-editorial text-xl sm:text-2xl font-bold tracking-[-0.02em] text-[#141413] whitespace-nowrap">
              El Contador del Escupo
            </h1>
            <span className="font-tabular text-xs text-[#4a4843] hidden md:inline whitespace-nowrap">
              Edición {fechaEdicion}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#4a4843]">
            Registro documental de declaraciones pasadas frente a hechos actuales
          </p>
        </div>

        <nav aria-label="Navegación principal" className="flex items-center gap-1 border border-[#dcd7cc] bg-[#efeae0] p-1 rounded-lg self-start sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => onCambiarVista('archivo')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
              vistaActiva === 'archivo'
                ? 'bg-[#ffffff] text-[#141413] shadow-xs'
                : 'text-[#4a4843] hover:text-[#141413]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Expediente</span>
          </button>

          <button
            type="button"
            onClick={() => onCambiarVista('redaccion')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
              vistaActiva === 'redaccion'
                ? 'bg-[#ffffff] text-[#141413] shadow-xs'
                : 'text-[#4a4843] hover:text-[#141413]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Mesa de Redacción</span>
            <span className="font-tabular text-[11px] px-1.5 py-0.5 rounded bg-[#141413]/10 text-[#141413]">
              {totalCandidatos}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
