<script lang="ts">
  import { onMount } from 'svelte';
  import bars from '../assets/illustrations/pushup-bars.webp';
  import { getDay, getExercise, updateItemSets } from '../lib/db/repo';
  import { REPS_MAX, REPS_MIN, REST_MAX_SEC, REST_MIN_SEC, REST_STEP_SEC } from '../lib/domain/defaults';
  import { dayNumber, dayTitle, formatRest } from '../lib/domain/format';
  import { addSet, removeSet, updateSet } from '../lib/domain/sets';
  import type { Exercise, SetConfig, TrainingDay } from '../lib/domain/types';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import IconButton from '../lib/ui/IconButton.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
  import Stepper from '../lib/ui/Stepper.svelte';

  let { dayId, itemId }: { dayId: string; itemId: string } = $props();

  let day: TrainingDay | undefined = $state();
  let exercise: Exercise | undefined = $state();
  let sets: SetConfig[] = $state([]);
  let notFound = $state(false);

  // Edits stay local until Save.
  onMount(async () => {
    const loaded = await getDay(dayId);
    const item = loaded?.items.find((i) => i.id === itemId);
    if (!loaded || !item) {
      notFound = true;
      return;
    }
    day = loaded;
    exercise = await getExercise(item.exerciseId);
    sets = item.sets;
  });

  async function save() {
    // IndexedDB cannot store Svelte's reactive proxies; save a plain copy.
    await updateItemSets(dayId, itemId, $state.snapshot(sets));
    navigate(`/days/${dayId}`, { replace: true });
  }
</script>

<main class="screen">
  <ScreenHeader
    back={{ to: `/days/${dayId}`, label: day ? dayTitle(dayNumber(day)) : 'День' }}
    kicker="Настройка упражнения"
    title={exercise?.name ?? ''}
    art={bars}
    artLayout="behind"
  />

  {#if notFound}
    <p class="empty">Упражнение в этом дне не найдено.</p>
  {:else if day}
    <h2 class="section-title display">Подходы</h2>
    <ol class="stack">
      {#each sets as set, i (i)}
        <li class="set">
          <span class="number display">{i + 1}</span>
          <Stepper
            label="Повторения"
            value={set.reps}
            min={REPS_MIN}
            max={REPS_MAX}
            onchange={(reps) => (sets = updateSet(sets, i, { reps }))}
          />
          <Stepper
            label="Отдых"
            value={set.restSec}
            min={REST_MIN_SEC}
            max={REST_MAX_SEC}
            step={REST_STEP_SEC}
            format={formatRest}
            onchange={(restSec) => (sets = updateSet(sets, i, { restSec }))}
          />
          <IconButton
            icon="delete"
            tone="red"
            label="Удалить подход {i + 1}"
            disabled={sets.length <= 1}
            onclick={() => (sets = removeSet(sets, i))}
          />
        </li>
      {/each}
    </ol>

    <div class="actions-bottom">
      <Button variant="secondary" icon="plus" onclick={() => (sets = addSet(sets))}>Добавить подход</Button>
      <Button onclick={save}>Сохранить</Button>
    </div>
  {/if}
</main>

<style>
  ol {
    padding: 0;
    list-style: none;
  }

  .set {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) minmax(0, 1fr) var(--tap);
    align-items: center;
    gap: 8px;
    padding: 10px 4px 10px 12px;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .number {
    font-size: 36px;
    text-align: center;
  }
</style>
