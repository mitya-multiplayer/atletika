<!-- PLACEHOLDER: the settings list is not approved yet (spec 4.12). -->
<script lang="ts">
  import gears from '../assets/illustrations/gears.webp';
  import Button from '../lib/ui/Button.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/', label: 'Главная' }} title="Настройки" art={gears} />
  <p class="empty">Список настроек ещё не утверждён.</p>

  <h2 class="section-title display">Для разработки</h2>
  <Button variant="secondary" to="/kit">Компоненты интерфейса</Button>
</main>
