<!-- Back button, large display title, optional illustration on a red diagonal. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import headerBackground from '../../assets/illustrations/header-bg.webp';
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
    /**
     * How far, in pixels, the illustration reaches below the title, at its usual size.
     * 'beside': the header gets shorter by this amount, so the title and the content
     *   below move up and the illustration extends into that content, which must sit
     *   above it (position: relative). Default 0.
     * 'behind': the illustration moves down below the title. Default 10.
     */
    artDrop?: number;
    size?: 'hero' | 'title';
    aside?: Snippet;
  };

  let { title, kicker, back, art, artLayout = 'beside', artDrop, size = 'title', aside }: Props = $props();
</script>

<header class="header" class:with-art={art}>
  {#if back || aside}
    <div class="bar">
      {#if back}<BackButton to={back.to} label={back.label} />{/if}
      {#if aside}<div class="aside">{@render aside()}</div>{/if}
    </div>
  {/if}

  <div class="hero {art ? artLayout : ''}" style:--art-drop={artDrop === undefined ? undefined : `${artDrop}px`}>
    {#if art}
      <div class="art" aria-hidden="true">
        <AccentStripe class="art-stripe" />
        <img src={art} alt="" />
      </div>
    {:else}
      <div class="backdrop" aria-hidden="true"><img src={headerBackground} alt="" /></div>
    {/if}
    <div class="titles">
      {#if kicker}<p class="kicker display">{kicker}</p>{/if}
      <h1 class="title display size-{size}" use:fitText={{ max: size === 'hero' ? 132 : undefined }}>{title}</h1>
    </div>
  </div>
</header>

<style>
  /* The header is the illustration's containing block, so the picture can reach up
     through the screen's top padding to the top edge (behind the back button). */
  .header {
    position: relative;
    margin-bottom: 18px;
  }

  .bar {
    position: relative;
    z-index: 1;
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

  /* Size classes are prefixed: a bare "hero" would pick up the .hero container styles
     (min-height, padding) and pad the title with empty space. */
  /* Poster titles stay on one line; fitText sizes them to the width. */
  .title.size-hero {
    font-size: var(--fs-hero);
    white-space: nowrap;
  }

  .with-art .title.size-hero {
    max-width: 68%;
  }

  .title.size-title {
    font-size: var(--fs-title);
  }

  /* Starts at the top edge of the screen in both layouts. */
  .art {
    position: absolute;
    top: calc(-1 * var(--screen-pad-top));
    right: calc(-1 * var(--gutter));
    bottom: 0;
    width: 62%;
    overflow: hidden;
    clip-path: polygon(34% 0, 100% 0, 100% 100%, 0 100%);
  }

  /* Darkens the top so the back button and the phone's status bar stay readable. */
  .art::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgb(7 7 6 / 0.6), rgb(7 7 6 / 0) calc(var(--screen-pad-top) + 48px));
  }

  .art img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: right center;
  }

  /* artDrop: the header shrinks by the drop and the illustration reaches that far below it. */
  .hero.beside {
    --art-drop: 0px;
  }

  .with-art .hero.beside {
    min-height: calc(200px - var(--art-drop));
  }

  .hero.beside .art {
    bottom: calc(-1 * var(--art-drop));
  }

  .art :global(.art-stripe) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /* Headers without an illustration: the black-and-red background image, full width from
     the top edge of the screen to the bottom of the header, red corner kept in view. */
  .backdrop {
    position: absolute;
    top: calc(-1 * var(--screen-pad-top));
    right: calc(-1 * var(--gutter));
    bottom: 0;
    left: calc(-1 * var(--gutter));
    overflow: hidden;
  }

  .backdrop img {
    width: 100%;
    max-width: none;
    height: 100%;
    object-fit: cover;
    object-position: right bottom;
  }

  /* ---- artLayout="behind": the illustration sits on the right, under the title ----
     It runs from the top edge of the screen to just below the title, at its natural
     proportions: its height sets its width, and anything wider than the screen is cut
     off on the left. */
  .with-art .hero.behind {
    min-height: 0;
  }

  /* The illustration ends this far below the title; the padding keeps it clear of the
     content below. (Padding, not margin: a margin would collapse with the header's.) */
  .hero.behind {
    --art-drop: 10px;
    padding-bottom: var(--art-drop);
  }

  .hero.behind .art {
    left: calc(-1 * var(--gutter));
    width: auto;
    display: flex;
    justify-content: flex-end;
    clip-path: none;
  }

  .hero.behind .art :global(.art-stripe) {
    display: none;
  }

  .hero.behind .art img {
    flex: none;
    width: auto;
    max-width: none;
    height: 100%;
    object-fit: fill;
    clip-path: polygon(34% 0, 100% 0, 100% 100%, 0 100%);
  }

  /* Adds a darker lower part so cream title letters stay readable over the cream floor. */
  .hero.behind .art::after {
    background:
      linear-gradient(to bottom, rgb(7 7 6 / 0.6), rgb(7 7 6 / 0) calc(var(--screen-pad-top) + 48px)),
      linear-gradient(to bottom, rgb(7 7 6 / 0) 45%, rgb(7 7 6 / 0.82) 100%);
  }
</style>
