# ATLETIKA
## Product, UX, and UI Implementation Brief for Claude Code

**Document purpose:** This document is the primary product and implementation brief for building the ATLETIKA mobile training application. The accompanying `assets/reference_screens/` directory contains the original visual screen references. Refer to those images by filename and screen ID throughout implementation.

**Language requirement:** The product UI must be in **Russian**. This English document is for the development agent. Every font used in the application must support **Cyrillic**, including uppercase and lowercase Russian characters, punctuation, and numerals. Do not use fonts that replace Cyrillic characters with fallback glyphs or produce pseudo-Cyrillic text.

**Important working rule:** Treat the reference screens as visual guidance, not as permission to invent product features. Implement only behavior defined in this brief. Where a behavior is marked **OPEN / NOT DECIDED**, do not silently choose a product rule. Use a conservative placeholder or ask for clarification before implementing that behavior.

---

# 1. Product Overview

ATLETIKA is a mobile application for creating and following personal workout programs. A user maintains an exercise library, organizes exercises into training days, optionally groups exercises into cyclic series, performs workouts, and reviews workout history.

The core product concepts are:

- **Exercise:** a reusable library item with a name, description, and optional video URL.
- **Training day:** an ordered collection of exercises and/or series, with per-exercise set and repetition configuration.
- **Set:** an individual occurrence of an exercise within a training day. Each set has its own repetition target and rest duration.
- **Series:** a cyclic group of multiple exercises, repeated for a configured number of cycles. The exact editing and interaction model is not finalized.
- **Workout session:** an execution of a training day, including progression through exercises and sets and rest timing. The active-workout interaction details are not finalized.
- **Workout history:** a chronological record of completed training days.

The app is intended for personal training programs rather than a social fitness network. No social feed, subscriptions, leaderboards, coaching marketplace, nutrition tracking, or weight tracking has been specified.

## 1.1 Product principles

1. Make the next workout easy to find and start.
2. Keep program editing direct and understandable.
3. Preserve a strong visual identity across all screens.
4. Keep workout configuration focused on sets, repetitions, and rest.
5. Avoid adding data or controls that have not been requested.
6. Keep the UI readable in Russian at real mobile sizes.

---

# 2. Visual Design System

## 2.1 Art direction

The visual language is a high-contrast athletic poster aesthetic:

- Near-black is the primary background.
- Bright athletic red is used for strong accents, diagonal graphic planes, and primary calls to action.
- Warm cream / ivory is used for prominent text and light card surfaces.
- Typography is bold, tall, narrow, and condensed for major headings and CTA labels.
- Secondary labels and data use a more readable narrow sans-serif.
- Layouts are vertical mobile compositions with a clear hierarchy and deliberate negative space.
- Illustrations are graphic and poster-like, primarily black and cream forms against red fields. Avoid mixing photorealistic and graphic illustration styles on the same screen.
- Red diagonal geometry may be used as a background accent, but must not compromise text legibility.

Do not invent exact brand color hex values from screenshots. Sample colors from the supplied references or define design tokens after inspecting the images and then use them consistently.

## 2.2 Typography and localization

- All visible product copy must be Russian.
- Select a condensed display font with complete Cyrillic coverage for headings and prominent buttons.
- Select a highly legible Cyrillic-capable sans-serif for body text, metadata, fields, and small labels.
- Verify the glyphs `А–Я`, `а–я`, `Ё`, `ё`, Russian punctuation, and numerals.
- Do not render Russian copy as images. Text must remain real UI text and adapt to screen sizes.
- Avoid clipping, broken line breaks, pseudo-Cyrillic characters, and unexpected fallback fonts.
- Prefer short Russian labels where the reference screens show compact controls.

## 2.3 Navigation and back controls

Every back control must communicate its destination in Russian, not show an unlabeled arrow alone. Examples:

- `← ГЛАВНАЯ`
- `← ПРОГРАММА`
- `← ДНИ`
- `← УПРАЖНЕНИЯ`

