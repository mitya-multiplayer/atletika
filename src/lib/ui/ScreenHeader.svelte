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
     * Both layouts end the illustration about 5 px below the title's baseline and darken its
     * lower part, so the cream title stays readable over it.
     * 'beside': cropped to fill the right side of the header from the top edge of the screen,
     *   partly behind the title. For tall illustrations (runner, gears).
     * 'behind': on the right, under the title, at the size the Program screen's «Упражнения»
     *   card shows it (--bars-art-w × --bars-art-h). For wide pictures (push-up bars,
     *   clipboard).
     */
    artLayout?: 'beside' | 'behind';
    /** Width ÷ height of a 'behind' picture's box (default: the push-up bars' --bars-art-ratio). */
    artRatio?: number;
    /** Cut the picture's left edge on a slant (default). Off for a picture whose left side is
     *  already the background's black, so all of it shows (the history clipboard). */
    artSlant?: boolean;
    /** CSS object-position of a 'beside' picture inside its cut window (default: its right side). */
    artPosition?: string;
    /** Without an illustration: show the black-and-red background image (default) or nothing. */
    backdrop?: boolean;
    size?: 'hero' | 'title';
    aside?: Snippet;
  };

  let { title, kicker, back, art, artLayout = 'beside', artRatio, artSlant = true, artPosition = 'right center', backdrop = true, size = 'title', aside }: Props = $props();
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
      <div class="art" class:uncut={!artSlant} aria-hidden="true" style:--art-ratio={artRatio}>
        <AccentStripe class="art-stripe" />
        <img src={art} alt="" style:object-position={artLayout === 'beside' ? artPosition : undefined} />
      </div>
    {:else if backdrop}
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

  /* The title's line box ends 0.023em below its baseline (Oswald at line-height 0.95, see
     --oswald-* in app.css): 1–3 px at header title sizes. Reaching 3 px further puts the
     picture's bottom edge about 5 px below the letters. */
  .hero {
    --art-below: -3px;
  }

  /* 'beside' starts at the top edge of the screen. */
  .art {
    position: absolute;
    top: calc(-1 * var(--screen-pad-top));
    right: calc(-1 * var(--gutter));
    bottom: var(--art-below);
    width: 62%;
    overflow: hidden;
    clip-path: polygon(34% 0, 100% 0, 100% 100%, 0 100%);
  }

  /* The lower part fades into the background, so the cream title letters stand out against
     the picture: a mask, not a dark layer on top. Where the picture's bottom edge falls on a
     fractional device pixel (phones at 2.625× or 3×), the picture and a layer over it each
     half-covered the last row, and some 11% of the picture showed through as a thin grey or
     red line however dark the layer was. A mask leaves nothing to paint at the edge. */
  .art {
    --fade: linear-gradient(to bottom, #000 45%, rgb(0 0 0 / 0.18) 85%, transparent 100%);
    -webkit-mask-image: var(--fade);
    mask-image: var(--fade);
  }

  /* Darkens the top, so the back button and the phone's status bar stay readable. */
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

  /* ---- artLayout="behind": the push-up bars on the right, under the title ----
     From the top edge of the screen to just below the title, like the other pictures, in the
     box shape and crop of the Program screen's «Упражнения» card (--bars-art-ratio): the
     height sets the width, so a taller header (a title on two lines, a phone's status bar)
     shows the picture larger. Flush with the screen's right edge. */
  /* At least the card's size: the back button's bar (--tap) and this hero, from the screen's
     top padding to the picture's bottom (3 px below the hero), make --bars-art-h. */
  .with-art .hero.behind {
    min-height: max(0px, calc(var(--bars-art-h) - var(--screen-pad-top) - var(--tap) - 3px));
  }

  .hero.behind .art {
    width: auto;
    aspect-ratio: var(--art-ratio, var(--bars-art-ratio));
    clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%);
  }

  .hero .art.uncut {
    clip-path: none;
  }

  .hero.behind .art :global(.art-stripe) {
    display: none;
  }

  .hero.behind .art img {
    object-fit: cover;
    object-position: center top;
  }
</style>
