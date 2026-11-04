# Decisions log

Decisions made after `ATLETIKA_PRODUCT_SPEC.md` was written. Where they conflict with the spec or a reference screen, this file wins.

## 2026-11-03

### Product
- **Phase.** UX/UI mockups continue; a first draft application is built in parallel.
- **Repetitions are exact numbers**, not ranges. Reference screens showing `8–10` are outdated.
- **Rest after the final set** of an exercise is the rest before the next exercise.
- **The `ДЕНЬ N` label is numbered automatically** from the day's position in the program. The user edits only the day name (e.g. `Верх тела`). The new-day name placeholder is therefore `Например, Верх тела` instead of `Например, День 1`.
- **History entries are snapshots.** Editing the program later must not change past workouts.

### Platform
- Static web app, no backend. Data is stored on the device in IndexedDB.
- Installable to the home screen on iPhone and Android (PWA). Both platforms are targets.
- Fonts are bundled with the app (works offline). See `TYPOGRAPHY.md`: Oswald for display text and buttons, Roboto Condensed for interface text.

### Reference screen corrections
The table in spec section 3 mislabels two references:
- **REF-01** `Minimalist Red-And-Cream Fitness App UI (1).png` shows the **active workout and rest timer**. The approved components were taken from it.
- **REF-05** `Атлетика_ День 2.png` is the **Home** screen, not a training-day editor.

Known outdated details in references (written rules win):
- `День 1_ Редактор тренировок.png` shows rep ranges and a cream-filled `ДОБАВИТЬ СЕРИЮ`; both buttons must use the secondary style.
- `Bold Fitness Exercise Catalog.png` lacks the required import/export actions.

### Design tokens sampled from the references
Median colors across all reference images:

| Token | Value | Use |
|---|---|---|
| `--c-bg` | `#070706` | Background |
| `--c-red` | `#F91621` | Accents, primary buttons |
| `--c-cream` | `#F7EDE0` | Text on dark, card surfaces |
| `--c-cream-muted` | `#E5DCCF` | Stepper buttons and set chips on cream cards |
| `--c-grey` | `#484643` | Inactive progress segments |

## Provisional choices in the first draft
These are placeholders, isolated in code, until the product decision is made:

| Topic | Draft behavior | Where |
|---|---|---|
| Next training day | The day after the last completed one, wrapping to Day 1; Day 1 when there is no history | `src/lib/domain/progression.ts` |
| New exercise in a day | 3 sets × 10 reps, 1:30 rest each | `src/lib/domain/defaults.ts` |
| Rest stepper | ±15 seconds | `src/lib/domain/defaults.ts` |
| Exercise selector | Single select: tapping an exercise adds it and opens its set configuration | `src/screens/ExerciseSelect.svelte` |
| Deleting a library exercise used in days | Blocked, with a message naming the days | `src/lib/db/repo.ts` |
| Active workout, series, history, settings | Placeholder screens | `src/screens/` |
