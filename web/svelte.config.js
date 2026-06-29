import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Static SPA: every route falls back to index.html and boots the client router,
    // so the app runs with no server (served as static files from `build/`).
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false
    }),
    // We register `src/service-worker.ts` manually (see src/lib/pwa.ts) so we can
    // surface an "update available / ready offline" prompt.
    serviceWorker: {
      register: false
    },
    // Strict CSP for the installable PWA. The static adapter cannot mint per-request
    // nonces, so `mode: 'hash'` embeds stable hashes of SvelteKit's inline hydration
    // bootstrap into a `meta http-equiv="content-security-policy"` in the prerendered
    // shell/fallback – satisfying `script-src 'self'` WITHOUT `unsafe-inline`.
    // Caddy stops sending a content CSP header, so this <meta> is the single source of truth.
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self', 'unsafe-inline'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'blob:', 'data:'],
        'font-src': ['self'],
        'connect-src': ['self'],
        'worker-src': ['self', 'blob:'],
        'frame-src': ['self', 'blob:'],
        'child-src': ['self', 'blob:'],
        'manifest-src': ['self'],
        'object-src': ['none'],
        'base-uri': ['self']
      }
    }
    // `$lib` -> `src/lib` is provided by SvelteKit out of the box (config.kit.files.lib).
    // It is reserved, so we intentionally do NOT redeclare it under `kit.alias`.
  }
};

export default config;
