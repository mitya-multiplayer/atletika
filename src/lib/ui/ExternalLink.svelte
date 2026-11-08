<!-- A plain text link that opens outside the app: dotted underline in the text colour, and an arrow.
     target="_blank": a new tab in a browser; from the home-screen app, Safari or Chrome
     (or the app that handles the address, such as Telegram). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  type Props = {
    href: string;
    /** Read after the link text by screen readers, e.g. «видео, откроется в браузере». */
    note: string;
    children: Snippet;
  };

  let { href, note, children }: Props = $props();
</script>

<a class="link" {href} target="_blank" rel="noopener noreferrer"
  ><span class="text">{@render children()}</span><Icon name="external" size={13} /><span class="visually-hidden">
    ({note})</span
  ></a
>

<style>
  .link {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    max-width: 100%;
    padding: 6px 0;
    color: var(--c-cream);
    text-decoration: underline dotted currentColor;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }

  /* The arrow follows the text size: 13 px next to 17 px body text. */
  .link :global(svg) {
    width: 0.75em;
    height: 0.75em;
  }

  /* One line; a long text ends in «…», the arrow stays visible. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
