<script lang="ts">
  import Sortable from 'sortablejs';
  import { onDestroy, onMount } from 'svelte';
  import runner from '../assets/illustrations/runner.webp';
  import { addSeriesToDay, dayQuery, exercisesQuery, moveDayItem, removeItem, renameDay } from '../lib/db/repo';
  import { dayNumber, dayTitle, formatRest, setsSummary } from '../lib/domain/format';
  import { roundsLabel, seriesNumber, seriesTitle } from '../lib/domain/series';
  import type { DayItem } from '../lib/domain/types';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import { confirmAction } from '../lib/ui/dialog.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import IconButton from '../lib/ui/IconButton.svelte';
  import ListRow from '../lib/ui/ListRow.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
  import SetChip from '../lib/ui/SetChip.svelte';

  let { dayId, query }: { dayId: string; query: URLSearchParams } = $props();

  const day = $derived(dayQuery(dayId));
  const exercises = exercisesQuery();
  const names = $derived(new Map(($exercises ?? []).map((exercise) => [exercise.id, exercise.name])));
  const title = $derived($day ? dayTitle(dayNumber($day)) : '');

  // ---- Day name: saved shortly after typing stops, and on leaving the field ----
  let name = $state('');
  let nameLoaded = false;
  // The id and the name as last loaded or saved, in plain variables: while the screen closes,
  // the focused field's blur still saves, but the `dayId` prop and `$day` are already gone then.
  let savedId = '';
  let savedName = '';
  let nameInput: HTMLInputElement | undefined = $state();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if ($day && !nameLoaded) {
      name = $day.name;
      savedId = $day.id;
      savedName = $day.name;
      nameLoaded = true;
    }
  });

  onMount(() => {
    if (query.get('new')) nameInput?.focus();
  });

  function scheduleNameSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveName, 400);
  }

  function saveName() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    if (nameLoaded && name.trim() !== savedName) {
      savedName = name.trim();
      renameDay(savedId, name);
    }
  }

  onDestroy(() => {
    if (saveTimer) saveName();
  });

  // ---- Reordering with the left drag handle ----
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
        if (oldIndex != null && newIndex != null && oldIndex !== newIndex) moveDayItem(dayId, oldIndex, newIndex);
      },
    });
    return () => sortable.destroy();
  });

  async function remove(item: DayItem) {
    const confirmed =
      item.kind === 'exercise'
        ? await confirmAction({
            title: `Убрать «${names.get(item.exerciseId) ?? 'упражнение'}» из дня?`,
            message: 'Упражнение останется в библиотеке.',
            confirmLabel: 'Убрать',
          })
        : await confirmAction({
            title: `Удалить ${seriesTitle(seriesNumber($day?.items ?? [], item.id))}?`,
            message: 'Упражнения серии останутся в библиотеке.',
            confirmLabel: 'Удалить',
          });
    if (confirmed) await removeItem(dayId, item.id);
  }

  async function addSeries() {
    const itemId = await addSeriesToDay(dayId);
    navigate(`/days/${dayId}/series/${itemId}`);
  }
</script>

