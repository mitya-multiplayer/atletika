<script lang="ts" module>
  // Paths from docs/assets/visual_assets/icons (64×64 grid, 5.5 stroke), drawn with
  // currentColor so one icon serves both the black and the cream variant.
  // arrow-left, chevron-right, search, import, export and external are added in the same style.
  const ICONS = {
    plus: { stroke: 'M32 10v44M10 32h44' },
    minus: { stroke: 'M10 32h44' },
    delete: { stroke: 'M12 17h40M22 17V9h20v8M17 17l3 36h24l3-36M27 25v20M37 25v20' },
    // Redrawn 2026-11-08 (the asset's tip was skewed, with a stray stroke inside it, and the
    // pencil sat off-centre): symmetric about the diagonal x + y = 64, tip at the bottom left,
    // a line where the sharpened part starts and one at the ferrule, a round end.
    edit: {
      stroke:
        'M10 54L13.54 40.56L41.82 12.28A7 7 0 0 1 51.72 22.18L23.44 50.46ZM13.54 40.56L23.44 50.46M35.45 18.65L45.35 28.55',
    },
    menu: { stroke: 'M8 14h48M8 32h48M8 50h48' },
    // dumbbell, history and settings: filled, made by scripts/trace-icons.py from the home
    // reference (dumbbell) and docs/assets/supplied_2026-11-04 (chart, gear).
    dumbbell: { fill: 'M14.69 22.23A3.94 3.94 0 0 1 22.57 22.23V29.09H41.43V22.23A3.94 3.94 0 0 1 49.31 22.23V41.77A3.94 3.94 0 0 1 41.43 41.77V34.91H22.57V41.77A3.94 3.94 0 0 1 14.69 41.77ZM13.31 24.8H10.4A2.4 2.4 0 0 0 8 27.2V36.8A2.4 2.4 0 0 0 10.4 39.2H13.31ZM50.69 24.8H53.6A2.4 2.4 0 0 1 56 27.2V36.8A2.4 2.4 0 0 1 53.6 39.2H50.69Z' },
    history: { fill: 'M10.25 34.5h10a1.5 1.5 0 0 1 1.5 1.5v18.5a1.5 1.5 0 0 1 -1.5 1.5h-10a1.5 1.5 0 0 1 -1.5 -1.5v-18.5a1.5 1.5 0 0 1 1.5 -1.5ZM27.25 21h9.5a1.5 1.5 0 0 1 1.5 1.5v32a1.5 1.5 0 0 1 -1.5 1.5h-9.5a1.5 1.5 0 0 1 -1.5 -1.5v-32a1.5 1.5 0 0 1 1.5 -1.5ZM43.75 8h10a1.5 1.5 0 0 1 1.5 1.5v45a1.5 1.5 0 0 1 -1.5 1.5h-10a1.5 1.5 0 0 1 -1.5 -1.5v-45a1.5 1.5 0 0 1 1.5 -1.5Z' },
    settings: {
      fill: 'M55.87 32L55.91 35.79L55.72 36.18L55.06 36.69L54.24 36.73L52.87 37.2L52.25 37.24L52.16 37.4L51.46 37.4L50.83 37.76L50.48 38.91L50.3 39.03L50.33 39.41L49.98 39.82L49.99 40.2L49.47 41.09L51.84 45.13L51.69 46.31L50.65 47.37L46.23 51.59L45.47 51.6L41.95 49.24L40.86 49.39L40.46 49.73L40.08 49.73L38.4 50.58L38.03 50.57L37.49 51.13L36.56 55.48L35.8 56L32.21 56L28.2 56L27.37 55.81L26.09 50.74L25.31 50.38L24.93 50.42L22.62 49.27L22.05 49.24L18.28 51.59L17.77 51.59L17.4 51.37L15.88 49.9L14.2 48.03L12.15 46.16L12.16 45.13L12.33 44.77L14.54 41.28L13.54 39.09L13.31 38.07L13.17 37.76L12.5 37.41L11.01 37.23L9.64 36.75L8.77 36.73L8.11 36.21L8.08 32L8.12 28L8.61 27.45L12.54 26.6L13.17 26.24L13.31 25.93L13.69 24.42L14.53 22.91L13.35 20.79L12.33 19.47L12.16 19.11L12.17 18.11L15.36 14.77L16.55 13.58L17.89 12.58L18.77 12.74L22.28 14.83L23.97 13.97L24.99 13.74L25.43 13.44L25.97 13.43L26.3 12.76L27.4 8.36L28.2 8L32 8L35.8 8L36.38 8.36L37.68 13.41L39.17 13.8L39.59 14.11L39.97 14.09L40.37 14.46L41.35 14.77L41.44 14.96L45.12 12.92L46.11 12.58L47.45 13.58L50.32 16.63L51.01 17.15L51.85 18.36L51.84 19.11L50.49 21.11L49.47 23.1L50.16 24.29L50.14 24.67L50.48 25.09L50.84 26.42L55.23 27.49L55.71 28.03L55.9 28.43ZM41.55 32a9.55 9.55 0 1 0 -19.1 0a9.55 9.55 0 1 0 19.1 0Z',
    },
    reset: { stroke: 'M12 20A22 22 0 1 1 9 36M12 8v13h13' },
    pause: { fill: 'M13 9h12v46H13ZM39 9h12v46H39Z' },
    play: { fill: 'M18 9v46l36-23L18 9Z' },
    // Share (2026-11-08, from the user's sketch): an arrowhead pointing right, its tail curving
    // down to a point at the bottom left. Centred: x 6–58, y 8–56.
    share: { fill: 'M38 8L58 28L38 48V36C22 36 11.5 42 6 56C6.5 35 19 20 38 20Z' },
    'arrow-left': { stroke: 'M54 32H12M28 14L10 32l18 18' },
    'chevron-right': { stroke: 'M24 12l20 20-20 20' },
    search: { stroke: 'M28 10a18 18 0 1 0 0 36a18 18 0 1 0 0-36ZM41 41l14 14' },
    import: { stroke: 'M32 8v32M18 26l14 14 14-14M10 44v10h44V44' },
    export: { stroke: 'M32 40V8M18 22L32 8l14 14M10 44v10h44V44' },
    // Opens outside the app.
    external: { stroke: 'M22 12h30v30M52 12L14 50' },
  } satisfies Record<string, { stroke?: string; fill?: string }>;

  export type IconName = keyof typeof ICONS;
  export const ICON_NAMES = Object.keys(ICONS) as IconName[];
</script>

<script lang="ts">
  let { name, size = 24 }: { name: IconName; size?: number } = $props();

  const icon: { stroke?: string; fill?: string } = $derived(ICONS[name]);
</script>

<svg class="icon" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false" data-icon={name}>
  <!-- evenodd cuts holes such as the gear's centre out of the fill. -->
  {#if icon.fill}<path d={icon.fill} fill="currentColor" fill-rule="evenodd" />{/if}
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
