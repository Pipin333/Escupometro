import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function metaTagsRedesPlugin(siteUrl?: string): Plugin {
  return {
    name: 'meta-tags-redes-gh-pages',
    transformIndexHtml(html) {
      const limpia = siteUrl?.replace(/\/+$/, '');
      if (!limpia) return html;

      return html
        .replaceAll(
          'content="./og-cover.jpg"',
          `content="${limpia}/og-cover.jpg"`
        )
        .replace(
          '<meta property="og:type" content="website" />',
          `<meta property="og:type" content="website" />\n    <meta property="og:url" content="${limpia}/" />`
        );
    },
  };
}

function devApiRssPlugin(): Plugin {
  let cachePayload: string | null = null;
  let cacheHasta = 0;

  return {
    name: 'dev-api-rss',
    configureServer(server) {
      server.middlewares.use('/api/rss', async (_req, res) => {
        try {
          const ahora = Date.now();
          if (!cachePayload || ahora > cacheHasta) {
            const mod = (await server.ssrLoadModule(
              '/pipeline/scrapers/rss-prensa.ts'
            )) as {
              scrapearPrensaChilena: () => Promise<{
                noticias: unknown[];
                errores: string[];
              }>;
            };
            const { noticias, errores } = await mod.scrapearPrensaChilena();
            cachePayload = JSON.stringify({
              items: noticias.slice(0, 60),
              fetchedAt: new Date().toISOString(),
              errores: errores.length > 0 ? errores : undefined,
            });
            cacheHasta = ahora + 15 * 60_000;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(cachePayload);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: 'Fallo al consultar feeds RSS locales.',
              detalle: err instanceof Error ? err.message : String(err),
            })
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['VITE_', 'VERCEL_']);
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const siteUrl =
    env.VITE_SITE_URL || (vercelHost ? `https://${vercelHost}` : undefined);

  return {
    base: env.VITE_BASE_PATH || './',
    plugins: [
      react(),
      tailwindcss(),
      metaTagsRedesPlugin(siteUrl),
      devApiRssPlugin(),
    ],
    server: {
      port: 5173,
      host: true,
    },
  };
});
