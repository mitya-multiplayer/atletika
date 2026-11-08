<!-- Settings › default rest after each set of an exercise newly added to a day. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import gears from '../assets/illustrations/gears.webp';
  import { getSettings, setDefaultRest } from '../lib/db/repo';
  import { REST_MAX_SEC, REST_MIN_SEC, REST_STEP_SEC } from '../lib/domain/defaults';
  import { formatRest } from '../lib/domain/format';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
  import Stepper from '../lib/ui/Stepper.svelte';

  // The change stays local until «Сохранить»; back leaves it unsaved.
  let restSec: number | undefined = $state();

  onMount(async () => {
    restSec = (await getSettings()).defaultRestSec;
  });

  async function save() {
    if (restSec === undefined) return;
    await setDefaultRest(restSec);
    navigate('/settings', { replace: true });
  }
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/settings', label: 'Настройки' }} kicker="Тренировка" title="Отдых" art={gears} />

  {#if restSec !== undefined}
    <div class="panel">
      <Stepper
        label="Отдых после подхода"
        variant="round"
        value={restSec}
        min={REST_MIN_SEC}
        max={REST_MAX_SEC}
        step={REST_STEP_SEC}
        format={formatRest}
        onchange={(value) => (restSec = value)}
      />
    </div>
    <p class="hint">
      С этим отдыхом после каждого подхода начинается упражнение, добавленное в день. Уже настроенные упражнения не
      меняются.
    </p>

    <div class="actions-bottom">
      <Button onclick={save}>Сохранить</Button>
    </div>
  {/if}
</main>

<style>
  /* Black, outlined like the panels on the workout screen. */
  .panel {
    position: relative;
    padding: 14px 18px 18px;
    border: 2px solid var(--c-panel-line);
    border-radius: var(--radius-m);
    background: var(--c-bg);
  }

  .hint {
    margin-top: 12px;
    color: var(--c-text-muted);
  }
</style>
