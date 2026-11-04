# ATLETIKA

Mobile workout-program app: static PWA (Vite + Svelte 5 + TypeScript), data on the device in IndexedDB via Dexie. No backend. UI text is Russian.

## Hosting
- Hosted on **GitHub Pages**. The repository is **public**.
- `.github/workflows/ci.yml` runs every check on each push and pull request; pushes to `main` deploy to Pages only after all checks pass. One-time repository setup: Settings → Pages → Source: GitHub Actions.
- Pages serves the app from a subpath (`https://<user>.github.io/<repo>/`) with no server rewrites. Keep `base: './'` in `vite.config.ts` and hash routing (`#/days/…`); never switch to path-based routes or absolute asset URLs.
- Everything committed is world-readable: no secrets, tokens, or real personal data, including in test fixtures and demo data.
- Users get new versions through the service worker (`registerType: 'autoUpdate'`). Data stays on their device, so a schema change must ship as a new Dexie `version()` that migrates existing data.

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

## Testing: required for every new feature
A feature is not done until it ships with an extensive set of tests. Add all of these that apply:

- **Domain logic** (`tests/unit/`): every rule in `src/lib/domain/`, including edge cases: empty lists, single items, min/max limits, invalid input, and Russian text with `Ё/ё`.
- **Persistence** (`tests/unit/repo.test.ts` or a sibling file): every repository function the feature adds or changes, against fake-indexeddb. Check what is stored, not only return values. A schema change also needs a test that upgrades data from the previous version.
- **User flows** (`tests/e2e/`): the main path end to end, plus cancel/back paths and empty states. Destructive actions must show their confirmation, and cancelling it must change nothing. Tests run on both the `iphone` and `android` projects; do not limit a test to one.
- **Accessibility**: add each new screen's route to the axe loop at the end of `tests/e2e/app.spec.ts`.
- **Bug fixes**: start with a test that fails without the fix.

Playwright notes:
- E2E tests run against the production build served from `/ATLETIKA/`, like GitHub Pages. Navigate with relative URLs (`page.goto('./#/days')`); a leading `/` escapes the subpath. Hosting checks (subpath, manifest, service worker, offline, persistence) live in `tests/e2e/pages.spec.ts`.
- Prefer role and label locators (`getByRole`, `getByLabel`), matched case-insensitively (`/день 1/i`): display text is uppercased by CSS.
- Wait on app state, never on fixed timing. Example: the drag test waits for SortableJS's `.sortable-fallback` and `.sortable-ghost` classes before releasing the mouse.

Before calling work finished, run and report all of: `npm run check`, `npm test`, `npm run check:fonts`, `npm run test:e2e`.

## Layout
- `src/lib/domain/`: pure logic, no browser APIs. Put product rules here.
- `src/lib/db/`: Dexie schema (`db.ts`; add a new `version()` for schema changes) and the repository (`repo.ts`).
- `src/lib/ui/`: shared components; `src/screens/Kit.svelte` (route `#/kit`) shows them all. Add new shared components there too.
- `src/screens/`: one component per route; routes are listed in `src/App.svelte`.
- Design tokens are CSS custom properties in `src/app.css`.
- `docs/assets/`: original reference screens and the visual asset pack. Never edit them; derived files go to `src/assets/` via `scripts/`.

## Gotchas
- Pass `$state.snapshot(value)` to Dexie: IndexedDB cannot store Svelte proxies.
- Sort Russian text with `sortByName` (Intl.Collator), not code-point order.
- `ДЕНЬ N` is derived from `position`; deleting a day renumbers the rest.
- Generate ids with `newId()` from `repo.ts`: `crypto.randomUUID` is missing on plain-HTTP LAN addresses used for phone testing.
