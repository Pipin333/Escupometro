import { useState, useMemo } from 'react';
import datosEscupos from './data/escupos.json';
import type { Escupo, CategoriaEscupo } from './types/escupo';
import {
  calcularDiasSinEscupo,
  calcularRecordHistorico,
  obtenerUltimoIncidente,
  filtrarIncidentes,
} from './lib/contador';
import { Header } from './components/Header';
import { TableroSeguridad } from './components/TableroSeguridad';
import { UltimoEscupoCard } from './components/UltimoEscupoCard';
import { FiltrosYBusqueda } from './components/FiltrosYBusqueda';
import { HistorialEscupos } from './components/HistorialEscupos';
import { ModalReportar } from './components/ModalReportar';
import { Footer } from './components/Footer';

export function App() {
  const [escupos] = useState<Escupo[]>(datosEscupos as Escupo[]);
  const [categoria, setCategoria] = useState<CategoriaEscupo | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);

  // Fecha actual en formato YYYY-MM-DD
  const fechaHoy = useMemo(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }, []);

  // Cálculos principales del tablero
  const ultimoIncidente = useMemo(() => obtenerUltimoIncidente(escupos), [escupos]);
  const diasActuales = useMemo(() => calcularDiasSinEscupo(escupos, fechaHoy), [escupos, fechaHoy]);
  const recordHistorico = useMemo(
    () => calcularRecordHistorico(escupos, diasActuales),
    [escupos, diasActuales]
  );

  // Filtrado reactivo de incidentes
  const incidentesFiltrados = useMemo(
    () => filtrarIncidentes(escupos, categoria, busqueda),
    [escupos, categoria, busqueda]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      <Header onAbrirReporte={() => setModalReporteAbierto(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* Tablero central tipo señalética industrial */}
        <TableroSeguridad
          diasActuales={diasActuales}
          recordHistorico={recordHistorico}
          ultimoIncidente={ultimoIncidente}
        />

        {/* Tarjeta destacada del último escupo que reinició el contador */}
        {ultimoIncidente && <UltimoEscupoCard incidente={ultimoIncidente} />}

        {/* Filtros, buscador y archivo histórico */}
        <FiltrosYBusqueda
          categoriaSeleccionada={categoria}
          onSeleccionarCategoria={setCategoria}
          busqueda={busqueda}
          onCambiarBusqueda={setBusqueda}
          totalResultados={incidentesFiltrados.length}
        />

        <HistorialEscupos incidentes={incidentesFiltrados} />
      </main>

      <Footer />

      {/* Modal accesible para denunciar nueva contradicción */}
      <ModalReportar
        abierto={modalReporteAbierto}
        onCerrar={() => setModalReporteAbierto(false)}
      />
    </div>
  );
}

export default App;
