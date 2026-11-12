import React from 'react';

/**
 * Pie de página editorial sobrio con nota documental y comando del worker.
 */
export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#dcd7cc] bg-[#efeae0]/50 mt-16 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#4a4843]">
        <div className="space-y-1 max-w-[65ch]">
          <p className="font-semibold text-[#141413]">
            El Contador del Escupo — Archivo documental de coherencia política
          </p>
          <p className="leading-relaxed">
            Basado exclusivamente en citas públicas de debates, actas parlamentarias y redes sociales contrastadas con cobertura verificable de prensa chilena.
          </p>
        </div>

        <div className="font-tabular text-xs text-[#4a4843] flex-shrink-0">
          Chile · 2026
        </div>
      </div>
    </footer>
  );
};
