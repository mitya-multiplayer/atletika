<script lang="ts" module>
  // Paths from docs/assets/visual_assets/icons (64×64 grid, 5.5 stroke), drawn with
  // currentColor so one icon serves both the black and the cream variant.
  // arrow-left, chevron-right, search, import and export are added in the same style.
  const ICONS = {
    plus: { stroke: 'M32 10v44M10 32h44' },
    minus: { stroke: 'M10 32h44' },
    delete: { stroke: 'M12 17h40M22 17V9h20v8M17 17l3 36h24l3-36M27 25v20M37 25v20' },
    edit: { stroke: 'M10 46l3-12L39 8a6 6 0 0 1 9 0l2 2a6 6 0 0 1 0 9L24 45l-14 1ZM34 13l13 13M10 46l12-3' },
    menu: { stroke: 'M8 14h48M8 32h48M8 50h48' },
    // Vertically centred; the source drawing sits in the top half of its box.
    dumbbell: { stroke: 'M5 26v12M11 22v20M21 27v10M43 27v10M53 22v20M59 26v12M11 32h42' },
    history: { fill: 'M8 52V34h10v18H8Zm18 0V22h10v30H26Zm18 0V11h10v41H44Z' },
    settings: {
      stroke:
        'M32 5l5 3 6-1 4 5 6 2v7l4 5-3 6 3 6-4 5v7l-6 2-4 5-6-1-5 3-5-3-6 1-4-5-6-2v-7l-4-5 3-6-3-6 4-5v-7l6-2 4-5 6 1 5-3ZM42 32a10 10 0 1 1-20 0a10 10 0 1 1 20 0Z',
    },
    reset: { stroke: 'M12 20A22 22 0 1 1 9 36M12 8v13h13' },
    pause: { fill: 'M13 9h12v46H13ZM39 9h12v46H39Z' },
    play: { fill: 'M18 9v46l36-23L18 9Z' },
    'arrow-left': { stroke: 'M54 32H12M28 14L10 32l18 18' },
    'chevron-right': { stroke: 'M24 12l20 20-20 20' },
    search: { stroke: 'M28 10a18 18 0 1 0 0 36a18 18 0 1 0 0-36ZM41 41l14 14' },
    import: { stroke: 'M32 8v32M18 26l14 14 14-14M10 44v10h44V44' },
    export: { stroke: 'M32 40V8M18 22L32 8l14 14M10 44v10h44V44' },
  } satisfies Record<string, { stroke?: string; fill?: string }>;

  export type IconName = keyof typeof ICONS;
  export const ICON_NAMES = Object.keys(ICONS) as IconName[];
</script>

<script lang="ts">
  let { name, size = 24 }: { name: IconName; size?: number } = $props();

  const icon: { stroke?: string; fill?: string } = $derived(ICONS[name]);
</script>

<svg class="icon" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
  {#if icon.fill}<path d={icon.fill} fill="currentColor" />{/if}
  {#if icon.stroke}
    <path
      d={icon.stroke}
      fill="none"
      stroke="currentColor"
      stroke-width="5.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/if}
</svg>

<style>
  .icon {
    flex: none;
    display: block;
  }
</style>
