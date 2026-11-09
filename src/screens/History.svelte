<!-- Finished workouts, newest first (REF-10; docs/DECISIONS.md, 2026-11-05). -->
<script lang="ts">
  import { finishedWorkoutsQuery } from '../lib/db/repo';
  import { dayTitle, formatDateParts } from '../lib/domain/format';
  import type { Workout } from '../lib/domain/types';
  import { durationMinutes } from '../lib/domain/workout';
  import Button from '../lib/ui/Button.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import clipboard from '../assets/illustrations/clipboard.webp';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  const workouts = finishedWorkoutsQuery();

  const latest = $derived($workouts?.[0]);
  const earlier = $derived($workouts?.slice(1) ?? []);

  const summaryPath = (workout: Workout) => `/workout/${workout.id}/summary?from=history`;
  /** The day's name when it has one, else «День N». */
  const heading = (workout: Workout) => workout.dayName || dayTitle(workout.dayNumber);
</script>

<main class="screen">
  <ScreenHeader
    back={{ to: '/', label: 'Главная' }}
    title="История"
    size="hero"
    art={clipboard}
    artLayout="behind"
    artRatio={16 / 9}
    artSlant={false}
  />

  {#if $workouts}
    {#if !latest}
      <p class="empty">Завершённых тренировок пока нет.</p>
    {:else}
      <section class="latest" aria-labelledby="latest-title">
        <p class="kicker display">Последняя тренировка</p>
        <h2 id="latest-title" class="latest-name display">{heading(latest)}</h2>
        {#if latest.dayName}<p class="latest-day display">{dayTitle(latest.dayNumber)}</p>{/if}
        <p class="latest-meta display">
          <span>{formatDateParts(latest.startedAt).full}</span>
          <span>{durationMinutes(latest)} мин</span>
        </p>
        <Button variant="cream" to={summaryPath(latest)}>Посмотреть тренировку</Button>
      </section>

      {#if earlier.length > 0}
        <h2 class="section-title display earlier-title">Предыдущие тренировки</h2>
        <ul class="list">
          {#each earlier as workout (workout.id)}
            {@const date = formatDateParts(workout.startedAt)}
            <li>
              <a href={'#' + summaryPath(workout)} aria-label="{date.full}, {heading(workout)}, {durationMinutes(workout)} мин">
                <span class="date">
                  <span class="date-day display">{date.day}</span>
                  <span class="date-rest display"><span>{date.month}</span><span>{date.year}</span></span>
                </span>
                <span class="what">
                  <span class="what-name display">{heading(workout)}</span>
                  {#if workout.dayName}<span class="what-day display">{dayTitle(workout.dayNumber)}</span>{/if}
                </span>
                <span class="minutes display">{durationMinutes(workout)} мин</span>
                <Icon name="chevron-right" size={22} />
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  {/if}
</main>

<style>
  .latest {
    display: grid;
    gap: 6px;
    padding: 18px;
    border: 2px solid var(--c-panel-line);
    border-radius: var(--radius-m);
  }

  .kicker {
    font-weight: 500;
    font-size: 18px;
    color: var(--c-text-muted);
  }

  .latest-name {
    font-size: 48px;
    overflow-wrap: anywhere;
  }

  .latest-day {
    font-weight: 600;
    font-size: 21px;
  }

  .latest-meta {
    display: flex;
    gap: 16px;
    margin: 10px 0 12px;
    font-weight: 500;
    font-size: 22px;
  }

  .latest-meta span + span {
    padding-left: 16px;
    border-left: 1px solid var(--c-panel-line);
  }

  .earlier-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--c-text-muted);
  }

  .list a {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--c-panel-line);
  }

  .list li:first-child a {
    border-top: 1px solid var(--c-panel-line);
  }

  /* The day number right against the month and year: no reserved width, a small gap. */
  .date {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .date-day {
    font-size: 46px;
    color: var(--c-cream);
  }

  .date-rest {
    display: grid;
    font-weight: 500;
    font-size: 15px;
    line-height: 1.15;
    color: var(--c-text-muted);
  }

  .what {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .what-name {
    font-size: 22px;
    overflow-wrap: anywhere;
  }

  .what-day {
    font-weight: 500;
    font-size: 15px;
    color: var(--c-text-muted);
  }

  .minutes {
    font-weight: 500;
    font-size: 17px;
    color: var(--c-text-muted);
    white-space: nowrap;
  }
</style>
