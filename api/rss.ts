import { scrapearPrensaChilena } from '../pipeline/scrapers/rss-prensa.js';

export const maxDuration = 30;

/**
 * Función serverless de Vercel para agregar feeds RSS políticos chilenos sin CORS
 * y con caché perimetral (Edge) de 15 minutos.
 */
export async function GET(): Promise<Response> {
  try {
    const { noticias, errores } = await scrapearPrensaChilena();
    const payload = {
      items: noticias.slice(0, 60),
      fetchedAt: new Date().toISOString(),
      errores: errores.length > 0 ? errores : undefined,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'No se pudieron consultar los feeds RSS en este momento.',
        detalle: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
