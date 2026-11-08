# ATLETIKA: what the app is today

The current state of the app, for anyone starting fresh. As of 2026-11-08 the product features are complete; the next work is visual styling.

- **Live:** https://mitya-multiplayer.github.io/atletika/ (GitHub Pages, deployed from `master` after CI passes)
- **Repository:** https://github.com/mitya-multiplayer/atletika (public)
- **Rules for working here:** [`CLAUDE.md`](../CLAUDE.md). **Why things behave as they do:** [`DECISIONS.md`](DECISIONS.md) (overrides the spec). **Original brief:** [`ATLETIKA_PRODUCT_SPEC.md`](ATLETIKA_PRODUCT_SPEC.md).

## What it does

A personal workout-program app for one person on their phone, installed to the home screen. You build training days from a library of exercises, then do the next day's workout with a rest timer, and every finished workout goes into History. There is no account and no server: all data lives on the device (IndexedDB), and Settings can export it to a file and import it back.

- Russian UI throughout. Home-screen name «АТЛЕТИКА»; browser tab «Атлетика».
- Works offline once installed; new versions arrive by the service worker on the next launch, keeping the data.
- Weight is out of scope: exercises have repetitions and rest only.

## Screens

Hash routes (`src/App.svelte`); one Svelte component per route in `src/screens/`. Every screen has a back control labelled with its destination («← ГЛАВНАЯ»).

| Route | Screen | What it does |
|---|---|---|
| `#/` | `Home` | «АТЛЕТИКА» and today's date (date, then weekday under it) at the top, capitals level. Everything else keeps to the bottom: the planche illustration, the next workout (day number and name) with «▶ НАЧАТЬ ТРЕНИРОВКУ ›» (label centred, larger ▶ at the left edge), or «ПРОДОЛЖИТЬ ТРЕНИРОВКУ» while one is in progress, and three tiles: История (chart icon), Программа (dumbbell), Настройки (gear). One gutter from the top (plus the safe area and 16 px more under a status bar, which iOS 26 blurs) and the sides; at the bottom the gutter or the safe area, whichever is larger. When space runs short, the illustration is cut from the top on a straight line a small gap below the brand; the athlete is at its bottom. Only when not even a 96 px strip of it fits does the screen scroll; nothing overlaps. |
| `#/program` | `Program` | Two big cards: «ДНИ» (runner) and «УПРАЖНЕНИЯ» (push-up bars). |
| `#/days` | `Days` | Training days in order, «ДЕНЬ N» plus name; add, open, delete (with confirmation; the rest renumber). |
| `#/days/:dayId` | `DayEditor` | Day name (saved as you type), its items in order: exercises (cream cards with set chips and `setsSummary`) and series (cream card with a red «СЕРИЯ» badge, rounds and round rest, its exercises listed). Drag by the left handle to reorder. «ДОБАВИТЬ УПРАЖНЕНИЕ», «ДОБАВИТЬ СЕРИЮ». |
| `#/days/:dayId/add` | `ExerciseSelect` | Search the library (ё = е) and tap an exercise to add it; it then opens its set configuration. Also adds into a series (`?series=`). Can create a new exercise from here. |
| `#/days/:dayId/items/:itemId` | `ExerciseConfig` | The exercise's sets: repetitions and rest per set (rest after every set, including the last), add/remove sets, «СОХРАНИТЬ». |
| `#/days/:dayId/series/:itemId` | `SeriesEditor` | Rounds (1–50), rest after a round, the series' exercises with repetitions and rest each; reorder, add, remove. Saves each change at once; «ГОТОВО». |
| `#/exercises` | `Exercises` | The library, sorted Russian-alphabetically; add, edit, delete (refused while a day uses the exercise). |
| `#/exercises/new`, `#/exercises/:id` | `ExerciseForm` | Name (required), description, video link (http/https only). |
| `#/workout` | `Workout` | The active workout. Set screen: exercise name, its description and video link, «Подход 1/3» (in a series «Круг 2/5», under «Серия N · Круг 2 из 5»), − / + for the repetitions actually done («план N» when it differs), centred in their column, «ЗАВЕРШИТЬ ПОДХОД», «ПРОПУСТИТЬ УПРАЖНЕНИЕ» / «ПРОПУСТИТЬ СЕРИЮ». Rest screen: countdown, «ЗАВЕРШИТЬ ОТДЫХ» right under it, what comes next. Past 0:00 the timer counts on below zero («−00:05») and pulses until «ЗАВЕРШИТЬ ОТДЫХ». Progress scale across the top. |
| `#/workout/:id/summary` | `WorkoutSummary` | After a workout (or from History with `?from=history`): each exercise's repetitions per set (`8/8/8`, `-` for skipped), «Серия N» and «пропущено» notes, «ПОДЕЛИТЬСЯ» (system share sheet; «КОПИРОВАТЬ» where the browser cannot share). |
| `#/history` | `History` | The newest workout as a card («ПОСЛЕДНЯЯ ТРЕНИРОВКА»), earlier ones as a list; each opens its summary. |
| `#/settings` | `Settings` | Groups of rows: «Тренировка» (default rest), «Экспорт данных», «Импорт данных», «Опасная зона» (red heading). Footer «Made by Mitya Kukharev» linking to Telegram. «Для разработки» (link to `#/kit`) shows only on the dev server. |
| `#/settings/rest` | `SettingsRest` | Default rest for exercises newly added to a day (1:30 by default, 15 s steps; circled − / + on a black panel), «СОХРАНИТЬ». |
| `#/kit` | `Kit` | Developer gallery of every shared component, the icons and fonts, and «Загрузить демо-данные» (a sample program; tests use it). Reachable by address in production too. |

