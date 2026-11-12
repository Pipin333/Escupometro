import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CategoriaEscupo } from '../types/escupo';

interface ModalReportarProps {
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Modal accesible para que los usuarios envíen una nueva contradicción documentada.
 */
export const ModalReportar: React.FC<ModalReportarProps> = ({ abierto, onCerrar }) => {
  const [categoria, setCategoria] = useState<CategoriaEscupo>('impuestos');
  const [titulo, setTitulo] = useState('');
  const [citaPasada, setCitaPasada] = useState('');
  const [fechaPasada, setFechaPasada] = useState('');
  const [hechoPresente, setHechoPresente] = useState('');
  const [fuenteUrl, setFuenteUrl] = useState('');
  const [enviado, setEnviado] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abierto) {
        onCerrar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    setTimeout(() => {
      setEnviado(false);
      onCerrar();
      // Limpiar formulario
      setTitulo('');
      setCitaPasada('');
      setFechaPasada('');
      setHechoPresente('');
      setFuenteUrl('');
    }, 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-reporte"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <h3 id="titulo-modal-reporte" className="font-bold text-slate-100 text-base sm:text-lg">
              Denunciar Nuevo Escupo al Cielo
            </h3>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Cerrar ventana de reporte"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {enviado ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" aria-hidden="true" />
            <h4 className="text-xl font-bold text-slate-100">¡Contradicción Ingresada!</h4>
            <p className="text-sm text-slate-300">
              El Comité de Física Salival revisará las fuentes antes de proceder al reseteo oficial del contador.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            <div>
              <label htmlFor="input-titulo" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                Título del Incidente *
              </label>
              <input
                id="input-titulo"
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: De condenar el gasto fiscal a pedir más asesores"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="select-categoria" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                  Categoría *
                </label>
                <select
                  id="select-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaEscupo)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <option value="impuestos">Impuestos & Panamá</option>
                  <option value="nepotismo">Pitutos & Operadores</option>
                  <option value="seguridad">Mano Dura & Indultos</option>
                  <option value="constitucion">Constitución & Procesos</option>
                  <option value="gasto-publico">Plata Fiscal & Servel</option>
                  <option value="libertades">ONU & Agenda Global</option>
                </select>
              </div>

              <div>
                <label htmlFor="input-fecha-pasada" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                  Fecha del Tweet / Cita Pasada
                </label>
                <input
                  id="input-fecha-pasada"
                  type="date"
                  value={fechaPasada}
                  onChange={(e) => setFechaPasada(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-cita" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                La Cita o Tweet Original (El Escupo) *
              </label>
              <textarea
                id="input-cita"
                required
                rows={2}
                value={citaPasada}
                onChange={(e) => setCitaPasada(e.target.value)}
                placeholder="Texto exacto dicho en el pasado o captura del tweet..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>

            <div>
              <label htmlFor="input-hecho" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                El Hecho Actual (La Caída en la Cara) *
              </label>
              <textarea
                id="input-hecho"
                required
                rows={2}
                value={hechoPresente}
                onChange={(e) => setHechoPresente(e.target.value)}
                placeholder="Qué ocurrió ahora que contradice la promesa original..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>

            <div>
              <label htmlFor="input-fuente" className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1">
                Enlace a Noticia / Fuente Verificable
              </label>
              <input
                id="input-fuente"
                type="url"
                value={fuenteUrl}
                onChange={(e) => setFuenteUrl(e.target.value)}
                placeholder="https://latercera.com/... o https://ciperchile.cl/..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onCerrar}
                className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Enviar para Verificación</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
