<script lang="ts">
  import bars from '../assets/illustrations/pushup-bars.webp';
  import { daysUsingExercise, deleteExercise, exercisesQuery } from '../lib/db/repo';
  import { dayNumber, dayTitle } from '../lib/domain/format';
  import type { Exercise } from '../lib/domain/types';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import { confirmAction, showMessage } from '../lib/ui/dialog.svelte';
  import Icon from '../lib/ui/Icon.svelte';
  import IconButton from '../lib/ui/IconButton.svelte';
  import ListRow from '../lib/ui/ListRow.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  const exercises = exercisesQuery();

  async function remove(exercise: Exercise) {
    const usedIn = await daysUsingExercise(exercise.id);
    if (usedIn.length > 0) {
      const days = usedIn.map((day) => dayTitle(dayNumber(day)) + (day.name ? ` (${day.name})` : '')).join(', ');
      await showMessage('Упражнение используется', `Сначала уберите «${exercise.name}» из дней: ${days}.`);
      return;
    }
    const confirmed = await confirmAction({
      title: `Удалить «${exercise.name}»?`,
      message: 'Упражнение будет удалено из библиотеки.',
      confirmLabel: 'Удалить',
    });
    if (confirmed) await deleteExercise(exercise.id);
  }

  // Entry points are required (spec 4.5); the file format is still OPEN.
  function notReady(action: 'Импорт' | 'Экспорт') {
    showMessage(`${action} пока недоступен`, 'Формат файла для импорта и экспорта упражнений ещё не утверждён.');
  }
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/program', label: 'Программа' }} title="Упражнения" art={bars} artLayout="behind">
    {#snippet aside()}
      <div class="io">
        <button type="button" onclick={() => notReady('Импорт')}><Icon name="import" size={22} /><span>Импорт</span></button>
        <button type="button" onclick={() => notReady('Экспорт')}><Icon name="export" size={22} /><span>Экспорт</span></button>
      </div>
    {/snippet}
  </ScreenHeader>

  {#if $exercises}
    {#if $exercises.length === 0}
      <p class="empty">Упражнений пока нет.</p>
    {:else}
      <ul class="stack">
        {#each $exercises as exercise (exercise.id)}
          <li>
            <ListRow to="/exercises/{exercise.id}">
              <span class="ex-name">{exercise.name}</span>
              {#snippet actions()}
                <IconButton icon="edit" label="Изменить {exercise.name}" onclick={() => navigate(`/exercises/${exercise.id}`)} />
                <IconButton icon="delete" label="Удалить {exercise.name}" onclick={() => remove(exercise)} />
              {/snippet}
            </ListRow>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  <div class="actions-bottom">
    <Button variant="secondary" icon="plus" to="/exercises/new">Добавить упражнение</Button>
  </div>
</main>

<style>
  .io {
    display: flex;
    gap: 4px;
  }

  .io button {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 56px;
    padding: 4px;
    border: 0;
    border-radius: var(--radius-s);
    /* Dark backing: these sit over the header illustration. */
    background: rgb(7 7 6 / 0.72);
    color: var(--c-cream);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .ex-name {
    font-weight: 700;
    font-size: var(--fs-name);
    text-transform: uppercase;
  }
</style>