Use the correct destination for the current navigation path.

## 2.4 Approved component references

See `assets/approved_components_overview.jpg` for a visual contact sheet of the currently approved component samples.

The following component definitions are approved:

### Component 01 — Back button
- Left arrow plus destination label.
- Cream-colored arrow and text.
- Transparent background.
- Preserve the proportions, font size, and color of the approved sample.
- The destination text changes according to navigation context.

### Component 02 — Compact training-day label
- Anchored in the upper-right area of the screen.
- Two left-aligned lines within the label block.
- First line is the day identifier, e.g. `ДЕНЬ 10`, larger and cream-colored.
- Second line is the day description, e.g. `СПИНА`, smaller and muted grey-cream.
- Uses the narrow, tall condensed type style.

### Component 03 — Progress scale
- Horizontal row of rounded segments.
- Default: five segments; segment count is configurable.
- Completed segments before the current segment are red.
- The current segment has a muted grey fill with a red outline.
- Future segments are grey.
- Preserve the approved segment thickness and proportions from the component reference.

### Component 04 — Active button
- Bright red fill with black label.
- Wide rounded rectangle.
- Bold, tall, condensed type.
- Label centered.
- Used for primary actions.

### Component 05 — Secondary outlined button
- Near-black fill (same visual family as the screen background).
- Cream outline and cream label.
- Wide rounded rectangle.
- Bold, tall, condensed type.
- Example label: `+ ДОБАВИТЬ УПРАЖНЕНИЕ`.
- The plus sign and label form one centered group.
- Used for secondary actions.

### Component 06 — Background accent 1
- Bright red diagonal / slanted graphic strip.
- No text, shadows, gradients, or extra decoration.
- More horizontal than vertical; does not run out through the corners.
- Right end is approximately twice as wide as the left end.
- The approved visual sample was shown on a checkerboard preview. Verify real alpha transparency before using an exported asset; do not bake a checkerboard into the application asset.

The contact sheet is a visual overview, not a replacement for inspecting the original screen references.

## 2.5 Exercise and training-day cards

- Cream surfaces with black text are part of the established visual language.
- Maintain strong contrast and clear spacing.
- On the **training-day editor**, exercise rows must not contain exercise thumbnails or illustrations.
- Exercise ordering is changed using a dedicated drag handle on the left side of each row.
- On the right side, place edit (pencil) and delete (trash) actions vertically.
- There must be no divider line between the pencil and trash icons.

## 2.6 Illustrations

- Use a graphic, silhouette-like, poster treatment.
- Prefer black and cream shapes with red surroundings.
- Avoid excessive anatomical detail.
- The **Days** program card uses a sprinter running toward the right, viewed from a front-right angle of approximately 45 degrees.
- The **Exercises** program card uses push-up bars.
- The exercise-configuration screen also uses the push-up bars visual already established on the Program screen.
- Do not place exercise illustrations inside the exercise rows of the training-day editor.

---

# 3. Screen Inventory and Reference Map

The original image files are included in `assets/reference_screens/`. The files are intentionally preserved without cropping or alteration.

| ID | Reference image filename | Main purpose / how to use it |
|---|---|---|
| REF-01 | `Minimalist Red-And-Cream Fitness App UI (1).png` | Overall visual language and a source for several approved component proportions. Use as a style reference, not as a source of extra features. |
| REF-02 | `High-Contrast Fitness Program UI.png` | Program landing screen with the two primary destinations: Days and Exercises. |
| REF-03 | `Тренировочные дни фитнес-программы.png` | Training-days list screen reference. |
| REF-04 | `День 1_ Редактор тренировок.png` | Training-day editor, exercise rows, ordering handle, edit/delete actions, and add actions. |
| REF-05 | `Атлетика_ День 2.png` | Additional training-day editor visual reference and consistency check. |
| REF-06 | `Bold Fitness Exercise Catalog.png` | Exercise library/catalog screen reference. |
| REF-07 | `Bold Fitness Exercise Selector.png` | Exercise selection flow/reference. |
| REF-08 | `New Exercise Form with Gym Graphics.png` | Create/edit exercise form reference. |
| REF-09 | `Push-Up Workout Settings UI.png` | Exercise configuration inside a training day. Apply the agreed removals described below. |
| REF-10 | `Historia de entrenamientos atlética.png` | Workout history screen reference. |
| REF-11 | `Bold Red-and-Black Settings Screen.png` | Settings screen visual reference. The settings feature set is not fully approved. |

