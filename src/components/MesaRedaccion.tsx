import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Cpu,
  Download,
  Play,
  Plus,
  Terminal,
} from 'lucide-react';
import type {
  CandidatoContradiccion,
  DichoHistorico,
  Escupo,
  NoticiaScrapeada,
} from '../types/escupo';
import { detectarContradiccionesEnLote } from '../motor/detector';

interface MesaRedaccionProps {
  candidatosIniciales: CandidatoContradiccion[];
  noticiasRecientes: NoticiaScrapeada[];
  dichosHistoricos: DichoHistorico[];
  escuposActuales: Escupo[];
  onPublicarEscupo: (nuevo: Escupo) => void;
}

/**
 * Mesa de redacción editorial conectada al scraper de prensa y al motor de detección de contradicciones.
 */
export const MesaRedaccion: React.FC<MesaRedaccionProps> = ({
  candidatosIniciales,
  noticiasRecientes,
  dichosHistoricos,
  escuposActuales,
  onPublicarEscupo,
}) => {
  // Probador en vivo del motor
  const [tituloPrueba, setTituloPrueba] = useState('');
  const [bajadaPrueba, setBajadaPrueba] = useState('');
  const [medioPrueba, setMedioPrueba] = useState('');
  const [urlPrueba, setUrlPrueba] = useState('');
  const [fechaPrueba, setFechaPrueba] = useState(() => new Date().toISOString().split('T')[0]);
  const [resultadoMotor, setResultadoMotor] = useState<CandidatoContradiccion | null>(null);
  const [sinCoincidencia, setSinCoincidencia] = useState(false);

  // Editor de expediente seleccionado
  const [borrador, setBorrador] = useState<Escupo | null>(null);
  const [jsonCopiado, setJsonCopiado] = useState(false);
  const [publicadoAviso, setPublicadoAviso] = useState(false);

  const ejecutarMotorManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloPrueba.trim()) return;

    const noticia: NoticiaScrapeada = {
      id: `manual-${Date.now()}`,
      titulo: tituloPrueba.trim(),
      bajada: bajadaPrueba.trim() || tituloPrueba.trim(),
      medio: medioPrueba.trim() || 'Prensa nacional',
      fecha: fechaPrueba,
      url: urlPrueba.trim() || 'https://news.google.com',
    };

    const matches = detectarContradiccionesEnLote([noticia], dichosHistoricos, 35);
    if (matches.length > 0) {
      setResultadoMotor(matches[0]);
      setSinCoincidencia(false);
    } else {
      setResultadoMotor(null);
      setSinCoincidencia(true);
    }
  };

  const cargarNoticiaDeScraper = (noticia: NoticiaScrapeada) => {
    setTituloPrueba(noticia.titulo);
    setBajadaPrueba(noticia.bajada);
    setMedioPrueba(noticia.medio);
    setUrlPrueba(noticia.url);
    setFechaPrueba(noticia.fecha);
    const matches = detectarContradiccionesEnLote([noticia], dichosHistoricos, 35);
    if (matches.length > 0) {
      setResultadoMotor(matches[0]);
      setSinCoincidencia(false);
    } else {
      setResultadoMotor(null);
      setSinCoincidencia(true);
    }
  };

  const prepararBorradorDesdeCandidato = (cand: CandidatoContradiccion) => {
    const slug = cand.noticia.titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 42);

    const nuevo: Escupo = {
      id: `${slug}-${cand.noticia.fecha}`,
      titulo: cand.noticia.titulo,
      categoria: cand.dicho.categoria,
      fechaIncidente: cand.noticia.fecha,
      diasSinEscupoPrevios: 1,
      gravedad: cand.scoreContradiccion >= 85 ? 'termocéfala' : 'critica',
      pasado: {
        fecha: cand.dicho.fecha,
        rol: cand.dicho.rol,
        tipoMedio: cand.dicho.tipoMedio,
        usuarioTweet: cand.dicho.usuarioTweet,
        cita: cand.dicho.cita,
        fuenteUrl: cand.dicho.fuenteUrl,
        ...(cand.dicho.archivoUrl ? { archivoUrl: cand.dicho.archivoUrl } : {}),
      },
      presente: {
        fecha: cand.noticia.fecha,
        medio: cand.noticia.medio,
        titulo: cand.noticia.titulo,
        descripcion: cand.noticia.bajada || cand.noticia.titulo,
        impacto: `${cand.tipoChoque} detectado con ${cand.scoreContradiccion}% de consistencia temática.`,
        fuenteUrl: cand.noticia.url,
      },
      veredictoSatirico: `${cand.tipoChoque}: ${cand.explicacionMotor}`,
      votosComunidad: 0,
    };

    setBorrador(nuevo);
    setPublicadoAviso(false);
  };

  const copiarJsonBorrador = async () => {
    if (!borrador) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(borrador, null, 2));
      setJsonCopiado(true);
      setTimeout(() => setJsonCopiado(false), 2000);
    } catch {
      // Sin portapapeles
    }
  };

  const descargarJsonCompleto = () => {
    const listaActualizada = borrador
      ? [borrador, ...escuposActuales.filter((e) => e.id !== borrador.id)]
      : escuposActuales;

    const blob = new Blob([JSON.stringify(listaActualizada, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'escupos.json';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const aprobarYPublicarEnVista = () => {
    if (!borrador) return;
    onPublicarEscupo(borrador);
    setPublicadoAviso(true);
  };

  return (
    <div className="py-8 space-y-10">
      {/* Encabezado técnico de Mesa de Redacción */}
      <section className="border-b border-[#dcd7cc] pb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141413]">
            Mesa de Redacción y Motor de Contradicciones
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#efeae0] border border-[#dcd7cc] text-xs font-tabular text-[#141413]">
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>npm run worker</span>
          </div>
        </div>
        <p className="text-sm text-[#4a4843] max-w-[75ch] leading-relaxed">
          El worker consulta feeds RSS de prensa chilena (Google Noticias CL, CIPER, The Clinic, El Ciudadano) y cruza automáticamente cada noticia reciente contra la base histórica de citas (<code className="font-tabular text-xs bg-[#efeae0] px-1 py-0.5 rounded">archivo-dichos.json</code>) calculando similitud temática y choque de postura.
        </p>

        <dl className="flex flex-wrap gap-6 pt-2 text-xs text-[#4a4843]">
          <div className="flex items-baseline gap-1.5">
            <dt>Declaraciones indexadas:</dt>
            <dd className="font-tabular font-semibold text-[#141413]">{dichosHistoricos.length}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt>Noticias recientes en caché:</dt>
            <dd className="font-tabular font-semibold text-[#141413]">{noticiasRecientes.length}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt>Candidatos puntuados por el motor:</dt>
            <dd className="font-tabular font-semibold text-[#b91c1c]">{candidatosIniciales.length}</dd>
          </div>
        </dl>
      </section>

      {/* Editor de Expediente Activo (cuando se selecciona o evalúa un candidato) */}
      {borrador && (
        <section aria-label="Editor de expediente" className="bg-[#ffffff] border-2 border-[#141413] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#dcd7cc]">
            <div>
              <h3 className="font-editorial text-xl font-bold text-[#141413]">
                Editor de Expediente para Publicación
              </h3>
              <p className="text-xs text-[#4a4843]">
                Ajusta el titular o remate editorial antes de publicarlo en la portada o descargarlo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBorrador(null)}
              className="text-xs text-[#4a4843] underline underline-offset-4 hover:text-[#141413]"
            >
              Cerrar editor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="ed-titulo" className="block text-xs font-semibold text-[#141413] mb-1">
                Titular del expediente
              </label>
              <input
                id="ed-titulo"
                type="text"
                value={borrador.titulo}
                onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
                className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
              />
            </div>

            <div>
              <label htmlFor="ed-cita" className="block text-xs font-semibold text-[#141413] mb-1">
                Cita pasada ({borrador.pasado.fecha})
              </label>
              <textarea
                id="ed-cita"
                rows={3}
                value={borrador.pasado.cita}
                onChange={(e) =>
                  setBorrador({
                    ...borrador,
                    pasado: { ...borrador.pasado, cita: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
              />
            </div>

            <div>
              <label htmlFor="ed-desc" className="block text-xs font-semibold text-[#141413] mb-1">
                Descripción del hecho ({borrador.presente.fecha})
              </label>
              <textarea
                id="ed-desc"
                rows={3}
                value={borrador.presente.descripcion}
                onChange={(e) =>
                  setBorrador({
                    ...borrador,
                    presente: { ...borrador.presente, descripcion: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="ed-veredicto" className="block text-xs font-semibold text-[#141413] mb-1">
                Veredicto editorial
              </label>
              <input
                id="ed-veredicto"
                type="text"
                value={borrador.veredictoSatirico}
                onChange={(e) => setBorrador({ ...borrador, veredictoSatirico: e.target.value })}
                className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#dcd7cc] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={aprobarYPublicarEnVista}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#141413] text-[#f7f5f0] hover:bg-[#2c2b28]"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Publicar en portada</span>
              </button>

              <button
                type="button"
                onClick={copiarJsonBorrador}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#dcd7cc] bg-[#ffffff] text-[#141413] hover:bg-[#efeae0]"
              >
                {jsonCopiado ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#166534]" aria-hidden="true" />
                    <span className="text-[#166534]">JSON copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar JSON del caso</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={descargarJsonCompleto}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#dcd7cc] bg-[#ffffff] text-[#141413] hover:bg-[#efeae0]"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Descargar escupos.json</span>
              </button>
            </div>

            {publicadoAviso && (
              <span className="text-xs font-medium text-[#166534]">
                Agregado a la portada en esta sesión. Descarga escupos.json para persistirlo en el repositorio.
              </span>
            )}
          </div>
        </section>
      )}

      {/* Sección 1: Probador en vivo del Motor de Contradicción */}
      <section aria-labelledby="titulo-probador-motor" className="bg-[#ffffff] border border-[#dcd7cc] rounded-xl p-5 sm:p-8 space-y-5 min-w-0 overflow-hidden">
        <div className="space-y-1">
          <h3 id="titulo-probador-motor" className="font-editorial text-xl font-bold text-[#141413]">
            Evaluar una noticia en vivo con el Motor
          </h3>
          <p className="text-xs sm:text-sm text-[#4a4843]">
            Ingresa un titular o selecciona una de las últimas noticias recolectadas por el scraper para cruzarla contra el archivo histórico.
          </p>
        </div>

        {/* Selector rápido de noticias recién scrapeadas */}
        {noticiasRecientes.length > 0 && (
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#4a4843]">
              Últimas noticias capturadas por el scraper (clic para evaluar):
            </span>
            <div className="flex flex-wrap gap-2 min-w-0">
              {noticiasRecientes.slice(0, 5).map((noticia) => (
                <button
                  key={noticia.id}
                  type="button"
                  onClick={() => cargarNoticiaDeScraper(noticia)}
                  className="text-left text-xs px-3 py-1.5 rounded-md border border-[#dcd7cc] bg-[#f7f5f0] hover:bg-[#efeae0] text-[#141413] max-w-full sm:max-w-xs truncate transition-colors"
                  title={noticia.titulo}
                >
                  {noticia.medio}: {noticia.titulo}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={ejecutarMotorManual} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="md:col-span-2">
            <label htmlFor="motor-titulo" className="block text-xs font-semibold text-[#141413] mb-1">
              Titular de la noticia *
            </label>
            <input
              id="motor-titulo"
              type="text"
              required
              value={tituloPrueba}
              onChange={(e) => setTituloPrueba(e.target.value)}
              placeholder="Ej: Kast mantiene gira a China y Vietnam pese al paro de camioneros"
              className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="motor-bajada" className="block text-xs font-semibold text-[#141413] mb-1">
              Bajada o extracto (opcional)
            </label>
            <textarea
              id="motor-bajada"
              rows={2}
              value={bajadaPrueba}
              onChange={(e) => setBajadaPrueba(e.target.value)}
              placeholder="Detalles de contexto o citas de la nota..."
              className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
            />
          </div>

          <div>
            <label htmlFor="motor-medio" className="block text-xs font-semibold text-[#141413] mb-1">
              Medio de prensa
            </label>
            <input
              id="motor-medio"
              type="text"
              value={medioPrueba}
              onChange={(e) => setMedioPrueba(e.target.value)}
              placeholder="Ej: BioBioChile, CIPER, El País"
              className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
            />
          </div>

          <div>
            <label htmlFor="motor-url" className="block text-xs font-semibold text-[#141413] mb-1">
              URL exacta de la noticia
            </label>
            <input
              id="motor-url"
              type="url"
              value={urlPrueba}
              onChange={(e) => setUrlPrueba(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-[#f7f5f0] border border-[#dcd7cc] rounded-lg text-sm text-[#141413]"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#141413] text-[#f7f5f0] hover:bg-[#2c2b28] transition-colors"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Evaluar contra archivo histórico</span>
            </button>
          </div>
        </form>

        {/* Resultado en vivo del motor */}
        {resultadoMotor && (
          <div className="mt-4 pt-5 border-t border-[#dcd7cc] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#b91c1c]" aria-hidden="true" />
                <span className="font-semibold text-sm text-[#141413]">
                  Contradicción detectada: {resultadoMotor.tipoChoque}
                </span>
              </div>
              <span className="font-tabular text-xs font-semibold px-2.5 py-1 rounded bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
                Score {resultadoMotor.scoreContradiccion}%
              </span>
            </div>

            <p className="text-sm text-[#4a4843]">
              {resultadoMotor.explicacionMotor}
            </p>

            <blockquote className="font-editorial text-base text-[#141413] bg-[#f7f5f0] p-4 rounded-lg border border-[#dcd7cc]">
              «{resultadoMotor.dicho.cita}»
              <footer className="font-ui text-xs text-[#4a4843] mt-1">
                — {resultadoMotor.dicho.rol} ({resultadoMotor.dicho.fecha})
              </footer>
            </blockquote>

            <button
              type="button"
              onClick={() => prepararBorradorDesdeCandidato(resultadoMotor)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#b91c1c] text-[#ffffff] hover:bg-[#991b1b]"
            >
              <span>Abrir en el editor para publicar</span>
            </button>
          </div>
        )}

        {sinCoincidencia && (
          <div className="mt-4 pt-4 border-t border-[#dcd7cc] text-sm text-[#4a4843]">
            El motor no superó el umbral mínimo (35%) contra las citas indexadas actualmente en <code className="font-tabular text-xs">archivo-dichos.json</code>.
          </div>
        )}
      </section>

      {/* Sección 2: Cola de Candidatos Detectados por el Worker */}
      <section aria-labelledby="titulo-cola-worker" className="space-y-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="titulo-cola-worker" className="font-editorial text-xl sm:text-2xl font-bold text-[#141413]">
            Hallazgos automáticos del Worker ({candidatosIniciales.length})
          </h3>
          <span className="font-tabular text-xs text-[#4a4843]">
            Ordenados por puntuación del motor
          </span>
        </div>

        <div className="divide-y divide-[#dcd7cc] border border-[#dcd7cc] bg-[#ffffff] rounded-xl overflow-hidden min-w-0">
          {candidatosIniciales.map((cand) => (
            <article key={cand.id} className="p-5 sm:p-6 space-y-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#4a4843]">
                  <span className="font-tabular font-semibold text-[#141413]">
                    {cand.noticia.fecha}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-[#141413]">{cand.noticia.medio}</span>
                  <span>·</span>
                  <span>{cand.tipoChoque}</span>
                </div>

                <span className="font-tabular font-semibold px-2 py-0.5 rounded bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
                  Score {cand.scoreContradiccion}%
                </span>
              </div>

              <h4 className="font-editorial text-lg sm:text-xl font-bold text-[#141413]">
                {cand.noticia.titulo}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#4a4843]">
                    Dicho histórico emparejado ({cand.dicho.fecha})
                  </span>
                  <p className="font-editorial text-[#141413]">
                    «{cand.dicho.cita}»
                  </p>
                </div>

                <div className="space-y-2 md:border-l md:border-[#dcd7cc] md:pl-4">
                  <span className="text-xs font-semibold text-[#4a4843]">
                    Análisis del motor
                  </span>
                  <p className="text-xs text-[#4a4843] leading-relaxed">
                    {cand.explicacionMotor}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cand.evidenciasLexicas.map((term) => (
                      <span
                        key={term}
                        className="font-tabular text-[11px] px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#dcd7cc] text-[#141413]"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={cand.noticia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#141413] underline underline-offset-4 hover:text-[#b91c1c]"
                >
                  <span>Abrir noticia original en {cand.noticia.medio}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={() => prepararBorradorDesdeCandidato(cand)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#141413] text-[#f7f5f0] hover:bg-[#2c2b28]"
                >
                  <span>Editar y aprobar expediente</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
