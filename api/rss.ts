import { scrapearPrensaChilena } from '../pipeline/scrapers/rss-prensa.js';

export const maxDuration = 30;

const CACHE_TTL_MS = 15 * 60_000;
let cachePayload: string | null = null;
let cacheExpiraEn = 0;
let consultaEnVuelo: Promise<string> | null = null;

async function obtenerPayloadRssCacheado(): Promise<string> {
  const ahora = Date.now();
  if (cachePayload && ahora < cacheExpiraEn) {
    return cachePayload;
  }

  if (!consultaEnVuelo) {
    consultaEnVuelo = (async () => {
      try {
        const { noticias, errores } = await scrapearPrensaChilena();
        if (errores.length > 0) {
          console.warn(`[api/rss] ${errores.length} fuente(s) con error transitorio.`);
        }
        const payload = JSON.stringify({
          items: noticias.slice(0, 60),
          fetchedAt: new Date().toISOString(),
          fuentesConError: errores.length > 0 ? errores.length : undefined,
        });
        cachePayload = payload;
        cacheExpiraEn = Date.now() + CACHE_TTL_MS;
        return payload;
      } finally {
        consultaEnVuelo = null;
      }
    })();
  }

  return consultaEnVuelo;
}

/**
 * Función serverless de Vercel para agregar feeds RSS políticos chilenos sin CORS,
 * con protección anti cache-busting, deduplicación en vuelo y caché CDN de 15 minutos.
 */
export async function GET(request?: Request): Promise<Response> {
  if (request) {
    try {
      const parsed = new URL(request.url);
      if (parsed.search) {
        return new Response(null, {
          status: 308,
          headers: {
            Location: parsed.pathname || '/api/rss',
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    } catch {
      // Continuar con ruta canónica si request.url no es absoluta
    }
  }

  try {
    const payloadJson = await obtenerPayloadRssCacheado();

    return new Response(payloadJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  } catch (err) {
    console.error('[api/rss] Fallo al consultar feeds RSS:', err instanceof Error ? err.message : 'error');
    return new Response(
      JSON.stringify({
        error: 'No se pudieron consultar los feeds RSS en este momento.',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