**Reference precedence:** explicit written decisions in this document and the agreed project rules take precedence over any conflicting detail visible in a screenshot. A screenshot may contain an outdated element that was later removed.

---

# 4. Screen Specifications

## 4.1 Home

**Reference:** REF-01 for the visual language. The Home screen is also represented in the overall reference set; do not infer unspecified interactions from decorative artwork alone.

Purpose:
- Show the next workout in the user's program.
- Provide a prominent `НАЧАТЬ ТРЕНИРОВКУ` action.
- Provide navigation to `ИСТОРИЯ`, `ПРОГРАММА`, and `НАСТРОЙКИ`.

Behavior:
- The primary CTA starts the next training day according to the program progression rule.
- The Home screen provides access to the program.
- The next-workout card must not show the number of exercises or workout duration. These were explicitly removed as unnecessary information.

**OPEN:** The exact algorithm for determining the next training day is not finalized. Do not invent behavior for skipped workouts, program edits, or manual day selection. Keep the progression logic isolated so it can be specified later.

## 4.2 Program

**Reference:** REF-02 (`High-Contrast Fitness Program UI.png`).

Purpose:
- Provide two large navigation cards:
  - `ДНИ`
  - `УПРАЖНЕНИЯ`

Approved content:
- Two large cards only.
- Do not add explanatory text below the cards.
- Do not add an introductory promotional paragraph.
- The Days card uses the agreed sprinter illustration.
- The Exercises card uses push-up bars.
- Keep both cards within the same high-contrast visual system.

Navigation:
- `ДНИ` opens the training-days list.
- `УПРАЖНЕНИЯ` opens the exercise library.

## 4.3 Training Days List

**Reference:** REF-03 (`Тренировочные дни фитнес-программы.png`).

Purpose:
- Display the user's training days.
- Allow the user to create, rename, edit, and delete days.

Known behavior:
- A day has a name, such as `Верх тела`.
- A placeholder example for a new day name is `Например, День 1`.
- A day can be opened to edit its exercise content.

Do not add unconfirmed metadata or extra actions. If destructive deletion is implemented, use a confirmation step.

## 4.4 Training Day Editor

**References:** REF-04 (`День 1_ Редактор тренировок.png`) and REF-05 (`Атлетика_ День 2.png`).

Purpose:
- Configure the name and ordered contents of one training day.

Layout/content:
- Show a day identifier such as `ДЕНЬ 1`.
- Show the editable day name, e.g. `Верх тела`.
- Show the ordered list of exercises and any configured series.
- Each exercise row displays its set/repetition information in a compact, readable way.
- Set cards may be shown as separate compact blocks, consistent with the reference design.

Exercise-row rules:
- No exercise thumbnail or illustration inside a row.
- A dedicated drag handle is on the left.
- The row's right side contains a pencil icon and a trash icon, vertically arranged.
- Do not place a separator line between those two icons.
- Dragging changes the exercise order.
- Pencil opens the exercise configuration screen for this day.
- Trash initiates removal; destructive removal should be confirmed.

Bottom actions:
- `ДОБАВИТЬ УПРАЖНЕНИЕ`
- `ДОБАВИТЬ СЕРИЮ`

Both use the same secondary-button visual language and palette. The Add Series button should visually correspond to Add Exercise.

