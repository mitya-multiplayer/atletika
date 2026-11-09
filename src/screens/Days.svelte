<script lang="ts">
  import runner from '../assets/illustrations/runner.webp';
  import { createDay, daysQuery, deleteDay } from '../lib/db/repo';
  import { dayNumber, dayTitle } from '../lib/domain/format';
  import type { TrainingDay } from '../lib/domain/types';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import { confirmAction } from '../lib/ui/dialog.svelte';
  import IconButton from '../lib/ui/IconButton.svelte';
  import ListRow from '../lib/ui/ListRow.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  const days = daysQuery();

  async function add() {
    const day = await createDay();
    navigate(`/days/${day.id}?new=1`);
  }

  async function remove(day: TrainingDay) {
    const title = dayTitle(dayNumber(day));
    const confirmed = await confirmAction({
      title: `Удалить ${title}${day.name ? ` · ${day.name}` : ''}?`,
      message: 'Упражнения этого дня тоже будут удалены. Следующие дни получат новые номера.',
      confirmLabel: 'Удалить',
    });
    if (confirmed) await deleteDay(day.id);
  }
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/program', label: 'Программа' }} title="Тренировочные дни" art={runner} artPosition="center" />

  {#if $days}
    {#if $days.length === 0}
      <p class="empty">Тренировочных дней пока нет.</p>
    {:else}
      <ul class="stack">
        {#each $days as day (day.id)}
          <li>
            <ListRow to="/days/{day.id}">
              <span class="day display">{dayTitle(dayNumber(day))}</span>
              <span class="name">{day.name || 'Без названия'}</span>
              {#snippet actions()}
                <IconButton icon="edit" label="Изменить {dayTitle(dayNumber(day))}" onclick={() => navigate(`/days/${day.id}`)} />
                <IconButton icon="delete" label="Удалить {dayTitle(dayNumber(day))}" onclick={() => remove(day)} />
              {/snippet}
            </ListRow>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  <div class="actions-bottom">
    <Button variant="secondary" icon="plus" onclick={add}>Добавить день</Button>
  </div>
</main>

<style>
  .day {
    display: block;
    font-size: 30px;
  }

  .name {
    display: block;
    margin-top: 4px;
  }
</style>
