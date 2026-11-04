<script lang="ts">
  import planche from '../assets/illustrations/planche.webp';
  import { daysQuery } from '../lib/db/repo';
  import { dayNumber, dayTitle, formatToday } from '../lib/domain/format';
  import { nextDay } from '../lib/domain/progression';
  import Button from '../lib/ui/Button.svelte';
  import { fitText } from '../lib/ui/fitText';
  import Icon from '../lib/ui/Icon.svelte';

  const days = daysQuery();
  const today = formatToday(new Date());

  // No workout history exists yet, so there is no last completed day.
  const next = $derived($days ? nextDay($days, null) : undefined);
</script>

<main class="screen home">
  <header class="top">
    <h1 class="brand display" use:fitText={{ max: 120 }}>Атлетика</h1>
    <p class="date display">
      <span>{today.weekday}</span>
      <span>{today.date}</span>
    </p>
  </header>

  <div class="hero" aria-hidden="true"><img src={planche} alt="" /></div>

  <section class="next" aria-live="polite">
    {#if next !== undefined}
      <p class="kicker display">Следующая тренировка</p>
      {#if next}
        <p class="day display">{dayTitle(dayNumber(next))}</p>
        {#if next.name}<p class="day-name display">{next.name}</p>{/if}
      {:else}
        <p class="day display">Программа пуста</p>
      {/if}
    {/if}
  </section>

  {#if next}
    <Button icon="play" trailing="chevron-right" to="/workout">Начать тренировку</Button>
  {:else if next === null}
    <Button icon="plus" to="/days">Создать день</Button>
  {/if}

  <nav class="tiles" aria-label="Разделы">
    <a href="#/history"><Icon name="history" size={46} /><span>История</span></a>
    <a href="#/program"><Icon name="dumbbell" size={50} /><span>Программа</span></a>
    <a href="#/settings"><Icon name="settings" size={46} /><span>Настройки</span></a>
  </nav>
</main>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
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

  .hero img {
    width: 100%;
    aspect-ratio: 910 / 530;
    object-fit: cover;
  }

  .next {
    display: grid;
    gap: 6px;
    min-height: 120px;
    padding-top: 6px;
  }

  .kicker,
  .day-name {
    font-weight: 600;
    font-size: 19px;
  }

  .day {
    font-size: clamp(48px, 15vw, 72px);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .tiles a {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 10px;
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
