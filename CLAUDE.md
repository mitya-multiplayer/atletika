# ATLETIKA

Mobile workout-program app: static PWA (Vite + Svelte 5 + TypeScript), data on the device in IndexedDB via Dexie. No backend. UI text is Russian.

## Read first
- `docs/ATLETIKA_PRODUCT_SPEC.md`: the product brief.
- `docs/DECISIONS.md`: later decisions; they override the spec. Lists the provisional choices in the draft.
- `docs/TYPOGRAPHY.md`: Oswald for display text and buttons, Roboto Condensed for interface text.
- Never invent behavior for items the spec marks OPEN / NOT DECIDED. Isolate placeholders and record them in `docs/DECISIONS.md`.

## Commands
Node lives in `C:\Program Files\nodejs` (add it to PATH in a fresh shell).
- `npm run dev`: dev server on all interfaces
- `npm run check`: svelte-check (types)
- `npm test`: Vitest unit tests (domain logic and the Dexie repository on fake-indexeddb)
- `npm run test:e2e`: Playwright on WebKit (iPhone) and Chromium (Android); builds first
- `npm run check:fonts`: fails if a bundled font lacks a required Cyrillic glyph
- `npm run assets`: regenerate illustrations (from `docs/assets/visual_assets`) and home-screen icons

## Layout
- `src/lib/domain/`: pure logic, no browser APIs. Put product rules here.
- `src/lib/db/`: Dexie schema (`db.ts`; add a new `version()` for schema changes) and the repository (`repo.ts`).
- `src/lib/ui/`: shared components; `src/screens/Kit.svelte` (route `#/kit`) shows them all.
- `src/screens/`: one component per route; routes are listed in `src/App.svelte`.
- Design tokens are CSS custom properties in `src/app.css`.

## Gotchas
- Pass `$state.snapshot(value)` to Dexie: IndexedDB cannot store Svelte proxies.
- Sort Russian text with `sortByName` (Intl.Collator), not code-point order.
- `ДЕНЬ N` is derived from `position`; deleting a day renumbers the rest.
