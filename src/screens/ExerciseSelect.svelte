<script lang="ts">
  import bars from '../assets/illustrations/pushup-bars.webp';
  import { addExerciseToDay, dayQuery, exercisesQuery } from '../lib/db/repo';
  import { matchesQuery } from '../lib/domain/exercises';
  import { dayNumber, dayTitle } from '../lib/domain/format';
  import type { Exercise } from '../lib/domain/types';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import ListRow from '../lib/ui/ListRow.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  let { dayId }: { dayId: string } = $props();

  const day = $derived(dayQuery(dayId));
  const exercises = exercisesQuery();
  let search = $state('');
  const visible = $derived(($exercises ?? []).filter((exercise) => matchesQuery(exercise.name, search)));

  // PROVISIONAL single select: add the exercise, then go straight to its sets.
  async function pick(exercise: Exercise) {
    const itemId = await addExerciseToDay(dayId, exercise.id);
    navigate(`/days/${dayId}/items/${itemId}`, { replace: true });
  }
</script>

<main class="screen">
  <ScreenHeader
    back={{ to: `/days/${dayId}`, label: $day ? dayTitle(dayNumber($day)) : 'День' }}
    title="Выбери упражнение"
    art={bars}
    artFit="contain"
  />

  <label class="search">
    <Icon name="search" size={22} />
    <span class="visually-hidden">Поиск упражнений</span>
    <input type="search" bind:value={search} placeholder="Поиск упражнений…" enterkeyhint="search" />
  </label>

  {#if $exercises}
    {#if $exercises.length === 0}
      <p class="empty">В библиотеке пока нет упражнений.</p>
    {:else if visible.length === 0}
      <p class="empty">Ничего не найдено.</p>
    {:else}
      <ul class="stack list">
        {#each visible as exercise (exercise.id)}
          <li>
            <ListRow onclick={() => pick(exercise)}>
              <span class="ex-name">{exercise.name}</span>
              {#snippet actions()}
                <span class="chevron" aria-hidden="true"><Icon name="chevron-right" size={22} /></span>
              {/snippet}
            </ListRow>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  <div class="actions-bottom">
    <Button icon="plus" to="/exercises/new?back={encodeURIComponent(`/days/${dayId}/add`)}">Создать упражнение</Button>
  </div>
</main>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border: 2px solid var(--c-cream);
    border-radius: var(--radius-m);
    color: var(--c-cream);
  }

  .search input {
    flex: 1;
    min-width: 0;
    padding: 14px 0;
    border: 0;
    outline: 0;
    background: none;
    font-size: var(--fs-body);
  }

  .search input::placeholder {
    color: var(--c-text-muted);
  }

  .list {
    margin-top: 16px;
  }

  .ex-name {
    font-weight: 700;
    font-size: var(--fs-name);
    text-transform: uppercase;
  }

  .chevron {
    display: grid;
    place-items: center;
    width: var(--tap);
  }
</style>
