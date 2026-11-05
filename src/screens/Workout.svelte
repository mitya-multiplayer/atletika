<!-- Active workout: the current set, or the rest timer after it (REF-01; docs/DECISIONS.md, 2026-11-05). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getActiveWorkout, saveWorkout } from '../lib/db/repo';
  import type { Workout } from '../lib/domain/types';
  import {
    adjustRest,
    completeSet,
    endRest,
    exercisesDone,
    formatTimer,
    isFinished,
    pauseRest,
    REST_ADJUST_SEC,
    restRemainingMs,
    resumeRest,
    settle,
    skipExercise,
  } from '../lib/domain/workout';
  import { navigate } from '../lib/router.svelte';
  import AccentStripe from '../lib/ui/AccentStripe.svelte';
  import BackButton from '../lib/ui/BackButton.svelte';
  import Button from '../lib/ui/Button.svelte';
  import DayLabel from '../lib/ui/DayLabel.svelte';
  import { fitText } from '../lib/ui/fitText';
  import Icon from '../lib/ui/Icon.svelte';
  import ProgressScale from '../lib/ui/ProgressScale.svelte';

  let workout: Workout | null | undefined = $state();
  let now = $state(Date.now());

  onMount(() => {
    getActiveWorkout().then((active) => {
      if (active) apply(settle(active, Date.now()));
      else workout = null;
    });
    // The rest timer is a timestamp; this only redraws it and notices when it runs out.
    const timer = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(timer);
  });

  // The next set opens automatically at 0:00.
  $effect(() => {
    if (workout?.rest && workout.rest.pausedRemainingMs === null && now >= workout.rest.endsAt) {
      apply(settle(workout, now));
    }
  });

  async function apply(next: Workout) {
    const plain = $state.snapshot(next) as Workout;
    // Refresh the clock too: a stale `now` would show 01:31 for a 1:30 rest for a moment.
    now = Date.now();
    workout = plain;
    await saveWorkout(plain);
    if (isFinished(plain)) navigate(`/workout/${plain.id}/summary`, { replace: true });
  }

  const exercise = $derived(workout ? workout.exercises[workout.position.exercise] : undefined);
  const upcoming = $derived(
    workout?.rest ? { position: workout.rest.next, exercise: workout.exercises[workout.rest.next.exercise] } : undefined,
  );
  const nextIsNewExercise = $derived(!!workout?.rest && workout.rest.next.exercise !== workout.position.exercise);
  const remaining = $derived(workout ? restRemainingMs(workout, now) : 0);
  const paused = $derived(workout?.rest?.pausedRemainingMs != null);
</script>

