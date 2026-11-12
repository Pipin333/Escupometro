import { useState, useMemo } from 'react';
import datosEscupos from './data/escupos.json';
import datosCandidatos from './data/candidatos.json';
import datosNoticias from './data/noticias-recientes.json';
import datosDichos from './data/archivo-dichos.json';
import type {
  CandidatoContradiccion,
  CategoriaEscupo,
  DichoHistorico,
  Escupo,
  NoticiaScrapeada,
} from './types/escupo';
import {
  calcularDiasSinEscupo,
  calcularRecordHistorico,
  obtenerUltimoIncidente,
  filtrarIncidentes,
} from './lib/contador';
import { Header, type VistaActiva } from './components/Header';
import { MarcadorPortada } from './components/MarcadorPortada';
import { ExpedienteDestacado } from './components/ExpedienteDestacado';
import { FiltrosYBusqueda } from './components/FiltrosYBusqueda';
import { HistorialEscupos } from './components/HistorialEscupos';
import { MesaRedaccion } from './components/MesaRedaccion';
import { Footer } from './components/Footer';

export function App() {
  const [escupos, setEscupos] = useState<Escupo[]>(datosEscupos as Escupo[]);
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('archivo');
  const [categoria, setCategoria] = useState<CategoriaEscupo | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  const candidatos = datosCandidatos as CandidatoContradiccion[];
  const noticiasRecientes = datosNoticias as NoticiaScrapeada[];
  const dichosHistoricos = datosDichos as DichoHistorico[];

  const fechaHoy = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const ultimoIncidente = useMemo(() => obtenerUltimoIncidente(escupos), [escupos]);
  const diasActuales = useMemo(() => calcularDiasSinEscupo(escupos, fechaHoy), [escupos, fechaHoy]);
  const recordHistorico = useMemo(
    () => calcularRecordHistorico(escupos, diasActuales),
    [escupos, diasActuales]
  );

  const incidentesFiltrados = useMemo(
    () => filtrarIncidentes(escupos, categoria, busqueda),
    [escupos, categoria, busqueda]
  );

  const handlePublicarEscupo = (nuevo: Escupo) => {
    setEscupos((prev) => [nuevo, ...prev.filter((item) => item.id !== nuevo.id)]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] text-[#141413]">
      <Header
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        totalCandidatos={candidatos.length}
        fechaEdicion={fechaHoy}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6">
        {vistaActiva === 'archivo' ? (
          <>
            <MarcadorPortada
              diasActuales={diasActuales}
              recordHistorico={recordHistorico}
              totalIncidentes={escupos.length}
              ultimoIncidente={ultimoIncidente}
            />

            {ultimoIncidente && <ExpedienteDestacado incidente={ultimoIncidente} />}

            <FiltrosYBusqueda
              categoriaSeleccionada={categoria}
              onSeleccionarCategoria={setCategoria}
              busqueda={busqueda}
              onCambiarBusqueda={setBusqueda}
              totalResultados={incidentesFiltrados.length}
            />

            <HistorialEscupos incidentes={incidentesFiltrados} />
          </>
        ) : (
          <MesaRedaccion
            candidatosIniciales={candidatos}
            noticiasRecientes={noticiasRecientes}
            dichosHistoricos={dichosHistoricos}
            escuposActuales={escupos}
            onPublicarEscupo={handlePublicarEscupo}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