Rest rule:
- Rest duration is configured separately for **every set, including the final set** of an exercise.
- Do not apply a conventional rule that omits rest after the last set.

## 4.5 Exercise Library

**Reference:** REF-06 (`Bold Fitness Exercise Catalog.png`).

Purpose:
- Show reusable exercises available to add to training days.
- Provide access to create, edit, delete, import, and export exercise records.

Known actions:
- Add an exercise.
- Edit an existing exercise.
- Delete an exercise.
- Import exercises.
- Export exercises.

Use clear iconography for import/export where appropriate, but ensure the meaning remains understandable. Deletion must have a confirmation step.

The precise import/export file format and conflict behavior are **OPEN**. Do not invent a data interchange contract.

## 4.6 Exercise Selector

**Reference:** REF-07 (`Bold Fitness Exercise Selector.png`).

Purpose:
- Let the user choose an existing library exercise to add to a training day.

The selector should reuse the exercise-library visual language and make exercise selection clear. Do not create duplicate exercise records when selecting an existing item.

**OPEN:** Multi-select versus single-select behavior, search/filter behavior, and the exact confirmation interaction have not been fully specified. Follow the current repository's existing behavior if one exists; otherwise ask before introducing additional controls.

## 4.7 Create / Edit Exercise

**Reference:** REF-08 (`New Exercise Form with Gym Graphics.png`).

Exercise fields:
- Name.
- Description.
- Video URL / link.

Important exclusion:
- Do **not** add weight fields or weight configuration. Weight editing is explicitly out of scope for the current product.

The same form should support creating and editing a library exercise. Validate required fields in a clear way, but do not invent complex validation rules beyond what is necessary for the chosen implementation.

## 4.8 Exercise Configuration Inside a Training Day

**Reference:** REF-09 (`Push-Up Workout Settings UI.png`).

Purpose:
- Configure how a specific library exercise is performed within a specific training day.

Required configuration:
- Number of sets.
- Repetition target for each set.
- Rest duration for each set.

Important approved changes relative to the reference:
- Remove all weight editing controls.
- Remove the informational banner that says the user should configure the number of sets/repetitions; it is redundant.
- Use the push-up bars illustration already established on the Program screen.
- Preserve the overall black, red, and cream palette and typography.

Rest rule:
- Every set has its own rest duration, including the final set.

The screen must make per-set configuration explicit and understandable. Do not replace per-set rest with a single exercise-level rest value.

## 4.9 Series

A series groups several exercises into a repeating cycle.

Known model:
- A series contains multiple exercises.
- Each exercise inside the series has its own repetition target.
- The series has a configured number of cycles.
- Example: pull-ups × 5, dips × 6, push-ups × 10, repeat the cycle 5 times.

**OPEN / UX NOT FINALIZED:**
- Editing actions for the series as a whole.
- Editing and reordering individual exercises inside a series.
- Whether rest is configured per exercise, per cycle, or per set within a series.
- How a series is represented in the training-day editor.
- How series progress is displayed during an active workout.

Do not invent these rules. The `ДОБАВИТЬ СЕРИЮ` entry point is required at the bottom of the Training Day Editor, but the complete series editor requires product clarification.

## 4.10 Active Workout

**Reference:** No final approved active-workout screen specification exists yet.

Known intent:
- The workout starts from Home through `НАЧАТЬ ТРЕНИРОВКУ`.
- The app selects the next training day according to the program progression logic.
- The active workout displays the current exercise and current set.
- A rest timer is part of the workout flow.

**OPEN / NOT DECIDED:**
- Exact workout screen layout.
- How a set is marked complete.
- Timer start, pause, skip, and completion behavior.
- Whether the timer starts automatically after each set.
- How the final set's rest is handled in the active session.
- How a workout is completed, cancelled, or resumed.
- Whether progress is persisted after the app is backgrounded or closed.

Do not create a definitive active-workout UX without confirming these points.

## 4.11 Workout History

