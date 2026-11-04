<!-- PLACEHOLDER: the series editor is not decided yet (spec 4.9). -->
<script lang="ts">
  import { dayQuery } from '../lib/db/repo';
  import { dayNumber, dayTitle } from '../lib/domain/format';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  let { dayId }: { dayId: string } = $props();

  const day = $derived(dayQuery(dayId));
</script>

<main class="screen">
  <ScreenHeader back={{ to: `/days/${dayId}`, label: $day ? dayTitle(dayNumber($day)) : 'День' }} title="Серия" />
  <p class="empty">
    Серия объединяет несколько упражнений, которые выполняются по кругу. Редактор серий появится, когда будет
    утверждена его логика.
  </p>
</main>
