import React from 'react';
import { Search, Tag, X } from 'lucide-react';
import type { CategoriaEscupo } from '../types/escupo';

interface FiltrosYBusquedaProps {
  categoriaSeleccionada: CategoriaEscupo | 'todas';
  onSeleccionarCategoria: (cat: CategoriaEscupo | 'todas') => void;
  busqueda: string;
  onCambiarBusqueda: (texto: string) => void;
  totalResultados: number;
}

const CATEGORIAS: { id: CategoriaEscupo | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todos los Escupos' },
  { id: 'impuestos', label: 'Impuestos & Panamá' },
  { id: 'nepotismo', label: 'Pitutos & Operadores' },
  { id: 'seguridad', label: 'Mano Dura & Indultos' },
  { id: 'constitucion', label: 'Constitución & Rechazo/A Favor' },
  { id: 'gasto-publico', label: 'Plata Fiscal & Servel' },
  { id: 'libertades', label: 'ONU & Foros Globales' },
];

/**
 * Barra interactiva de filtrado y búsqueda accesible en tiempo real.
 */
export const FiltrosYBusqueda: React.FC<FiltrosYBusquedaProps> = ({
  categoriaSeleccionada,
  onSeleccionarCategoria,
  busqueda,
  onCambiarBusqueda,
  totalResultados,
}) => {
  return (
    <div className="my-6 max-w-4xl mx-auto space-y-4">
      {/* Buscador de texto */}
      <div className="relative">
        <label htmlFor="input-busqueda-escupos" className="sr-only">
          Buscar en el archivo de contradicciones
        </label>
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" aria-hidden="true" />
          <input
            id="input-busqueda-escupos"
            type="search"
            value={busqueda}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            placeholder="Buscar por tweet, tema, palabra clave (ej: Panamá, pitutos, indulto, servel)..."
            className="w-full pl-11 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-transparent transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onCambiarBusqueda('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Selector de categorías en pills horizontales accesibles */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1 font-mono uppercase">
          <Tag className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Filtro:</span>
        </div>

        {CATEGORIAS.map((cat) => {
          const estaActivo = categoriaSeleccionada === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSeleccionarCategoria(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap ${
                estaActivo
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 border border-slate-700/60'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Indicador de resultados */}
      <div className="text-xs font-mono text-slate-400 flex items-center justify-between px-1">
        <span>Mostrando {totalResultados} {totalResultados === 1 ? 'incidente documentado' : 'incidentes documentados'}</span>
        {(categoriaSeleccionada !== 'todas' || busqueda) && (
          <button
            type="button"
            onClick={() => {
              onSeleccionarCategoria('todas');
              onCambiarBusqueda('');
            }}
            className="text-amber-400 hover:underline hover:text-amber-300"
          >
            Restablecer todos los filtros
          </button>
        )}
      </div>
    </div>
  );
};
