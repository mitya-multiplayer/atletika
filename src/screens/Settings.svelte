<!-- Settings (REF-11; docs/DECISIONS.md, 2026-11-07): default rest, export, import, danger zone.
     Other candidates in spec 4.12 are not approved. -->
<script lang="ts">
  import gears from '../assets/illustrations/gears.webp';
  import {
    clearHistory,
    dataCounts,
    deleteAllDays,
    daysUsingExercises,
    deleteAllExercises,
    exportBackup,
    importBackup,
    previewImport,
    settingsQuery,
  } from '../lib/db/repo';
  import {
    backupFileName,
    backupJson,
    importDoneMessage,
    importProblem,
    importQuestion,
    parseBackup,
    type BackupKind,
  } from '../lib/domain/backup';
  import { countDays, countExercises, countWorkouts, dayNumber, dayTitle, formatRest } from '../lib/domain/format';
  import { DEFAULT_SETTINGS } from '../lib/domain/settings';
  import type { TrainingDay } from '../lib/domain/types';
  import Button from '../lib/ui/Button.svelte';
  import { confirmAction, showMessage } from '../lib/ui/dialog.svelte';
  import MenuList from '../lib/ui/MenuList.svelte';
  import ScreenHeader from '../lib/ui/ScreenHeader.svelte';

  const settings = settingsQuery();

  let fileInput: HTMLInputElement | undefined = $state();
  /** The import row whose file picker is open. */
  let importKind: BackupKind = 'exercises';
  let busy = false;

  /** Runs one action at a time, so a double tap cannot start a second export or import. */
  async function once(action: () => Promise<void>) {
    if (busy) return;
    busy = true;
    try {
      await action();
    } finally {
      busy = false;
    }
  }

  // ---- Export ----

  function exportData(kind: BackupKind) {
    return once(async () => {
      const now = Date.now();
      const backup = await exportBackup(kind, now);
      await saveFile(new File([backupJson(backup)], backupFileName(kind, now), { type: 'application/json' }));
    });
  }

  /**
   * Phones: the share sheet («Сохранить в Файлы», a messenger, mail). A PC, or a phone browser
   * that cannot share files: a download.
   */
  async function saveFile(file: File) {
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (error) {
        // Closing the share sheet is not an error; other failures fall back to a download.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // ---- Import ----

  function chooseFile(kind: BackupKind) {
    importKind = kind;
    fileInput?.click();
  }

  function importFile() {
    const file = fileInput?.files?.[0];
    if (fileInput) fileInput.value = ''; // choosing the same file again fires `change` again
    if (!file) return;
    return once(async () => {
      const result = parseBackup(await file.text());
      const problem = result.ok ? importProblem(result.backup, importKind) : result.error;
      if (!result.ok || problem) {
        await showMessage('Не удалось загрузить файл', problem ?? undefined);
        return;
      }
      const question = importQuestion(result.backup, await previewImport(result.backup, importKind));
      if (question.kind === 'nothing') {
        await showMessage(question.title, question.message);
        return;
      }
      if (!(await confirmAction(question))) return;
      const done = await importBackup(result.backup, importKind);
      await showMessage('Готово', importDoneMessage(done));
    });
  }

  // ---- Danger zone ----

  const IRREVERSIBLE = 'Это нельзя отменить.';

  function removeHistory() {
    return once(async () => {
      const { finishedWorkouts } = await dataCounts();
      if (finishedWorkouts === 0) {
        await showMessage('История пуста', 'Завершённых тренировок нет.');
        return;
      }
      const confirmed = await confirmAction({
        title: 'Очистить историю?',
        message: `Будут удалены все завершённые тренировки: ${countWorkouts(finishedWorkouts)}. ${IRREVERSIBLE}`,
        confirmLabel: 'Очистить',
      });
      if (!confirmed) return;
      await clearHistory();
      await showMessage('Готово', 'История очищена.');
    });
  }

  function removeDays() {
    return once(async () => {
      const { days } = await dataCounts();
      if (days === 0) {
        await showMessage('Дней нет', 'Тренировочных дней пока нет.');
        return;
      }
      const confirmed = await confirmAction({
        title: 'Удалить все дни?',
        message:
          `Будут удалены все тренировочные дни: ${countDays(days)}. ` +
          `Упражнения останутся в библиотеке, история не изменится. ${IRREVERSIBLE}`,
        confirmLabel: 'Удалить',
      });
      if (!confirmed) return;
      await deleteAllDays();
      await showMessage('Готово', 'Дни удалены.');
    });
  }

  function removeExercises() {
    return once(async () => {
      const { exercises } = await dataCounts();
      if (exercises === 0) {
        await showMessage('Упражнений нет', 'Библиотека пуста.');
        return;
      }
      const usedIn = await daysUsingExercises();
      if (usedIn.length > 0) {
        await showUsedIn(usedIn);
        return;
      }
      const confirmed = await confirmAction({
        title: 'Удалить все упражнения?',
        message: `Будут удалены все упражнения библиотеки: ${countExercises(exercises)}. ${IRREVERSIBLE}`,
        confirmLabel: 'Удалить',
      });
      if (!confirmed) return;
      const result = await deleteAllExercises();
      // A day could have gained an exercise meanwhile (another tab); nothing is deleted then.
      if (result.deleted) await showMessage('Готово', 'Упражнения удалены.');
      else await showUsedIn(result.usedIn);
    });
  }

  function showUsedIn(days: TrainingDay[]) {
    const names = days.map((day) => dayTitle(dayNumber(day)) + (day.name ? ` (${day.name})` : '')).join(', ');
    return showMessage('Упражнения используются', `Сначала удалите дни или уберите из них упражнения: ${names}.`);
  }
</script>

<main class="screen">
  <ScreenHeader back={{ to: '/', label: 'Главная' }} title="Настройки" art={gears} />

  <section aria-labelledby="training-title">
    <h2 id="training-title" class="group-title display">Тренировка</h2>
    <MenuList
      items={[
        {
          title: `Отдых: ${formatRest(($settings ?? DEFAULT_SETTINGS).defaultRestSec)}`,
          hint: 'Время отдыха по умолчанию',
          to: '/settings/rest',
        },
      ]}
    />
  </section>

  <section aria-labelledby="export-title">
    <h2 id="export-title" class="group-title display">Экспорт данных</h2>
    <MenuList
      items={[
        { title: 'Экспортировать упражнения', hint: 'Сохранить упражнения в файл', onclick: () => exportData('exercises') },
        { title: 'Экспортировать дни', hint: 'Сохранить дни и их упражнения в файл', onclick: () => exportData('program') },
        { title: 'Экспортировать всё', hint: 'Сохранить всё, включая историю', onclick: () => exportData('all') },
      ]}
    />
  </section>

  <section aria-labelledby="import-title">
    <h2 id="import-title" class="group-title display">Импорт данных</h2>
    <MenuList
      items={[
        { title: 'Импортировать упражнения', hint: 'Добавить упражнения из файла', onclick: () => chooseFile('exercises') },
        { title: 'Импортировать дни', hint: 'Заменить дни днями из файла', onclick: () => chooseFile('program') },
        { title: 'Импортировать всё', hint: 'Восстановить всё из файла', onclick: () => chooseFile('all') },
      ]}
    />
    <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importFile} />
  </section>

  <section aria-labelledby="danger-title">
    <h2 id="danger-title" class="group-title danger display">Опасная зона</h2>
    <MenuList
      items={[
        { title: 'Очистить историю', hint: 'Удалить все завершённые тренировки', onclick: removeHistory },
        { title: 'Удалить дни', hint: 'Удалить все тренировочные дни', onclick: removeDays },
        { title: 'Удалить упражнения', hint: 'Удалить все упражнения библиотеки', onclick: removeExercises },
      ]}
    />
  </section>

  <!-- Only on the dev server (npm run dev), never in the published build. The /kit route stays. -->
  {#if import.meta.env.DEV}
    <section aria-labelledby="dev-title">
      <h2 id="dev-title" class="group-title display">Для разработки</h2>
      <Button variant="secondary" to="/kit">Компоненты интерфейса</Button>
    </section>
  {/if}

  <footer class="credit">Made by Mitya Kukharev</footer>
</main>

<style>
  section {
    /* Above the header illustration, which reaches down behind the first group. */
    position: relative;
  }

  .group-title {
    margin: 26px 0 10px;
    font-size: 24px;
    color: var(--c-text-muted);
  }

  .group-title.danger {
    color: var(--c-red);
  }

  .credit {
    margin-top: 36px;
    font-size: var(--fs-small);
    text-align: center;
    color: var(--c-text-muted);
  }
</style>
