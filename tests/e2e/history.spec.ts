// History of finished workouts (REF-10; docs/DECISIONS.md, 2026-11-05).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadDemo } from './helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 18, 10, 0) });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void ((window as unknown as { copied: string }).copied = text) },
    });
  });
  await loadDemo(page);
});

/** Starts the next day from Home and skips every exercise, which finishes it. */
async function finishNextWorkout(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  // One skip per item: «Пропустить упражнение», or «Пропустить серию» for a series.
  const progress = page.getByRole('progressbar');
  await expect(progress).toBeVisible();
  const total = Number(await progress.getAttribute('aria-valuemax'));
  for (let i = 0; i < total; i++) await page.getByRole('button', { name: /пропустить (упражнение|серию)/i }).click();
  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
}

/** Day 1 on 18 Oct, Day 2 on 21 Oct, and Day 3 started on 23 Oct but not finished. */
async function threeWorkouts(page: Page) {
  await finishNextWorkout(page);
  await page.clock.fastForward(3 * DAY_MS);
  await finishNextWorkout(page);
  await page.clock.fastForward(2 * DAY_MS);
  await page.goto('./');
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  await page.getByRole('button', { name: /завершить подход/i }).click();
  await page.goto('./#/history');
}

test('says so when there are no finished workouts', async ({ page }) => {
  await page.goto('./#/history');
  await expect(page.getByText(/завершённых тренировок пока нет/i)).toBeVisible();
  await expect(page.getByText(/последняя тренировка/i)).toHaveCount(0);
});

test('shows the newest workout as a card and earlier ones in a list', async ({ page }) => {
  await threeWorkouts(page);

  const card = page.locator('section.latest');
  await expect(card).toContainText(/последняя тренировка/i);
  await expect(card.getByRole('heading')).toHaveText(/низ тела/i);
  await expect(card).toContainText(/день 2/i);
  await expect(card).toContainText('21 ОКТ 2026');
  await expect(card).toContainText('1 мин');

  const rows = page.getByRole('listitem');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('18');
  await expect(rows.first()).toContainText('ОКТ');
  await expect(rows.first()).toContainText('2026');
  await expect(rows.first()).toContainText(/верх тела/i);
  await expect(rows.first()).toContainText(/день 1/i);
});

test('a workout in progress is not listed', async ({ page }) => {
  await threeWorkouts(page);
  await expect(page.getByText(/жимовые/i)).toHaveCount(0);
  await expect(page.getByText(/день 3/i)).toHaveCount(0);
});

test('lists workouts newest first', async ({ page }) => {
  await finishNextWorkout(page);
  for (const days of [1, 1, 1]) {
    await page.clock.fastForward(days * DAY_MS);
    await finishNextWorkout(page);
  }
  await page.goto('./#/history');
  // 21 Oct is the newest (the card); the list holds 20, 19, 18 in that order.
  await expect(page.locator('section.latest')).toContainText('21 ОКТ 2026');
  const days = await page.locator('.date-day').allTextContents();
  expect(days).toEqual(['20', '19', '18']);
});

test('opening the latest workout shows its results; back returns to History', async ({ page }) => {
  await threeWorkouts(page);
  await page.getByRole('link', { name: /посмотреть тренировку/i }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/день 2/i);
  await expect(page.locator('.meta')).toContainText('21 ОКТ 2026');
  await expect(page.getByRole('listitem').first()).toContainText('-/-/-');
  await expect(page.getByText(/тренировка завершена/i)).toHaveCount(0);

  await page.getByRole('link', { name: /история/i }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: /история/i })).toBeVisible();
});

test('opening an earlier workout shows that workout, and copies it', async ({ page }) => {
  await threeWorkouts(page);
  await page.getByRole('link', { name: /18 ОКТ 2026, верх тела/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/день 1/i);
  await expect(page.locator('.meta')).toContainText('18 ОКТ 2026');

  await page.getByRole('button', { name: /копировать/i }).click();
  await expect(page.getByRole('status')).toHaveText(/скопировано/i);
  const copied = await page.evaluate(() => (window as unknown as { copied: string }).copied);
  expect(copied.split('\n').slice(0, 2)).toEqual(['Атлетика · День 1 · Верх тела', '18 окт 2026 · 1 мин']);

  // Only the back button leads back: no «К истории» or «На главную» at the bottom.
  await expect(page.getByRole('link', { name: /к истории/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /на главную/i })).toHaveCount(0);
  await page.getByRole('link', { name: /история/i }).first().click();
  await expect(page.locator('section.latest')).toBeVisible();
});

test('the history keeps the day as it was, even after the program changes', async ({ page }) => {
  await finishNextWorkout(page);
  await page.goto('./#/days');
  await page.getByRole('button', { name: 'Удалить День 1' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /удалить/i }).click();
  await page.goto('./#/history');
  await expect(page.locator('section.latest').getByRole('heading')).toHaveText(/верх тела/i);
  await expect(page.locator('section.latest')).toContainText(/день 1/i);
});

test('no accessibility violations on a filled History', async ({ page }) => {
  await threeWorkouts(page);
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
