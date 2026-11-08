// Settings (REF-11; docs/DECISIONS.md, 2026-11-07): default rest, export, import, danger zone.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadDemo } from './helpers';

const NOW = new Date(2026, 10, 7, 9, 0);

type SavedFile = { name: string; type: string; text: string };

/**
 * Replaces the share sheet for files. `share`: the user saves the file somewhere (recorded in
 * `window.sharedFiles`); `abort`: the user closes the sheet; `none`: no file sharing, as on a PC.
 */
async function stubFileShare(page: Page, mode: 'share' | 'abort' | 'none') {
  await page.addInitScript((mode) => {
    const w = window as unknown as { sharedFiles: SavedFile[]; shareCalls: number; downloaded: string[] };
    w.sharedFiles = [];
    w.shareCalls = 0;
    // A download's contents, read from the blob the page links to.
    w.downloaded = [];
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      if (object instanceof Blob) object.text().then((text) => w.downloaded.push(text));
      return createObjectURL(object);
    };
    const share =
      mode === 'none'
        ? undefined
        : async (data: ShareData) => {
            w.shareCalls++;
            if (mode === 'abort') throw new DOMException('Share canceled', 'AbortError');
            for (const file of data.files ?? []) w.sharedFiles.push({ name: file.name, type: file.type, text: await file.text() });
          };
    const canShare = mode === 'none' ? undefined : (data?: ShareData) => !!data?.files?.length;
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
  }, mode);
}

const shared = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { sharedFiles: SavedFile[]; shareCalls: number };
    return { files: w.sharedFiles, calls: w.shareCalls };
  });

async function open(page: Page, mode: 'share' | 'abort' | 'none' = 'none') {
  await page.clock.install({ time: NOW });
  await stubFileShare(page, mode);
  await loadDemo(page);
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { level: 1, name: /настройки/i })).toBeVisible();
}

/** Finishes Day 1 by skipping everything: one workout in History. */
async function finishAWorkout(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /пропустить упражнение/i }).click();
  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
  await page.goto('./#/settings');
}

const dialog = (page: Page) => page.getByRole('dialog');

type Part = 'упражнения' | 'дни' | 'всё';

/** A Settings row (a link or a button), by its title; its accessible name also has the hint. */
const row = (page: Page, title: string) => {
  const name = new RegExp(`^${title}`, 'i');
  return page.getByRole('button', { name }).or(page.getByRole('link', { name }));
};

async function toSettings(page: Page) {
  if (!page.url().endsWith('#/settings')) await page.goto('./#/settings');
  await expect(page.getByRole('heading', { level: 1, name: /настройки/i })).toBeVisible();
}

async function chooseExport(page: Page, part: Part) {
  await toSettings(page);
  await row(page, `экспортировать ${part}`).click();
}

async function exportByDownload(page: Page, part: Part) {
  await toSettings(page);
  const count = await page.evaluate(() => (window as unknown as { downloaded: string[] }).downloaded.length);
  const download = page.waitForEvent('download');
  await chooseExport(page, part);
  const name = (await download).suggestedFilename();
  await expect.poll(() => page.evaluate(() => (window as unknown as { downloaded: string[] }).downloaded.length)).toBe(count + 1);
  const text = await page.evaluate(() => (window as unknown as { downloaded: string[] }).downloaded.at(-1)!);
  return { name, data: JSON.parse(text) };
}

