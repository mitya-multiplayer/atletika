// Active workout (docs/DECISIONS.md, 2026-11-05). Playwright's fake clock jumps through rest
// time; it keeps running in real time otherwise, so timer checks allow a few seconds.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadDemo } from './helpers';

const START = new Date(2026, 10, 5, 18, 40);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: START });
  // Captures what «Копировать» puts on the clipboard (the real API needs permissions in tests).
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void ((window as unknown as { copied: string }).copied = text) },
    });
  });
  await loadDemo(page);
  await page.goto('./');
});

const complete = (page: Page) => page.getByRole('button', { name: /завершить подход/i }).click();
const skip = (page: Page) => page.getByRole('button', { name: /пропустить упражнение/i }).click();
const endRest = (page: Page) => page.getByRole('button', { name: /завершить отдых/i }).click();

async function startWorkout(page: Page) {
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Expects the rest timer to show about `seconds` (it may have run a little), waiting for the screen to update. */
async function expectTimer(page: Page, seconds: number) {
  await expect
    .poll(async () => {
      const [m, s] = (await page.getByRole('timer').textContent())!.split(':').map(Number);
      const shown = m * 60 + s;
      return shown >= seconds - 3 && shown <= seconds ? 'ok' : shown;
    })
    .toBe('ok');
}

async function expectSet(page: Page, exercise: RegExp, set: string, reps: number) {
  await expect(page.getByRole('heading', { level: 1, name: exercise })).toBeVisible();
  const figures = page.locator('.panel.figures');
  await expect(figures).toContainText(set);
  await expect(figures).toContainText(String(reps));
}

test('starts the next day from home at its first set', async ({ page }) => {
  await startWorkout(page);
  // Demo Day 1: Жим лёжа 8 × 3, Подтягивания 10 × 3, Жим гантелей стоя 10 × 3, Тяга штанги 12 × 3.
  await expect(page.getByText(/упражнение 1 из 4/i)).toBeVisible();
  await expectSet(page, /жим лёжа/i, '1 / 3', 8);
  await expect(page.locator('.day-label')).toContainText(/день 1/i);
  await expect(page.locator('.day-label')).toContainText(/верх тела/i);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test.describe('actual repetitions', () => {
  const reps = (page: Page) => page.getByRole('group', { name: 'Повторения' }).locator('output');
  const less = (page: Page) => page.getByRole('button', { name: 'Повторения: меньше' });
  const more = (page: Page) => page.getByRole('button', { name: 'Повторения: больше' });

  test('− and + set the repetitions done; the summary and copy show them', async ({ page }) => {
    await startWorkout(page);
    await expect(reps(page)).toHaveText('8');
    await expect(page.getByText(/план/i)).toHaveCount(0);

    await less(page).click();
    await less(page).click();
    await expect(reps(page)).toHaveText('6');
    await expect(page.getByText('план 8')).toBeVisible();
    await complete(page);
    await endRest(page);

    await expect(reps(page)).toHaveText('8'); // the next set starts at its plan
    for (let i = 0; i < 3; i++) await more(page).click();
    await expect(reps(page)).toHaveText('11');
    await complete(page);
    await endRest(page);
    await complete(page); // third set at the plan
    await endRest(page);
    for (let i = 0; i < 3; i++) await skip(page);

    await expect(page.getByRole('listitem').first()).toContainText('6/11/8');
    await page.getByRole('button', { name: /копировать/i }).click();
    const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
    expect(copied).toContain('Жим лёжа: 6/11/8');
  });

  test('the adjusted count survives closing the app', async ({ page }) => {
    await startWorkout(page);
    await less(page).click();
    await expect(reps(page)).toHaveText('7');
    await page.reload();
    await expect(reps(page)).toHaveText('7');
    await expect(page.getByText('план 8')).toBeVisible();
  });

  test('cannot go below 0', async ({ page }) => {
    await startWorkout(page);
    for (let i = 0; i < 8; i++) await less(page).click();
    await expect(reps(page)).toHaveText('0');
    await expect(less(page)).toBeDisabled();
    await complete(page);
    await endRest(page);
    for (let i = 0; i < 4; i++) await skip(page);
    await expect(page.getByRole('listitem').first()).toContainText('0/-/-');
  });
});

test('the set count stays on one line next to the repetitions controls', async ({ page }) => {
  await startWorkout(page);
  const count = page.locator('.panel.figures .big').first();
  await expect(count).toHaveText('1 / 3');
  const lines = await count.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  });
  expect(lines).toBe(1);
});

test('the set screen buttons fit their labels on one line', async ({ page }) => {
  await startWorkout(page);
  for (const name of [/завершить подход/i, /пропустить упражнение/i]) {
    const button = page.getByRole('button', { name });
    // One client rect per line of the label text.
    const lines = await button.locator('.group > span').evaluate((label) => {
      const range = document.createRange();
      range.selectNodeContents(label);
      return range.getClientRects().length;
    });
    expect(lines).toBe(1);
  }
});

test('finishing a set starts its rest; at 0:00 the next set opens by itself', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await expect(page.getByRole('heading', { name: /отдых/i })).toBeVisible();
  await expectTimer(page, 90);
  await expect(page.getByText(/до следующего подхода/i)).toBeVisible();
  await expect(page.locator('.panel.next')).toContainText(/жим лёжа/i);

  await page.clock.fastForward(60_000);
  await expectTimer(page, 30);
  await page.clock.fastForward(31_000);
  await expectSet(page, /жим лёжа/i, '2 / 3', 8);
});

