import { describe, it, expect } from 'vitest';
import {
  calcularDiasEntreFechas,
  obtenerUltimoIncidente,
  calcularDiasSinEscupo,
  calcularRecordHistorico,
  filtrarIncidentes,
} from './contador';
import type { Escupo } from '../types/escupo';

const muestraMock: Escupo[] = [
  {
    id: 'test-1',
    titulo: 'Incidente Antiguo',
    categoria: 'impuestos',
    fechaIncidente: '2023-01-01',
    diasSinEscupoPrevios: 10,
    gravedad: 'leve',
    pasado: {
      fecha: '2020-01-01',
      rol: 'Candidato',
      cita: 'No pagaré impuestos',
      tipoMedio: 'tweet',
    },
    presente: {
      fecha: '2023-01-01',
      titulo: 'Pagó impuestos',
      descripcion: 'Tuvo que pagar al final',
      impacto: 'Impacto menor',
    },
    veredictoSatirico: 'Contradicción clásica',
  },
  {
    id: 'test-2',
    titulo: 'Incidente Reciente de Seguridad',
    categoria: 'seguridad',
    fechaIncidente: '2024-05-10',
    diasSinEscupoPrevios: 25,
    gravedad: 'critica',
    pasado: {
      fecha: '2021-05-01',
      rol: 'Diputado',
      cita: 'Cárcel para todos',
      tipoMedio: 'debate',
    },
    presente: {
      fecha: '2024-05-10',
      titulo: 'Pidió indulto',
      descripcion: 'Defendió liberación de reos',
      impacto: 'Escándalo público',
    },
    veredictoSatirico: 'La gravedad no perdona',
  },
];

describe('Lógica del Contador y Filtros de Escupos', () => {
  it('calcula la diferencia correcta de días entre dos fechas', () => {
    expect(calcularDiasEntreFechas('2024-01-01', '2024-01-11')).toBe(10);
    expect(calcularDiasEntreFechas('2024-01-10', '2024-01-01')).toBe(0); // No negativos
  });

  it('determina el último incidente correctamente por fecha más reciente', () => {
    const ultimo = obtenerUltimoIncidente(muestraMock);
    expect(ultimo?.id).toBe('test-2');
  });

  it('calcula los días transcurridos desde el último incidente hasta hoy', () => {
    const dias = calcularDiasSinEscupo(muestraMock, '2024-05-20');
    expect(dias).toBe(10);
  });

  it('calcula el récord histórico considerando registros previos y días actuales', () => {
    expect(calcularRecordHistorico(muestraMock, 5)).toBe(25);
    expect(calcularRecordHistorico(muestraMock, 30)).toBe(30);
  });

  it('filtra incidentes por categoría y búsqueda de texto', () => {
    const soloSeguridad = filtrarIncidentes(muestraMock, 'seguridad', '');
    expect(soloSeguridad.length).toBe(1);
    expect(soloSeguridad[0].id).toBe('test-2');

    const busquedaTexto = filtrarIncidentes(muestraMock, 'todas', 'indulto');
    expect(busquedaTexto.length).toBe(1);
    expect(busquedaTexto[0].id).toBe('test-2');

    const busquedaInexistente = filtrarIncidentes(muestraMock, 'todas', 'inexistente');
    expect(busquedaInexistente.length).toBe(0);
  });
});
