# ATLETIKA

Mobile workout-program app: static PWA (Vite + Svelte 5 + TypeScript), data on the device in IndexedDB via Dexie. No backend. UI text is Russian.

## Hosting
- Hosted on **GitHub Pages**. The repository is **public**.
- `.github/workflows/ci.yml` runs every check on each push and pull request; pushes to `master` deploy to Pages only after all checks pass. One-time repository setup: Settings → Pages → Source: GitHub Actions.
- Pages serves the app from a subpath (`https://<user>.github.io/<repo>/`) with no server rewrites. Keep `base: './'` in `vite.config.ts` and hash routing (`#/days/…`); never switch to path-based routes or absolute asset URLs.
- Everything committed is world-readable: no secrets, tokens, or real personal data, including in test fixtures and demo data.
- Users get new versions through the service worker (`registerType: 'autoUpdate'`). Data stays on their device, so a schema change must ship as a new Dexie `version()` that migrates existing data.

## Read first
- `docs/APP_OVERVIEW.md`: **start here.** What the app is today: every screen, the product rules in short, the data model, the visual system, and which tests guard styling. Keep it current when a feature or screen changes.
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
- `npm run assets`: regenerate illustrations (from `docs/assets/`) and home-screen icons
- `python -I scripts/trace-icons.py`: re-trace the supplied history (chart) and settings (gear) icons into SVG paths; paste the output into `src/lib/ui/Icon.svelte`

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
- Timers (rest between sets) are tested with Playwright's fake clock: `page.clock.install()` before the first `goto`, then `page.clock.fastForward(ms)`. See `tests/e2e/workout.spec.ts`. The workout timer stores timestamps, so it is correct after the app was closed.
- Wait on app state, never on fixed timing. Example: the drag test waits for SortableJS's `.sortable-fallback` and `.sortable-ghost` classes before releasing the mouse.

Before calling work finished, run and report all of: `npm run check`, `npm test`, `npm run check:fonts`, `npm run test:e2e`.

## Design changes
- Do not render PNG screenshots or mockups by default; only when the user asks for them. Check visual changes in the running app (the dev server in the Browser pane) instead. When PNGs are requested, save them in `docs/mockups/`.

## UI conventions
- **Repetitions × sets**, always in this order: «8 × 3» means 8 repetitions in each of 3 sets. Build this text only with `setsSummary()` in `src/lib/domain/format.ts`, never by hand. When the sets differ, it lists each set's repetitions in order: «10 · 8 · 6». Write it the same way in docs and comments ("8 reps × 3 sets"). Reference screens showing «3 × 8–10» are outdated.

## Layout
- `src/lib/domain/`: pure logic, no browser APIs. Put product rules here.
- `src/lib/db/`: Dexie schema (`db.ts`; add a new `version()` for schema changes) and the repository (`repo.ts`).
- `src/lib/ui/`: shared components; `src/screens/Kit.svelte` (route `#/kit`) shows them all. Add new shared components there too.
- `src/screens/`: one component per route; routes are listed in `src/App.svelte`.
- Design tokens are CSS custom properties in `src/app.css`.
- `docs/assets/`: original reference screens, the visual asset pack, and later artwork from the user in dated folders (`supplied_YYYY-MM-DD/`). Never edit them; derived files go to `src/assets/` via `scripts/`.

## Gotchas
- Pass `$state.snapshot(value)` to Dexie: IndexedDB cannot store Svelte proxies.
- Sort Russian text with `sortByName` (Intl.Collator), not code-point order.
- `ДЕНЬ N` is derived from `position`; deleting a day renumbers the rest. Likewise «Серия N» is derived from the series' order in its day (`seriesNumber`).
- A day item is an exercise or a series (`item.kind`). Use `exerciseIdsOf(item)` to find the library exercises it uses.
- A workout is a flat list of steps (`src/lib/domain/workout.ts`); a series interleaves its exercises round by round. Stored workouts changed shape in Dexie v3, migrated by `migrateWorkoutV2`.
- Export files (`src/lib/domain/backup.ts`) hold stored records field by field. When a stored shape changes, update `parseBackup` too, and raise `BACKUP_FORMAT` while still reading older files: users keep backups for a long time.
- Generate ids with `newId()` from `repo.ts`: `crypto.randomUUID` is missing on plain-HTTP LAN addresses used for phone testing.
