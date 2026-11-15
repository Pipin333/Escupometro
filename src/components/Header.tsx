import React from 'react';
import { FileText, Cpu, Quote, BarChart3, Newspaper } from 'lucide-react';

export type VistaActiva = 'archivo' | 'noticias' | 'redaccion' | 'legal';
export type SeccionNavegacion = 'archivo' | 'noticias' | 'frases' | 'encuesta' | 'redaccion';

interface HeaderProps {
  seccionActiva: SeccionNavegacion | null;
  onNavegar: (seccion: SeccionNavegacion) => void;
  totalCandidatos: number;
  fechaEdicion: string;
  mostrarRedaccion: boolean;
}

function claseItemNav(activo: boolean): string {
  return `inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
    activo
      ? 'bg-[#ffffff] text-[#141413] shadow-xs'
      : 'text-[#4a4843] hover:text-[#141413]'
  }`;
}

/**
 * Cabecera editorial tipo periódico y expediente de archivo público.
 */
export const Header: React.FC<HeaderProps> = ({
  seccionActiva,
  onNavegar,
  totalCandidatos,
  fechaEdicion,
  mostrarRedaccion,
}) => {
  const manejarClickEnlace = (
    evento: React.MouseEvent<HTMLAnchorElement>,
    seccion: 'frases' | 'encuesta'
  ) => {
    evento.preventDefault();
    onNavegar(seccion);
  };

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

        <nav
          aria-label="Navegación principal"
          className="flex items-center gap-1 border border-[#dcd7cc] bg-[#efeae0] p-1 rounded-lg self-center sm:self-auto max-w-full overflow-x-auto flex-shrink-0"
        >
          <button
            type="button"
            aria-current={seccionActiva === 'archivo' ? 'page' : undefined}
            onClick={() => onNavegar('archivo')}
            className={claseItemNav(seccionActiva === 'archivo')}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Expediente</span>
          </button>

          <button
            type="button"
            aria-current={seccionActiva === 'noticias' ? 'page' : undefined}
            onClick={() => onNavegar('noticias')}
            className={claseItemNav(seccionActiva === 'noticias')}
          >
            <Newspaper className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Noticias</span>
          </button>

          {!mostrarRedaccion ? (
            <>
              <a
                href="#frases-bronce"
                aria-current={seccionActiva === 'frases' ? 'location' : undefined}
                onClick={(e) => manejarClickEnlace(e, 'frases')}
                className={claseItemNav(seccionActiva === 'frases')}
              >
                <Quote className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Frases</span>
              </a>
              <a
                href="#encuesta-gobierno"
                aria-current={seccionActiva === 'encuesta' ? 'location' : undefined}
                onClick={(e) => manejarClickEnlace(e, 'encuesta')}
                className={claseItemNav(seccionActiva === 'encuesta')}
              >
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Encuesta</span>
              </a>
            </>
          ) : (
            <button
              type="button"
              aria-current={seccionActiva === 'redaccion' ? 'page' : undefined}
              onClick={() => onNavegar('redaccion')}
              className={claseItemNav(seccionActiva === 'redaccion')}
            >
              <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Mesa de Redacción</span>
              <span className="font-tabular text-[11px] px-1.5 py-0.5 rounded bg-[#141413]/10 text-[#141413]">
                {totalCandidatos}
              </span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
