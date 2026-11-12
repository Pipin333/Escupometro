import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Pie de página con información satírica legal y descargo de responsabilidad ciudadana.
 */
export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-16 text-slate-400 py-10 px-4 text-xs sm:text-sm">
      <div className="max-w-4xl mx-auto space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider font-semibold">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Observatorio Ciudadano de Balística Retórica</span>
        </div>

        <p className="max-w-xl mx-auto text-slate-400 leading-relaxed">
          Proyecto satírico y de fiscalización pública sin fines de lucro. Todas las citas pasadas provienen de tweets públicos, actas de la Cámara de Diputados y debates oficiales de acceso público. Los hechos contrastados cuentan con enlaces directos a medios de prensa verificables.
        </p>

        <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <span>
            Hecho con memoria histórica y leyes inmutables de la física.
          </span>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Chile, 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
