import { describe, expect, it } from 'vitest';
import type { DichoHistorico } from '../types/escupo';
import {
  construirDichoHistorico,
  esTweetSustantivo,
  extraerConceptosClave,
  extraerIdTweetDesdeUrl,
  fusionarDichosSinDuplicados,
  inferirCategoriaDicho,
  inferirPosturaDicho,
  inferirRolPorFecha,
  normalizarFechaIso,
  normalizarUrlFuente,
} from './clasificador-dichos';

describe('clasificador-dichos', () => {
  it('normaliza fechas ISO y fechas estilo Twitter', () => {
    expect(normalizarFechaIso('2021-10-18T14:22:00.000Z')).toBe('2021-10-18');
    expect(normalizarFechaIso('Fri Nov 19 15:00:00 +0000 2021')).toBe('2021-11-19');
    expect(normalizarFechaIso('invalida')).toBe('');
  });

  it('extrae ID de status y unifica URLs entre twitter.com y x.com', () => {
    expect(
      extraerIdTweetDesdeUrl('https://twitter.com/joseantoniokast/status/1461708384729202695?s=20')
    ).toBe('1461708384729202695');
    expect(
      normalizarUrlFuente('https://twitter.com/joseantoniokast/status/123456/?s=20')
    ).toBe('https://x.com/joseantoniokast/status/123456');
    expect(
      normalizarUrlFuente('https://x.com/joseantoniokast/status/123456')
    ).toBe('https://x.com/joseantoniokast/status/123456');
  });

  it('filtra retweets y saludos cortos sin sustancia politica', () => {
    expect(esTweetSustantivo('RT @alguien: Muy buenos dias a todos')).toBe(false);
    expect(esTweetSustantivo('Buenos dias Chile! https://t.co/abc123')).toBe(false);
    expect(
      esTweetSustantivo(
        'En nuestro gobierno vamos a eliminar los pitutos y terminar con el cuoteo politico https://t.co/xyz987'
      )
    ).toBe(true);
  });

  it('infiere categorias tematicas correctamente', () => {
    expect(
      inferirCategoriaDicho('Los pitutos y parientes en cargos publicos sin merito son una verguenza')
    ).toBe('nepotismo');
    expect(
      inferirCategoriaDicho('No podemos seguir subiendo el impuesto a los combustibles ni el IVA a las pymes')
    ).toBe('impuestos');
    expect(
      inferirCategoriaDicho('Es intolerable que otorguen indultos o rebajas de condena a delincuentes')
    ).toBe('seguridad');
    expect(
      inferirCategoriaDicho('Exigimos austeridad fiscal y terminar con las giras y viaticos millonarios')
    ).toBe('gasto-publico');
  });

  it('infiere posturas normativas distintas', () => {
    expect(inferirPosturaDicho('En nuestro gobierno vamos a reducir los ministerios')).toBe('promete');
    expect(inferirPosturaDicho('No mas pitutos ni operadores politicos en el Estado')).toBe('prohibe');
    expect(inferirPosturaDicho('El ministro debe renunciar hoy mismo por respeto al pais')).toBe('exige');
    expect(inferirPosturaDicho('Que verguenza el escandalo de despilfarro en el gabinete')).toBe('condena');
  });

  it('extrae conceptos clave priorizando vocabulario de dominio y excluyendo ruido', () => {
    const conceptos = extraerConceptosClave(
      '@joseantoniokast En Chile hoy el gobierno gasta millones en viajes y viaticos mientras sube la bencina https://t.co/abc'
    );
    expect(conceptos).toContain('viaje');
    expect(conceptos).toContain('viatico');
    expect(conceptos).toContain('bencina');
    expect(conceptos).not.toContain('chile');
    expect(conceptos).not.toContain('gobierno');
  });

  it('construye un DichoHistorico completo limpiando t.co e infiriendo rol', () => {
    const dicho = construirDichoHistorico({
      fecha: '2021-11-19T12:00:00Z',
      texto: 'En nuestro gobierno vamos a terminar con los pitutos y designar solo por merito https://t.co/xyz',
      url: 'https://x.com/joseantoniokast/status/1461708384729202695',
    });

    expect(dicho).not.toBeNull();
    expect(dicho?.id).toBe('tweet-1461708384729202695');
    expect(dicho?.fecha).toBe('2021-11-19');
    expect(dicho?.rol).toBe('Líder de oposición / Candidato presidencial');
    expect(dicho?.usuarioTweet).toBe('@joseantoniokast');
    expect(dicho?.cita).not.toContain('t.co');
    expect(dicho?.categoria).toBe('nepotismo');
    expect(dicho?.postura).toBe('promete');
    expect(inferirRolPorFecha('2017-10-01')).toBe('Diputado / Candidato presidencial');
    expect(inferirRolPorFecha('2026-04-01')).toBe('Presidente en ejercicio');
  });

  it('fusiona nuevos dichos deduplicando por id, URL equivalente o texto normalizado', () => {
    const existente: DichoHistorico = {
      id: 'dicho-manual-1',
      fecha: '2021-11-19',
      rol: 'Candidato',
      tipoMedio: 'tweet',
      usuarioTweet: '@joseantoniokast',
      cita: 'No más pitutos ni operadores políticos en el Estado.',
      fuenteUrl: 'https://twitter.com/joseantoniokast/status/999000111',
      categoria: 'nepotismo',
      postura: 'prohibe',
      conceptosClave: ['pitutos', 'operadores', 'estado'],
    };

    const duplicadoPorUrl: DichoHistorico = {
      ...existente,
      id: 'tweet-999000111',
      cita: 'Cita ligeramente distinta pero mismo status URL',
      fuenteUrl: 'https://x.com/joseantoniokast/status/999000111?s=20',
    };

    const duplicadoPorTexto: DichoHistorico = {
      ...existente,
      id: 'tweet-888777666',
      cita: 'No mas pitutos ni operadores politicos en el Estado!',
      fuenteUrl: 'https://x.com/joseantoniokast/status/888777666',
    };

    const legitimoNuevo: DichoHistorico = {
      ...existente,
      id: 'tweet-555444333',
      fecha: '2024-06-15',
      cita: 'Exigimos austeridad total en las giras internacionales del Ejecutivo.',
      fuenteUrl: 'https://x.com/joseantoniokast/status/555444333',
      categoria: 'gasto-publico',
      postura: 'exige',
      conceptosClave: ['austeridad', 'giras'],
    };

    const resultado = fusionarDichosSinDuplicados(
      [existente],
      [duplicadoPorUrl, duplicadoPorTexto, legitimoNuevo]
    );

    expect(resultado.agregados).toBe(1);
    expect(resultado.omitidosDuplicados).toBe(2);
    expect(resultado.dichos).toHaveLength(2);
    expect(resultado.dichos[0].id).toBe('tweet-555444333');
  });
});
