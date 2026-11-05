# Decisions log

Decisions made after `ATLETIKA_PRODUCT_SPEC.md` was written. Where they conflict with the spec or a reference screen, this file wins.

## 2026-11-05

### Series (answers to spec 4.9)
- **Day editor: option A** (`docs/mockups/series-option-a.png`). A series is one card, moved as a whole; its exercises are edited in the series editor (pencil).
- **Rest:** both after each exercise in a round and after each full round.
- **During a workout:** the round is shown, «Круг 2 из 5», with the usual set and rest screens.
- **In the summary and history:** one line per exercise, with its repetitions in each round.
- **Names:** no custom names; series are numbered automatically within a day, «Серия 1», «Серия 2», …

Follow-ons applied in the draft:
- Each exercise in a series has its own repetitions and rest. After the last exercise of a round the rest after the round applies instead; after the last round it is the rest before the next item.
- In a series, «ПРОПУСТИТЬ СЕРИЮ» replaces «Пропустить упражнение» and skips the rest of the series.
- On the workout progress scale a series is one segment, like an exercise.
- The series editor saves each change at once; «ГОТОВО» returns to the day.
- A series without exercises is left out when a workout starts.

### Active workout
Answers to the open questions in spec 4.10:
1. **Finishing a set** («ЗАВЕРШИТЬ ПОДХОД») starts that set's rest timer automatically.
2. **When the rest timer reaches 0:00**, the next set opens automatically. The rest screen keeps the reference controls: −30 s, +30 s, pause, and «ЗАВЕРШИТЬ ОТДЫХ» to end rest early.
3. **No sound or vibration** at the end of rest.
4. **«ПРОПУСТИТЬ УПРАЖНЕНИЕ» stays.** Sets not done are recorded as `-`, e.g. `-/-/-` for a skipped 3-set exercise.
5. **Leaving does not pause or cancel.** «← ГЛАВНАЯ» leaves without confirmation; the workout is resumed later from Home («ПРОДОЛЖИТЬ ТРЕНИРОВКУ»). A running rest timer keeps counting while the user is away.
6. **A summary screen** ends the workout, with a «КОПИРОВАТЬ» button that copies the result as plain text for sending in a message.
7. **The next day** is the one after the last completed workout's day, wrapping to Day 1 (was provisional).

8. **Actual repetitions are recorded.** The set screen has − and + around «Повторения», starting at the planned number; «ЗАВЕРШИТЬ ПОДХОД» records what it shows. The summary, history and copied text show actual repetitions. When they differ from the plan, «план N» is shown under the number. Range 0–999.

Follow-ons applied in the draft:
- The final set of the whole workout has no rest: the summary opens right away. A set with 0:00 rest goes straight to the next set.
- Skipping an exercise goes straight to the next exercise, without rest.
- One workout can be in progress at a time. Home shows its day and «ПРОДОЛЖИТЬ ТРЕНИРОВКУ» until it is finished.
- A day without exercises cannot be started; Home says so.

### History (draft, following REF-10)
- Lists finished workouts only, newest first; a workout in progress is not listed.
- The newest is a card («ПОСЛЕДНЯЯ ТРЕНИРОВКА»: day name, day number, date, duration, «ПОСМОТРЕТЬ ТРЕНИРОВКУ»); the rest form the list «ПРЕДЫДУЩИЕ ТРЕНИРОВКИ».
- A workout's date is the day it started.
- Opening a record shows the workout summary with «КОПИРОВАТЬ» (the spec's history copy capability); back returns to «История».

## 2026-11-04

### Product
- **Repetitions × sets.** Sets and repetitions are always written repetitions first: «8 × 3» is 8 repetitions in each of 3 sets. Reference screens showing «3 × 8–10» (sets first) are outdated.

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
- Hosted on GitHub Pages from a public repository.
- Every new feature ships with an extensive set of tests (unit, persistence, end-to-end, accessibility). See `CLAUDE.md`.
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
| New exercise in a day | 10 reps × 3 sets, 1:30 rest each | `src/lib/domain/defaults.ts` |
| Rest stepper | ±15 seconds | `src/lib/domain/defaults.ts` |
| Exercise selector | Single select: tapping an exercise adds it and opens its set configuration | `src/screens/ExerciseSelect.svelte` |
| Deleting a library exercise used in days | Blocked, with a message naming the days | `src/lib/db/repo.ts` |
| Abandoning a workout in progress | Not possible; skipping the remaining exercises finishes it | `src/lib/domain/workout.ts` |
| Deleting or editing history records | Not possible (spec 4.11 OPEN) | `src/screens/History.svelte` |
| New series | 3 rounds, 2:00 rest after a round; an exercise added to it: 10 reps, 0:30 rest | `src/lib/domain/series.ts` |
| Settings | Placeholder screen | `src/screens/Settings.svelte` |
