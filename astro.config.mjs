// @ts-check
import dns from 'node:dns';
import { setGlobalDispatcher, Agent } from 'undici';
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Appwrite (Fastly) publishes both A and AAAA records; Node's default
// "verbatim" DNS order may try IPv6 first and fail intermittently from some
// networks, making server-side fetch() calls to Appwrite flaky. Force IPv4
// first and disable Happy Eyeballs so one address is tried at a time.
dns.setDefaultResultOrder('ipv4first');
setGlobalDispatcher(
  new Agent({ connect: { autoSelectFamily: false, lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, family: 4 }, callback);
  } } }),
);

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
      PUBLIC_APPWRITE_ENDPOINT: envField.string({ context: 'client', access: 'public', default: 'https://cloud.appwrite.io/v1' }),
      PUBLIC_APPWRITE_PROJECT_ID: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_APPWRITE_DATABASE_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_BUCKET_ID: envField.string({ context: 'client', access: 'public', optional: true }),

      // Public collection ids — non-secret, needed for client reads/realtime
      PUBLIC_APPWRITE_COLLECTION_ARTICLES: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_ELECTIONS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_CANDIDATES: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_RESULTS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_FACTCHECKS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_HIGHLIGHTS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_STATS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_SPORTS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_HOMEPAGE_LAYOUT: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_SETTINGS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_COMMENTS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_VIEWS: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_APPWRITE_COLLECTION_STAFF: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_VAPID_PUBLIC_KEY: envField.string({ context: 'client', access: 'public', optional: true }),

      // ── Server-only secrets (never bundled to the browser) ────────────────
      APPWRITE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      APPWRITE_COLLECTION_ROLES: envField.string({ context: 'server', access: 'secret', optional: true }),
      APPWRITE_COLLECTION_INVITATIONS: envField.string({ context: 'server', access: 'secret', optional: true }),
      APPWRITE_COLLECTION_REVISIONS: envField.string({ context: 'server', access: 'secret', optional: true }),
      APPWRITE_COLLECTION_NEWSLETTER: envField.string({ context: 'server', access: 'secret', optional: true }),
      APPWRITE_COLLECTION_AUTOFETCH_SOURCES: envField.string({ context: 'server', access: 'secret', optional: true }),

      GEMINI_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      GEMINI_MODEL: envField.string({ context: 'server', access: 'public', optional: true, default: 'gemini-3.1-flash-lite' }),
      GROQ_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      COHERE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      OPENROUTER_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      DEEPSEEK_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      ZYTE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});