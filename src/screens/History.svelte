<!-- PLACEHOLDER: history needs completed workouts, which need the active-workout flow. -->
<script lang="ts">
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/', label: 'Главная' }} title="История" size="hero" />
  <p class="empty">Завершённых тренировок пока нет.</p>
</main>