<main class="screen workout">
  <div class="bar">
    <BackButton to="/" label="Главная" />
    {#if workout}<DayLabel number={workout.dayNumber} name={workout.dayName} />{/if}
  </div>

  {#if workout === null}
    <h1 class="display missing-title">Тренировка</h1>
    <p class="empty">Тренировка не начата. Начните её на главном экране.</p>
    <Button variant="secondary" to="/">На главную</Button>
  {:else if workout && exercise}
    <ProgressScale total={workout.exercises.length} current={exercisesDone(workout)} label="Упражнения тренировки" />

    {#if !workout.rest}
      <section class="stage" aria-live="polite">
        <AccentStripe class="stage-stripe" />
        <p class="kicker display">Упражнение {workout.position.exercise + 1} из {workout.exercises.length}</p>
        <h1 class="exercise display" use:fitText={{ max: 96 }}>{exercise.name}</h1>
      </section>

      <div class="panel figures">
        <div>
          <span class="label">Подход</span>
          <span class="big display"
            ><span class="current">{workout.position.set + 1}</span> / {exercise.sets.length}</span
          >
        </div>
        <div>
          <span class="label">Повторения</span>
          <span class="big display">{exercise.sets[workout.position.set].reps}</span>
        </div>
      </div>

      <div class="actions">
        <Button onclick={() => workout && apply(completeSet(workout, Date.now()))}>Завершить подход</Button>
        <Button variant="secondary" onclick={() => workout && apply(skipExercise(workout, Date.now()))}>
          Пропустить упражнение
        </Button>
      </div>
    {:else if upcoming}
      <section class="stage rest">
        <AccentStripe class="stage-stripe" />
        <h1 class="display rest-title">Отдых</h1>
        <p class="timer display" role="timer" aria-label="Осталось {formatTimer(remaining)}">{formatTimer(remaining)}</p>
        <p class="until display">{nextIsNewExercise ? 'До следующего упражнения' : 'До следующего подхода'}</p>
        <p class="which display">Подход {upcoming.position.set + 1} из {upcoming.exercise.sets.length}</p>
      </section>

      <div class="panel controls">
        <button type="button" class="round" onclick={() => workout && apply(adjustRest(workout, -REST_ADJUST_SEC, Date.now()))}>
          <Icon name="minus" size={28} /><span class="visually-hidden">Отдых: меньше на 30 секунд</span>
        </button>
        <button
          type="button"
          class="round main"
          onclick={() => workout && apply(paused ? resumeRest(workout, Date.now()) : pauseRest(workout, Date.now()))}
        >
          <Icon name={paused ? 'play' : 'pause'} size={30} />
          <span class="visually-hidden">{paused ? 'Продолжить отдых' : 'Пауза'}</span>
        </button>
        <button type="button" class="round" onclick={() => workout && apply(adjustRest(workout, REST_ADJUST_SEC, Date.now()))}>
          <Icon name="plus" size={28} /><span class="visually-hidden">Отдых: больше на 30 секунд</span>
        </button>
        <span class="caption" aria-hidden="true">- 30 с</span>
        <span class="caption" aria-hidden="true">{paused ? 'Продолжить' : 'Пауза'}</span>
        <span class="caption" aria-hidden="true">+ 30 с</span>
      </div>

      <div class="panel next">
        <span class="label">{nextIsNewExercise ? 'Следующее упражнение' : 'Следующий подход'}</span>
        <p class="next-name display">{upcoming.exercise.name}</p>
        <div class="figures small">
          <div>
            <span class="label">Подход</span>
            <span class="display">{upcoming.position.set + 1} из {upcoming.exercise.sets.length}</span>
          </div>
          <div>
            <span class="label">Повторения</span>
            <span class="display">{upcoming.exercise.sets[upcoming.position.set].reps}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <Button variant="secondary" onclick={() => workout && apply(endRest(workout))}>Завершить отдых</Button>
      </div>
    {/if}
  {/if}
</main>

<style>
  .workout {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-height: var(--tap);
  }

  .missing-title {
    font-size: var(--fs-title);
  }

  .stage {
    position: relative;
    display: grid;
    align-content: start;
    gap: 6px;
    min-height: 210px;
    padding-top: 6px;
  }

  .stage :global(.stage-stripe) {
    position: absolute;
    right: calc(-1 * var(--gutter));
    bottom: -20px;
    left: calc(-1 * var(--gutter));
    width: calc(100% + 2 * var(--gutter));
    height: 190px;
  }

  .kicker,
  .exercise,
  .rest-title,
  .timer,
  .until,
  .which {
    position: relative;
  }

  .kicker {
    font-weight: 500;
    font-size: 19px;
    color: var(--c-text-muted);
  }

  .exercise {
    font-size: 72px;
    text-shadow: 0 2px 0 rgb(7 7 6 / 0.55);
  }

  .rest {
    justify-items: center;
    text-align: center;
  }

  .rest-title {
    font-size: 34px;
  }

  .timer {
    font-size: clamp(110px, 38vw, 170px);
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 3px 0 rgb(7 7 6 / 0.55);
  }

  .until,
  .which {
    font-weight: 600;
    font-size: 21px;
    line-height: 1.1;
  }

  .panel {
    border: 2px solid var(--c-panel-line);
    border-radius: var(--radius-m);
    padding: 14px 18px;
  }

  .figures {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .figures > div {
    display: grid;
    gap: 2px;
  }

  .figures > div + div {
    padding-left: 18px;
    border-left: 1px solid var(--c-panel-line);
  }

  .label {
    font-weight: 500;
    font-size: var(--fs-label);
    color: var(--c-text-muted);
  }

  .big {
    font-size: 72px;
    line-height: 1;
  }

  .current {
    color: var(--c-red);
  }

  .actions {
    display: grid;
    gap: 12px;
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    justify-items: center;
    align-items: center;
    row-gap: 6px;
  }

  .round {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border: 2px solid var(--c-cream);
    border-radius: 50%;
    background: none;
    color: var(--c-cream);
    cursor: pointer;
  }

  .round.main {
    width: 76px;
    height: 76px;
    border-color: var(--c-cream);
    background: var(--c-cream);
    color: var(--c-red);
  }

  .caption {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 15px;
    text-transform: uppercase;
  }

  .next {
    display: grid;
    gap: 6px;
  }

  .next-name {
    font-size: 30px;
  }

  .figures.small {
    padding-top: 6px;
    border-top: 1px solid var(--c-panel-line);
    text-align: center;
  }

  .figures.small .display {
    font-size: 24px;
  }
</style>
