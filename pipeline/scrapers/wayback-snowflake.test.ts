import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ingestarDesdeWayback,
  prefijosSnowflakeParaRango,
  tweetDentroDeRango,
} from './wayback-tweets';

describe('prefijosSnowflakeParaRango y filtrado moderno de Wayback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calcula prefijos Snowflake descendentes para rangos 2021-2025 y omite <= 2018', () => {
    const prefijos = prefijosSnowflakeParaRango('2021', '2025');
    expect(prefijos[0]).toBe('20');
    expect(prefijos).toContain('19');
    expect(prefijos).toContain('14');
    expect(prefijos[prefijos.length - 1]).toBe('13');
    expect(prefijosSnowflakeParaRango('2018', '2020')).toEqual([]);
  });

  it('filtra tweetIds segun fecha Snowflake dentro del rango solicitado', () => {
    const idMayo2018 = '1000033827564789762';
    const idAbril2025 = '1914730768502251758';
    const idPreSnowflake = '19049139594';

    expect(tweetDentroDeRango(idMayo2018, '2021-01-01', '2025-12-31')).toBe(false);
    expect(tweetDentroDeRango(idAbril2025, '2021-01-01', '2025-12-31')).toBe(true);
    expect(tweetDentroDeRango(idAbril2025, '2025-01-01', '2025-03-31')).toBe(false);
    expect(tweetDentroDeRango(idPreSnowflake, '2021-01-01', '2025-12-31')).toBe(false);
    expect(tweetDentroDeRango(idPreSnowflake)).toBe(true);
  });

  it('usa oEmbed primero para tweets 2021+ conservando archivoUrl y cae a snapshot si fue borrado', async () => {
    const idOEmbed = '1914730768502251758';
    const idBorrado = '1906389531160437244';

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes('web.archive.org/cdx/search/cdx')) {
        if (url.includes('status%2F19*')) {
          return new Response(
            JSON.stringify([
              ['timestamp', 'original', 'statuscode'],
              ['20250423000000', `https://twitter.com/joseantoniokast/status/${idOEmbed}`, '200'],
              ['20250401000000', `https://twitter.com/joseantoniokast/status/${idBorrado}`, '200'],
            ]),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (url.includes('publish.twitter.com/oembed')) {
        if (url.includes(idOEmbed)) {
          return new Response(
            JSON.stringify({
              author_name: 'José Antonio Kast',
              author_url: 'https://twitter.com/joseantoniokast',
              html: '<blockquote class="twitter-tweet"><p lang="es" dir="ltr">Nunca vamos a subir impuestos ni aprobar indultos en este gobierno.</p>&mdash; José Antonio Kast (@joseantoniokast) <a href="https://twitter.com/joseantoniokast/status/1914730768502251758">April 22, 2025</a></blockquote>',
            }),
            { status: 200 }
          );
        }
        return new Response('Not found', { status: 404 });
      }

      if (url.includes(`web.archive.org/web/20250401000000id_/`) && url.includes(idBorrado)) {
        return new Response(
          '<html><head><meta property="og:description" content="Recortaremos seis mil millones de dolares de gasto fiscal." /></head></html>',
          { status: 200 }
        );
      }

      return new Response('Not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const resultado = await ingestarDesdeWayback('joseantoniokast', {
      desde: '2025-03-01',
      hasta: '2025-05-01',
      maxTweets: 10,
      pausaMs: 0,
    });

    expect(resultado.errores).toEqual([]);
    expect(resultado.registros).toHaveLength(2);

    const porId = new Map(resultado.registros.map((r) => [r.id, r]));
    expect(porId.get(`tweet-${idOEmbed}`)?.texto).toContain('Nunca vamos a subir impuestos');
    expect(porId.get(`tweet-${idOEmbed}`)?.fecha).toBe('2025-04-22');
    expect(porId.get(`tweet-${idOEmbed}`)?.archivoUrl).toBe(
      `https://web.archive.org/web/20250423000000/https://twitter.com/joseantoniokast/status/${idOEmbed}`
    );

    expect(porId.get(`tweet-${idBorrado}`)?.texto).toContain('seis mil millones de dolares');
    expect(porId.get(`tweet-${idBorrado}`)?.fecha).toBe('2025-03-30');
    expect(porId.get(`tweet-${idBorrado}`)?.archivoUrl).toBe(
      `https://web.archive.org/web/20250401000000/https://twitter.com/joseantoniokast/status/${idBorrado}`
    );
  });
});
