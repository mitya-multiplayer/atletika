<!-- Component 06: red diagonal strip. Enters and leaves through the sides, never the corners;
     the right end is twice as wide as the left. Position it from the parent. -->
<script lang="ts">
  let { class: className = '' }: { class?: string } = $props();
</script>

<svg class="stripe {className}" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
  <polygon points="0,34 100,4 100,28 0,46" />
</svg>

<style>
  .stripe {
    display: block;
    pointer-events: none;
  }

  polygon {
    fill: var(--c-red);
  }
</style>
