<!-- Component 02: compact training-day label for the upper-right corner. -->
<script lang="ts">
  import { dayTitle } from '../domain/format';

  let { number, name = '' }: { number: number; name?: string } = $props();
</script>

<div class="day-label">
  <span class="day">{dayTitle(number)}</span>
  {#if name}<span class="name">{name}</span>{/if}
</div>

<style>
  .day-label {
    display: inline-grid;
    justify-items: start;
    gap: 4px;
    font-family: var(--font-display);
    line-height: 1;
    text-transform: uppercase;
  }

  .day {
    font-weight: 700;
    font-size: 30px;
    color: var(--c-cream);
  }

  .name {
    font-weight: 500;
    font-size: 15px;
    color: var(--c-text-muted);
  }
</style>
