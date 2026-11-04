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
    /** 'contain' for wide illustrations that cropping would make unrecognisable. */
    artFit?: 'cover' | 'contain';
    size?: 'hero' | 'title';
    aside?: Snippet;
  };

  let { title, kicker, back, art, artFit = 'cover', size = 'title', aside }: Props = $props();
</script>

<header class="header" class:with-art={art}>
  {#if back || aside}
    <div class="bar">
      {#if back}<BackButton to={back.to} label={back.label} />{/if}
      {#if aside}<div class="aside">{@render aside()}</div>{/if}
    </div>
  {/if}

  <div class="hero">
    {#if art}
      <div class="art {artFit}" aria-hidden="true">
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

  .art.contain {
    width: 78%;
  }

  /* Top-aligned so the title below does not sit on the illustration's cream floor. */
  .art.contain img {
    object-fit: contain;
    object-position: right top;
  }

  .with-art:has(.contain) .hero {
    min-height: 210px;
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
</style>
