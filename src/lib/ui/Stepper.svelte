<!-- Labelled − value + control.
     card: square buttons, for cream surfaces (day editor, series editor).
     round: circled − / + and a large value on the dark background, like the repetitions on the
     workout set screen (Settings › Отдых). -->
<script lang="ts">
  import Icon from './Icon.svelte';

  type Props = {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    format?: (value: number) => string;
    variant?: 'card' | 'round';
    onchange: (value: number) => void;
  };

  let { label, value, min = 0, max = 999, step = 1, format = String, variant = 'card', onchange }: Props = $props();
  const iconSize = $derived(variant === 'round' ? 20 : 16);
</script>

<div class="stepper {variant}" role="group" aria-label={label}>
  <span class="label">{label}</span>
  <div class="controls">
    <button
      type="button"
      aria-label="{label}: меньше"
      disabled={value <= min}
      onclick={() => onchange(Math.max(min, value - step))}
    >
      <Icon name="minus" size={iconSize} />
    </button>
    <output class="value" class:display={variant === 'round'}>{format(value)}</output>
    <button
      type="button"
      aria-label="{label}: больше"
      disabled={value >= max}
      onclick={() => onchange(Math.min(max, value + step))}
    >
      <Icon name="plus" size={iconSize} />
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

  /* ---- round ---- */

  .round {
    gap: 10px;
    justify-items: center;
  }

  .round .label {
    font-size: var(--fs-label);
    color: var(--c-text-muted);
  }

  .round .controls {
    grid-template-columns: 40px auto 40px;
    gap: 14px;
  }

  .round button {
    width: 40px;
    height: 40px;
    border: 2px solid var(--c-cream);
    border-radius: 50%;
    background: none;
    color: var(--c-cream);
  }

  .round button:disabled {
    opacity: 0.3;
  }

  /* Wide enough for 60:00, so the buttons stay put as the value changes. */
  .round .value {
    min-width: 2.6em;
    font-size: 56px;
    line-height: 1;
  }
</style>
