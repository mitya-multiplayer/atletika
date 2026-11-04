<!-- Component 01: arrow plus the destination name. -->
<script lang="ts">
  import Icon from './Icon.svelte';

  let { to, label }: { to: string; label: string } = $props();
</script>

<a class="back" href={'#' + to}>
  <Icon name="arrow-left" size={28} />
  <span>{label}</span>
</a>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    min-height: var(--tap);
    padding-right: 8px;
    color: var(--c-cream);
    font-family: var(--font-display);
    font-weight: 600;
    font-size: var(--fs-nav);
    line-height: 1;
    text-transform: uppercase;
  }
</style>
