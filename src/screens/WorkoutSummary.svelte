<!-- After a workout: what was done, and «Поделиться» for sending the result in a message. -->
<script lang="ts">
  import clipboard from '../assets/illustrations/clipboard.webp';
  import { onMount } from 'svelte';
  import { getWorkout } from '../lib/db/repo';
  import { dayTitle, formatDateParts } from '../lib/domain/format';
  import { seriesTitle } from '../lib/domain/series';
  import type { Workout } from '../lib/domain/types';
  import { durationMinutes, exerciseResult, summaryText } from '../lib/domain/workout';
  import Button from '../lib/ui/Button.svelte';
  import { showMessage } from '../lib/ui/dialog.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  let { workoutId, query }: { workoutId: string; query: URLSearchParams } = $props();

  // Opened from History: back returns there. Right after a workout: back goes home.
  const fromHistory = $derived(query.get('from') === 'history');
  const back = $derived(fromHistory ? { to: '/history', label: 'История' } : { to: '/', label: 'Главная' });

  let workout: Workout | null | undefined = $state();
  let copied = $state(false);
  let sharing = false;
  let hideCopied: ReturnType<typeof setTimeout> | undefined;

  // The share button only where the browser has a share sheet (phones, Chrome/Edge on Windows, Safari on Mac).
  const canShare = typeof navigator.share === 'function';

  onMount(() => {
    getWorkout(workoutId).then((found) => (workout = found ?? null));
    return () => clearTimeout(hideCopied);
  });

  async function share() {
    if (!workout || sharing) return;
    copied = false;
    sharing = true;
    try {
      await navigator.share({ text: summaryText(workout) });
      return;
    } catch (error) {
      // Closing the share sheet without choosing an app is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    } finally {
      sharing = false;
    }
    await copy();
  }

  /** Copies the text; «Скопировано!» shows above the buttons for 2 s. */
  async function copy() {
    if (!workout) return;
    const text = summaryText(workout);
    clearTimeout(hideCopied);
    copied = await copyText(text);
    if (copied) hideCopied = setTimeout(() => (copied = false), 2000);
    else await showMessage('Не удалось скопировать', text);
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

<main class="screen summary">
  <ScreenHeader
    {back}
    art={fromHistory ? clipboard : undefined}
    artLayout="behind"
    artRatio={16 / 9}
    artSlant={false}
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
          {#if exercise.series || exercise.skipped}
            <span class="note">
              {[exercise.series ? seriesTitle(exercise.series.number) : '', exercise.skipped ? 'пропущено' : '']
                .filter(Boolean)
                .join(' · ')}
            </span>
          {/if}
        </li>
      {/each}
    </ul>

    <!-- Announced to screen readers only: on a phone the share sheet opens instead, and a
         visible line here only left an empty gap above «На главную» (2026-11-08). -->
    <p class="visually-hidden" role="status">{copied ? 'Скопировано' : ''}</p>

    <!-- From History the back button at the top returns there; no second way back. -->
    {#if !fromHistory}
      <div class="actions-bottom">
        <Button variant="secondary" to="/">На главную</Button>
      </div>
    {/if}

    <!-- Bottom right corner: copy, then share (2026-11-15). The label floats above, so nothing moves. -->
    <div class="corner">
      {#if copied}<span class="copied" class:alone={!canShare} aria-hidden="true">Скопировано!</span>{/if}
      <button type="button" aria-label="Скопировать итоги" onclick={copy}><Icon name="copy" size={34} /></button>
      {#if canShare}
        <button type="button" aria-label="Поделиться" onclick={share}><Icon name="share" size={34} /></button>
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

  .note {
    grid-column: 1 / -1;
    font-size: var(--fs-small);
    color: var(--c-text-muted);
  }

  /* Room at the end, so the buttons never cover the last of the content. */
  .summary {
    --share-size: 60px;
    --share-bottom: max(var(--gutter), var(--safe-bottom));
    padding-bottom: calc(var(--share-bottom) + var(--share-size) + 16px);
  }

  /* The gutter from the side and from the bottom (or the home indicator's safe area), inside the app's 520 px column. */
  .corner {
    position: fixed;
    right: max(var(--gutter), calc(50vw - 260px + var(--gutter)));
    bottom: var(--share-bottom);
    z-index: 2;
    display: flex;
    gap: 12px;
  }

  /* Above the buttons from the copy button's left edge, out of the layout. */
  .copied {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    color: var(--c-cream);
    font-size: 14px;
    line-height: 1.4;
    white-space: nowrap;
  }

  /* Over the copy button alone it is wider than the button: right-aligned, so it stays on screen. */
  .copied.alone {
    right: 0;
    left: auto;
  }

  /* Cream squares. */
  .corner button {
    display: grid;
    place-items: center;
    width: var(--share-size);
    height: var(--share-size);
    padding: 0;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
    cursor: pointer;
  }

  .corner button:active {
    transform: translateY(1px);
  }
</style>