/** An import row opens the file picker; the test then picks a file made from `contents`. */
async function importFile(page: Page, part: Part, contents: unknown, name = 'atletika.json') {
  await toSettings(page);
  const chooser = page.waitForEvent('filechooser');
  await row(page, `импортировать ${part}`).click();
  await chooser;
  const text = typeof contents === 'string' ? contents : JSON.stringify(contents);
  await page.locator('input[type=file]').evaluate(
    (input: HTMLInputElement, [text, name]) => {
      const files = new DataTransfer();
      files.items.add(new File([text], name, { type: 'application/json' }));
      input.files = files.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [text, name] as const,
  );
}

const exercise = (id: string, name: string) => ({ id, name, description: '', videoUrl: '', createdAt: 1 });
const exercisesFile = (exercises: ReturnType<typeof exercise>[]) => ({
  app: 'atletika',
  format: 1,
  kind: 'exercises',
  exportedAt: NOW.getTime(),
  exercises,
});

/** The library's exercise names; the library must not be empty. */
async function libraryNames(page: Page) {
  await page.goto('./#/exercises');
  // Wait for the library itself: the previous screen's list could still be showing.
  await expect(page.getByRole('heading', { level: 1, name: /упражнения/i })).toBeVisible();
  await expect(page.locator('.ex-name').first()).toBeVisible();
  return page.locator('.ex-name').allTextContents();
}

test.describe('export', () => {
  test('each row saves its file at once, with no question first', async ({ page }) => {
    await open(page, 'share');
    await chooseExport(page, 'упражнения');
    await expect.poll(async () => (await shared(page)).files.length).toBe(1);
    await expect(dialog(page)).toBeHidden();
  });

  test('on a phone the file goes to the share sheet', async ({ page }) => {
    await open(page, 'share');
    await chooseExport(page, 'упражнения');
    await expect.poll(async () => (await shared(page)).files.length).toBe(1);
    const [file] = (await shared(page)).files;
    expect(file.name).toBe('atletika-exercises-2026-11-07.json');
    expect(file.type).toBe('application/json');
    const data = JSON.parse(file.text);
    expect(data).toMatchObject({ app: 'atletika', format: 1, kind: 'exercises' });
    expect(data.exercises).toHaveLength(10);
    expect(data.exercises.map((e: { name: string }) => e.name)).toContain('Подъёмы ног в висе');
    expect(data.days).toBeUndefined();
  });

  test('closing the share sheet saves nothing and does not download', async ({ page }) => {
    await open(page, 'abort');
    let downloads = 0;
    page.on('download', () => downloads++);
    await chooseExport(page, 'всё');
    await expect.poll(async () => (await shared(page)).calls).toBe(1);
    await expect(dialog(page)).toBeHidden();
    expect(downloads).toBe(0);
  });

  test('without a share sheet (a PC) each row downloads its file', async ({ page }) => {
    await open(page, 'none');
    await finishAWorkout(page);

    const exercises = await exportByDownload(page, 'упражнения');
    expect(exercises.name).toBe('atletika-exercises-2026-11-07.json');
    expect(exercises.data.exercises).toHaveLength(10);
    expect(exercises.data.days).toBeUndefined();

    const days = await exportByDownload(page, 'дни');
    expect(days.name).toBe('atletika-days-2026-11-07.json');
    expect(days.data.kind).toBe('program');
    expect(days.data.days.map((d: { name: string }) => d.name)).toEqual(['Верх тела', 'Низ тела', 'Жимовые']);
    expect(days.data.exercises).toHaveLength(10);
    expect(days.data.workouts).toBeUndefined();

    const all = await exportByDownload(page, 'всё');
    expect(all.name).toBe('atletika-all-2026-11-07.json');
    expect(all.data.kind).toBe('all');
    expect(all.data.workouts).toHaveLength(1);
    expect(all.data.workouts[0]).toMatchObject({ dayNumber: 1, dayName: 'Верх тела' });
    expect(all.data.settings).toEqual({ defaultRestSec: 90 });
  });
});

test.describe('import', () => {
  test('exercises: adds only new ones, after saying how many', async ({ page }) => {
    await open(page);
    await importFile(page, 'упражнения', exercisesFile([exercise('a', 'ЖИМ ЛЕЖА'), exercise('b', 'Планка')]));
    await expect(dialog(page)).toContainText(/добавить упражнения\?/i);
    await expect(dialog(page)).toContainText('Новых в файле: 1 упражнение.');
    await expect(dialog(page)).toContainText('Ещё 1 упражнение уже есть в библиотеке и не изменится.');
    await dialog(page).getByRole('button', { name: /^добавить$/i }).click();
    await expect(dialog(page)).toContainText(/готово/i);
    await expect(dialog(page)).toContainText('Добавлено: 1 упражнение.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    const names = await libraryNames(page);
    expect(names).toHaveLength(11);
    expect(names).toContain('Планка');
    expect(names.filter((n) => /жим л[её]жа/i.test(n))).toEqual(['Жим лёжа']);
  });

  test('exercises: cancelling adds nothing', async ({ page }) => {
    await open(page);
    await importFile(page, 'упражнения', exercisesFile([exercise('b', 'Планка')]));
    await dialog(page).getByRole('button', { name: /отмена/i }).click();
    expect(await libraryNames(page)).not.toContain('Планка');
  });

  test('exercises: a file with nothing new says so; the same file can be chosen again', async ({ page }) => {
    await open(page);
    const file = exercisesFile([exercise('b', 'Планка')]);
    await importFile(page, 'упражнения', file);
    await dialog(page).getByRole('button', { name: /^добавить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    // Browsers fire `change` for the same file again only if the field was cleared.
    await expect(page.locator('input[type=file]')).toHaveValue('');

    await importFile(page, 'упражнения', file);
    await expect(dialog(page)).toContainText(/нечего добавлять/i);
    await expect(dialog(page)).toContainText('Все упражнения из файла уже есть в библиотеке.');
    await expect(dialog(page).getByRole('button')).toHaveText([/понятно/i]);
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    expect((await libraryNames(page)).filter((n) => n === 'Планка')).toHaveLength(1);
  });

  const programFile = {
    app: 'atletika',
    format: 1,
    kind: 'program',
    exportedAt: NOW.getTime(),
    exercises: [exercise('p', 'Планка'), exercise('b', 'Жим лёжа')],
    days: [
      {
        id: 'core',
        position: 0,
        name: 'Кор',
        createdAt: 1,
        items: [
          { kind: 'exercise', id: 'i1', exerciseId: 'p', sets: [{ reps: 30, restSec: 60 }] },
          { kind: 'exercise', id: 'i2', exerciseId: 'b', sets: [{ reps: 5, restSec: 120 }] },
        ],
      },
    ],
  };

  test('exercises and days: replaces the days after confirming; history stays', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    await importFile(page, 'дни', programFile);
    await expect(dialog(page)).toContainText(/заменить дни\?/i);
    await expect(dialog(page)).toContainText('В файле: 1 день, 2 упражнения.');
    await expect(dialog(page)).toContainText('(новых: 1)');
    await dialog(page).getByRole('button', { name: /^заменить$/i }).click();
    await expect(dialog(page)).toContainText('Дни заменены: 1 день. Новых упражнений: 1.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день 1/i })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /день 2/i })).toHaveCount(0);
    await page.getByRole('link', { name: /день 1/i }).click();
    await expect(page.getByRole('textbox', { name: /название дня/i })).toHaveValue('Кор');
    const rows = page.getByRole('listitem');
    await expect(rows.nth(0)).toContainText(/планка/i);
    await expect(rows.nth(0)).toContainText('30 × 1');
    await expect(rows.nth(1)).toContainText(/жим лёжа/i);

    expect(await libraryNames(page)).toHaveLength(11); // the demo's 10 stay, «Планка» added
    await page.goto('./#/history');
    await expect(page.getByText(/последняя тренировка/i)).toBeVisible();
  });

  test('exercises and days: cancelling keeps the days', async ({ page }) => {
    await open(page);
    await importFile(page, 'дни', programFile);
    await dialog(page).getByRole('button', { name: /отмена/i }).click();
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(3);
    expect(await libraryNames(page)).not.toContain('Планка');
  });

  test('everything: a backup restores the app as it was', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    const backup = await exportByDownload(page, 'всё');

    // Changes made after the copy: a new exercise, and Day 3 removed.
    await importFile(page, 'упражнения', exercisesFile([exercise('b', 'Планка')]));
    await dialog(page).getByRole('button', { name: /^добавить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    await page.goto('./#/days');
    await page.getByRole('button', { name: /удалить день 3/i }).click();
    await dialog(page).getByRole('button', { name: /удалить/i }).click();
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(2);

    await page.goto('./#/settings');
    await importFile(page, 'всё', backup.data, backup.name);
    await expect(dialog(page)).toContainText(/заменить все данные\?/i);
    await expect(dialog(page)).toContainText('Копия от 7 ноя 2026: 10 упражнений · 3 дня · 1 тренировка.');
    await expect(dialog(page)).toContainText('Всё, что сейчас в приложении, будет заменено.');
    await dialog(page).getByRole('button', { name: /^заменить$/i }).click();
    await expect(dialog(page)).toContainText('Данные восстановлены из копии.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    expect(await libraryNames(page)).not.toContain('Планка');
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(3);
    await page.goto('./#/history');
    await expect(page.getByText(/последняя тренировка/i)).toBeVisible();
    // The next workout continues from the restored history: Day 2.
    await page.goto('./');
    await expect(page.locator('section.next')).toContainText(/день 2/i);
  });

  test('everything: cancelling changes nothing', async ({ page }) => {
    await open(page);
    const backup = await exportByDownload(page, 'всё');
    await importFile(page, 'упражнения', exercisesFile([exercise('b', 'Планка')]));
    await dialog(page).getByRole('button', { name: /^добавить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    await importFile(page, 'всё', backup.data);
    await expect(dialog(page)).toContainText(/заменить все данные\?/i);
    await dialog(page).getByRole('button', { name: /отмена/i }).click();
    expect(await libraryNames(page)).toContain('Планка');
  });

  for (const [what, contents, message] of [
    ['a file of another app', '{"hello": "world"}', 'Это не файл Атлетики.'],
    ['a file that is not JSON', 'Жим лёжа: 8/8/8', 'Это не файл Атлетики.'],
    ['a file from a newer version', JSON.stringify({ ...exercisesFile([]), format: 2 }), 'Обновите приложение'],
    ['a damaged file', JSON.stringify(exercisesFile([exercise('a', '')])), 'Файл повреждён'],
  ] as const) {
    test(`${what} is refused and changes nothing`, async ({ page }) => {
      await open(page);
      await importFile(page, 'упражнения', contents);
      await expect(dialog(page)).toContainText(/не удалось загрузить файл/i);
      await expect(dialog(page)).toContainText(message);
      await dialog(page).getByRole('button', { name: /понятно/i }).click();
      expect(await libraryNames(page)).toHaveLength(10);
    });
  }
});


test.describe('import rows take their part of any file', () => {
  test('«Импортировать дни» refuses a file without days', async ({ page }) => {
    await open(page);
    await importFile(page, 'дни', exercisesFile([exercise('b', 'Планка')]));
    await expect(dialog(page)).toContainText(/не удалось загрузить файл/i);
    await expect(dialog(page)).toContainText('В этом файле нет тренировочных дней.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    expect(await libraryNames(page)).not.toContain('Планка');
  });

  test('«Импортировать всё» refuses a file that is not a full backup', async ({ page }) => {
    await open(page);
    const days = await exportByDownload(page, 'дни');
    await importFile(page, 'всё', days.data);
    await expect(dialog(page)).toContainText('Это не полная копия. Выберите файл, сохранённый через «Экспортировать всё».');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(3);
  });

  test('«Импортировать упражнения» takes only the exercises of a full backup', async ({ page }) => {
    await open(page);
    const full = await exportByDownload(page, 'всё');
    full.data.exercises.push(exercise('new', 'Планка'));
    full.data.days = [];
    full.data.workouts = [];
    await importFile(page, 'упражнения', full.data);
    await expect(dialog(page)).toContainText('Новых в файле: 1 упражнение.');
    await dialog(page).getByRole('button', { name: /^добавить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    expect(await libraryNames(page)).toContain('Планка');
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(3);
  });

  test('«Импортировать дни» takes the days of a full backup, keeping history and settings', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    const full = await exportByDownload(page, 'всё');
    full.data.days = full.data.days.slice(0, 1);
    full.data.workouts = [];
    full.data.settings = { defaultRestSec: 15 };
    await importFile(page, 'дни', full.data);
    await expect(dialog(page)).toContainText('В файле: 1 день, 10 упражнений.');
    await dialog(page).getByRole('button', { name: /^заменить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    await expect(row(page, 'отдых')).toContainText('1:30');
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(1);
    await page.goto('./#/history');
    await expect(page.getByText(/последняя тренировка/i)).toBeVisible();
  });
});

test.describe('default rest', () => {
  const restValue = (page: Page) => page.getByRole('group', { name: /отдых после подхода/i }).locator('output');

  test('shows 1:30 until changed; «Сохранить» stores the new time', async ({ page }) => {
    await open(page);
    await expect(row(page, 'отдых: 1:30')).toContainText(/время отдыха по умолчанию/i);
    await row(page, 'отдых').click();
    await expect(page.getByRole('heading', { level: 1, name: /отдых/i })).toBeVisible();
    await expect(restValue(page)).toHaveText('1:30');
    await page.getByRole('button', { name: /больше/i }).click();
    await page.getByRole('button', { name: /больше/i }).click();
    await expect(restValue(page)).toHaveText('2:00');
    await page.getByRole('button', { name: /сохранить/i }).click();

    await expect(page).toHaveURL(/#\/settings$/);
    await expect(row(page, 'отдых: 2:00')).toBeVisible();
    await page.reload();
    await expect(row(page, 'отдых: 2:00')).toBeVisible();
  });

  test('leaving without «Сохранить» keeps the old time', async ({ page }) => {
    await open(page);
    await row(page, 'отдых').click();
    await page.getByRole('button', { name: /меньше/i }).click();
    await expect(restValue(page)).toHaveText('1:15');
    await page.getByRole('link', { name: /настройки/i }).click();
    await expect(row(page, 'отдых: 1:30')).toBeVisible();
  });

  test('goes down to 0:00 and no further', async ({ page }) => {
    await open(page);
    await row(page, 'отдых').click();
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: /меньше/i }).click();
    await expect(restValue(page)).toHaveText('0:00');
    await expect(page.getByRole('button', { name: /меньше/i })).toBeDisabled();
    await page.getByRole('button', { name: /сохранить/i }).click();
    await expect(row(page, 'отдых: 0:00')).toBeVisible();
  });

  test('an exercise added to a day afterwards starts with it', async ({ page }) => {
    await open(page);
    await row(page, 'отдых').click();
    await page.getByRole('button', { name: /меньше/i }).click();
    await page.getByRole('button', { name: /сохранить/i }).click();
    await expect(row(page, 'отдых: 1:15')).toBeVisible();

    await page.goto('./#/days');
    await page.getByRole('link', { name: /день 1/i }).click();
    await page.getByRole('link', { name: /добавить упражнение/i }).click();
    await page.getByRole('button', { name: 'Отжимания на упорах' }).click();
    await expect(page.getByRole('heading', { name: /отжимания на упорах/i })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Отдых' }).locator('output')).toHaveText(['1:15', '1:15', '1:15']);
  });

  test('circled − / + on a black panel, like the repetitions during a workout', async ({ page }) => {
    await open(page);
    await row(page, 'отдых').click();
    await expect(restValue(page)).toHaveText('1:30');
    for (const name of ['Отдых после подхода: меньше', 'Отдых после подхода: больше']) {
      const button = page.getByRole('button', { name });
      const look = await button.evaluate((b) => {
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return { radius: cs.borderTopLeftRadius, border: cs.borderTopStyle, color: cs.borderTopColor, bg: cs.backgroundColor, w: r.width, h: r.height };
      });
      expect(look).toMatchObject({ radius: '50%', border: 'solid', color: 'rgb(247, 237, 224)', bg: 'rgba(0, 0, 0, 0)' });
      expect(look.w).toBe(look.h);
    }
    const panelBg = await page
      .getByRole('group', { name: 'Отдых после подхода' })
      .evaluate((g) => getComputedStyle(g.parentElement!).backgroundColor);
    expect(panelBg).toBe('rgb(7, 7, 6)');
    // The value sits centred between the two buttons.
    const [less, value, more] = await Promise.all([
      page.getByRole('button', { name: 'Отдых после подхода: меньше' }).boundingBox(),
      restValue(page).boundingBox(),
      page.getByRole('button', { name: 'Отдых после подхода: больше' }).boundingBox(),
    ]);
    const gapLeft = value!.x - (less!.x + less!.width);
    const gapRight = more!.x - (value!.x + value!.width);
    expect(Math.abs(gapLeft - gapRight)).toBeLessThanOrEqual(1);
  });

  test('a full backup brings it back', async ({ page }) => {
    await open(page);
    await row(page, 'отдых').click();
    await page.getByRole('button', { name: /больше/i }).click();
    await page.getByRole('button', { name: /сохранить/i }).click();
    await expect(row(page, 'отдых: 1:45')).toBeVisible();
    const backup = await exportByDownload(page, 'всё');
    expect(backup.data.settings).toEqual({ defaultRestSec: 105 });

    await row(page, 'отдых').click();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /меньше/i }).click();
    await page.getByRole('button', { name: /сохранить/i }).click();
    await expect(row(page, 'отдых: 1:00')).toBeVisible();

    await importFile(page, 'всё', backup.data);
    await dialog(page).getByRole('button', { name: /^заменить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    await expect(row(page, 'отдых: 1:45')).toBeVisible();
  });
});

test.describe('danger zone', () => {
  test('its heading is red', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: /опасная зона/i })).toHaveCSS('color', 'rgb(249, 22, 33)');
  });

  test('«Очистить историю» asks first; cancelling keeps it', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    await row(page, 'очистить историю').click();
    await expect(dialog(page)).toContainText(/очистить историю\?/i);
    await expect(dialog(page)).toContainText('Будут удалены все завершённые тренировки: 1 тренировка. Это нельзя отменить.');
    await dialog(page).getByRole('button', { name: /отмена/i }).click();
    await page.goto('./#/history');
    await expect(page.getByText(/последняя тренировка/i)).toBeVisible();
  });

  test('«Очистить историю» deletes finished workouts; days and library stay', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    await row(page, 'очистить историю').click();
    await dialog(page).getByRole('button', { name: /^очистить$/i }).click();
    await expect(dialog(page)).toContainText('История очищена.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    await page.goto('./#/history');
    await expect(page.getByText(/завершённых тренировок пока нет/i)).toBeVisible();
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(3);
    expect(await libraryNames(page)).toHaveLength(10);
    // With no history, the next workout is Day 1 again.
    await page.goto('./');
    await expect(page.locator('section.next')).toContainText(/день 1/i);

    await toSettings(page);
    await row(page, 'очистить историю').click();
    await expect(dialog(page)).toContainText(/история пуста/i);
    await expect(dialog(page).getByRole('button')).toHaveText(['Понятно']);
  });

  test('«Очистить историю» keeps a workout in progress', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    await page.goto('./');
    await page.getByRole('button', { name: /начать тренировку/i }).click();
    await expect(page.getByRole('button', { name: /завершить подход/i })).toBeVisible();
    await toSettings(page);
    await row(page, 'очистить историю').click();
    await expect(dialog(page)).toContainText('1 тренировка');
    await dialog(page).getByRole('button', { name: /^очистить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    await page.goto('./');
    await expect(page.getByRole('link', { name: /продолжить тренировку/i })).toBeVisible();
  });

  test('«Удалить дни» asks first; cancelling keeps them', async ({ page }) => {
    await open(page);
    await row(page, 'удалить дни').click();
    await expect(dialog(page)).toContainText(/удалить все дни\?/i);
    await expect(dialog(page)).toContainText(
      'Будут удалены все тренировочные дни: 3 дня. Упражнения останутся в библиотеке, история не изменится. Это нельзя отменить.',
    );
    await dialog(page).getByRole('button', { name: /отмена/i }).click();
    await page.goto('./#/days');
    await expect(page.getByRole('link', { name: /день \d/i })).toHaveCount(3);
  });

  test('«Удалить дни» deletes every day; library and history stay', async ({ page }) => {
    await open(page);
    await finishAWorkout(page);
    await row(page, 'удалить дни').click();
    await dialog(page).getByRole('button', { name: /^удалить$/i }).click();
    await expect(dialog(page)).toContainText('Дни удалены.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    await page.goto('./#/days');
    await expect(page.getByText(/тренировочных дней пока нет/i)).toBeVisible();
    expect(await libraryNames(page)).toHaveLength(10);
    await page.goto('./#/history');
    await expect(page.getByText(/последняя тренировка/i)).toBeVisible();

    await toSettings(page);
    await row(page, 'удалить дни').click();
    await expect(dialog(page)).toContainText(/дней нет/i);
  });

  test('«Удалить упражнения» is refused while days use them, before asking anything', async ({ page }) => {
    await open(page);
    await row(page, 'удалить упражнения').click();
    await expect(dialog(page)).toContainText(/упражнения используются/i);
    await expect(dialog(page)).toContainText(
      'Сначала удалите дни или уберите из них упражнения: День 1 (Верх тела), День 2 (Низ тела), День 3 (Жимовые).',
    );
    await expect(dialog(page).getByRole('button')).toHaveText(['Понятно']);
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    expect(await libraryNames(page)).toHaveLength(10);
  });

  test('«Удалить упражнения» asks first once no day uses them; cancelling keeps them', async ({ page }) => {
    await open(page);
    await row(page, 'удалить дни').click();
    await dialog(page).getByRole('button', { name: /^удалить$/i }).click();
    await dialog(page).getByRole('button', { name: /понятно/i }).click();

    await row(page, 'удалить упражнения').click();
    await expect(dialog(page)).toContainText(/удалить все упражнения\?/i);
    await expect(dialog(page)).toContainText('Будут удалены все упражнения библиотеки: 10 упражнений. Это нельзя отменить.');
    await dialog(page).getByRole('button', { name: /отмена/i }).click();
    expect(await libraryNames(page)).toHaveLength(10);

    await toSettings(page);
    await row(page, 'удалить упражнения').click();
    await dialog(page).getByRole('button', { name: /^удалить$/i }).click();
    await expect(dialog(page)).toContainText('Упражнения удалены.');
    await dialog(page).getByRole('button', { name: /понятно/i }).click();
    await page.goto('./#/exercises');
    await expect(page.getByText(/упражнений пока нет/i)).toBeVisible();

    await toSettings(page);
    await row(page, 'удалить упражнения').click();
    await expect(dialog(page)).toContainText(/упражнений нет/i);
  });
});

test('row hints are in sentence case, as written; titles are display capitals', async ({ page }) => {
  await open(page);
  const hint = row(page, 'экспортировать упражнения').locator('.hint');
  await expect(hint).toHaveCSS('text-transform', 'none');
  // innerText applies text-transform, so this is what is on screen.
  expect(await hint.evaluate((el) => (el as HTMLElement).innerText)).toBe('Сохранить упражнения в файл');
  await expect(row(page, 'экспортировать упражнения').locator('.title')).toHaveCSS('text-transform', 'uppercase');
});

test('a confirmation opened by a tap rings no button: focus starts on the dialog', async ({ page }) => {
  await open(page);
  await row(page, 'удалить дни').click();
  await expect(dialog(page)).toBeVisible();
  // Safari on iPhone drew the red focus ring around the red button that showModal() focused.
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('DIALOG');
  expect(await page.evaluate(() => !!document.querySelector('dialog :focus-visible'))).toBe(false);
  await expect(dialog(page)).toHaveCSS('outline-style', 'none');
  // The keyboard still reaches the buttons, and Escape still cancels.
  await page.keyboard.press('Tab');
  await expect(dialog(page).getByRole('button', { name: /^удалить$/i })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await page.goto('./#/days');
  await expect(page.getByRole('link', { name: /день 1/i }).first()).toBeVisible();
});

test('the exercise library has no import or export buttons any more', async ({ page }) => {
  await open(page);
  await page.goto('./#/exercises');
  await expect(page.getByRole('heading', { level: 1, name: /упражнения/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /импорт|экспорт/i })).toHaveCount(0);
});

test('no accessibility violations on the rest screen and with a danger confirmation open', async ({ page }) => {
  await open(page);
  await page.goto('./#/settings/rest');
  await expect(page.getByRole('heading', { level: 1, name: /отдых/i })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await toSettings(page);
  await row(page, 'удалить дни').click();
  await expect(dialog(page)).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test('the published app shows the author at the bottom and no development section', async ({ page }) => {
  // E2E tests run the production build, the one published to GitHub Pages.
  await open(page);
  const credit = page.locator('footer');
  await expect(credit).toContainText('Made by Mitya Kukharev');
  await credit.scrollIntoViewIfNeeded();
  await expect(credit).toBeInViewport();
  // Last on the screen: below the danger zone.
  const dangerBottom = await page.getByRole('button', { name: /^удалить упражнения/i }).evaluate((e) => e.getBoundingClientRect().bottom);
  const creditTop = await credit.evaluate((e) => e.getBoundingClientRect().top);
  expect(creditTop).toBeGreaterThan(dangerBottom);

  await expect(page.getByRole('heading', { name: /для разработки/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /компоненты интерфейса/i })).toHaveCount(0);
  // The component gallery itself still opens by its address.
  await page.goto('./#/kit');
  await expect(page.getByRole('button', { name: 'Загрузить демо-данные' })).toBeVisible();
});

test('the name of the author links to Telegram, styled like the exercise video link', async ({ page, context }) => {
  await context.route('https://t.me/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>t.me</title>' }));
  await open(page);
  const link = page.locator('footer').getByRole('link', { name: /mitya kukharev/i });
  await expect(link).toHaveAccessibleName(/telegram, откроется в приложении или браузере/i);
  await expect(link).toHaveAttribute('href', 'https://t.me/kd10000');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link.locator('.text')).toHaveText('Mitya Kukharev');
  await expect(link.locator('svg[data-icon="external"]')).toHaveCount(1);
  // Same look as the video link: cream text, dotted 2 px underline in the text colour, no border.
  const style = await link.evaluate((a) => {
    const cs = getComputedStyle(a);
    return {
      color: cs.color,
      decoration: cs.textDecorationLine,
      decorationStyle: cs.textDecorationStyle,
      decorationColor: cs.textDecorationColor,
      thickness: cs.textDecorationThickness,
      border: cs.borderTopStyle,
    };
  });
  expect(style).toEqual({
    color: 'rgb(247, 237, 224)',
    decoration: 'underline',
    decorationStyle: 'dotted',
    decorationColor: 'rgb(247, 237, 224)',
    thickness: '2px',
    border: 'none',
  });
  // «Made by» stays plain.
  await expect(page.locator('footer')).toHaveCSS('color', 'rgb(168, 161, 150)');

  // The underline is drawn, not only styled: at this small size the box that clips a long
  // link to «…» once cut it off. A strip just under «Kukharev» (no descenders) has cream dots.
  await link.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const under = await link.locator('.text').evaluate((el) => {
    const node = el.firstChild!;
    const at = node.textContent!.indexOf('Kukharev');
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + 'Kukharev'.length);
    const r = range.getBoundingClientRect();
    return { x: r.left, y: r.bottom - 0.5, width: r.width, height: 6 };
  });
  const png = await page.screenshot({ clip: under });
  const dots = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, img.width, img.height).data;
    // Rows (device pixels) with cream dots in them: the full 2 px line, not a clipped sliver.
    let rows = 0;
    for (let y = 0; y < img.height; y++) {
      let bright = 0;
      for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        if (px[i] > 150 && px[i + 1] > 150 && px[i + 2] > 150) bright++;
      }
      if (bright >= 3) rows++;
    }
    return rows / devicePixelRatio;
  }, png.toString('base64'));
  expect(dots).toBeGreaterThanOrEqual(1.5);

  const popup = context.waitForEvent('page');
  await link.click();
  await expect(await popup).toHaveURL('https://t.me/kd10000');
  await expect(page).toHaveURL(/#\/settings$/);
});
