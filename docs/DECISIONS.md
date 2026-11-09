# Decisions log

Decisions made after `ATLETIKA_PRODUCT_SPEC.md` was written. Where they conflict with the spec or a reference screen, this file wins.

## 2026-11-09

### New artwork
- **Runner** («Дни»): new artwork from the user (`docs/assets/supplied_2026-11-09/days-runner-right.png`, 1196×896, in the app's exact colours) replaces the asset pack's runner. It is centred in its windows: the Program card and the day screens' headers (Days list, day editor). The settings gears keep the right side of their picture.
- **Program cards:** the push-up bars are cut at the same angle as the runner (both slants are set from the card's width, so they match on every phone).
- **History clipboard:** History and a workout opened from History show the user's clipboard and pen (`supplied_2026-11-09/history-clipboard.png`, 16:9) instead of the black-and-red background. Like the push-up bars, it runs from the top edge to just below the title, in its own 16:9 box, so it is shown whole. It has no slanted cut: its left side is already the background's black. Its lower part fades out like every header picture. The summary right after a workout keeps the background image. «ИСТОРИЯ» is now limited to about two thirds of the width, as every poster title beside a picture.

## 2026-11-08

### Rest timer (replaces Active workout items 2 and the rest controls of 2026-11-05)
- **The rest never ends by itself.** At 0:00 the timer counts on below zero («−00:05») and fades in and out, in the same colour, until «ЗАВЕРШИТЬ ОТДЫХ». 00:00 shows for one second; the minus is U+2212.
- **The rest screen has no −30 s, +30 s or pause.** «ЗАВЕРШИТЬ ОТДЫХ» sits right under the timer, above the next set.
- A rest paused before this change continues from the time it had left when the workout is opened. The stored shape is unchanged (`pausedRemainingMs` stays, always null for new rests), so no schema or backup format change.
- Unchanged: leaving does not pause; on return the timer shows the time since the rest ended. A set with 0:00 rest still goes straight to the next set; the last set of the workout still has no rest.

### Fixes from a review on the phone
- Home: when the screen is too short even for a strip of the illustration, the screen scrolls; nothing overlaps (two-line «Программа пуста» ran under «Создать день»). The brand starts 16 px lower on a phone with a status bar (iOS 26 blurs content just under it); the tiles keep to the bottom safe area without an extra gutter.
- Home: in «▶ НАЧАТЬ ТРЕНИРОВКУ ›» the label is centred on the button, the ▶ is 1.5× larger at the left edge.
- Set screen: no shadow under the exercise name; «1/3» without spaces; space on both sides of the divider; the repetitions and − / + centred in their column.
- Settings: row hints in sentence case. Default rest: circled − / + on a black panel, like the workout screen.
- Dialogs open with focus on the dialog, not its first button (Safari on iPhone ringed the red button).
- External links: the dotted underline was cut off at small text sizes (the author's name in Settings).
- The pencil icon («edit») is redrawn, departing from `docs/assets/visual_assets/icons/svg/edit_pencil.svg`: that drawing has a skewed tip with a stray stroke inside it and sits off-centre. The new one is symmetric about its diagonal and centred (`tests/e2e/app.spec.ts` checks both).
- Demo data: some exercises have a description and a YouTube search link, some only one, some neither; Day 2 has a series.

### Second review
- **Header pictures** (all screens): the picture's bottom edge sits about 5 px below the title's letters, and its lower part is darkened so the title reads clearly. This applies to the day editor too: the runner no longer reaches down behind the day-name field.
- **Push-up bars** are shown at one size everywhere: the box of the Program screen's «Упражнения» card, whole, on the library, exercise form, selector and set configuration screens. (Third review: anchored to the top edge and scaled to the header instead.)
- **Program** has no background image behind its title (no red line).
- **Same top on every screen:** the back button's label starts where Home's «АТЛЕТИКА» does (`--content-top`).
- **No text shadows** anywhere.
- **Cream button** (cream fill, black label), a third `Button` variant: «ПОСМОТРЕТЬ ТРЕНИРОВКУ» in History.
- **History list:** the day of the month in cream, right next to the month and year.
- **Rest screen:** «До следующего подхода» and «Подход N из N» are gone (the panel below names what comes next); their space stays, so «ЗАВЕРШИТЬ ОТДЫХ» keeps its place.
- **Set screen:** «2/4» all in cream.
- **Summary:** a cream share icon button in the bottom right corner (the gutter from the side, the gutter or the home indicator's safe area from the bottom) replaces «ПОДЕЛИТЬСЯ» / «КОПИРОВАТЬ». Where the browser has no share sheet, the same button copies the text («Скопировано»).
- **Exercise selector:** «Создать упражнение» is a regular (outlined) button. **Series editor:** the bottom button reads «СОХРАНИТЬ» (changes are still saved at once).

### Third review
- **Header pictures fade out** by a mask instead of a dark layer over them; the dark layer let a thin light line show along the picture's bottom edge on phones (fractional device pixels).
- **Exercise name on two lines** (set screen): 1.1em between lines instead of 0.95em, so «Д» and «Ё» no longer touch the other line; a one-line name stays where it was.
- **Push-up bars in headers** start at the top edge of the screen, like the other pictures, and end just below the title. They keep the Program card's box shape (`--bars-art-ratio`), scaled to that height: a one-line title without a status bar shows them at the card's size, a title on two lines («Новое упражнение») or a phone's status bar larger. This replaces "the same size everywhere" from the second review.
- **Summary:** «На главную» follows the results with the usual gap. «Скопировано» is no longer shown (it reserved an empty line); screen readers still hear it.

## 2026-11-07

### Settings (reference `docs/assets/supplied_2026-11-07/settings-screen.webp`; answers spec 4.5 and 4.12 for these items)
The screen has four groups of rows (title, hint, chevron): «Тренировка», «Экспорт данных», «Импорт данных», «Опасная зона» (red heading). Each row acts at once: no dialog asks what to export or import. The other candidates in spec 4.12 are not approved.

The screen ends with the credit «Made by Mitya Kukharev». The «Для разработки» section (link to the component gallery) shows only on the dev server, not in the published build; the `#/kit` address still works there.

**Default rest** («Отдых: 1:30», «Время отдыха по умолчанию»):
- The rest after each set of an exercise newly added to a day. Default 1:30, range 0:00–60:00 in 15 s steps.
- It opens its own screen with the rest stepper; «Сохранить» stores it, back leaves it unchanged.
- Existing days never change. Series keep their own defaults (2:00 after a round, 0:30 between exercises).
- Stored in IndexedDB (Dexie v4, table `settings`, one record).

**Export and import.** The Exercise Library no longer has import/export buttons; they are in Settings (this replaces the spec 4.5 entry points).
- Three files: «Экспортировать упражнения» (the library), «Экспортировать дни» (library and training days, since days need their exercises), «Экспортировать всё» (library, days, every workout including one in progress, and settings).
- On a phone the file goes to the share sheet («Сохранить в Файлы», a messenger, mail); on a PC, or a browser that cannot share files, it downloads. Closing the share sheet saves nothing.
- Each import row takes its part of the file chosen, and a confirmation always says what will change, except when nothing would:
  - «Импортировать упражнения» (any file): adds exercises the library lacks. An exercise with the same name (case, ё/е and extra spaces ignored) stays as it is on the phone.
  - «Импортировать дни» (a days file or a full backup): adds missing exercises as above and **replaces** all training days. Days from the file use the phone's exercise when the name matches. History and settings do not change.
  - «Импортировать всё» (a full backup only): **replaces** everything, settings included. The confirmation shows the copy's date and contents.
- Files: JSON named `atletika-<exercises|days|all>-YYYY-MM-DD.json`, with `app: "atletika"`, `kind` and a `format` number (now 1) so later versions can read older files. A file of another app, from a newer version, damaged, or without the part a row needs is refused, and nothing changes. Import writes all or nothing.

**Danger zone.** Each asks for confirmation with the count and «Это нельзя отменить.»; cancelling changes nothing. With nothing to delete, a message says so instead.
- «Очистить историю»: deletes every finished workout. A workout in progress stays. The next day then starts again from Day 1.
- «Удалить дни»: deletes every training day. The library and history stay.
- «Удалить упражнения»: deletes the whole library. While any day uses an exercise it is refused before asking, naming those days (same rule as deleting one exercise).

Follow-ons applied:
- Importing or deleting days while a workout is in progress lets it continue: a workout keeps its own copy of its exercises.
- An imported exercise gets a new id, so it can never overwrite a stored exercise.

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
- The series editor saves each change at once; «ГОТОВО» returns to the day. (2026-11-08: the button reads «СОХРАНИТЬ».)
- A series without exercises is left out when a workout starts.

### Active workout
Answers to the open questions in spec 4.10:
1. **Finishing a set** («ЗАВЕРШИТЬ ПОДХОД») starts that set's rest timer automatically.
2. ~~**When the rest timer reaches 0:00**, the next set opens automatically. The rest screen keeps the reference controls: −30 s, +30 s, pause, and «ЗАВЕРШИТЬ ОТДЫХ» to end rest early.~~ Replaced 2026-11-08: the timer counts on below zero until «ЗАВЕРШИТЬ ОТДЫХ»; no −30 s, +30 s or pause.
3. **No sound or vibration** at the end of rest.
4. **«ПРОПУСТИТЬ УПРАЖНЕНИЕ» stays.** Sets not done are recorded as `-`, e.g. `-/-/-` for a skipped 3-set exercise.
5. **Leaving does not pause or cancel.** «← ГЛАВНАЯ» leaves without confirmation; the workout is resumed later from Home («ПРОДОЛЖИТЬ ТРЕНИРОВКУ»). A running rest timer keeps counting while the user is away.
6. **A summary screen** ends the workout, with a «ПОДЕЛИТЬСЯ» button that sends the result as plain text to an app of the user's choice (2026-11-07, replacing «КОПИРОВАТЬ»):
   - Where the browser has a system share sheet (Web Share API: iPhone, Android, Chrome and Edge on Windows, Safari on Mac), the button opens it with the text.
   - Where it has none (e.g. Firefox on a PC), the button reads «КОПИРОВАТЬ» and copies the text, showing «Скопировано».
   - Closing the share sheet without choosing an app does nothing. If sharing fails for another reason, the text is copied instead.
7. **The next day** is the one after the last completed workout's day, wrapping to Day 1 (was provisional).

8. **Actual repetitions are recorded.** The set screen has − and + around «Повторения», starting at the planned number; «ЗАВЕРШИТЬ ПОДХОД» records what it shows. The summary, history and shared text show actual repetitions. When they differ from the plan, «план N» is shown under the number. Range 0–999.

9. **Description and video on the set screen.** Below the exercise name, when the library exercise has them: the description, then the video address as a plain link (dotted underline, arrow, «…» when long). It opens outside the app (`target="_blank"`): a new browser tab, or Safari/Chrome from the home-screen app. Only http(s) links are shown. Not on the rest screen.

Follow-ons applied in the draft:
- The final set of the whole workout has no rest: the summary opens right away. A set with 0:00 rest goes straight to the next set.
- Skipping an exercise goes straight to the next exercise, without rest.
- One workout can be in progress at a time. Home shows its day and «ПРОДОЛЖИТЬ ТРЕНИРОВКУ» until it is finished.
- A day without exercises cannot be started; Home says so.

### History (draft, following REF-10)
- Lists finished workouts only, newest first; a workout in progress is not listed.
- The newest is a card («ПОСЛЕДНЯЯ ТРЕНИРОВКА»: day name, day number, date, duration, «ПОСМОТРЕТЬ ТРЕНИРОВКУ»); the rest form the list «ПРЕДЫДУЩИЕ ТРЕНИРОВКИ».
- A workout's date is the day it started.
- Opening a record shows the workout summary with «ПОДЕЛИТЬСЯ» (the spec's history copy capability; «КОПИРОВАТЬ» where the browser cannot share); back returns to «История».

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
- `Bold Fitness Exercise Catalog.png` lacks import/export actions; since 2026-11-07 they are in Settings instead.

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
| New exercise in a day | 10 reps × 3 sets; rest from Settings (1:30 by default) | `src/lib/domain/defaults.ts`, `src/lib/domain/settings.ts` |
| Rest stepper | ±15 seconds | `src/lib/domain/defaults.ts` |
| Exercise selector | Single select: tapping an exercise adds it and opens its set configuration | `src/screens/ExerciseSelect.svelte` |
| Deleting a library exercise used in days | Blocked, with a message naming the days | `src/lib/db/repo.ts` |
| Abandoning a workout in progress | Not possible; skipping the remaining exercises finishes it | `src/lib/domain/workout.ts` |
| Deleting or editing history records | Not possible (spec 4.11 OPEN) | `src/screens/History.svelte` |
| New series | 3 rounds, 2:00 rest after a round; an exercise added to it: 10 reps, 0:30 rest | `src/lib/domain/series.ts` |
| Settings | Default rest, export, import and danger zone only; the other candidates in spec 4.12 are not approved | `src/screens/Settings.svelte` |
