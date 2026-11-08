<!-- Components 04 (primary: red fill, black label) and 05 (secondary: cream outline), and
     cream: cream fill, black label, for opening something rather than acting (History). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';

  type Props = {
    variant?: 'primary' | 'secondary' | 'cream';
    icon?: IconName;
    trailing?: IconName;
    to?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
  };

  let { variant = 'primary', icon, trailing, to, type = 'button', disabled = false, onclick, children }: Props =
    $props();
</script>

<!-- With a trailing icon, the leading one moves to the left edge, 1.5× larger, and the label
     is centred on the button by itself (Home: ▶ «Начать тренировку» ›). -->
{#snippet content()}
  {#if icon && trailing}<span class="leading"><Icon name={icon} size={39} /></span>{/if}
  <span class="group">
    {#if icon && !trailing}<Icon name={icon} size={26} />{/if}
    <span>{@render children()}</span>
  </span>
  {#if trailing}<span class="trailing"><Icon name={trailing} size={22} /></span>{/if}
{/snippet}

{#if to}
  <a class="btn {variant}" class:with-trailing={trailing} href={'#' + to}>{@render content()}</a>
{:else}
  <button class="btn {variant}" class:with-trailing={trailing} {type} {disabled} {onclick}>{@render content()}</button>
{/if}

<style>
  .btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: var(--button-h);
    padding: 8px 20px;
    border: 2px solid transparent;
    border-radius: var(--radius-m);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-button);
    line-height: 1;
    text-align: center;
    text-transform: uppercase;
    cursor: pointer;
  }

  .group {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }

  /* Room for the edge icons, absolutely positioned left and right; the same on both sides
     keeps the label centred. */
  .with-trailing {
    padding-inline: 62px;
  }

  .primary {
    background: var(--c-red);
    color: var(--c-ink);
  }

  .secondary {
    background: var(--c-bg);
    border-color: var(--c-cream);
    color: var(--c-cream);
  }

  .cream {
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .btn:active {
    transform: translateY(1px);
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .trailing {
    position: absolute;
    right: 18px;
    display: flex;
  }

  .leading {
    position: absolute;
    left: 16px;
    display: flex;
  }
</style>
