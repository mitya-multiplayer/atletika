<script lang="ts">
  import bars from '../assets/illustrations/pushup-bars.webp';
  import runner from '../assets/illustrations/runner.webp';
  import { fitText } from '../lib/ui/fitText';
  import Icon from '../lib/ui/Icon.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  // Both card labels share one size: the one «Упражнения» fits at. «Дни» alone would grow larger.
  let labelSize = $state<number>();
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/', label: 'Главная' }} title="Программа" size="hero" backdrop={false} />

  <nav class="cards" aria-label="Программа">
    <a class="card days" href="#/days">
      <img class="art" src={runner} alt="" />
      <span class="label display" style:font-size={labelSize ? `${labelSize}px` : undefined}>Дни</span>
      <span class="chevron"><Icon name="chevron-right" size={30} /></span>
    </a>
    <a class="card exercises" href="#/exercises">
      <img class="art" src={bars} alt="" />
      <span class="label display" use:fitText={{ max: 96, onfit: (px) => (labelSize = px) }}>Упражнения</span>
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
    /* cqw in the pictures' cut lines refers to the card's width. */
    container-type: inline-size;
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

  /* The illustrations are rectangular crops; a slanted left edge makes the cut look deliberate.
     Both cuts run at one angle: 19.2cqw across the runner's 230 px height (about 30% of its
     box; cqw is the card's content width), the same slope over the bars' 133 px box. */
  .art {
    position: absolute;
    right: 0;
    bottom: 0;
    object-fit: cover;
    pointer-events: none;
  }

  .days .art {
    width: 64%;
    height: 100%;
    /* Centred: the artwork places the runner where the cut leaves room for him. */
    object-position: center;
    clip-path: polygon(19.2cqw 0, 100% 0, 100% 100%, 0 100%);
  }

  /* The box shape the exercise screens' headers use (app.css), at its base height. */
  .exercises .art {
    width: calc(var(--bars-art-h) * var(--bars-art-ratio));
    height: var(--bars-art-h);
    object-position: center top;
    clip-path: polygon(calc(19.2cqw * 133 / 230) 0, 100% 0, 100% 100%, 0 100%);
  }
</style>
