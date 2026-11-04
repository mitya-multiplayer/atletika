<!-- Cream list card. Optional left drag handle and right-side actions. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  type Props = {
    to?: string;
    onclick?: () => void;
    handle?: boolean;
    actionsLayout?: 'row' | 'column';
    children: Snippet;
    actions?: Snippet;
  };

  let { to, onclick, handle = false, actionsLayout = 'row', children, actions }: Props = $props();
</script>

<div class="row">
  {#if handle}
    <span class="handle" aria-hidden="true"><Icon name="menu" size={22} /></span>
  {/if}
  {#if to}
    <a class="main" href={'#' + to}>{@render children()}</a>
  {:else if onclick}
    <button class="main" type="button" {onclick}>{@render children()}</button>
  {:else}
    <div class="main">{@render children()}</div>
  {/if}
  {#if actions}
    <div class="actions" class:vertical={actionsLayout === 'column'}>{@render actions()}</div>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 60px;
    padding: 8px 6px 8px 16px;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
  }

  .handle {
    display: grid;
    place-items: center;
    align-self: stretch;
    width: 36px;
    margin-left: -8px;
    cursor: grab;
    touch-action: none;
  }

  .main {
    flex: 1;
    min-width: 0;
    padding: 6px 0;
  }

  button.main {
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .actions {
    display: flex;
    flex: none;
  }

  .actions.vertical {
    flex-direction: column;
  }
</style>
