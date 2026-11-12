import { describe, it, expect } from 'vitest';
import datosEscupos from './escupos.json';
import { filtrarIncidentes, obtenerUltimoIncidente } from '../lib/contador';
import type { CategoriaEscupo, Escupo } from '../types/escupo';

const CATEGORIAS_VALIDAS = new Set<CategoriaEscupo>([
  'impuestos',
  'nepotismo',
  'seguridad',
  'constitucion',
  'gasto-publico',
  'libertades',
]);

const GRAVEDADES_VALIDAS = new Set<Escupo['gravedad']>([
  'leve',
  'moderada',
  'critica',
  'termocéfala',
]);

const MEDIOS_PASADO_VALIDOS = new Set<Escupo['pasado']['tipoMedio']>([
  'tweet',
  'prensa',
  'debate',
  'congreso',
]);

describe('Integridad del catálogo escupos.json', () => {
  it('cada registro cumple estrictamente la estructura de Escupo y tiene id único', () => {
    expect(Array.isArray(datosEscupos)).toBe(true);
    expect(datosEscupos.length).toBeGreaterThan(0);

    const idsVistos = new Set<string>();

    for (const raw of datosEscupos) {
      const registro = raw as Record<string, unknown>;
      expect(typeof registro.id, `id inválido en ${String(registro.id)}`).toBe('string');
      expect((registro.id as string).trim().length).toBeGreaterThan(0);
      expect(idsVistos.has(registro.id as string), `id duplicado: ${String(registro.id)}`).toBe(false);
      idsVistos.add(registro.id as string);

      expect(typeof registro.titulo, `titulo faltante en ${String(registro.id)}`).toBe('string');
      expect(CATEGORIAS_VALIDAS.has(registro.categoria as CategoriaEscupo), `categoria inválida en ${String(registro.id)}`).toBe(true);
      expect(typeof registro.fechaIncidente, `fechaIncidente faltante en ${String(registro.id)}`).toBe('string');
      expect(typeof registro.diasSinEscupoPrevios, `diasSinEscupoPrevios inválido en ${String(registro.id)}`).toBe('number');
      expect(GRAVEDADES_VALIDAS.has(registro.gravedad as Escupo['gravedad']), `gravedad inválida en ${String(registro.id)}`).toBe(true);
      expect(typeof registro.veredictoSatirico, `veredictoSatirico faltante en ${String(registro.id)}`).toBe('string');

      const pasado = registro.pasado as Record<string, unknown> | undefined;
      expect(pasado && typeof pasado === 'object', `pasado faltante en ${String(registro.id)}`).toBe(true);
      expect(typeof pasado?.fecha, `pasado.fecha faltante en ${String(registro.id)}`).toBe('string');
      expect(typeof pasado?.rol, `pasado.rol faltante en ${String(registro.id)}`).toBe('string');
      expect(typeof pasado?.cita, `pasado.cita faltante en ${String(registro.id)}`).toBe('string');
      expect(
        MEDIOS_PASADO_VALIDOS.has(pasado?.tipoMedio as Escupo['pasado']['tipoMedio']),
        `pasado.tipoMedio inválido en ${String(registro.id)}`
      ).toBe(true);

      const presente = registro.presente as Record<string, unknown> | undefined;
      expect(presente && typeof presente === 'object', `presente faltante en ${String(registro.id)}`).toBe(true);
      expect(typeof presente?.fecha, `presente.fecha faltante en ${String(registro.id)}`).toBe('string');
      expect(typeof presente?.titulo, `presente.titulo faltante en ${String(registro.id)}`).toBe('string');
      expect(typeof presente?.descripcion, `presente.descripcion faltante en ${String(registro.id)}`).toBe('string');
      expect(typeof presente?.impacto, `presente.impacto faltante en ${String(registro.id)}`).toBe('string');
    }
  });

  it('permite filtrar y calcular el último incidente sin lanzar excepciones', () => {
    const lista = datosEscupos as Escupo[];
    expect(() => filtrarIncidentes(lista, 'todas', 'kast')).not.toThrow();
    expect(obtenerUltimoIncidente(lista)?.id).toBeTruthy();
  });
});
