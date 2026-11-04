<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';

  type Props = {
    icon: IconName;
    label: string;
    onclick?: (event: MouseEvent) => void;
    tone?: 'inherit' | 'red';
    size?: number;
    disabled?: boolean;
  };

  let { icon, label, onclick, tone = 'inherit', size = 24, disabled = false }: Props = $props();
</script>

<button class="icon-btn {tone}" type="button" aria-label={label} title={label} {disabled} {onclick}>
  <Icon name={icon} {size} />
</button>

<style>
  .icon-btn {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    padding: 0;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .red {
    color: var(--c-red);
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
