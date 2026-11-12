import { describe, expect, it } from 'vitest';
import {
  construirUrlArchivo,
  extraerCapturasPorTweet,
  extraerTweetDesdeHtmlArchivado,
  fechaDesdeSnowflake,
  type CapturaTweet,
} from './wayback-tweets';

describe('wayback-tweets', () => {
  describe('extraerCapturasPorTweet', () => {
    it('filtra por usuario sin distinguir mayusculas, ignora cabecera, filas vacias y resumeKey, y agrupa por tweetId', () => {
      const filasCdx: string[][] = [
        ['timestamp', 'original', 'statuscode'],
        [],
        ['resumeKey123'],
        ['20210101000000', 'https://twitter.com/otrousuario/status/1000081964085497861', '200'],
        ['20210101000000', 'https://example.com/joseantoniokast/status/1000081964085497861', '200'],
        ['20210101000000', 'https://twitter.com/joseantoniokast/following', '200'],
        ['20200501120000', 'http://twitter.com/JoseAntonioKast/status/1000081964085497861/photo/1', '200'],
        ['20210601100000', 'https://x.com/JOSEANTONIOKAST/status/2000000000000000000?s=20', '200'],
      ];

      const mapa = extraerCapturasPorTweet(filasCdx, 'joseantoniokast');

      expect(mapa.size).toBe(2);
      expect(mapa.get('1000081964085497861')).toEqual([
        {
          tweetId: '1000081964085497861',
          timestamp: '20200501120000',
          original: 'http://twitter.com/JoseAntonioKast/status/1000081964085497861/photo/1',
        },
      ]);
      expect(mapa.get('2000000000000000000')).toEqual([
        {
          tweetId: '2000000000000000000',
          timestamp: '20210601100000',
          original: 'https://x.com/JOSEANTONIOKAST/status/2000000000000000000?s=20',
        },
      ]);
    });

    it('procesa filas CDX aun cuando no hay fila de cabecera', () => {
      const filasCdx: string[][] = [
        ['20210304120000', 'https://twitter.com/joseantoniokast/status/111222333444', '200'],
      ];

      const mapa = extraerCapturasPorTweet(filasCdx, 'JoseAntonioKast');

      expect(mapa.get('111222333444')).toEqual([
        {
          tweetId: '111222333444',
          timestamp: '20210304120000',
          original: 'https://twitter.com/joseantoniokast/status/111222333444',
        },
      ]);
    });

    it('ordena por prioridad de host y timestamp ascendente y elimina duplicados exactos', () => {
      const filasCdx: string[][] = [
        ['timestamp', 'original', 'statuscode'],
        ['20200101000000', 'https://x.com/joseantoniokast/status/1000081964085497861', '200'],
        ['20210101000000', 'https://mobile.twitter.com/joseantoniokast/status/1000081964085497861', '200'],
        ['20220202000000', 'https://twitter.com/joseantoniokast/status/1000081964085497861', '200'],
        ['20220101000000', 'https://twitter.com/joseantoniokast/status/1000081964085497861', '200'],
        ['20220101000000', 'https://twitter.com/joseantoniokast/status/1000081964085497861', '301'],
        ['20200101000000', 'https://x.com/joseantoniokast/status/222333444555', '200'],
        ['20210101000000', 'https://mobile.twitter.com/joseantoniokast/status/222333444555', '200'],
        ['20230101000000', 'https://www.twitter.com/joseantoniokast/status/222333444555', '200'],
      ];

      const mapa = extraerCapturasPorTweet(filasCdx, 'joseantoniokast');

      expect(mapa.get('1000081964085497861')).toEqual([
        {
          tweetId: '1000081964085497861',
          timestamp: '20220101000000',
          original: 'https://twitter.com/joseantoniokast/status/1000081964085497861',
        },
        {
          tweetId: '1000081964085497861',
          timestamp: '20220202000000',
          original: 'https://twitter.com/joseantoniokast/status/1000081964085497861',
        },
        {
          tweetId: '1000081964085497861',
          timestamp: '20210101000000',
          original: 'https://mobile.twitter.com/joseantoniokast/status/1000081964085497861',
        },
        {
          tweetId: '1000081964085497861',
          timestamp: '20200101000000',
          original: 'https://x.com/joseantoniokast/status/1000081964085497861',
        },
      ]);

      expect(mapa.get('222333444555')).toEqual([
        {
          tweetId: '222333444555',
          timestamp: '20230101000000',
          original: 'https://www.twitter.com/joseantoniokast/status/222333444555',
        },
        {
          tweetId: '222333444555',
          timestamp: '20210101000000',
          original: 'https://mobile.twitter.com/joseantoniokast/status/222333444555',
        },
        {
          tweetId: '222333444555',
          timestamp: '20200101000000',
          original: 'https://x.com/joseantoniokast/status/222333444555',
        },
      ]);
    });
  });

  describe('fechaDesdeSnowflake', () => {
    it('convierte IDs snowflake validos a fecha UTC YYYY-MM-DD', () => {
      expect(fechaDesdeSnowflake('1000081964085497861')).toBe('2018-05-25');
      expect(fechaDesdeSnowflake('29700859247')).toBe('2010-11-04');
    });

    it('devuelve null para IDs bajo el umbral, vacios o no numericos', () => {
      expect(fechaDesdeSnowflake('29700859246')).toBeNull();
      expect(fechaDesdeSnowflake('12345678')).toBeNull();
      expect(fechaDesdeSnowflake('')).toBeNull();
      expect(fechaDesdeSnowflake('no-es-numero')).toBeNull();
      expect(fechaDesdeSnowflake('1000081964085497861abc')).toBeNull();
    });
  });

  describe('extraerTweetDesdeHtmlArchivado', () => {
    it('extrae texto desde parrafo jumbo quitando enlaces u-hidden y calcula fecha snowflake', () => {
      const html = `
<title>José Antonio Kast Rist 🇨🇱 on Twitter: &quot;Si esto es verdad, seria un poco de sensatez dentro de tanta reacción demagógica y populista. Es hora de que el sentido común marche por las calles, antes que las minorías radicales lo terminen destruyendo todo… https://t.co/gwyLRAbmFS&quot;</title>
<meta  property="og:description" content="“Si esto es verdad, seria un poco de sensatez dentro de tanta reacción demagógica y populista. Es hora de que el sentido común marche por las calles, antes que las minorías radicales lo terminen destruyendo todo”">
<link rel="canonical" href="https://twitter.com/joseantoniokast/status/1000081964085497861">
<div class="js-tweet-text-container">
  <p class="TweetTextSize TweetTextSize--jumbo js-tweet-text tweet-text" lang="es" data-aria-label-part="0">Si esto es verdad, seria un poco de sensatez dentro de tanta reacción demagógica y populista. Es hora de que el sentido común marche por las calles, antes que las minorías radicales lo terminen destruyendo todo <a href="https://t.co/gwyLRAbmFS" class="twitter-timeline-link u-hidden" data-pre-embedded="true" dir="ltr">pic.twitter.com/gwyLRAbmFS</a></p>
</div>`;

      const resultado = extraerTweetDesdeHtmlArchivado(
        html,
        '1000081964085497861',
        'JoseAntonioKast'
      );

      expect(resultado).toEqual({
        texto:
          'Si esto es verdad, seria un poco de sensatez dentro de tanta reacción demagógica y populista. Es hora de que el sentido común marche por las calles, antes que las minorías radicales lo terminen destruyendo todo',
        fecha: '2018-05-25',
      });
    });

    it('ignora parrafos sin clase jumbo previos al tweet principal y decodifica entidades', () => {
      const html = `
<div class="reply">
  <p class="TweetTextSize js-tweet-text tweet-text">Tweet padre que no debe seleccionarse</p>
</div>
<div class="js-tweet-text-container">
  <p class="TweetTextSize TweetTextSize--jumbo js-tweet-text tweet-text">Orden &amp; &quot;progreso&quot; &#39;real&#39; <a href="https://twitter.com/ejemplo">@ejemplo</a> &lt;ok&gt;&nbsp;con   espacios <a href="https://t.co/abc" class="twitter-timeline-link u-hidden">pic.twitter.com/abc</a></p>
</div>`;

      const resultado = extraerTweetDesdeHtmlArchivado(
        html,
        '1000081964085497861',
        'joseantoniokast'
      );

      expect(resultado).toEqual({
        texto: 'Orden & "progreso" \'real\' @ejemplo <ok> con espacios',
        fecha: '2018-05-25',
      });
    });

    it('usa og:description sin comillas tipograficas como respaldo cuando falta parrafo jumbo', () => {
      const html = `
<title>José Antonio Kast Rist on Twitter: &quot;Texto alternativo del titulo&quot;</title>
<meta  property="og:description" content="“Propuesta de orden &amp; progreso en el pais”">`;

      const resultado = extraerTweetDesdeHtmlArchivado(
        html,
        '1000081964085497861',
        'joseantoniokast'
      );

      expect(resultado).toEqual({
        texto: 'Propuesta de orden & progreso en el pais',
        fecha: '2018-05-25',
      });
    });

    it('usa el titulo como ultimo respaldo cuando faltan parrafo jumbo y og:description', () => {
      const htmlEntidades = `
<title>José Antonio Kast Rist on Twitter: &quot;Vamos a defender el sentido comun &amp; la libertad&quot;</title>`;
      const htmlComillaLiteral = `
<title>José Antonio Kast Rist on Twitter: "Propuesta de austeridad fiscal"</title>`;

      expect(
        extraerTweetDesdeHtmlArchivado(htmlEntidades, '1000081964085497861', 'joseantoniokast')
      ).toEqual({
        texto: 'Vamos a defender el sentido comun & la libertad',
        fecha: '2018-05-25',
      });

      expect(
        extraerTweetDesdeHtmlArchivado(htmlComillaLiteral, '1000081964085497861', 'joseantoniokast')
      ).toEqual({
        texto: 'Propuesta de austeridad fiscal',
        fecha: '2018-05-25',
      });
    });

    it('devuelve null si canonical corresponde a otro usuario o si no hay texto extraible', () => {
      const htmlOtroUsuario = `
<link rel="canonical" href="https://twitter.com/otrousuario/status/1000081964085497861">
<p class="TweetTextSize TweetTextSize--jumbo js-tweet-text tweet-text">Texto valido pero de otra cuenta</p>`;

      expect(
        extraerTweetDesdeHtmlArchivado(htmlOtroUsuario, '1000081964085497861', 'joseantoniokast')
      ).toBeNull();

      expect(
        extraerTweetDesdeHtmlArchivado('<html><body></body></html>', '1000081964085497861', 'joseantoniokast')
      ).toBeNull();
    });

    it('calcula fecha con data-time posterior a data-tweet-id para IDs pre-snowflake', () => {
      const htmlConDataTime = `
<div data-tweet-id="99999999" data-time="1000000000"></div>
<div data-tweet-id="12345678">
  <span class="_timestamp" data-time="1262304000"></span>
  <p class="TweetTextSize TweetTextSize--jumbo js-tweet-text tweet-text">Mensaje historico previo a snowflake</p>
</div>`;

      expect(
        extraerTweetDesdeHtmlArchivado(htmlConDataTime, '12345678', 'joseantoniokast')
      ).toEqual({
        texto: 'Mensaje historico previo a snowflake',
        fecha: '2010-01-01',
      });

      const htmlSinDataTime = `
<p class="TweetTextSize TweetTextSize--jumbo js-tweet-text tweet-text">Mensaje historico sin timestamp</p>`;

      expect(
        extraerTweetDesdeHtmlArchivado(htmlSinDataTime, '12345678', 'joseantoniokast')
      ).toEqual({
        texto: 'Mensaje historico sin timestamp',
        fecha: null,
      });
    });
  });

  describe('construirUrlArchivo', () => {
    it('construye la URL de Wayback Machine usando timestamp y original', () => {
      const captura: CapturaTweet = {
        tweetId: '1000081964085497861',
        timestamp: '20211220021329',
        original: 'https://twitter.com/joseantoniokast/status/1000081964085497861',
      };

      expect(construirUrlArchivo(captura)).toBe(
        'https://web.archive.org/web/20211220021329/https://twitter.com/joseantoniokast/status/1000081964085497861'
      );
    });
  });
});