**Reference:** REF-10 (`Historia de entrenamientos atlética.png`).

Purpose:
- Show a chronological history of completed training days.
- Provide export/copy capability for history.

The history should represent completed workouts, not merely the current program configuration.

**OPEN:** The exact history data fields, export format, and whether an entry can be edited or deleted are not specified. Do not add these capabilities without confirmation.

## 4.12 Settings

**Reference:** REF-11 (`Bold Red-and-Black Settings Screen.png`).

The image is a visual reference only. The settings feature set is not finalized.

Potential settings discussed, but **not approved as requirements**:
- Behavior for moving to the next training day.
- Rest-timer sound/vibration.
- Time display format.
- Data export/backup.
- Clearing workout history with confirmation.

Do not treat this candidate list as a committed feature set. Confirm before implementing these settings.

---

# 5. Core Data Concepts

The following is a conceptual model to guide implementation. It is not a mandate for a specific database schema or framework.

## 5.1 Exercise

Suggested conceptual fields:
- `id`
- `name`
- `description`
- `videoUrl` (optional)

No weight-related field is required for the current scope.

## 5.2 Training Day

Suggested conceptual fields:
- `id`
- `name`
- `orderedItems`

`orderedItems` may contain exercise instances and series references/items. Preserve user-defined order.

## 5.3 Exercise Instance in a Training Day

A library exercise can appear in one or more training days. Its configuration within a day is distinct from the reusable library definition.

Suggested conceptual fields:
- `id`
- `exerciseId`
- `order`
- `sets`

Each set should contain:
- `repetitions` (number or supported range, depending on the existing product model)
- `restDuration`

Rest is per set, including the final set.

## 5.4 Series

Suggested conceptual fields, subject to the unresolved UX:
- `id`
- `name` (only if the product later requires one)
- `cycles`
- ordered list of contained exercise items
- repetitions per contained exercise

Do not finalize the series schema until the unresolved rest and editing semantics are clarified.

## 5.5 Workout History Entry

A completed workout should preserve enough information to represent what was actually completed at that time. The exact snapshot fields are not specified. Avoid a design where later edits to the program silently rewrite historical records.

This is an implementation recommendation, not a finalized product requirement. Confirm the snapshot behavior before relying on it.

---

# 6. Navigation Map

The currently defined high-level navigation is:

- **Home**
  - Start Workout → Active Workout (next training day)
  - History → Workout History
  - Program → Program
  - Settings → Settings

- **Program**
  - Days → Training Days List
    - Open day → Training Day Editor
      - Add Exercise → Exercise Selector
      - Edit exercise instance → Exercise Configuration
      - Add Series → Series flow (UX pending)
  - Exercises → Exercise Library
    - Add / Edit → Create or Edit Exercise

Back controls must display their destination in Russian.

This map captures the known product flow. Do not add extra navigation destinations without approval.

---

# 7. Functional Requirements and Acceptance Checklist

## Global
- [ ] All UI copy is Russian.
- [ ] Every selected font supports Cyrillic correctly.
- [ ] Visual system uses near-black, bright red, and warm cream consistently.
- [ ] Back controls include a Russian destination label.
- [ ] No unrequested feature is introduced.

## Home and Program
- [ ] Home shows the next workout.
- [ ] Primary CTA is `НАЧАТЬ ТРЕНИРОВКУ`.
- [ ] Next-workout card does not show exercise count or duration.
- [ ] Program screen has exactly the two primary cards `ДНИ` and `УПРАЖНЕНИЯ`.
- [ ] No explanatory/promotional text is added to the Program screen.
- [ ] Days card uses the agreed sprinter graphic.
- [ ] Exercises card uses push-up bars.

