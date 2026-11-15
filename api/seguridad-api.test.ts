import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import escuposData from '../src/data/escupos.json';
import { GET as encuestaGet, POST as encuestaPost } from './encuesta';
import { GET as votosGet, POST as votosPost } from './votos';
import { GET as rssGet } from './rss';
import { GET as ogGet } from './og';

const ID_VALIDO = escuposData[0]?.id ?? '';

function construirPostJson(
  url: string,
  cuerpo: string,
  headersExtra: Record<string, string> = {}
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      origin: 'https://escupometro.vercel.app',
      'content-type': 'application/json',
      ...headersExtra,
    },
    body: cuerpo,
  });
}

describe('seguridad en endpoints serverless (/api/*)', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://ejem-redis.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token-test-no-real-12345');
    vi.stubEnv('RATE_LIMIT_SALT', 'sal-test-hmac');
    vi.stubEnv('VOTE_COOKIE_SECRET', 'secreto-cookie-test-hmac');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('bloquea CSRF cross-site, Origin extraño y Content-Type distinto de JSON', async () => {
    const reqCrossSite = construirPostJson(
      'https://escupometro.vercel.app/api/encuesta',
      JSON.stringify({ opcion: 'aprueba' }),
      { 'sec-fetch-site': 'cross-site' }
    );
    expect((await encuestaPost(reqCrossSite)).status).toBe(403);

    const reqOriginMalo = construirPostJson(
      'https://escupometro.vercel.app/api/votos',
      JSON.stringify({ id: ID_VALIDO, accion: 'sumar' }),
      { origin: 'https://atacante.tld' }
    );
    expect((await votosPost(reqOriginMalo)).status).toBe(403);

    const reqTextoPlano = new Request('https://escupometro.vercel.app/api/encuesta', {
      method: 'POST',
      headers: {
        origin: 'https://escupometro.vercel.app',
        'content-type': 'text/plain',
      },
      body: JSON.stringify({ opcion: 'aprueba' }),
    });
    expect((await encuestaPost(reqTextoPlano)).status).toBe(415);
  });

  it('rechaza cargas JSON mayores a 2048 bytes con HTTP 413', async () => {
    const payloadGigante = JSON.stringify({
      opcion: 'aprueba',
      relleno: 'x'.repeat(2500),
    });

    const reqStreaming = construirPostJson(
      'https://escupometro.vercel.app/api/encuesta',
      payloadGigante
    );
    expect((await encuestaPost(reqStreaming)).status).toBe(413);

    const reqHeader = construirPostJson(
      'https://escupometro.vercel.app/api/votos',
      JSON.stringify({ id: ID_VALIDO, accion: 'sumar' }),
      { 'content-length': '5000' }
    );
    expect((await votosPost(reqHeader)).status).toBe(413);
  });

  it('rechaza IDs inexistentes o contaminantes en /api/votos antes de tocar Redis', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resDesconocido = await votosPost(
      construirPostJson(
        'https://escupometro.vercel.app/api/votos',
        JSON.stringify({ id: 'expediente-inventado-spam', accion: 'sumar' })
      )
    );
    expect(resDesconocido.status).toBe(400);

    const resProto = await votosPost(
      construirPostJson(
        'https://escupometro.vercel.app/api/votos',
        '{"id":"__proto__","accion":"sumar"}'
      )
    );
    expect(resProto.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('emite cookie HttpOnly firmada en voto válido y reutiliza cookie válida sin reemitirla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([{ result: [1, 42] }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const primera = await votosPost(
      construirPostJson(
        'https://escupometro.vercel.app/api/votos',
        JSON.stringify({ id: ID_VALIDO, accion: 'sumar' })
      )
    );
    expect(primera.status).toBe(200);
    const setCookie = primera.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('ck_votante=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    const valorCookie = setCookie.split(';')[0] ?? '';

    const segunda = await votosPost(
      construirPostJson(
        'https://escupometro.vercel.app/api/votos',
        JSON.stringify({ id: ID_VALIDO, accion: 'restar' }),
        { cookie: valorCookie }
      )
    );
    expect(segunda.status).toBe(200);
    expect(segunda.headers.get('set-cookie')).toBeNull();

    const manipulada = await votosPost(
      construirPostJson(
        'https://escupometro.vercel.app/api/votos',
        JSON.stringify({ id: ID_VALIDO, accion: 'restar' }),
        { cookie: 'ck_votante=00000000-0000-4000-8000-000000000000.deadbeef' }
      )
    );
    expect(manipulada.status).toBe(200);
    expect(manipulada.headers.get('set-cookie')).toContain('ck_votante=');
  });

  it('devuelve HTTP 429 ante límite de tasa en POST y GET, y no filtra detalle interno en errores', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([{ result: [-1] }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const ratePost = await encuestaPost(
      construirPostJson(
        'https://escupometro.vercel.app/api/encuesta',
        JSON.stringify({ opcion: 'neutral' })
      )
    );
    expect(ratePost.status).toBe(429);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([{ result: 99 }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );
    const rateGet = await votosGet(
      new Request('https://escupometro.vercel.app/api/votos')
    );
    expect(rateGet.status).toBe(429);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Error interno sensible upstash://secreto');
      })
    );
    const errGet = await encuestaGet(
      new Request('https://escupometro.vercel.app/api/encuesta')
    );
    expect(errGet.status).toBe(502);
    const errJson = (await errGet.json()) as Record<string, unknown>;
    expect(errJson).not.toHaveProperty('detalle');
    expect(JSON.stringify(errJson)).not.toContain('upstash://secreto');

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ result: 1 }]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              { result: [ID_VALIDO, '7', 'clave-inventada', '999', '__proto__', '5'] },
            ]),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }
          )
        )
    );
    const votosOk = await votosGet(
      new Request('https://escupometro.vercel.app/api/votos')
    );
    expect(votosOk.status).toBe(200);
    expect(votosOk.headers.get('x-content-type-options')).toBe('nosniff');
    const votosJson = (await votosOk.json()) as { votos: Record<string, number> };
    expect(votosJson.votos).toEqual({ [ID_VALIDO]: 7 });
  });

  it('canoniza URLs con query string en /api/rss y /api/og (308) y genera PNG válido en /api/og', async () => {
    const rssRedir = await rssGet(
      new Request('https://escupometro.vercel.app/api/rss?nocache=123')
    );
    expect(rssRedir.status).toBe(308);
    expect(rssRedir.headers.get('location')).toBe('/api/rss');

    const ogRedir = await ogGet(
      new Request('https://escupometro.vercel.app/api/og?foo=bar')
    );
    expect(ogRedir.status).toBe(308);
    expect(ogRedir.headers.get('location')).toBe('/api/og');

    const ogResp = await ogGet(new Request('https://escupometro.vercel.app/api/og'));
    expect(ogResp.status).toBe(200);
    expect(ogResp.headers.get('content-type')).toBe('image/png');
    expect(ogResp.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(ogResp.headers.get('x-content-type-options')).toBe('nosniff');

    const bytes = new Uint8Array(await ogResp.arrayBuffer());
    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  });
});
