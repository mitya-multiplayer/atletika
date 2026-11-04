<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = {
    label: string;
    value?: string;
    placeholder?: string;
    multiline?: boolean;
    required?: boolean;
    error?: string;
    type?: 'text' | 'url';
    inputmode?: HTMLInputAttributes['inputmode'];
  };

  let {
    label,
    value = $bindable(''),
    placeholder = '',
    multiline = false,
    required = false,
    error = '',
    type = 'text',
    inputmode,
  }: Props = $props();
</script>

<label class="field">
  <span class="label">
    {label}{#if required}<span class="required" aria-hidden="true"> *</span>{/if}
  </span>
  {#if multiline}
    <textarea bind:value {placeholder} rows="4" aria-invalid={!!error}></textarea>
  {:else}
    <input {type} {inputmode} bind:value {placeholder} {required} aria-invalid={!!error} autocomplete="off" />
  {/if}
  {#if error}<span class="error">{error}</span>{/if}
</label>

<style>
  .field {
    display: grid;
    gap: 8px;
  }

  .label {
    font-weight: 500;
    font-size: var(--fs-body);
    color: var(--c-cream);
  }

  .required {
    color: var(--c-red);
  }

  input,
  textarea {
    width: 100%;
    padding: 15px 16px;
    border: 2px solid transparent;
    border-radius: var(--radius-m);
    background: var(--c-cream);
    color: var(--c-ink);
    font-size: var(--fs-body);
    resize: vertical;
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--c-placeholder);
  }

  [aria-invalid='true'] {
    border-color: var(--c-red);
  }

  .error {
    color: var(--c-red);
    font-size: var(--fs-label);
  }
</style>
