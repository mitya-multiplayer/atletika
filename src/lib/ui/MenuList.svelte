<!-- A bordered group of rows: title, hint and a chevron (Settings, REF-11). Each row is a link or a button. -->
<script lang="ts" module>
  export type MenuItem = { title: string; hint?: string; to?: string; onclick?: () => void };
</script>

<script lang="ts">
  import Icon from './Icon.svelte';

  let { items }: { items: MenuItem[] } = $props();
</script>

<ul class="menu">
  {#each items as item (item.title)}
    <li>
      {#snippet content()}
        <span class="text">
          <span class="title display">{item.title}</span>
          {#if item.hint}<span class="hint">{item.hint}</span>{/if}
        </span>
        <Icon name="chevron-right" size={22} />
      {/snippet}
      {#if item.to}
        <a class="row" href={'#' + item.to}>{@render content()}</a>
      {:else}
        <button class="row" type="button" onclick={item.onclick}>{@render content()}</button>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .menu {
    border: 2px solid var(--c-panel-line);
    border-radius: var(--radius-m);
    list-style: none;
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 72px;
    padding: 12px 14px 12px 20px;
    border: 0;
    background: none;
    color: var(--c-cream);
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  /* Divider between rows, inset like the reference. */
  li + li .row::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 14px;
    border-top: 1px solid var(--c-panel-line);
  }

  .row:active {
    background: rgb(247 237 224 / 0.06);
  }

  .text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }

  .title {
    font-size: 24px;
    line-height: 1.1;
  }

  .hint {
    font-size: var(--fs-label);
    text-transform: uppercase;
    color: var(--c-text-muted);
  }
</style>
