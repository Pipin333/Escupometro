import { afterEach, describe, expect, it, vi } from 'vitest';
import { limpiarHtml, scrapearFeed } from './rss-prensa';
import { extraerTweetDesdeHtmlArchivado } from './wayback-tweets';

describe('seguridad en scrapers del pipeline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('limpiarHtml no lanza RangeError ante code points inválidos o de control', () => {
    expect(() => limpiarHtml('Hola &#99999999; &#x110000; &#0; &#x1B; mundo')).not.toThrow();
    expect(limpiarHtml('Hola &#99999999; &#x110000; &#0; mundo')).toBe('Hola mundo');
  });

  it('scrapearFeed rechaza feeds en hosts privados o redirecciones SSRF', async () => {
    await expect(
      scrapearFeed({ nombre: 'Interno', url: 'http://169.254.169.254/latest/meta-data/' })
    ).rejects.toThrow(/Host privado/i);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'http://127.0.0.1:8080/secreto' },
        })
      )
    );

    await expect(
      scrapearFeed({ nombre: 'Redir', url: 'https://medio-publico.cl/rss.xml' })
    ).rejects.toThrow(/Host privado/i);
  });

  it('scrapearFeed descarta ítems cuyo enlace usa javascript: o data:', async () => {
    const xmlMalicioso = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>José Antonio Kast y medida de prueba</title>
      <link>javascript:alert(1)</link>
      <description>Kast anuncia medida</description>
      <pubDate>Mon, 15 Jun 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>José Antonio Kast firma decreto real</title>
      <link>https://www.biobiochile.cl/noticias/nacional/kast-decreto</link>
      <description>Detalle de noticia válida</description>
      <pubDate>Mon, 15 Jun 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(xmlMalicioso, { status: 200 }))
    );

    const noticias = await scrapearFeed({
      nombre: 'BioBio',
      url: 'https://www.biobiochile.cl/lista/categorias/nacional/rss',
    });

    expect(noticias).toHaveLength(1);
    expect(noticias[0]?.url).toBe('https://www.biobiochile.cl/noticias/nacional/kast-decreto');
  });

  it('extraerTweetDesdeHtmlArchivado ignora tweetId malicioso no numérico sin compilar RegExp dinámica', () => {
    const html = `
      <html>
        <head><link rel="canonical" href="https://x.com/joseantoniokast/status/123456" /></head>
        <body>
          <p class="TweetTextSize--jumbo">Texto archivado de prueba</p>
          <span data-tweet-id="123456" data-time="1700000000"></span>
        </body>
      </html>`;

    const valido = extraerTweetDesdeHtmlArchivado(html, '123456', 'joseantoniokast');
    expect(valido?.texto).toBe('Texto archivado de prueba');
    expect(valido?.fecha).toBeTruthy();

    const inyectado = extraerTweetDesdeHtmlArchivado(
      html,
      '((((a+)+)+)+$)',
      'joseantoniokast'
    );
    expect(inyectado?.texto).toBe('Texto archivado de prueba');
    expect(inyectado?.fecha).toBeNull();
  });
});
