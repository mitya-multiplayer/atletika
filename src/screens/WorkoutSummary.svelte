<!-- After a workout: what was done, and «Копировать» for sending the result in a message. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getWorkout } from '../lib/db/repo';
  import { dayTitle, formatDateParts } from '../lib/domain/format';
  import type { Workout } from '../lib/domain/types';
  import { durationMinutes, exerciseResult, summaryText } from '../lib/domain/workout';
  import Button from '../lib/ui/Button.svelte';
  import { showMessage } from '../lib/ui/dialog.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  let { workoutId, query }: { workoutId: string; query: URLSearchParams } = $props();

  // Opened from History: back returns there. Right after a workout: back goes home.
  const fromHistory = $derived(query.get('from') === 'history');
  const back = $derived(fromHistory ? { to: '/history', label: 'История' } : { to: '/', label: 'Главная' });

  let workout: Workout | null | undefined = $state();
  let copied = $state(false);

  onMount(async () => {
    workout = (await getWorkout(workoutId)) ?? null;
  });

  async function copy() {
    if (!workout) return;
    const text = summaryText(workout);
    copied = await copyText(text);
    if (!copied) await showMessage('Не удалось скопировать', text);
  }

  /** The Clipboard API needs a secure context; plain-HTTP phone testing falls back to execCommand. */
  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }
</script>

<main class="screen">
  <ScreenHeader
    {back}
    kicker={fromHistory ? 'Тренировка' : 'Тренировка завершена'}
    title={workout ? dayTitle(workout.dayNumber) : 'Итоги'}
  />

  {#if workout === null}
    <p class="empty">Тренировка не найдена.</p>
  {:else if workout}
    <p class="meta display">
      {#if workout.dayName}<span>{workout.dayName}</span>{/if}
      <span>{formatDateParts(workout.startedAt).full}</span>
      <span>{durationMinutes(workout)} мин</span>
    </p>

    <ul class="results">
      {#each workout.exercises as exercise, i (i)}
        <li>
          <span class="name">{exercise.name}</span>
          <span class="sets display">{exerciseResult(exercise)}</span>
          {#if exercise.skipped}<span class="skipped">пропущено</span>{/if}
        </li>
      {/each}
    </ul>

    <div class="actions-bottom">
      <Button onclick={copy}>Копировать</Button>
      <p class="copied" role="status">{copied ? 'Скопировано' : ''}</p>
      <!-- From History the back button at the top returns there; no second way back. -->
      {#if !fromHistory}
        <Button variant="secondary" to="/">На главную</Button>
      {/if}
    </div>
  {/if}
</main>

<style>
  .meta {
    display: flex;
    gap: 14px;
    font-weight: 600;
    font-size: 21px;
    color: var(--c-text-muted);
  }

  .results {
    display: grid;
    margin-top: 18px;
  }

  .results li {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    column-gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--c-panel-line);
  }

  .name {
    font-weight: 700;
    font-size: var(--fs-name);
    text-transform: uppercase;
  }

  .sets {
    font-size: 24px;
    font-variant-numeric: tabular-nums;
  }

  .skipped {
    grid-column: 1 / -1;
    font-size: var(--fs-small);
    color: var(--c-text-muted);
  }

  .copied {
    min-height: 1.35em;
    text-align: center;
    color: var(--c-text-muted);
  }
</style>
