<!-- Labelled − value + control on cream surfaces. -->
<script lang="ts">
  import Icon from './Icon.svelte';

  type Props = {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    format?: (value: number) => string;
    onchange: (value: number) => void;
  };

  let { label, value, min = 0, max = 999, step = 1, format = String, onchange }: Props = $props();
</script>

<div class="stepper" role="group" aria-label={label}>
  <span class="label">{label}</span>
  <div class="controls">
    <button
      type="button"
      aria-label="{label}: меньше"
      disabled={value <= min}
      onclick={() => onchange(Math.max(min, value - step))}
    >
      <Icon name="minus" size={16} />
    </button>
    <output class="value">{format(value)}</output>
    <button
      type="button"
      aria-label="{label}: больше"
      disabled={value >= max}
      onclick={() => onchange(Math.min(max, value + step))}
    >
      <Icon name="plus" size={16} />
    </button>
  </div>
</div>

<style>
  .stepper {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .label {
    font-weight: 500;
    font-size: var(--fs-small);
  }

  .controls {
    display: grid;
    grid-template-columns: 38px minmax(40px, 1fr) 38px;
    align-items: center;
  }

  button {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-s);
    background: var(--c-cream-muted);
    color: var(--c-ink);
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .value {
    font-weight: 700;
    font-size: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