test('rest controls: −30 s, +30 s, pause and «Завершить отдых»', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await page.getByRole('button', { name: 'Отдых: больше на 30 секунд' }).click();
  await expectTimer(page, 120);
  await page.getByRole('button', { name: 'Отдых: меньше на 30 секунд' }).click();
  await expectTimer(page, 90);

  await page.getByRole('button', { name: 'Пауза' }).click();
  const frozen = await page.getByRole('timer').textContent();
  await page.clock.fastForward(120_000);
  await expect(page.getByRole('timer')).toHaveText(frozen!);
  await page.getByRole('button', { name: 'Продолжить отдых' }).click();
  await page.clock.fastForward(10_000);
  await expectTimer(page, 80);

  await endRest(page);
  await expectSet(page, /жим лёжа/i, '2 / 3', 8);
});

test('−30 s below zero ends the rest', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Отдых: меньше на 30 секунд' }).click();
  await expectSet(page, /жим лёжа/i, '2 / 3', 8);
});

test('the last set of an exercise rests before the next exercise', async ({ page }) => {
  await startWorkout(page);
  for (let i = 0; i < 2; i++) {
    await complete(page);
    await endRest(page);
  }
  await complete(page);
  await expect(page.getByText(/до следующего упражнения/i)).toBeVisible();
  await expect(page.locator('.panel.next')).toContainText(/подтягивания/i);
  await endRest(page);
  await expectSet(page, /подтягивания/i, '1 / 3', 10);
  await expect(page.getByText(/упражнение 2 из 4/i)).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('leaving needs no confirmation; the workout resumes and its rest timer kept running', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await expectTimer(page, 90);

  await page.getByRole('link', { name: /главная/i }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(/тренировка идёт/i)).toBeVisible();
  await page.clock.fastForward(60_000);

  await page.getByRole('link', { name: /продолжить тренировку/i }).click();
  await expectTimer(page, 30);

  // Away longer than the rest: the next set is open on return.
  await page.getByRole('link', { name: /главная/i }).click();
  await page.clock.fastForward(120_000);
  await page.getByRole('link', { name: /продолжить тренировку/i }).click();
  await expectSet(page, /жим лёжа/i, '2 / 3', 8);
});

test('the workout survives closing the app', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await endRest(page);
  // The screen updates only after the state is saved, so closing now loses nothing.
  await expectSet(page, /жим лёжа/i, '2 / 3', 8);
  await page.reload();
  await expectSet(page, /жим лёжа/i, '2 / 3', 8);
});

