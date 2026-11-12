import React from 'react';
import { Search, X } from 'lucide-react';
import type { CategoriaEscupo } from '../types/escupo';

interface FiltrosYBusquedaProps {
  categoriaSeleccionada: CategoriaEscupo | 'todas';
  onSeleccionarCategoria: (cat: CategoriaEscupo | 'todas') => void;
  busqueda: string;
  onCambiarBusqueda: (texto: string) => void;
  totalResultados: number;
}

const CATEGORIAS: { id: CategoriaEscupo | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todos' },
  { id: 'gasto-publico', label: 'Gasto y viajes' },
  { id: 'seguridad', label: 'Seguridad e indultos' },
  { id: 'impuestos', label: 'Impuestos y bencinas' },
  { id: 'nepotismo', label: 'Cargos y pitutos' },
  { id: 'constitucion', label: 'Constitución' },
  { id: 'libertades', label: 'Derechos y ONU' },
];

/**
 * Índice de categorías y buscador en tiempo real sobre el expediente histórico.
 */
export const FiltrosYBusqueda: React.FC<FiltrosYBusquedaProps> = ({
  categoriaSeleccionada,
  onSeleccionarCategoria,
  busqueda,
  onCambiarBusqueda,
  totalResultados,
}) => {
  return (
    <div className="pt-8 pb-4 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#141413]">
          Archivo Cronológico
        </h2>

        {/* Buscador minimalista */}
        <div className="relative w-full sm:w-80">
          <label htmlFor="input-busqueda-archivo" className="sr-only">
            Buscar en el archivo cronológico
          </label>
          <Search
            className="w-4 h-4 text-[#4a4843] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="input-busqueda-archivo"
            type="search"
            value={busqueda}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            placeholder="Buscar tema, fecha, cita..."
            className="w-full pl-9 pr-8 py-2 bg-[#ffffff] border border-[#dcd7cc] rounded-lg text-sm text-[#141413] placeholder-[#4a4843] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onCambiarBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4a4843] hover:text-[#141413] p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de categoría con subrayado activo */}
      <div
        role="tablist"
        aria-label="Filtrar por categoría temática"
        className="flex items-center gap-5 overflow-x-auto no-scrollbar border-b border-[#dcd7cc] pb-px"
      >
        {CATEGORIAS.map((cat) => {
          const activo = categoriaSeleccionada === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => onSeleccionarCategoria(cat.id)}
              className={`pb-2.5 text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
                activo
                  ? 'border-[#141413] text-[#141413] font-semibold'
                  : 'border-transparent text-[#4a4843] hover:text-[#141413]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-[#4a4843]">
        <span className="font-tabular">
          {totalResultados} {totalResultados === 1 ? 'registro' : 'registros'}
        </span>
        {(categoriaSeleccionada !== 'todas' || busqueda) && (
          <button
            type="button"
            onClick={() => {
              onSeleccionarCategoria('todas');
              onCambiarBusqueda('');
            }}
            className="underline underline-offset-4 hover:text-[#141413]"
          >
            Ver todo el archivo
          </button>
        )}
      </div>
    </div>
  );
};
