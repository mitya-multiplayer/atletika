<!-- Component 03: segmented progress. Done = red, current = grey with red outline, next = grey. -->
<script lang="ts">
  let { total = 5, current = 0, label = 'Прогресс' }: { total?: number; current?: number; label?: string } =
    $props();

  const segments = $derived(Array.from({ length: total }, (_, i) => i));
</script>

<div
  class="scale"
  role="progressbar"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={total}
  aria-valuenow={current}
>
  {#each segments as i (i)}
    <span class="seg" class:done={i < current} class:current={i === current}></span>
  {/each}
</div>

<style>
  .scale {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 8px;
  }

  .seg {
    height: 9px;
    border-radius: 999px;
    background: var(--c-grey);
  }

  .seg.done {
    background: var(--c-red);
  }

  .seg.current {
    box-shadow: inset 0 0 0 2px var(--c-red);
  }
</style>
