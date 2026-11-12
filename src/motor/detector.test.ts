import { describe, it, expect } from 'vitest';
import {
  evaluarContradiccion,
  detectarContradiccionesEnLote,
  normalizarTexto,
} from './detector';
import archivoDichos from '../data/archivo-dichos.json';
import type { DichoHistorico, NoticiaScrapeada } from '../types/escupo';

const dichos = archivoDichos as DichoHistorico[];

describe('Motor de Detección de Contradicciones', () => {
  it('normaliza texto eliminando tildes y puntuación', () => {
    expect(normalizarTexto('¡Gira a China y Japón!')).toBe('gira a china y japon');
  });

  it('detecta contradicción de viaje en medio de crisis con score alto', () => {
    const noticia: NoticiaScrapeada = {
      id: 'news-viaje-1',
      titulo: 'Kast confirma gira a Vietnam y China pese a críticas por paro indefinido de camioneros',
      bajada: 'Oposición reflotó retro-tuits acusando doble estándar tras mantener el viaje al extranjero.',
      medio: 'BioBioChile',
      fecha: '2026-11-12',
      url: 'https://www.biobiochile.cl/noticias/ejemplo',
    };

    const resultados = detectarContradiccionesEnLote([noticia], dichos, 45);
    expect(resultados.length).toBe(1);
    expect(resultados[0].scoreContradiccion).toBeGreaterThanOrEqual(70);
    expect(resultados[0].dicho.id).toBe('dicho-giras-extranjero');
    expect(resultados[0].tipoChoque).toBe('Doble estándar');
  });

  it('detecta contradicción en decretos de rebaja de penas a abusadores', () => {
    const noticia: NoticiaScrapeada = {
      id: 'news-rabat-1',
      titulo: 'Kast respalda al ministro Fernando Rabat tras decretos que rebajaron penas a violadores',
      bajada: 'La rebaja de condenas benefició a 56 reos pese a promesa de mano dura.',
      medio: 'El País',
      fecha: '2026-11-03',
      url: 'https://elpais.com/ejemplo',
    };

    const resultados = detectarContradiccionesEnLote([noticia], dichos, 45);
    expect(resultados.length).toBe(1);
    expect(resultados[0].dicho.id).toBe('dicho-indulto-abusadores');
    expect(resultados[0].scoreContradiccion).toBeGreaterThanOrEqual(65);
  });

  it('descarta noticias no relacionadas con promesas históricas', () => {
    const noticiaIrrelevante: NoticiaScrapeada = {
      id: 'news-clima-1',
      titulo: 'Pronóstico del tiempo anuncia precipitaciones aisladas en la región de Los Lagos',
      bajada: 'Temperaturas mínimas bajarán a 6 grados durante el fin de semana.',
      medio: 'Meteored',
      fecha: '2026-11-12',
      url: 'https://ejemplo.cl/clima',
    };

    const resultados = detectarContradiccionesEnLote([noticiaIrrelevante], dichos, 45);
    expect(resultados.length).toBe(0);
  });

  it('impide asociar una noticia anterior a la fecha en que se emitió el dicho', () => {
    const dicho = dichos.find((d) => d.id === 'dicho-indulto-abusadores')!;
    const noticiaAntigua: NoticiaScrapeada = {
      id: 'news-old',
      titulo: 'Debate sobre rebaja de condenas e indultos en 2020',
      bajada: 'Discusión en el Congreso sobre penas carcelarias.',
      medio: 'Emol',
      fecha: '2020-05-01',
      url: 'https://emol.com/ejemplo',
    };

    const match = evaluarContradiccion(noticiaAntigua, dicho);
    expect(match).toBeNull();
  });
});
