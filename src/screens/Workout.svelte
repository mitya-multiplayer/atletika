<!-- PLACEHOLDER: the active-workout flow is not decided yet (spec 4.10). -->
<script lang="ts">
  import { daysQuery, exercisesQuery } from '../lib/db/repo';
  import { dayNumber, setsSummary } from '../lib/domain/format';
  import { nextDay } from '../lib/domain/progression';
  import DayLabel from '../lib/ui/DayLabel.svelte';
  import ProgressScale from '../lib/ui/ProgressScale.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  const days = daysQuery();
  const exercises = exercisesQuery();
  const names = $derived(new Map(($exercises ?? []).map((exercise) => [exercise.id, exercise.name])));
  const day = $derived($days ? nextDay($days, null) : undefined);
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/', label: 'Главная' }} title="Тренировка">
    {#snippet aside()}
      {#if day}<DayLabel number={dayNumber(day)} name={day.name} />{/if}
    {/snippet}
  </ScreenHeader>

  {#if day}
    <ProgressScale total={Math.max(day.items.length, 1)} current={0} label="Упражнения тренировки" />
    <p class="note">
      Экран тренировки ещё проектируется. Выполнение подходов и таймер отдыха появятся, когда будет утверждена их
      логика.
    </p>
    <h2 class="section-title display">План дня</h2>
    {#if day.items.length === 0}
      <p class="empty">В этом дне нет упражнений.</p>
    {:else}
      <ol class="plan">
        {#each day.items as item (item.id)}
          <li><span>{names.get(item.exerciseId)}</span><span class="sets">{setsSummary(item.sets)}</span></li>
        {/each}
      </ol>
    {/if}
  {:else if day === null}
    <p class="empty">В программе нет тренировочных дней.</p>
  {/if}
</main>

<style>
  .note {
    margin-top: 20px;
    color: var(--c-text-muted);
  }

  .plan {
    display: grid;
    gap: 2px;
    padding: 0;
    list-style: none;
  }

  .plan li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--c-panel-line);
    font-weight: 700;
    text-transform: uppercase;
  }

  .sets {
    flex: none;
    font-weight: 400;
  }
</style>
