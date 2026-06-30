# Itinera — Web (SvelteKit PWA)

A cozy, **offline-first** travel planner. Static, installable SPA built with SvelteKit + Vite + Tailwind, packaged as a PWA. Local-first data layer (`$lib/db`) uses PouchDB (IndexedDB) for all reads/writes, syncing bidirectionally with CouchDB in the background.

---

## Requirements

- Node ≥ 18.13 (tested on 20 / 22)
- pnpm (enabled via `corepack enable`)

---

## Commands

```bash
pnpm install       # install dependencies
pnpm dev           # start the dev server (http://localhost:5173)
pnpm build         # produce the static SPA in ./build
pnpm preview       # serve ./build locally (http://localhost:4173)
pnpm check         # svelte-check (types)
pnpm lint          # prettier + eslint
pnpm test          # unit tests (Vitest, jsdom)
pnpm test:e2e      # Playwright e2e (builds + previews first)
```

---

## Build Output

`pnpm build` runs `@sveltejs/adapter-static` in SPA mode and emits a fully static site to `**web/build/**` with an `index.html` fallback. Serve that directory as static files — no server runtime required. This is what `deploy/web.Dockerfile` bakes into the Caddy image.

---

## PWA

- Web app manifest at `static/manifest.webmanifest` (`name` **Itinera**, `display: standalone`, `theme_color: #2F684F`, 192/512 + maskable icons).
- Service worker: `src/service-worker.ts` (compiled to `build/service-worker.js`). Precaches the app shell and fonts for offline use. Auto-registration is disabled; `src/lib/pwa.ts` registers it in production and drives the "update available / ready offline" prompt (`src/lib/components/ReloadPrompt.svelte`).

---

## PouchDB Compatibility

PouchDB was written for Node.js and requires two compatibility shims to work in a Vite browser build:

### 1. `global` → `globalThis`

`vite.config.ts` injects:
```ts
define: { global: 'globalThis' }
```
This makes PouchDB's Node-style `global` references resolve correctly in the browser.

### 2. `events` module polyfill (`polyfillEvents` plugin)

Vite's bundler cannot resolve Node's built-in `events` module for the browser. Without a shim, PouchDB throws `TypeError: EventEmitter is not a constructor` (or `r.prototype is not an object or null`) at startup.

`vite.config.ts` contains a custom Vite plugin that:
1. Intercepts every `import ... from 'events'` (and `require('events')`) that PouchDB emits.
2. Reads `node_modules/events/events.js` directly (the `events` npm package — a browser-compatible EventEmitter).
3. Wraps it as a native ES module (`export default EventEmitter; export { EventEmitter };`).

```ts
// vite.config.ts (simplified)
function polyfillEvents() {
  return {
    name: 'polyfill-events',
    resolveId(id) { if (id === 'events') return '\0events'; },
    load(id) {
      if (id === '\0events') {
        // reads node_modules/events/events.js and re-exports as ES module
      }
    }
  };
}
```

The `events` npm package must be present in `package.json` dependencies.

### 3. Remote URL resolution (`resolveRemoteUrl` in `src/lib/db/pouch.ts`)

PouchDB requires an **absolute URL** (e.g. `http://localhost:8090/db/itinera`) to treat a replication target as HTTP — a relative path like `/db/itinera` causes PouchDB to create a second local IndexedDB instead. `pouch.ts` resolves the configured remote URL at runtime:

```ts
function resolveRemoteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${window.location.origin}${url}`;
}
```

This means sync works automatically on any origin — `localhost`, a LAN IP, a Tailscale hostname, or a public domain — without any rebuild.

---

## Design System

| Token | Value |
|---|---|
| **Theme** | Light only, warm paper |
| **Primary accent** | Forest green (`#2F684F`) |
| **Fonts** | Fraunces (headings, serif) / Inter (body, sans) |
| **Border radius scale** | `sm` 8 px · `md` 12 px · `lg` 16 px · `xl` 24 px |
| **Contrast** | AA compliant, visible 2px focus rings |
| **Tap targets** | 44px minimum |

Implemented in `tailwind.config.ts` + `src/app.css`.

### Glass & Animated Background

`src/app.css` also includes:
- `.glass-panel`, `.glass-header`, `.glass-input` — frosted glass utilities (backdrop-blur + semi-transparent background) applied to the homepage header, search input, and trip cards.
- `.mesh-container`, `.mesh-orb`, `.mesh-orb-1/2/3` — three slow-drifting radial gradient orbs (forest green, terracotta, amber) fixed behind all content to create a dynamic animated background mesh.
- Full `@media (prefers-reduced-motion: reduce)` support — all animation durations collapse to `0.01ms` when the user prefers reduced motion.

### Fonts

- **Inter** (body/UI) is self-hosted and precached via `@fontsource/inter`.
- **Fraunces** (headings) is self-hosted via `@fontsource/fraunces`. If this package is unavailable in a private npm registry, the heading font falls back to `ui-serif, Georgia, Cambria, 'Times New Roman', serif`. The Docker build resolves it from the public npm registry normally.

---

## Project Conventions

- **UI primitives:** `src/lib/components/ui/` (re-exported from its `index.ts`).
- **`$lib`** → `src/lib` (SvelteKit default alias).
- **Data layer:** all database access goes through `$lib/db` — see [`src/lib/db/README.md`](src/lib/db/README.md) for the full API contract.