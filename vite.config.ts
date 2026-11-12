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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    base: env.VITE_BASE_PATH || './',
    plugins: [
      react(),
      tailwindcss(),
      metaTagsRedesPlugin(env.VITE_SITE_URL),
    ],
    server: {
      port: 5173,
      host: true,
    },
  };
});
