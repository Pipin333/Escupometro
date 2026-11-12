import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import datosEscupos from './data/escupos.json';
import type {
  CategoriaEscupo,
  Escupo,
  FraseBronce as FraseBronceTipo,
  NoticiaScrapeada,
} from './types/escupo';
import datosFrasesBronce from './data/frases-bronce.json';
import {
  obtenerFechaHoySantiago,
  calcularDiasSinEscupo,
  calcularRecordHistorico,
  obtenerUltimoIncidente,
  filtrarIncidentes,
} from './lib/contador';
import { cargarNoticiasEnVivo } from './lib/noticias';
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
import { UltimasNoticiasWidget } from './components/UltimasNoticiasWidget';
import { SeccionNoticias } from './components/SeccionNoticias';
import { PaginaLegal } from './components/PaginaLegal';
import { Footer } from './components/Footer';

const MesaRedaccionDev = import.meta.env.DEV
  ? lazy(() => import('./components/MesaRedaccionDev'))
  : null;

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
  const mostrarRedaccion = puedeAccederRedaccion({
    isDev: import.meta.env.DEV,
    search: '',
    hash: '',
  });
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>(() =>
    determinarVistaInicial(leerContextoNavegador())
  );
  const [totalCandidatosDev, setTotalCandidatosDev] = useState(0);
  const [categoria, setCategoria] = useState<CategoriaEscupo | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [noticias, setNoticias] = useState<NoticiaScrapeada[]>([]);
  const [noticiasCargando, setNoticiasCargando] = useState(true);
  const [noticiasError, setNoticiasError] = useState<string | null>(null);
  const [noticiasActualizadoEn, setNoticiasActualizadoEn] = useState<string | null>(null);
  const [noticiasFallbackEstatico, setNoticiasFallbackEstatico] = useState(false);

  const recargarNoticias = useCallback(async () => {
    setNoticiasCargando(true);
    setNoticiasError(null);
    try {
      const resultado = await cargarNoticiasEnVivo();
      setNoticias(resultado.items);
      setNoticiasActualizadoEn(resultado.fetchedAt);
      setNoticiasFallbackEstatico(resultado.esFallbackEstatico);
    } catch {
      setNoticiasError('No fue posible obtener los titulares de prensa.');
    } finally {
      setNoticiasCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargarNoticias();
    const intervalo = window.setInterval(() => {
      void recargarNoticias();
    }, 900_000);
    return () => window.clearInterval(intervalo);
  }, [recargarNoticias]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let activo = true;
    void import('./data/candidatos.json').then((modulo) => {
      if (activo && Array.isArray(modulo.default)) {
        setTotalCandidatosDev(modulo.default.length);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  const frasesBronce = datosFrasesBronce as FraseBronceTipo[];

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

  const abrirLegal = () => {
    setVistaActiva('legal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const abrirNoticias = () => {
    setVistaActiva('noticias');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const volverAlArchivo = () => {
    setVistaActiva('archivo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] text-[#141413]">
      <Header
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        totalCandidatos={totalCandidatosDev}
        fechaEdicion={fechaHoy}
        mostrarRedaccion={mostrarRedaccion}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6">
        {vistaActiva === 'legal' ? (
          <PaginaLegal onVolverArchivo={volverAlArchivo} />
        ) : vistaActiva === 'noticias' ? (
          <SeccionNoticias
            noticias={noticias}
            cargando={noticiasCargando}
            error={noticiasError}
            actualizadoEn={noticiasActualizadoEn}
            esFallbackEstatico={noticiasFallbackEstatico}
            onRecargar={() => void recargarNoticias()}
          />
        ) : vistaActiva === 'archivo' || !mostrarRedaccion || !MesaRedaccionDev ? (
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

            <UltimasNoticiasWidget
              noticias={noticias}
              cargando={noticiasCargando}
              error={noticiasError}
              esFallbackEstatico={noticiasFallbackEstatico}
              onVerTodas={abrirNoticias}
              onRecargar={() => void recargarNoticias()}
            />
          </>
        ) : (
          <Suspense
            fallback={
              <div className="py-12 text-sm text-[#4a4843]">
                Cargando Mesa de Redacción...
              </div>
            }
          >
            <MesaRedaccionDev
              escuposActuales={escupos}
              onPublicarEscupo={handlePublicarEscupo}
            />
          </Suspense>
        )}
      </main>

      <Footer onAbrirLegal={abrirLegal} />
    </div>
  );
}

export default App;