<main class="screen">
  {#if $day === undefined}
    <!-- loading -->
  {:else if $day === null || !$day}
    <ScreenHeader back={{ to: '/days', label: 'Дни' }} title="День не найден" />
  {:else}
    <!-- The runner reaches below the header to end just below the day-name field:
         header margin 18 + field 56 + 12. -->
    <ScreenHeader back={{ to: '/days', label: 'Дни' }} title={title} size="hero" art={runner} artDrop={86} />

    <label class="name-field">
      <span class="visually-hidden">Название дня</span>
      <input
        bind:this={nameInput}
        bind:value={name}
        oninput={scheduleNameSave}
        onblur={saveName}
        placeholder="Например, Верх тела"
        maxlength="40"
        enterkeyhint="done"
      />
      <Icon name="edit" size={22} />
    </label>

    <h2 class="section-title display">Упражнения</h2>

    {#if $day.items.length === 0}
      <p class="empty">В этом дне пока нет упражнений.</p>
    {:else}
      <ul class="stack" bind:this={list}>
        {#each $day.items as item (item.id)}
          <li>
            {#if item.kind === 'exercise'}
              <ListRow handle actionsLayout="column">
                <span class="ex-name">{names.get(item.exerciseId) ?? ''}</span>
                <span class="summary">{setsSummary(item.sets)}</span>
                <span class="chips">
                  {#each item.sets as set, i (i)}
                    <SetChip index={i + 1} reps={set.reps} />
                  {/each}
                </span>
                {#snippet actions()}
                  <IconButton
                    icon="edit"
                    label="Настроить {names.get(item.exerciseId) ?? ''}"
                    onclick={() => navigate(`/days/${dayId}/items/${item.id}`)}
                  />
                  <IconButton icon="delete" label="Убрать {names.get(item.exerciseId) ?? ''}" onclick={() => remove(item)} />
                {/snippet}
              </ListRow>
            {:else}
              {@const title = seriesTitle(seriesNumber($day.items, item.id))}
              <!-- Option A (docs/mockups/series-option-a.png): the series is one card, moved as a whole. -->
              <div class="series-card">
                <div class="series-top">
                  <span class="handle" aria-hidden="true"><Icon name="menu" size={22} /></span>
                  <div class="series-main">
                    <span class="badge display">Серия</span>
                    <span class="series-title display">{title}</span>
                    <span class="series-meta">
                      <Icon name="reset" size={16} />
                      <span class="rounds">{roundsLabel(item.rounds)}</span>
                      <span>· отдых после круга {formatRest(item.roundRestSec)}</span>
                    </span>
                  </div>
                  <div class="series-actions">
                    <IconButton icon="edit" label="Настроить {title}" onclick={() => navigate(`/days/${dayId}/series/${item.id}`)} />
                    <IconButton icon="delete" label="Удалить {title}" onclick={() => remove(item)} />
                  </div>
                </div>
                {#if item.exercises.length === 0}
                  <p class="series-empty">В серии пока нет упражнений.</p>
                {:else}
                  <ol class="series-list">
                    {#each item.exercises as exercise, i (exercise.id)}
                      <li>
                        <span class="series-ex">{names.get(exercise.exerciseId) ?? ''}</span>
                        <span class="series-reps">{exercise.reps}</span>
                        <!-- After the round's last exercise, the round rest in the header applies. -->
                        <span class="series-rest">{i < item.exercises.length - 1 ? `отдых ${formatRest(exercise.restSec)}` : ''}</span>
                      </li>
                    {/each}
                  </ol>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <div class="actions-bottom">
      <Button variant="secondary" icon="plus" to="/days/{dayId}/add">Добавить упражнение</Button>
      <Button variant="secondary" icon="plus" onclick={addSeries}>Добавить серию</Button>
    </div>
  {/if}
</main>

<style>
  /* Above the header illustration, which reaches down behind this field. */
  .name-field {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 300px;
    padding: 0 14px;
    border: 2px solid var(--c-panel-line);
    border-radius: var(--radius-m);
    background: #151513;
    color: var(--c-cream);
  }

  .name-field:focus-within {
    border-color: var(--c-cream);
  }

  .name-field input {
    flex: 1;
    min-width: 0;
    padding: 13px 0;
    border: 0;
    outline: 0;
    background: none;
    font-size: 19px;
  }

  .name-field input::placeholder {
    color: var(--c-placeholder);
  }

  .ex-name {
    display: block;
    font-weight: 700;
    font-size: var(--fs-name);
    line-height: 1.15;
    text-transform: uppercase;
  }

  .summary {
    display: block;
    margin-top: 2px;
    font-size: var(--fs-label);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .series-card {
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
    overflow: hidden;
  }

  .series-top {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 6px 8px 16px;
    border-bottom: 2px solid var(--c-cream-muted);
  }

  .series-top .handle {
    display: grid;
    place-items: center;
    align-self: stretch;
    width: 36px;
    margin-left: -8px;
    cursor: grab;
    touch-action: none;
  }

  .series-main {
    display: grid;
    flex: 1;
    gap: 4px;
    min-width: 0;
    padding: 6px 0;
  }

  .badge {
    justify-self: start;
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--c-red);
    font-weight: 700;
    font-size: 13px;
  }

  .series-title {
    font-size: 26px;
  }

  .series-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 6px;
    font-size: var(--fs-label);
  }

  .series-meta span {
    white-space: nowrap;
  }

  .rounds {
    font-weight: 700;
    color: #c8101a;
  }

  .series-actions {
    display: flex;
    flex-direction: column;
  }

  .series-empty {
    padding: 12px 16px 14px 44px;
    font-size: var(--fs-label);
    color: #5c574f;
  }

  .series-list {
    padding: 6px 16px 10px 44px;
    list-style: none;
  }

  .series-list li {
    display: grid;
    grid-template-columns: 1fr auto 76px;
    align-items: baseline;
    gap: 12px;
    padding: 7px 0;
    border-bottom: 1px solid var(--c-cream-muted);
  }

  .series-list li:last-child {
    border-bottom: 0;
  }

  .series-ex {
    font-weight: 700;
    font-size: 16px;
    text-transform: uppercase;
  }

  .series-reps {
    font-weight: 700;
  }

  .series-rest {
    font-size: var(--fs-small);
    color: #5c574f;
    text-align: right;
  }

  :global(.sortable-chosen) {
    opacity: 0.85;
  }

  :global(.sortable-ghost) {
    opacity: 0.35;
  }
</style>
