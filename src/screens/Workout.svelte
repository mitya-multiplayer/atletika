<!-- Active workout: the current set, or the rest timer after it (REF-01; docs/DECISIONS.md, 2026-11-05). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { exercisesQuery, getActiveWorkout, saveWorkout } from '../lib/db/repo';
  import { videoHref } from '../lib/domain/exercises';
  import type { Workout } from '../lib/domain/types';
  import { seriesTitle } from '../lib/domain/series';
  import {
    ACTUAL_REPS_MAX,
    ACTUAL_REPS_MIN,
    blockCount,
    blocksDone,
    completeSet,
    currentReps,
    currentStep,
    endRest,
    formatTimer,
    isFinished,
    restRemainingMs,
    setActualReps,
    settle,
    skipExercise,
    upcomingStep,
  } from '../lib/domain/workout';
  import { navigate } from '../lib/router.svelte';
  import AccentStripe from '../lib/ui/AccentStripe.svelte';
  import BackButton from '../lib/ui/BackButton.svelte';
  import Button from '../lib/ui/Button.svelte';
  import DayLabel from '../lib/ui/DayLabel.svelte';
  import { fitText } from '../lib/ui/fitText';
  import ExternalLink from '../lib/ui/ExternalLink.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import ProgressScale from '../lib/ui/ProgressScale.svelte';

  let workout: Workout | null | undefined = $state();
  let now = $state(Date.now());

  onMount(() => {
    getActiveWorkout().then((active) => {
      if (active) {
        latest = active;
        act((w) => settle(w, Date.now()));
      } else workout = null;
    });
    // The rest timer is a timestamp; this only redraws it. At 0:00 it counts on below zero
    // until «Завершить отдых» (docs/DECISIONS.md, 2026-11-08).
    const timer = setInterval(() => (now = Date.now()), 250);
    return () => clearInterval(timer);
  });

  /** The newest state, possibly still being saved. Every change builds on it, so quick taps add up. */
  let latest: Workout | null = null;
  let saving: Promise<void> = Promise.resolve();

  /**
   * Applies a change. Saves run one after another in tap order, and the screen shows a state
   * only once it is saved: what is visible survives the app closing right after a tap.
   */
  function act(change: (current: Workout) => Workout) {
    if (!latest) return;
    const changed = change(latest);
    // Nothing changed (e.g. a timer tick while the save that ended the rest is still running).
    // On first load it still goes through, to show the screen.
    if (changed === latest && workout !== undefined) return;
    const next = $state.snapshot(changed) as Workout;
    latest = next;
    saving = saving.then(async () => {
      await saveWorkout(next);
      if (latest !== next) return; // a newer change follows; it will be shown instead
      // Refresh the clock too: a stale `now` would show 01:31 for a 1:30 rest for a moment.
      now = Date.now();
      workout = next;
      if (isFinished(next)) navigate(`/workout/${next.id}/summary`, { replace: true });
    });
  }

  const step = $derived(workout ? currentStep(workout) : undefined);
  const reps = $derived(workout && !workout.rest ? currentReps(workout) : 0);
  const exercise = $derived(workout && step ? workout.exercises[step.exercise] : undefined);
  // Description and video come from the library, so edits there show here; a workout only stores names.
  const library = exercisesQuery();
  const details = $derived(exercise ? $library?.find((e) => e.id === exercise.exerciseId) : undefined);
  const description = $derived(details?.description.trim() ?? '');
  const video = $derived(videoHref(details?.videoUrl));
  /** While resting: the step that comes next. */
  const upcoming = $derived.by(() => {
    const next = workout?.rest ? upcomingStep(workout) : undefined;
    return workout && next ? { step: next, exercise: workout.exercises[next.exercise] } : undefined;
  });
  // What the rest leads to: another set of the same exercise, the next round, or another exercise.
  const nextKind = $derived.by((): 'set' | 'round' | 'exercise' => {
    if (!upcoming || !step || !exercise) return 'exercise';
    if (upcoming.step.exercise === step.exercise) return exercise.series ? 'round' : 'set';
    if (exercise.series && upcoming.exercise.block === exercise.block && upcoming.step.set > step.set) return 'round';
    return 'exercise';
  });
  /** «2 из 3»: the set, or in a series the round. */
  const countOf = (ex: { sets: unknown[]; series: { rounds: number } | null }, set: number) =>
    `${set + 1} из ${ex.series?.rounds ?? ex.sets.length}`;
  const remaining = $derived(workout ? restRemainingMs(workout, now) : 0);
  const timerText = $derived(formatTimer(remaining));
  /** Past 0:00: the timer shows a negative time and pulses. */
  const over = $derived(timerText.startsWith('−'));
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
    <ProgressScale total={blockCount(workout)} current={blocksDone(workout)} label="Упражнения тренировки" />

    {#if !workout.rest}
      <section class="stage" aria-live="polite">
        <AccentStripe class="stage-stripe" />
        <p class="kicker display">
          {#if exercise.series}
            {seriesTitle(exercise.series.number)} · Круг {step!.set + 1} из {exercise.series.rounds}
          {:else}
            Упражнение {exercise.block + 1} из {blockCount(workout)}
          {/if}
        </p>
        <h1 class="exercise display" use:fitText={{ max: 96 }}>{exercise.name}</h1>
      </section>

      {#if description || video}
        <section class="about" aria-label="Об упражнении">
          {#if description}<p class="description">{description}</p>{/if}
          {#if video}
            <ExternalLink href={video} note="видео, откроется в браузере">{video}</ExternalLink>
          {/if}
        </section>
      {/if}

      <div class="panel figures">
        <div>
          <span class="label">{exercise.series ? 'Круг' : 'Подход'}</span>
          <span class="big display count"
            ><span class="current">{step!.set + 1}</span>/{exercise.series?.rounds ?? exercise.sets.length}</span
          >
        </div>
        <div class="reps-column">
          <span class="label">Повторения</span>
          <!-- The repetitions actually done: start at the plan, adjusted before «Завершить подход». -->
          <div class="reps" role="group" aria-label="Повторения">
            <button
              type="button"
              class="adjust"
              aria-label="Повторения: меньше"
              disabled={reps <= ACTUAL_REPS_MIN}
              onclick={() => act((w) => setActualReps(w, currentReps(w) - 1))}
            >
              <Icon name="minus" size={20} />
            </button>
            <output class="big display" class:long={reps >= 100}>{reps}</output>
            <button
              type="button"
              class="adjust"
              aria-label="Повторения: больше"
              disabled={reps >= ACTUAL_REPS_MAX}
              onclick={() => act((w) => setActualReps(w, currentReps(w) + 1))}
            >
              <Icon name="plus" size={20} />
            </button>
          </div>
          {#if reps !== exercise.sets[step!.set].reps}
            <span class="plan">план {exercise.sets[step!.set].reps}</span>
          {/if}
        </div>
      </div>

      <div class="actions">
        <Button onclick={() => act((w) => completeSet(w, Date.now()))}>Завершить подход</Button>
        <Button variant="secondary" onclick={() => act((w) => skipExercise(w, Date.now()))}>
          {exercise.series ? 'Пропустить серию' : 'Пропустить упражнение'}
        </Button>
      </div>
    {:else if upcoming}
      <section class="stage rest">
        <AccentStripe class="stage-stripe" />
        <h1 class="display rest-title">Отдых</h1>
        <p
          class="timer display"
          class:over
          class:long={timerText.length > 6}
          role="timer"
          aria-label={over ? `Отдых окончен ${timerText.slice(1)} назад` : `Осталось ${timerText}`}
        >{timerText}</p>
        <p class="until display">
          {nextKind === 'set' ? 'До следующего подхода' : nextKind === 'round' ? 'До следующего круга' : 'До следующего упражнения'}
        </p>
        <p class="which display">
          {upcoming.exercise.series ? 'Круг' : 'Подход'} {countOf(upcoming.exercise, upcoming.step.set)}
        </p>
      </section>

      <div class="actions">
        <Button variant="secondary" onclick={() => act(endRest)}>Завершить отдых</Button>
      </div>

      <div class="panel next">
        <span class="label">
          {nextKind === 'set' ? 'Следующий подход' : nextKind === 'round' ? 'Следующий круг' : 'Следующее упражнение'}
        </span>
        <p class="next-name display">{upcoming.exercise.name}</p>
        <div class="figures small">
          <div>
            <span class="label">{upcoming.exercise.series ? 'Круг' : 'Подход'}</span>
            <span class="display">{countOf(upcoming.exercise, upcoming.step.set)}</span>
          </div>
          <div>
            <span class="label">Повторения</span>
            <span class="display">{upcoming.exercise.sets[upcoming.step.set].reps}</span>
          </div>
        </div>
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

  /* minmax(0, …) and min-width: 0 give the title a definite width, so fitText can shrink
     a long one-word name («Подтягивания») instead of letting it run off the screen. */
  .stage {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
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
    min-width: 0;
    font-size: 72px;
  }

  .rest {
    justify-items: center;
    text-align: center;
  }

  .rest-title {
    font-size: 34px;
  }

  /* Sized so «−01:28» (after 0:00) fits the width as well as «01:28». */
  .timer {
    font-size: clamp(90px, 30vw, 146px);
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* 100 minutes and more over: one digit more. */
  .timer.long {
    font-size: clamp(76px, 25vw, 122px);
  }

  /* Past 0:00 the time counts on below zero and fades in and out, in the same colour. */
  .timer.over {
    animation: rest-over 1.6s ease-in-out infinite;
  }

  @keyframes rest-over {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .until,
  .which {
    font-weight: 600;
    font-size: 21px;
    line-height: 1.1;
  }

  /* minmax(0, …): otherwise the column grows to fit a long URL and nothing is cut off. */
  .about {
    display: grid;
    font-size: var(--fs-body);
    grid-template-columns: minmax(0, 1fr);
    justify-items: start;
    gap: 10px;
  }

  .description {
    color: var(--c-cream);
    font-size: var(--fs-body);
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .panel {
    border: 2px solid var(--c-panel-line);
    border-radius: var(--radius-m);
    padding: 14px 18px;
  }

  /* The set column takes what «1 / 3» needs; the repetitions with − / + get the rest. */
  .figures {
    display: grid;
    grid-template-columns: auto 1fr;
  }

  .figures > div {
    display: grid;
    gap: 2px;
  }

  /* The same gap on both sides of the divider. */
  .figures > div:first-child {
    padding-right: 18px;
  }

  .figures > div + div {
    padding-left: 18px;
    border-left: 1px solid var(--c-panel-line);
  }

  /* The repetitions, their − / + and «план N» centred in their column. */
  .reps-column {
    justify-items: center;
  }

  .label {
    font-weight: 500;
    font-size: var(--fs-label);
    color: var(--c-text-muted);
  }

  .big {
    font-size: 72px;
    line-height: 1;
    white-space: nowrap;
  }

  .current {
    color: var(--c-red);
  }

  .reps {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .reps .big {
    min-width: 1.1em;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .reps .big.long {
    font-size: 52px;
  }

  .adjust {
    display: grid;
    flex: none;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 2px solid var(--c-cream);
    border-radius: 50%;
    background: none;
    color: var(--c-cream);
    cursor: pointer;
  }

  .adjust:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .plan {
    font-size: var(--fs-label);
    color: var(--c-text-muted);
  }

  .actions {
    display: grid;
    gap: 12px;
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
