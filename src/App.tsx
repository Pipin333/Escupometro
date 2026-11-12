import { useState, useMemo, useEffect } from 'react';
import datosEscupos from './data/escupos.json';
import datosCandidatos from './data/candidatos.json';
import datosNoticias from './data/noticias-recientes.json';
import datosDichos from './data/archivo-dichos.json';
import datosFrasesBronce from './data/frases-bronce.json';
import type {
  CandidatoContradiccion,
  CategoriaEscupo,
  DichoHistorico,
  Escupo,
  FraseBronce,
  NoticiaScrapeada,
} from './types/escupo';
import {
  obtenerFechaHoySantiago,
  calcularDiasSinEscupo,
  calcularRecordHistorico,
  obtenerUltimoIncidente,
  filtrarIncidentes,
} from './lib/contador';
import {
  determinarVistaInicial,
  puedeAccederRedaccion,
} from './lib/entorno-editor';
import { Header, type VistaActiva } from './components/Header';
import { MarcadorPortada } from './components/MarcadorPortada';
import { ExpedienteDestacado } from './components/ExpedienteDestacado';
import { FiltrosYBusqueda } from './components/FiltrosYBusqueda';
import { HistorialEscupos } from './components/HistorialEscupos';
import { FrasesBronce } from './components/FrasesBronce';
import { EncuestaGobierno } from './components/EncuestaGobierno';
import { MesaRedaccion } from './components/MesaRedaccion';
import { Footer } from './components/Footer';

function leerContextoNavegador() {
  if (typeof window === 'undefined') {
    return { isDev: import.meta.env.DEV, search: '', hash: '' };
  }
  return {
    isDev: import.meta.env.DEV,
    search: window.location.search,
    hash: window.location.hash,
  };
}

export function App() {
  const [escupos, setEscupos] = useState<Escupo[]>(datosEscupos as Escupo[]);
  const [mostrarRedaccion, setMostrarRedaccion] = useState<boolean>(() =>
    puedeAccederRedaccion(leerContextoNavegador())
  );
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>(() =>
    determinarVistaInicial(leerContextoNavegador())
  );
  const [categoria, setCategoria] = useState<CategoriaEscupo | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const actualizarPermiso = () => {
      const contexto = leerContextoNavegador();
      const habilitado = puedeAccederRedaccion(contexto);
      setMostrarRedaccion(habilitado);
      if (!habilitado) {
        setVistaActiva('archivo');
      } else if (determinarVistaInicial(contexto) === 'redaccion') {
        setVistaActiva('redaccion');
      }
    };

    window.addEventListener('hashchange', actualizarPermiso);
    window.addEventListener('popstate', actualizarPermiso);
    return () => {
      window.removeEventListener('hashchange', actualizarPermiso);
      window.removeEventListener('popstate', actualizarPermiso);
    };
  }, []);

  const candidatos = datosCandidatos as CandidatoContradiccion[];
  const noticiasRecientes = datosNoticias as NoticiaScrapeada[];
  const dichosHistoricos = datosDichos as DichoHistorico[];
  const frasesBronce = datosFrasesBronce as FraseBronce[];

  const fechaHoy = useMemo(() => obtenerFechaHoySantiago(), []);

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
        mostrarRedaccion={mostrarRedaccion}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6">
        {vistaActiva === 'archivo' || !mostrarRedaccion ? (
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

            <FrasesBronce frases={frasesBronce} />

            <EncuestaGobierno />
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