## Training Days and Day Editor
- [ ] User can create, rename, edit, and delete training days.
- [ ] Day editor shows the day identifier and editable day name.
- [ ] Exercise order can be changed with a dedicated left-side drag handle.
- [ ] No exercise illustration appears inside day-editor exercise rows.
- [ ] Pencil and trash actions are vertically arranged on the right.
- [ ] No divider appears between pencil and trash.
- [ ] Add Exercise and Add Series actions appear at the bottom.
- [ ] Each set has its own rest duration, including the last set.

## Exercise Library and Form
- [ ] Exercise library supports add, edit, delete, import, and export entry points.
- [ ] Delete actions require confirmation.
- [ ] Exercise form contains name, description, and optional video URL.
- [ ] No weight field or weight-editing UI exists.

## Exercise Configuration
- [ ] Per-set repetitions are configurable.
- [ ] Per-set rest duration is configurable.
- [ ] Final-set rest is configurable.
- [ ] No weight controls exist.
- [ ] No redundant instructional banner exists.
- [ ] Push-up bars illustration is used.

## History and Settings
- [ ] History is chronological and represents completed workouts.
- [ ] History export/copy capability is available only according to the confirmed implementation scope.
- [ ] Settings candidates are not implemented as committed features until confirmed.

## Unresolved product decisions
- [ ] Next-day progression algorithm.
- [ ] Series editor and series execution semantics.
- [ ] Active workout and rest timer behavior.
- [ ] Workout completion/cancellation/resume behavior.
- [ ] Exercise import/export format.
- [ ] History export format and exact record contents.
- [ ] Final settings feature set.

---

# 8. Guidance for Claude Code

Before changing code:

1. Inspect the existing repository, package configuration, framework, navigation, state management, persistence layer, and current screens.
2. Identify what is already implemented. Do not replace working architecture merely to match a preferred stack.
3. Compare existing screens with the supplied references and this brief.
4. Report any conflicts between current code and explicit product decisions.
5. Implement incrementally, screen by screen, preserving existing behavior unless it conflicts with this brief.
6. Keep product logic separate from UI components where practical, especially workout progression, set configuration, and timer behavior.
7. Do not hard-code screenshot text as image assets. Use localized UI strings.
8. Ensure the app handles Cyrillic in every relevant UI state, including placeholders, validation messages, buttons, and empty states.
9. If a requirement is marked OPEN / NOT DECIDED, do not invent a permanent product rule. Ask for clarification or isolate the implementation behind a clearly provisional boundary.
10. After each implementation step, run the repository's available checks and report what changed, what was tested, and what remains unresolved.

## Suggested implementation order

This is a practical sequence, not a mandate to implement unresolved flows prematurely:

1. Inspect repository and establish a screen/component inventory.
2. Establish design tokens, typography, Cyrillic font verification, and reusable approved components.
3. Implement or align Home and Program.
4. Implement Training Days List and Training Day Editor.
5. Implement Exercise Library, Exercise Selector, and Exercise Form.
6. Implement per-exercise-in-day configuration with per-set repetitions and rest.
7. Pause for product clarification before finalizing Series and Active Workout behavior.
8. Implement History and only the confirmed Settings scope.
9. Add persistence, edge-case handling, and tests consistent with the actual repository architecture.

## Definition of done for a screen

A screen is not complete merely because it resembles a screenshot. It must:
- Match the approved visual hierarchy and component rules.
- Use real Russian text with correct Cyrillic rendering.
- Support the specified interactions.
- Avoid explicitly removed controls and unapproved features.
- Respect navigation destinations.
- Handle empty, long-text, and smaller-screen states without breaking layout.
- Be tested within the existing project setup.

---

# 9. Reference Asset Usage

All supplied reference screenshots are located in:

`assets/reference_screens/`

Use the exact filenames listed in Section 3. The images are visual references and must not be treated as complete technical specifications. Written decisions in this brief override outdated screenshot details.

The supplementary approved component overview is:

`assets/approved_components_overview.jpg`

Do not crop, recolor, or otherwise alter the original reference screenshots when using them for visual comparison. If derivative crops or implementation assets are needed, create separate files and keep the originals intact.