## Product rules in short

The full list with reasons is in `DECISIONS.md`; these are the ones most often needed.

- **Repetitions × sets:** «8 × 3» = 8 reps in each of 3 sets; differing sets read «10 · 8 · 6». Only `setsSummary()` builds this text.
- **Numbering:** «ДЕНЬ N» comes from the day's position, «Серия N» from the series' order within its day. Nobody names them.
- **Next workout:** the day after the last finished workout's day, wrapping to Day 1 (Day 1 with no history). `src/lib/domain/progression.ts`.
- **Workout:** a flat list of steps; a series runs round by round (exercise A, B, C, then A, B, C again). Finishing a set starts its rest; at 0:00 the timer counts on below zero until «Завершить отдых» (it never opens the next set by itself). No sound or vibration. The last set of the workout has no rest. Leaving does not pause or cancel; the rest timer keeps running (timestamps). Skipping records `-` for the sets not done. One workout at a time; it cannot be abandoned, only finished by skipping.
- **History** stores each workout as it was (names and plan copied), so later program edits do not change it. Records cannot be edited or deleted one by one; «Очистить историю» removes all finished ones.
- **Export/import** (Settings): files `atletika-{exercises,days,all}-YYYY-MM-DD.json`. Importing exercises adds only new names (case, ё/е and spaces ignored); importing days replaces all days and adds missing exercises; importing everything replaces all data including settings. Files are validated field by field; imports are all-or-nothing.
- **Danger zone:** clear history, delete all days, delete all exercises (refused while a day uses one). Every destructive action asks first; cancelling changes nothing.
- **Provisional choices** (made in the draft, could change): listed in the table at the end of `DECISIONS.md`.

## Code map

- `src/lib/domain/`: pure product logic, no browser APIs. `workout.ts` (the workout engine and summary text), `series.ts`, `sets.ts`, `format.ts` (numbers, dates, Russian plurals), `exercises.ts` (sorting, search, validation, video links), `progression.ts`, `backup.ts` (export/import files), `settings.ts`, `defaults.ts` (limits and provisional defaults), `types.ts` (data model).
- `src/lib/db/`: `db.ts` Dexie schema, `repo.ts` every read and write, `demo.ts` sample data.
- `src/lib/ui/`: shared components (below), `dialog.svelte.ts` (confirm / message dialogs), `fitText.ts`.
- `src/lib/router.svelte.ts`: hash router (`navigate`, `matchRoute`).
- `src/app.css`: design tokens and global styles.

### Data (IndexedDB database `atletika`)

| Table | Holds | Since |
|---|---|---|
| `exercises` | Library: name, description, video URL | v1 |
| `days` | Training days: position, name, items (exercise with sets, or series with rounds and exercises) | v1 |
| `workouts` | Workouts in progress and finished (history): copied names, sets with actual reps, steps, rest timer | v2; reshaped to steps in v3 |
| `settings` | One record: default rest | v4 |

A schema change ships as a new Dexie `version()` with a migration and an upgrade test; also update `parseBackup` and `BACKUP_FORMAT` (see `CLAUDE.md`).

## Visual system (for styling work)

The look: near-black background, sport red diagonals and primary buttons, warm cream text and cards. Poster-like, condensed uppercase headings. Flat graphic illustrations of athletes. See `docs/assets/` for the references and `DESIGN_SYSTEM.md` for the original direction.

