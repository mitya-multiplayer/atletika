<!-- Components 04 (primary: red fill, black label) and 05 (secondary: cream outline). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';

  type Props = {
    variant?: 'primary' | 'secondary';
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

{#snippet content()}
  <span class="group">
    {#if icon}<Icon name={icon} size={26} />{/if}
    <span>{@render children()}</span>
  </span>
  {#if trailing}<span class="trailing"><Icon name={trailing} size={22} /></span>{/if}
{/snippet}

{#if to}
  <a class="btn {variant}" href={'#' + to}>{@render content()}</a>
{:else}
  <button class="btn {variant}" {type} {disabled} {onclick}>{@render content()}</button>
{/if}

<style>
  .btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: var(--button-h);
    padding: 8px 48px;
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

  .primary {
    background: var(--c-red);
    color: var(--c-ink);
  }

  .secondary {
    background: var(--c-bg);
    border-color: var(--c-cream);
    color: var(--c-cream);
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
</style>
