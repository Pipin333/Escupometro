import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Globe2, RotateCcw } from 'lucide-react';
import type { OpcionEncuesta } from '../types/escupo';
import {
  calcularResumenEncuesta,
  cargarEncuestaGlobal,
  crearEstadoInicialEncuesta,
  enviarVotoGlobal,
  guardarEncuestaLocal,
  leerEncuestaLocal,
  registrarVotoEncuesta,
  type EstadoEncuesta,
} from '../lib/encuesta';

const OPCIONES_ENCUESTA: ReadonlyArray<{
  id: OpcionEncuesta;
  etiqueta: string;
  descripcion: string;
  colorBarra: string;
}> = [
  {
    id: 'aprueba',
    etiqueta: 'Aprueba',
    descripcion: 'Respalda la gestión actual del gobierno.',
    colorBarra: 'bg-[#141413]',
  },
  {
    id: 'desaprueba',
    etiqueta: 'Desaprueba',
    descripcion: 'Rechaza la conducción actual del gobierno.',
    colorBarra: 'bg-[#b91c1c]',
  },
  {
    id: 'neutral',
    etiqueta: 'No sabe / Neutral',
    descripcion: 'Sin postura definida o evaluación mixta.',
    colorBarra: 'bg-[#6b675f]',
  },
];

/**
 * Consulta interactiva de lectores sobre apoyo al gobierno, persistida localmente en el navegador.
 */
export const EncuestaGobierno: React.FC = () => {
  const [estado, setEstado] = useState<EstadoEncuesta>(() => leerEncuestaLocal());
  const [modoGlobal, setModoGlobal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const resumen = calcularResumenEncuesta(estado.conteos);

  useEffect(() => {
    let activo = true;
    void cargarEncuestaGlobal().then((globalResp) => {
      if (!activo || !globalResp) return;
      setModoGlobal(true);
      setEstado((prev) => ({
        ...prev,
        conteos: globalResp.conteos,
        actualizadoEn: globalResp.actualizadoEn,
      }));
    });
    return () => {
      activo = false;
    };
  }, []);

  const manejarVoto = async (opcion: OpcionEncuesta) => {
    if (estado.votoUsuario === opcion || enviando) return;
    const votoAnterior = estado.votoUsuario;
    const optimista = registrarVotoEncuesta(estado, opcion);
    setEstado(optimista);
    guardarEncuestaLocal(optimista);

    if (!modoGlobal) return;

    setEnviando(true);
    try {
      const globalResp = await enviarVotoGlobal(opcion, votoAnterior);
      if (globalResp) {
        setEstado((prev) => {
          const sincronizado: EstadoEncuesta = {
            ...prev,
            conteos: globalResp.conteos,
            actualizadoEn: globalResp.actualizadoEn,
          };
          guardarEncuestaLocal(sincronizado);
          return sincronizado;
        });
      }
    } finally {
      setEnviando(false);
    }
  };

  const reiniciarEncuesta = () => {
    if (modoGlobal) return;
    const limpio = crearEstadoInicialEncuesta();
    setEstado(limpio);
    guardarEncuestaLocal(limpio);
  };

  return (
    <section
      id="encuesta-gobierno"
      aria-labelledby="titulo-encuesta-gobierno"
      className="py-10 border-t border-[#dcd7cc]"
    >
      <div className="bg-[#ffffff] border border-[#dcd7cc] rounded-lg p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 font-tabular text-xs uppercase tracking-[0.12em] text-[#4a4843] font-semibold">
              <BarChart3 className="w-3.5 h-3.5 text-[#b91c1c]" aria-hidden="true" />
              <span>Pulso de lectores</span>
              {modoGlobal && (
                <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-[#efeae0] text-[#141413] text-[10px] tracking-normal normal-case">
                  <Globe2 className="w-3 h-3 text-[#b91c1c]" aria-hidden="true" />
                  Global en vivo
                </span>
              )}
            </div>
            <h2
              id="titulo-encuesta-gobierno"
              className="font-editorial text-2xl sm:text-3xl font-bold text-[#141413] tracking-[-0.02em]"
            >
              Encuesta de apoyo al gobierno
            </h2>
            <p className="text-sm text-[#4a4843] max-w-[65ch]">
              {modoGlobal
                ? '¿Cómo evalúas la gestión actual del gobierno de José Antonio Kast? Votación abierta en tiempo real entre todos los lectores.'
                : '¿Cómo evalúas la gestión actual del gobierno de José Antonio Kast? Los votos se guardan localmente en este navegador como consulta abierta de lectores.'}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="block font-tabular text-2xl font-bold text-[#141413]">
              {resumen.total}
            </span>
            <span className="text-xs text-[#4a4843]">
              {resumen.total === 1 ? 'voto registrado' : 'votos registrados'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label="Opciones de evaluación al gobierno">
          {OPCIONES_ENCUESTA.map((opcion) => {
            const seleccionada = estado.votoUsuario === opcion.id;
            const porcentaje = resumen.porcentajes[opcion.id];
            const conteo = estado.conteos[opcion.id];

            return (
              <button
                key={opcion.id}
                type="button"
                aria-pressed={seleccionada}
                disabled={enviando}
                onClick={() => void manejarVoto(opcion.id)}
                className={`text-left p-4 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413] ${
                  seleccionada
                    ? 'border-[#141413] bg-[#f7f5f0]'
                    : 'border-[#dcd7cc] bg-[#ffffff] hover:border-[#141413]/50 hover:bg-[#f7f5f0]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#141413]">
                    {opcion.etiqueta}
                  </span>
                  {seleccionada && (
                    <CheckCircle2
                      className="w-4 h-4 text-[#b91c1c] flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <p className="text-xs text-[#4a4843] mb-4">{opcion.descripcion}</p>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs font-tabular">
                    <span className="font-semibold text-[#141413]">{porcentaje}%</span>
                    <span className="text-[#4a4843]">
                      {conteo} {conteo === 1 ? 'voto' : 'votos'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#efeae0] overflow-hidden">
                    <div
                      className={`h-full ${opcion.colorBarra} transition-[width] duration-300 ease-out`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#efeae0] text-xs text-[#4a4843]">
          <span>
            {estado.votoUsuario
              ? `Tu voto actual: ${
                  OPCIONES_ENCUESTA.find((o) => o.id === estado.votoUsuario)?.etiqueta
                }. Puedes cambiarlo en cualquier momento.`
              : 'Selecciona una opción para emitir tu voto.'}
          </span>

          {!modoGlobal && resumen.total > 0 && (
            <button
              type="button"
              onClick={reiniciarEncuesta}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#dcd7cc] text-[#141413] hover:bg-[#efeae0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141413]"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reiniciar encuesta</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
