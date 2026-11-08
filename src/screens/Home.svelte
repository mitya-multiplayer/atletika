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
  <!-- The brand and date at the top; everything else keeps to the bottom. When the screen is
       short, the illustration loses its top, cut on a straight line under the brand. Only when
       even a small strip of it would not fit does the screen scroll; nothing overlaps. -->
  <header class="top">
    <h1 class="brand display" use:fitText={{ max: 120 }}>Атлетика</h1>
    <p class="date display">
      <span>{today.date}</span>
      <span>{today.weekday}</span>
    </p>
  </header>

  <div class="bottom">
    <div class="hero" aria-hidden="true"><img src={planche} alt="" width="1392" height="1400" /></div>

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
  </div>
</main>

<style>
  /* At least as tall as the screen; taller (it scrolls) only when the content needs it.
     A flex column, not a one-cell grid with align-self: end: WebKit left such a grid item where
     it was when content loaded into it later, hanging below the screen.
     Bottom: the gutter, or the home indicator's safe area where that is larger. */
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding-top: 0;
    padding-bottom: max(var(--gutter), var(--safe-bottom));
  }

  /* The illustration below is cut on a straight line at the bottom of this box. The bottom
     padding makes the gap from the brand's baseline to that line about the one between
     «Тренировка идёт» and «День N» (baseline to capitals, ~13px).
     Top: the gutter below the safe area, plus --home-top-extra on a phone with a status bar,
     whose soft edge blurs what lies just under it (iOS 26). */
  .top {
    --home-top-extra: min(var(--safe-top), 16px);
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin: 0 calc(-1 * var(--gutter));
    padding: calc(var(--safe-top) + var(--home-top-extra) + var(--gutter)) var(--gutter) 11px;
    background: var(--c-bg);
  }

  /* Each line's negative margin lifts the top of its capitals onto the padding line, so the
     brand and the date start at the same height whatever size fitText gives the brand. */
  .brand {
    --lh: 0.95;
    flex: 1;
    min-width: 0;
    margin-top: calc((var(--oswald-cap) - (var(--lh) + var(--oswald-ascent) - var(--oswald-descent)) / 2) * 1em);
    font-size: var(--fs-hero);
    line-height: var(--lh);
  }

  .date {
    --lh: 1.15;
    display: grid;
    margin-top: calc((var(--oswald-cap) - (var(--lh) + var(--oswald-ascent) - var(--oswald-descent)) / 2) * 1em);
    padding-bottom: 6px;
    border-bottom: 2px solid var(--c-cream);
    font-weight: 500;
    font-size: 17px;
    line-height: var(--lh);
    white-space: nowrap;
  }

  /* Fills the rest of the screen; only the illustration gives up height to fit. */
  .bottom {
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    gap: 14px;
  }

  .bottom > :not(.hero) {
    flex: none;
  }

  /* Takes the height left over and shows the picture from its bottom edge, where the athlete
     is: a tall screen leaves background above the picture, a short one cuts its top. Never
     less than a strip of it; below that the screen scrolls. */
  .hero {
    position: relative;
    flex: 1 1 0;
    min-height: 96px;
    margin: 0 calc(-1 * var(--gutter));
    overflow: hidden;
  }

  /* Full width at the illustration's own proportions (from the width/height attributes).
     Lighten raises any black darker than --c-bg to exactly --c-bg, so the picture has no
     visible edge where it meets the background, and leaves every other colour as it is. */
  .hero img {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: auto;
    mix-blend-mode: lighten;
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
