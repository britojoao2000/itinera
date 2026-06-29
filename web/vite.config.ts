/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function polyfillEvents() {
  return {
    name: 'polyfill-events',
    resolveId(id) {
      if (id === 'events') {
        return '\0events';
      }
    },
    load(id) {
      if (id === '\0events') {
        const filePath = resolve(__dirname, './node_modules/events/events.js');
        const code = readFileSync(filePath, 'utf8');
        return `
          const module = { exports: {} };
          const exports = module.exports;
          (function() {
            ${code}
          })();
          const EventEmitter = module.exports;
          export default EventEmitter;
          export { EventEmitter };
        `;
      }
    }
  };
}

export default defineConfig({
  plugins: [polyfillEvents(), sveltekit()],

  // PouchDB (added later under src/lib/db) expects a Node-style `global`.
  define: {
    global: 'globalThis'
  },

  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['e2e/**', 'node_modules/**']
  }
});