- **Tokens** (`src/app.css`): colours `--c-bg #070706`, `--c-red #f91621`, `--c-cream #f7ede0`, `--c-cream-muted`, `--c-grey`, `--c-ink`, `--c-text-muted #a8a196`, `--c-placeholder`, `--c-panel-line`; type sizes `--fs-hero` … `--fs-small`; `--radius-s/m`, `--gutter 18px`, `--tap 44px`, `--button-h 60px`, safe-area insets; Oswald's metrics `--oswald-ascent/descent/cap`, for putting the top of capitals exactly on a padding line (see `Home.svelte`).
- **Fonts** (bundled via `@fontsource-variable`, Cyrillic checked by `npm run check:fonts`): Oswald for display text and buttons (class `display`, uppercase), Roboto Condensed for interface text. Rules in `TYPOGRAPHY.md`.
- **Text case:** display text is uppercased by CSS; the source text is in normal case. That is why tests match `/день 1/i`.
- **Shared components** (`src/lib/ui/`, all shown on `#/kit`): `ScreenHeader` (back button, kicker, poster title fitted to the width, illustration `beside` or `behind`, or the black-and-red background image when there is none), `BackButton`, `Button` (primary red / secondary outlined, optional icon), `IconButton`, `ListRow` (cream card with drag handle and actions), `MenuList` (bordered rows with title, hint, chevron: Settings), `Stepper` (− value +; `card` on cream, `round` circled on black), `SetChip`, `DayLabel`, `ProgressScale`, `TextField`, `ExternalLink` (dotted-underline link with an arrow, opens outside the app), `AccentStripe` (the red diagonal), `Icon` (64×64 stroke icons plus traced filled dumbbell, chart and gear), `DialogHost`.
- **Illustrations:** `src/assets/illustrations/` (planche, runner, push-up bars, gears, header background), generated from `docs/assets/` by `npm run assets` (`scripts/make-illustrations.py`). Home-screen icons by `scripts/make-icons.py`. Never edit `docs/assets/`; supplied artwork goes in dated `supplied_YYYY-MM-DD/` folders.
- **Mockups:** earlier PNGs in `docs/mockups/`. Do not render new ones unless asked; check changes in the running app.

### Styling changes that tests will notice

E2E tests check some layout and style decisions; if a change is intended, update the test with it.

- `tests/e2e/layout.spec.ts`: poster titles stay on one line; the runner reaches down behind the day-name field and the field stays usable; the push-up-bars header sits right and behind the title; screens without an illustration get the background image.
- `tests/e2e/home.spec.ts`: date above weekday; brand and date capitals level, one gutter below the top (with a faked safe area: plus 16 px); the illustration, next workout and tiles kept to the bottom, tiles one gutter from the bottom and sides (with a safe area: the safe area alone); on a short screen nothing scrolls and the planche loses its top under the brand; on a very short screen nothing overlaps and the screen scrolls; the planche never shows under the brand, is cut on a straight line (no fade) a gap below it that matches the one under «Следующая тренировка»; no visible edge where the planche meets the background; planche full width at its proportions; equal gaps in the next-workout lines; «Начать тренировку» label centred with the larger ▶ at the left; tile icons and their shapes; aligned tile labels.
- `tests/e2e/workout.spec.ts`: set-screen buttons fit on one line; the set count «1/3» stays beside the repetition controls, with space either side of the divider; repetitions centred; no text shadow on the name or timer; the negative timer pulses in its own colour and fits the width; «Завершить отдых» right under the timer; the video link's dotted underline, ellipsis and arrow.
- `tests/e2e/settings.spec.ts`: danger-zone heading in `--c-red`; row hints in sentence case; circled − / + on a black panel for the default rest; the author link's colour and underline (and that the dots are actually drawn); footer text colour; dialogs open with no focus ring on a button.
- Accessibility (axe, WCAG 2 A/AA) runs on every screen, so colour contrast is checked too.

## Testing and delivery

- `npm run check`, `npm test` (Vitest: domain and repository on fake-indexeddb), `npm run check:fonts`, `npm run test:e2e` (Playwright: WebKit as iPhone and Chromium as Android, against the production build under `/ATLETIKA/`). All four must pass before work is done; CI runs them on every push.
- Tests by area: `tests/unit/` (`domain`, `workout`, `series`, `backup`, `settings`, `repo`, `backup-repo`, `settings-repo`); `tests/e2e/` (`app`, `home`, `layout`, `workout`, `series`, `history`, `settings`, `pages` for hosting, service worker and offline).
- Real-device checks: `DEVICE_CHECKLIST.md`.

## Known limitations

- On iPhone, removing the home-screen app deletes its data, and Safari and the installed app keep separate data. Export «всё» before reinstalling.
- In WebKit on Windows (the test browser), Oswald looks lighter than on a real iPhone.
- On a small iPhone (SE), «ПРОПУСТИТЬ УПРАЖНЕНИЕ» wraps to two lines (left as is).
- Not built, by decision: weights, editing or deleting single history records, abandoning a workout, sounds or vibration, time-format and next-day settings.
