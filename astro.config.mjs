// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://yanci.ng',
  trailingSlash: 'never',
  adapter: node({
    mode: 'standalone',
    staticHeaders: true,
  }),
  integrations: [react(), sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-icons/fa6',
      ],
    },
    ssr: {
      noExternal: ['react-icons'],
    },
  },
  env: {
    schema: {
      // ─── Public (safe for client) ─────────────────────────────────────────
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', default: 'https://yanci.ng' }),
      PUBLIC_VAPID_PUBLIC_KEY: envField.string({ context: 'client', access: 'public', optional: true }),

      // ── Server-only database & storage ────────────────────────────────────
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      R2_ACCOUNT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      R2_ACCESS_KEY_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      R2_SECRET_ACCESS_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      R2_BUCKET_NAME: envField.string({ context: 'server', access: 'secret', optional: true }),
      R2_PUBLIC_URL: envField.string({ context: 'client', access: 'public', optional: true }),

      // ── AI & Crawlers (Server-only) ───────────────────────────────────────
      GEMINI_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      GEMINI_MODEL: envField.string({ context: 'server', access: 'public', optional: true, default: 'gemini-3.1-flash-lite' }),
      GROQ_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      COHERE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      OPENROUTER_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      DEEPSEEK_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      ZYTE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      FIRECRAWL_API_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      FIRECRAWL_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
