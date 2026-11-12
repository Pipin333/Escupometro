import React from 'react';
import datosCandidatos from '../data/candidatos.json';
import datosNoticias from '../data/noticias-recientes.json';
import datosDichos from '../data/archivo-dichos.json';
import type {
  CandidatoContradiccion,
  DichoHistorico,
  Escupo,
  NoticiaScrapeada,
} from '../types/escupo';
import { MesaRedaccion } from './MesaRedaccion';

interface MesaRedaccionDevProps {
  escuposActuales: Escupo[];
  onPublicarEscupo: (nuevo: Escupo) => void;
}

/**
 * Puente de carga exclusiva para entorno de desarrollo (`import.meta.env.DEV`),
 * manteniendo `MesaRedaccion` y los datos del worker fuera del bundle de producción.
 */
const MesaRedaccionDev: React.FC<MesaRedaccionDevProps> = ({
  escuposActuales,
  onPublicarEscupo,
}) => {
  return (
    <MesaRedaccion
      candidatosIniciales={datosCandidatos as CandidatoContradiccion[]}
      noticiasRecientes={datosNoticias as NoticiaScrapeada[]}
      dichosHistoricos={datosDichos as DichoHistorico[]}
      escuposActuales={escuposActuales}
      onPublicarEscupo={onPublicarEscupo}
    />
  );
};

export default MesaRedaccionDev;
