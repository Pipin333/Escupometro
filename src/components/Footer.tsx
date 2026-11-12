import React from 'react';

interface FooterProps {
  onAbrirLegal: () => void;
}

/**
 * Pie de página editorial sobrio con nota documental y acceso a Términos y Privacidad.
 */
export const Footer: React.FC<FooterProps> = ({ onAbrirLegal }) => {
  return (
    <footer className="border-t border-[#dcd7cc] bg-[#efeae0]/50 mt-16 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-xs text-[#4a4843]">
        <div className="space-y-1.5 max-w-[68ch]">
          <p className="font-semibold text-[#141413]">
            El Contador del Escupo — Archivo documental de coherencia política
          </p>
          <p className="leading-relaxed">
            Proyecto ciudadano independiente de sátira política y archivo documental sin afiliación partidaria. Basado exclusivamente en citas públicas contrastadas con cobertura verificable de prensa chilena.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={onAbrirLegal}
            className="text-xs font-medium text-[#141413] hover:text-[#b91c1c] underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] rounded"
          >
            Términos, Nota Legal y Privacidad
          </button>
          <span className="font-tabular text-xs text-[#4a4843]">
            Chile · 2026
          </span>
        </div>
      </div>
    </footer>
  );
};
