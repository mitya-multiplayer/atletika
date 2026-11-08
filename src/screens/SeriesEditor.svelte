<!-- Series editor: rounds, rest after a round, and the exercises with their reps and rest.
     Each change is saved at once (docs/DECISIONS.md, 2026-11-05). -->
<script lang="ts">
  import Sortable from 'sortablejs';
  import { dayQuery, exercisesQuery, modifySeries } from '../lib/db/repo';
  import { REPS_MAX, REPS_MIN, REST_MAX_SEC, REST_MIN_SEC, REST_STEP_SEC } from '../lib/domain/defaults';
  import { dayNumber, dayTitle, formatRest } from '../lib/domain/format';
  import {
    moveSeriesExercise,
    removeSeriesExercise,
    ROUNDS_MAX,
    ROUNDS_MIN,
    seriesNumber,
    seriesTitle,
    setRoundRest,
    setRounds,
    updateSeriesExercise,
  } from '../lib/domain/series';
  import type { SeriesExercise, SeriesItem } from '../lib/domain/types';
  import Button from '../lib/ui/Button.svelte';
  import { confirmAction } from '../lib/ui/dialog.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import IconButton from '../lib/ui/IconButton.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
  import Stepper from '../lib/ui/Stepper.svelte';

  let { dayId, itemId }: { dayId: string; itemId: string } = $props();

  const day = $derived(dayQuery(dayId));
  const exercises = exercisesQuery();
  const names = $derived(new Map(($exercises ?? []).map((exercise) => [exercise.id, exercise.name])));
  const series = $derived(
    $day?.items.find((item): item is SeriesItem => item.id === itemId && item.kind === 'series'),
  );
  const title = $derived($day ? seriesTitle(seriesNumber($day.items, itemId)) : '');

  const change = (fn: (s: SeriesItem) => SeriesItem) => modifySeries(dayId, itemId, fn);

  async function remove(exercise: SeriesExercise) {
    const confirmed = await confirmAction({
      title: `Убрать «${names.get(exercise.exerciseId) ?? 'упражнение'}» из серии?`,
      message: 'Упражнение останется в библиотеке.',
      confirmLabel: 'Убрать',
    });
    if (confirmed) await change((s) => removeSeriesExercise(s, exercise.id));
  }

  // Reordering with the left drag handle, as in the day editor.
  let list: HTMLUListElement | undefined = $state();

  $effect(() => {
    if (!list) return;
    const element = list;
    let originalNext: Node | null = null;
    const sortable = Sortable.create(element, {
      handle: '.handle',
      animation: 150,
      forceFallback: true,
      onStart: (event) => {
        originalNext = event.item.nextSibling;
      },
      onEnd: (event) => {
        // Put the node back where Svelte left it; the saved order re-renders the list.
        element.insertBefore(event.item, originalNext);
        const { oldIndex, newIndex } = event;
        if (oldIndex != null && newIndex != null && oldIndex !== newIndex) {
          change((s) => moveSeriesExercise(s, oldIndex, newIndex));
        }
      },
    });
    return () => sortable.destroy();
  });
</script>

<main class="screen">
  <ScreenHeader
    back={{ to: `/days/${dayId}`, label: $day ? dayTitle(dayNumber($day)) : 'День' }}
    kicker="Настройка серии"
    title={series ? title : 'Серия'}
  />

  {#if $day !== undefined && !series}
    <p class="empty">Серия не найдена.</p>
  {:else if series}
    <div class="settings">
      <Stepper
        label="Круги"
        value={series.rounds}
        min={ROUNDS_MIN}
        max={ROUNDS_MAX}
        onchange={(rounds) => change((s) => setRounds(s, rounds))}
      />
      <Stepper
        label="Отдых после круга"
        value={series.roundRestSec}
        min={REST_MIN_SEC}
        max={REST_MAX_SEC}
        step={REST_STEP_SEC}
        format={formatRest}
        onchange={(sec) => change((s) => setRoundRest(s, sec))}
      />
    </div>

    <h2 class="section-title display">Упражнения</h2>

    {#if series.exercises.length === 0}
      <p class="empty">В серии пока нет упражнений.</p>
    {:else}
      <ul class="stack" bind:this={list}>
        {#each series.exercises as exercise, i (exercise.id)}
          {@const name = names.get(exercise.exerciseId) ?? ''}
          <li class="row">
            <span class="handle" aria-hidden="true"><Icon name="menu" size={22} /></span>
            <div class="body">
              <span class="ex-name">{name}</span>
              <div class="steppers">
                <Stepper
                  label="Повторения"
                  value={exercise.reps}
                  min={REPS_MIN}
                  max={REPS_MAX}
                  onchange={(reps) => change((s) => updateSeriesExercise(s, exercise.id, { reps }))}
                />
                {#if i < series.exercises.length - 1}
                  <Stepper
                    label="Отдых"
                    value={exercise.restSec}
                    min={REST_MIN_SEC}
                    max={REST_MAX_SEC}
                    step={REST_STEP_SEC}
                    format={formatRest}
                    onchange={(restSec) => change((s) => updateSeriesExercise(s, exercise.id, { restSec }))}
                  />
                {:else}
                  <p class="round-note">Затем отдых после круга: {formatRest(series.roundRestSec)}</p>
                {/if}
              </div>
            </div>
            <IconButton icon="delete" tone="red" label="Убрать {name}" onclick={() => remove(exercise)} />
          </li>
        {/each}
      </ul>
    {/if}

    <div class="actions-bottom">
      <Button variant="secondary" icon="plus" to="/days/{dayId}/add?series={itemId}">Добавить упражнение</Button>
      <!-- Each change is saved at once; this only returns to the day (2026-11-08: was «Готово»). -->
      <Button to="/days/{dayId}">Сохранить</Button>
    </div>
  {/if}
</main>

<style>
  .settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 4px 10px 14px;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .handle {
    display: grid;
    place-items: center;
    align-self: stretch;
    width: 30px;
    margin-left: -6px;
    cursor: grab;
    touch-action: none;
  }

  .body {
    display: grid;
    flex: 1;
    gap: 8px;
    min-width: 0;
  }

  .ex-name {
    font-weight: 700;
    font-size: var(--fs-name);
    line-height: 1.15;
    text-transform: uppercase;
  }

  .steppers {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
  }

  .round-note {
    align-self: end;
    padding-bottom: 6px;
    font-size: var(--fs-small);
    color: #5c574f;
  }

  :global(.sortable-chosen) {
    opacity: 0.85;
  }

  :global(.sortable-ghost) {
    opacity: 0.35;
  }
</style>