test('skipping goes straight to the next exercise and is recorded as -/-/-', async ({ page }) => {
  await startWorkout(page);
  await skip(page);
  await expectSet(page, /подтягивания/i, '1 / 3', 10);
  await expect(page.getByRole('timer')).toHaveCount(0);

  for (let i = 0; i < 3; i++) await skip(page);
  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
  const first = page.getByRole('listitem').first();
  await expect(first).toContainText(/жим лёжа/i);
  await expect(first).toContainText('-/-/-');
  await expect(first).toContainText(/пропущено/i);
});

test('a full workout ends with a summary that copies as text', async ({ page }) => {
  await startWorkout(page);
  for (let i = 0; i < 3; i++) {
    await complete(page);
    if (i < 2) await endRest(page);
  }
  await endRest(page); // rest before the next exercise
  await complete(page); // Подтягивания, set 1
  await endRest(page);
  await skip(page); // the rest of Подтягивания
  await skip(page);
  // The last exercise: finishing its final set ends the workout without rest.
  for (let i = 0; i < 3; i++) {
    await complete(page);
    if (i < 2) await endRest(page);
  }

  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
  await expect(page).toHaveURL(/#\/workout\/[0-9a-f]+\/summary$/);
  const rows = page.getByRole('listitem');
  await expect(rows.nth(0)).toContainText('8/8/8');
  await expect(rows.nth(1)).toContainText('10/-/-');
  await expect(rows.nth(2)).toContainText('-/-/-');
  await expect(rows.nth(3)).toContainText('12/12/12');

  await page.getByRole('button', { name: /копировать/i }).click();
  await expect(page.getByRole('status')).toHaveText(/скопировано/i);
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied.split('\n')).toEqual([
    'Атлетика · День 1 · Верх тела',
    '5 ноя 2026 · 1 мин',
    '',
    'Жим лёжа: 8/8/8',
    'Подтягивания: 10/-/-',
    'Жим гантелей стоя: -/-/-',
    'Тяга штанги в наклоне: 12/12/12',
  ]);
});

test('after finishing, home offers the next day', async ({ page }) => {
  await startWorkout(page);
  for (let i = 0; i < 4; i++) await skip(page);
  await page.getByRole('link', { name: /на главную/i }).click();
  await expect(page.getByText(/следующая тренировка/i)).toBeVisible();
  await expect(page.locator('section.next')).toContainText(/день 2/i);
  await expect(page.locator('section.next')).toContainText(/низ тела/i);
  await expect(page.getByRole('button', { name: /начать тренировку/i })).toBeVisible();
});

test('opening the workout screen with no workout in progress points back home', async ({ page }) => {
  await page.goto('./#/workout');
  await expect(page.getByText(/тренировка не начата/i)).toBeVisible();
  await page.getByRole('link', { name: /на главную/i }).click();
  await expect(page.getByRole('button', { name: /начать тренировку/i })).toBeVisible();
});

test('a day without exercises cannot be started', async ({ page }) => {
  // Remove Day 1's exercises so it is empty.
  await page.goto('./#/days');
  await page.getByRole('link', { name: /день 1/i }).first().click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /^убрать /i }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /убрать/i }).click();
  }
  await expect(page.getByText(/пока нет упражнений/i)).toBeVisible();
  await page.goto('./');
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  await expect(page.getByRole('dialog')).toContainText(/в этом дне нет упражнений/i);
});

for (const [name, open] of [
  ['set', async (page: Page) => startWorkout(page)],
  ['rest', async (page: Page) => (await startWorkout(page), await complete(page))],
  ['summary', async (page: Page) => (await startWorkout(page), await skip(page), await skip(page), await skip(page), await skip(page))],
] as const) {
  test(`no accessibility violations on the ${name} screen`, async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
