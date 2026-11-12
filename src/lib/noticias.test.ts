import { describe, expect, it, vi } from 'vitest';
import type { NoticiaScrapeada } from '../types/escupo';
import {
  cargarNoticiasEnVivo,
  filtrarNoticiasPorMedioYTexto,
  formatearTiempoRelativo,
  obtenerMediosDisponibles,
} from './noticias';

const NOTICIAS_DEMO: NoticiaScrapeada[] = [
  {
    id: 'n1',
    titulo: 'Gobierno anuncia reforma de seguridad en La Moneda',
    bajada: 'El Ejecutivo ingresará urgencia esta semana en el Congreso.',
    medio: 'La Tercera',
    fecha: '2026-04-01',
    publicadoEn: '2026-04-01T14:00:00.000Z',
    url: 'https://example.com/1',
  },
  {
    id: 'n2',
    titulo: 'Oposición cuestiona cifras fiscales del trimestre',
    bajada: 'Diputados exigen mayor detalle presupuestario al Ministerio de Hacienda.',
    medio: 'BioBioChile',
    fecha: '2026-04-01',
    publicadoEn: '2026-04-01T12:00:00.000Z',
    url: 'https://example.com/2',
  },
];

describe('noticias helpers', () => {
  it('formatea tiempos relativos recientes y fechas antiguas', () => {
    const ahora = Date.parse('2026-04-01T15:00:00.000Z');
    expect(formatearTiempoRelativo('2026-04-01T15:00:00.000Z', ahora)).toBe('Recién');
    expect(formatearTiempoRelativo('2026-04-01T14:45:00.000Z', ahora)).toBe('Hace 15 min');
    expect(formatearTiempoRelativo('2026-04-01T12:00:00.000Z', ahora)).toBe('Hace 3 h');
    expect(formatearTiempoRelativo('2026-03-31T12:00:00.000Z', ahora)).toBe('Ayer');
    expect(formatearTiempoRelativo('2026-03-29T12:00:00.000Z', ahora)).toBe('Hace 3 días');
  });

  it('obtiene medios únicos ordenados alfabéticamente', () => {
    expect(obtenerMediosDisponibles(NOTICIAS_DEMO)).toEqual(['BioBioChile', 'La Tercera']);
  });

  it('filtra por medio y texto ignorando tildes y mayúsculas', () => {
    expect(filtrarNoticiasPorMedioYTexto(NOTICIAS_DEMO, 'todos', 'oposicion')).toHaveLength(1);
    expect(filtrarNoticiasPorMedioYTexto(NOTICIAS_DEMO, 'La Tercera', 'moneda')).toHaveLength(1);
    expect(filtrarNoticiasPorMedioYTexto(NOTICIAS_DEMO, 'BioBioChile', 'moneda')).toHaveLength(0);
  });

  it('usa /api/rss cuando responde ok y cae a snapshot estático cuando falla', async () => {
    const fetchOk = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: NOTICIAS_DEMO,
        fetchedAt: '2026-04-01T15:00:00.000Z',
      }),
    }) as unknown as typeof fetch;

    const vivo = await cargarNoticiasEnVivo(fetchOk);
    expect(vivo.esFallbackEstatico).toBe(false);
    expect(vivo.items).toHaveLength(2);
    expect(vivo.fetchedAt).toBe('2026-04-01T15:00:00.000Z');

    const fetchError = vi.fn().mockRejectedValue(new Error('Network down')) as unknown as typeof fetch;
    const fallback = await cargarNoticiasEnVivo(fetchError);
    expect(fallback.esFallbackEstatico).toBe(true);
    expect(Array.isArray(fallback.items)).toBe(true);
  });
});
