<!-- Back button, large display title, optional illustration on a red diagonal. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import AccentStripe from './AccentStripe.svelte';
  import BackButton from './BackButton.svelte';
  import { fitText } from './fitText';

  type Props = {
    title: string;
    kicker?: string;
    back?: { to: string; label: string };
    art?: string;
    /**
     * 'beside': cropped to fill the right side of the header, partly behind the title.
     *   For tall illustrations (runner, gears).
     * 'behind': on the right at its natural proportions, under the title, ending just below it
     *   and darkened at the bottom for legibility. For wide illustrations (push-up bars).
     */
    artLayout?: 'beside' | 'behind';
    size?: 'hero' | 'title';
    aside?: Snippet;
  };

  let { title, kicker, back, art, artLayout = 'beside', size = 'title', aside }: Props = $props();
</script>

<header class="header" class:with-art={art}>
  {#if back || aside}
    <div class="bar">
      {#if back}<BackButton to={back.to} label={back.label} />{/if}
      {#if aside}<div class="aside">{@render aside()}</div>{/if}
    </div>
  {/if}

  <div class="hero {art ? artLayout : ''}">
    {#if art}
      <div class="art" aria-hidden="true">
        <AccentStripe class="art-stripe" />
        <img src={art} alt="" />
      </div>
    {:else}
      <AccentStripe class="lone-stripe" />
    {/if}
    <div class="titles">
      {#if kicker}<p class="kicker display">{kicker}</p>{/if}
      <h1 class="title display {size}" use:fitText={{ max: size === 'hero' ? 132 : undefined }}>{title}</h1>
    </div>
  </div>
</header>

<style>
  .header {
    margin-bottom: 18px;
  }

  .bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-height: var(--tap);
  }

  .aside {
    margin-left: auto;
  }

  .hero {
    position: relative;
    display: flex;
    align-items: flex-end;
    min-height: 96px;
    padding-top: 10px;
  }

  .with-art .hero {
    min-height: 200px;
  }

  .titles {
    position: relative;
    z-index: 1;
    width: 100%;
    min-width: 0;
  }

  .kicker {
    margin-bottom: 6px;
    font-weight: 500;
    font-size: 18px;
    color: var(--c-cream);
  }

  .title {
    color: var(--c-cream);
    hyphens: manual;
    text-shadow: 0 2px 0 rgb(7 7 6 / 0.55);
  }

  /* Poster titles stay on one line; fitText sizes them to the width. */
  .title.hero {
    font-size: var(--fs-hero);
    white-space: nowrap;
  }

  .with-art .title.hero {
    max-width: 68%;
  }

  .title.title {
    font-size: var(--fs-title);
  }

  .art {
    position: absolute;
    top: 0;
    right: calc(-1 * var(--gutter));
    bottom: 0;
    width: 62%;
    overflow: hidden;
    clip-path: polygon(34% 0, 100% 0, 100% 100%, 0 100%);
  }

  .art img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: right center;
  }

  .art :global(.art-stripe) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .hero :global(.lone-stripe) {
    position: absolute;
    right: calc(-1 * var(--gutter));
    bottom: -6px;
    width: 70%;
    height: 90px;
  }

  /* ---- artLayout="behind": the illustration sits on the right, under the title ----
     Art and title share one grid cell, so the header is as tall as the taller of the two. */
  .with-art .hero.behind {
    display: grid;
    align-items: end;
    min-height: 0;
  }

  .hero.behind > * {
    grid-area: 1 / 1;
  }

  /* The illustration drops below the title; the padding keeps it clear of the content below.
     (Padding, not margin: a margin would collapse with the header's own bottom margin.) */
  .hero.behind {
    --art-drop: 10px;
    padding-bottom: var(--art-drop);
  }

  .hero.behind .art {
    position: relative;
    top: var(--art-drop);
    right: auto;
    bottom: auto;
    justify-self: end;
    width: 78%;
    margin-right: calc(-1 * var(--gutter));
  }

  /* Natural proportions: neither cropped nor enlarged to fill the header. */
  .hero.behind .art img {
    height: auto;
    object-fit: fill;
  }

  /* Darkens the lower part so cream title letters stay readable over the cream floor. */
  .hero.behind .art::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgb(7 7 6 / 0) 30%, rgb(7 7 6 / 0.82) 100%);
  }
</style>
