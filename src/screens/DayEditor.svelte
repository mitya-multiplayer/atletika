<script lang="ts">
  import Sortable from 'sortablejs';
  import { onDestroy, onMount } from 'svelte';
  import runner from '../assets/illustrations/runner.webp';
  import { dayQuery, exercisesQuery, moveDayItem, removeItem, renameDay } from '../lib/db/repo';
  import { dayNumber, dayTitle, setsSummary } from '../lib/domain/format';
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
  let nameInput: HTMLInputElement | undefined = $state();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if ($day && !nameLoaded) {
      name = $day.name;
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
    if ($day && name.trim() !== $day.name) renameDay(dayId, name);
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
    const confirmed = await confirmAction({
      title: `Убрать «${names.get(item.exerciseId) ?? 'упражнение'}» из дня?`,
      message: 'Упражнение останется в библиотеке.',
      confirmLabel: 'Убрать',
    });
    if (confirmed) await removeItem(dayId, item.id);
  }
</script>

<main class="screen">
  {#if $day === undefined}
    <!-- loading -->
  {:else if $day === null || !$day}
    <ScreenHeader back={{ to: '/days', label: 'Дни' }} title="День не найден" />
  {:else}
    <ScreenHeader back={{ to: '/days', label: 'Дни' }} title={title} size="hero" art={runner} />

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
          </li>
        {/each}
      </ul>
    {/if}

    <div class="actions-bottom">
      <Button variant="secondary" icon="plus" to="/days/{dayId}/add">Добавить упражнение</Button>
      <Button variant="secondary" icon="plus" to="/days/{dayId}/series">Добавить серию</Button>
    </div>
  {/if}
</main>

<style>
  .name-field {
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

  :global(.sortable-chosen) {
    opacity: 0.85;
  }

  :global(.sortable-ghost) {
    opacity: 0.35;
  }
</style>
