<script lang="ts">
  import planche from '../assets/illustrations/planche.webp';
  import { daysQuery, startOrResumeWorkout, workoutStatusQuery } from '../lib/db/repo';
  import { dayNumber, dayTitle, formatToday } from '../lib/domain/format';
  import { nextDay } from '../lib/domain/progression';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import { showMessage } from '../lib/ui/dialog.svelte';
  import { fitText } from '../lib/ui/fitText';
  import Icon from '../lib/ui/Icon.svelte';

  const days = daysQuery();
  const status = workoutStatusQuery();
  const today = formatToday(new Date());

  const active = $derived($status?.active ?? null);
  // The day after the last finished workout's day (docs/DECISIONS.md, 2026-11-05).
  const next = $derived($days && $status ? nextDay($days, $status.lastFinishedDayId) : undefined);

  async function start() {
    if (!next) return;
    const workout = await startOrResumeWorkout(next.id);
    if (workout) navigate('/workout');
    else await showMessage('В этом дне нет упражнений', `Добавьте упражнения в ${dayTitle(dayNumber(next))}, чтобы начать тренировку.`);
  }
</script>

<main class="screen home">
  <!-- The illustration starts at the top edge of the screen; the brand and date sit over it. -->
  <div class="masthead">
    <div class="hero" aria-hidden="true"><img src={planche} alt="" width="1390" height="1105" /></div>
    <header class="top">
      <h1 class="brand display" use:fitText={{ max: 120 }}>Атлетика</h1>
      <p class="date display">
        <span>{today.weekday}</span>
        <span>{today.date}</span>
      </p>
    </header>
  </div>

  <section class="next" aria-live="polite">
    {#if active}
      <p class="kicker display">Тренировка идёт</p>
      <p class="day display">{dayTitle(active.dayNumber)}</p>
      {#if active.dayName}<p class="day-name display">{active.dayName}</p>{/if}
    {:else if next !== undefined}
      <p class="kicker display">Следующая тренировка</p>
      {#if next}
        <p class="day display">{dayTitle(dayNumber(next))}</p>
        {#if next.name}<p class="day-name display">{next.name}</p>{/if}
      {:else}
        <p class="day display">Программа пуста</p>
      {/if}
    {/if}
  </section>

  {#if active}
    <Button icon="play" trailing="chevron-right" to="/workout">Продолжить тренировку</Button>
  {:else if next}
    <Button icon="play" trailing="chevron-right" onclick={start}>Начать тренировку</Button>
  {:else if next === null}
    <Button icon="plus" to="/days">Создать день</Button>
  {/if}

  <nav class="tiles" aria-label="Разделы">
    <a href="#/history"><Icon name="history" size={46} /><span>История</span></a>
    <!-- Wide and short: drawn larger so it is about 1.4× the chart's height, as in the reference. -->
    <a href="#/program"><Icon name="dumbbell" size={64} /><span>Программа</span></a>
    <a href="#/settings"><Icon name="settings" size={46} /><span>Настройки</span></a>
  </nav>
</main>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Picture and header share one grid cell; the cell reaches up over the screen's top padding. */
  .masthead {
    display: grid;
    /* minmax(0, …): otherwise the column grows to the image's 1390px intrinsic width. */
    grid-template-columns: minmax(0, 1fr);
    margin-top: calc(-1 * var(--screen-pad-top));
  }

  .masthead > * {
    grid-area: 1 / 1;
  }

  .top {
    position: relative;
    z-index: 1;
    display: flex;
    align-self: start;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding-top: calc(var(--screen-pad-top) + 12px);
  }

  .brand {
    flex: 1;
    min-width: 0;
    font-size: var(--fs-hero);
  }

  .date {
    display: grid;
    padding-top: 6px;
    padding-bottom: 6px;
    border-bottom: 2px solid var(--c-cream);
    font-weight: 500;
    font-size: 17px;
    line-height: 1.15;
    white-space: nowrap;
  }

  .hero {
    margin: 0 calc(-1 * var(--gutter));
  }

  /* Full width at the illustration's own proportions (from the width/height attributes). */
  .hero img {
    width: 100%;
    height: auto;
  }

  /* align-content: start keeps the line spacing fixed; stretched rows would pad it. */
  .next {
    display: grid;
    align-content: start;
    gap: 6px;
    min-height: 120px;
    padding-top: 6px;
  }

  .kicker,
  .day-name {
    font-weight: 600;
    font-size: 19px;
  }

  /* The tail of «Д» hangs below «ДЕНЬ N»; this makes the visible gap under it
     match the one between «Следующая тренировка» and the day. In em, so it
     follows the tail as the title scales with the screen width. */
  .next .day {
    margin-bottom: 0.15em;
  }

  .day {
    font-size: clamp(48px, 15vw, 72px);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  /* A fixed icon row keeps the three labels on one line whatever each icon's size. */
  .tiles a {
    display: grid;
    grid-template-rows: 64px auto;
    justify-items: center;
    align-items: center;
    align-content: center;
    gap: 6px;
    min-height: 116px;
    padding: 12px 4px;
    border-radius: var(--radius-s);
    background: var(--c-cream);
    color: var(--c-ink);
    font-weight: 700;
    font-size: var(--fs-label);
    text-transform: uppercase;
  }
</style>
