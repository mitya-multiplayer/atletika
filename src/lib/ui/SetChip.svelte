<!-- A set shown as a compact block: set number over its repetitions. -->
<script lang="ts">
  let { index, reps }: { index: number; reps: number } = $props();
</script>

<span class="chip" aria-label="Подход {index}: {reps} повт.">
  <span class="n">{index}</span>
  <span class="r">{reps}</span>
</span>

<style>
  .chip {
    display: inline-grid;
    justify-items: center;
    min-width: 42px;
    padding: 5px 8px;
    border-radius: var(--radius-s);
    background: var(--c-cream-muted);
    color: var(--c-ink);
    font-family: var(--font-ui);
    line-height: 1.15;
  }

  .n {
    font-weight: 700;
    font-size: var(--fs-small);
  }

  .r {
    font-size: var(--fs-label);
  }
</style>
