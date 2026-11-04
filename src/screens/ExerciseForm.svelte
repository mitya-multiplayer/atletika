<script lang="ts">
  import { onMount } from 'svelte';
  import bars from '../assets/illustrations/pushup-bars.webp';
  import { getExercise, saveExercise } from '../lib/db/repo';
  import { validateExercise, type ExerciseErrors } from '../lib/domain/exercises';
  import { navigate } from '../lib/router.svelte';
  import Button from '../lib/ui/Button.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';
  import TextField from '../lib/ui/TextField.svelte';

  let { exerciseId, query }: { exerciseId?: string; query: URLSearchParams } = $props();

  // Opened from the exercise selector, the form returns there.
  const back = $derived(query.get('back') ?? '/exercises');
  const backLabel = $derived(back.startsWith('/days/') ? 'Выбор упражнения' : 'Упражнения');

  let name = $state('');
  let description = $state('');
  let videoUrl = $state('');
  let errors: ExerciseErrors = $state({});
  let notFound = $state(false);

  onMount(async () => {
    if (!exerciseId) return;
    const exercise = await getExercise(exerciseId);
    if (!exercise) {
      notFound = true;
      return;
    }
    ({ name, description, videoUrl } = exercise);
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    errors = validateExercise({ name, description, videoUrl });
    if (Object.keys(errors).length > 0) return;
    await saveExercise({ id: exerciseId, name, description, videoUrl });
    navigate(back, { replace: true });
  }
</script>

<main class="screen">
  <ScreenHeader
    back={{ to: back, label: backLabel }}
    title={exerciseId ? 'Упражнение' : 'Новое упражнение'}
    art={bars}
    artLayout="behind"
  />

  {#if notFound}
    <p class="empty">Упражнение не найдено.</p>
  {:else}
    <form class="form" onsubmit={submit} novalidate>
      <TextField
        label="Название"
        required
        bind:value={name}
        placeholder="Введите название упражнения…"
        error={errors.name}
      />
      <TextField label="Описание" multiline bind:value={description} placeholder="Добавьте описание упражнения…" />
      <TextField
        label="Ссылка на видео"
        type="url"
        inputmode="url"
        bind:value={videoUrl}
        placeholder="Например, ссылка на YouTube"
        error={errors.videoUrl}
      />
      <div class="actions-bottom">
        <Button type="submit">Сохранить</Button>
      </div>
    </form>
  {/if}
</main>

<style>
  .form {
    display: grid;
    gap: 22px;
  }
</style>
