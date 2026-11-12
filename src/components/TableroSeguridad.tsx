import React, { useState } from 'react';
import { Siren, Trophy, Share2, Check, ExternalLink, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { reproducirAlarmaReinicio } from '../lib/sonido';
import type { Escupo } from '../types/escupo';

interface TableroSeguridadProps {
  diasActuales: number;
  recordHistorico: number;
  ultimoIncidente: Escupo | null;
}

/**
 * Tablero estilo señalética industrial con el contador en tiempo real.
 */
export const TableroSeguridad: React.FC<TableroSeguridadProps> = ({
  diasActuales,
  recordHistorico,
  ultimoIncidente,
}) => {
  const [copiado, setCopiado] = useState(false);
  const [alarmaActiva, setAlarmaActiva] = useState(false);

  const dispararAlarma = () => {
    reproducirAlarmaReinicio();
    setAlarmaActiva(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ef4444', '#f59e0b', '#ffffff'],
      });
    } catch {
      // Ignorar si falla confetti
    }

    setTimeout(() => {
      setAlarmaActiva(false);
    }, 1200);
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback si no hay soporte de clipboard
    }
  };

  const textoCompartir = `🚨 ¡ALERTA DE GRAVEDAD! Llevamos ${diasActuales} días sin que a Kast le caiga su propio escupo en la cara. Récord histórico: ${recordHistorico} días. Revisa las contradicciones aquí:`;
  const urlTwitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textoCompartir)}&url=${encodeURIComponent(window.location.href)}`;
  const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${textoCompartir} ${window.location.href}`)}`;

  const esCero = diasActuales === 0;

  return (
    <section aria-label="Tablero de Coherencia Industrial" className="relative my-6 sm:my-8">
      {/* Fondo con resplandor */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent blur-2xl pointer-events-none" />

      <div className="relative border-4 border-slate-700 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
        {/* Cabecera del cartel estilo señalética */}
        <div className="bg-amber-500 text-slate-950 font-black px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-b-4 border-slate-950">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 animate-pulse text-slate-950" aria-hidden="true" />
            <span className="tracking-widest uppercase text-xs sm:text-sm font-mono">
              ESTACIÓN CENTRAL DE BALÍSTICA POLÍTICA
            </span>
          </div>
          <span className="text-xs bg-slate-950 text-amber-400 font-mono px-3 py-1 rounded-full uppercase tracking-wider font-bold">
            NORMA ISO-9000 DE GRAVEDAD RETÓRICA
          </span>
        </div>

        {/* Cuerpo del tablero */}
        <div className="p-6 sm:p-10 text-center flex flex-col items-center">
          <p className="text-xs sm:text-sm uppercase tracking-widest font-mono text-slate-400 mb-2">
            La República de Chile acumula exactamente:
          </p>

          {/* Display Numérico Gigante */}
          <div className="relative my-4 inline-block">
            <div
              className={`px-8 sm:px-14 py-4 sm:py-6 rounded-2xl border-4 ${
                esCero
                  ? 'bg-red-950/40 border-red-500 text-red-500 digital-display shadow-red-500/20'
                  : 'bg-amber-950/30 border-amber-500 text-amber-400 digital-display-amber shadow-amber-500/20'
              } shadow-2xl transition-all duration-300 ${alarmaActiva ? 'scale-105 ring-4 ring-red-400' : ''}`}
            >
              <div className="text-6xl sm:text-9xl font-black font-mono tracking-tighter leading-none select-none">
                {diasActuales}
              </div>
            </div>

            {esCero && (
              <div className="absolute -top-3 -right-3 bg-red-600 text-white font-mono text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg animate-bounce">
                ¡CONTADOR REINICIADO!
              </div>
            )}
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold uppercase tracking-wide text-slate-100 max-w-2xl mt-2 mb-4 leading-tight">
            Días sin que a Kast le caiga su propio escupo en la cara
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mb-6">
            Monitoreo científico de la ley universal: <em className="text-amber-300 not-italic font-semibold">«Todo lo que sube como tweet o cuña de campaña, baja por gravedad sobre su propio mandato»</em>.
          </p>

          {/* Métricas y Récord */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 py-3 px-6 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm font-mono text-slate-300 mb-8">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>
                Récord Histórico de Coherencia: <strong className="text-slate-100">{recordHistorico} días</strong>
              </span>
            </div>
            {ultimoIncidente && (
              <div className="hidden md:inline-block text-slate-600">•</div>
            )}
            {ultimoIncidente && (
              <div className="text-slate-400">
                Último impacto registrado: <strong className="text-red-400">{ultimoIncidente.fechaIncidente}</strong>
              </div>
            )}
          </div>

          {/* Botonera de interacción */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={dispararAlarma}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                alarmaActiva
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                  : 'bg-red-600/90 text-white hover:bg-red-600'
              }`}
            >
              <Siren className={`w-4 h-4 ${alarmaActiva ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{alarmaActiva ? '¡SONANDO ALARMA!' : 'Probar Sirena de Reinicio'}</span>
            </button>

            <a
              href={urlTwitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-all duration-150 border border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>Publicar en X</span>
              <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />
            </a>

            <a
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-800/80 text-emerald-100 hover:bg-emerald-700 transition-all duration-150 border border-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span>WhatsApp</span>
              <ExternalLink className="w-3 h-3 text-emerald-300" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={copiarEnlace}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all duration-150 border border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {copiado ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">¡Enlace copiado!</span>
                </>
              ) : (
                <span>Copiar Enlace</span>
              )}
            </button>
          </div>
        </div>

        {/* Franja de peligro inferior */}
        <div className="h-3 w-full hazard-stripes-danger opacity-80" aria-hidden="true" />
      </div>
    </section>
  );
};
