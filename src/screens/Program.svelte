<script lang="ts">
  import bars from '../assets/illustrations/pushup-bars.webp';
  import runner from '../assets/illustrations/runner.webp';
  import { fitText } from '../lib/ui/fitText';
  import Icon from '../lib/ui/Icon.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/', label: 'Главная' }} title="Программа" size="hero" backdrop={false} />

  <nav class="cards" aria-label="Программа">
    <a class="card days" href="#/days">
      <img class="art" src={runner} alt="" />
      <span class="label display" use:fitText={{ max: 96 }}>Дни</span>
      <span class="chevron"><Icon name="chevron-right" size={30} /></span>
    </a>
    <a class="card exercises" href="#/exercises">
      <img class="art" src={bars} alt="" />
      <span class="label display" use:fitText={{ max: 96 }}>Упражнения</span>
      <span class="chevron"><Icon name="chevron-right" size={30} /></span>
    </a>
  </nav>
</main>

<style>
  .cards {
    display: grid;
    gap: 16px;
  }

  .card {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-content: space-between;
    min-height: 230px;
    padding: 22px 20px 20px;
    overflow: hidden;
    border-radius: var(--radius-s);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .label {
    position: relative;
    z-index: 1;
    display: block;
    min-width: 0;
  }

  .chevron {
    position: relative;
    z-index: 1;
  }

  /* The illustrations are rectangular crops; a slanted left edge makes the cut look deliberate. */
  .art {
    position: absolute;
    right: 0;
    bottom: 0;
    object-fit: cover;
    pointer-events: none;
    clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%);
  }

  .days .art {
    width: 64%;
    height: 100%;
    object-position: 60% center;
  }

  /* The box shape the exercise screens' headers use (app.css), at its base height. */
  .exercises .art {
    width: calc(var(--bars-art-h) * var(--bars-art-ratio));
    height: var(--bars-art-h);
    object-position: center top;
  }
</style>
