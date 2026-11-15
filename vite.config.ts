import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function validarSiteUrlBase(siteUrl?: string): string | null {
  if (!siteUrl) return null;
  const trimmed = siteUrl.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    const baseLimpia = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
    if (/[&"'<>]/.test(baseLimpia)) return null;
    return baseLimpia;
  } catch {
    return null;
  }
}

function metaTagsRedesPlugin(siteUrl?: string): Plugin {
  return {
    name: 'meta-tags-redes-gh-pages',
    transformIndexHtml(html) {
      const limpia = validarSiteUrlBase(siteUrl);
      if (!limpia) return html;

      return {
        html: html.replaceAll(
          'content="./og-cover.jpg"',
          `content="${limpia}/og-cover.jpg"`
        ),
        tags: [
          {
            tag: 'meta',
            attrs: { property: 'og:url', content: `${limpia}/` },
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

function cspMetaBuildPlugin(): Plugin {
  const cspMeta =
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

  return {
    name: 'csp-meta-build',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta name="viewport"',
        `<meta http-equiv="Content-Security-Policy" content="${cspMeta}" />\n    <meta name="viewport"`
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
      server.middlewares.use('/api/rss', async (req, res) => {
        const metodo = (req as { method?: string }).method;
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (metodo !== 'GET' && metodo !== 'HEAD') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Método no permitido.' }));
          return;
        }

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
          res.end(metodo === 'HEAD' ? undefined : cachePayload);
        } catch {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: 'Fallo al consultar feeds RSS locales.',
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
      cspMetaBuildPlugin(),
      devApiRssPlugin(),
    ],
    server: {
      port: 5173,
      host: true,
    },
  };
});
