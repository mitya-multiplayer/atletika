import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function loadDemo(page: Page) {
  await page.goto('./#/kit');
  await page.getByRole('button', { name: 'Загрузить демо-данные' }).click();
  await page.getByRole('button', { name: 'Понятно' }).click();
}

test('home shows the brand and an empty program', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /атлетика/i })).toBeVisible();
  await expect(page.getByText(/программа пуста/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /создать день/i })).toBeVisible();
});

test('bundled fonts render Cyrillic', async ({ page }) => {
  await page.goto('./#/kit');
  await page.evaluate(() => document.fonts.ready);
  const families = await page.evaluate(() =>
    [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
  );
  expect(families.join()).toContain('Oswald');
  expect(families.join()).toContain('Roboto Condensed');
  const covered = await page.evaluate(
    () =>
      document.fonts.check('700 20px "Oswald Variable"', 'ЁЖЯёжя№') &&
      document.fonts.check('400 20px "Roboto Condensed Variable"', 'ЁЖЯёжя№'),
  );
  expect(covered).toBe(true);
});

test('build a training day from scratch', async ({ page }) => {
  await page.goto('./#/exercises/new');
  await page.getByRole('button', { name: /сохранить/i }).click();
  await expect(page.getByText('Введите название упражнения')).toBeVisible();
  await page.getByLabel('Название').fill('Отжимания на упорах');
  await page.getByRole('button', { name: /сохранить/i }).click();
  await expect(page.getByText('Отжимания на упорах')).toBeVisible();

  await page.goto('./#/days');
  await page.getByRole('button', { name: /добавить день/i }).click();
  await expect(page.getByRole('heading', { name: /день 1/i })).toBeVisible();
  await page.getByPlaceholder('Например, Верх тела').fill('Жимовые');

  await page.getByRole('link', { name: /добавить упражнение/i }).click();
  await page.getByRole('button', { name: 'Отжимания на упорах' }).click();

  await expect(page.getByRole('heading', { name: /отжимания на упорах/i })).toBeVisible();
  await page.getByRole('button', { name: /добавить подход/i }).click();
  await page.getByRole('button', { name: 'Повторения: больше' }).first().click();
  await page.getByRole('button', { name: 'Отдых: больше' }).last().click();
  await page.getByRole('button', { name: /сохранить/i }).click();

  await expect(page.getByText('11 · 10 · 10 · 10')).toBeVisible();
  await page.goto('./');
  await expect(page.getByText(/жимовые/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /начать тренировку/i })).toBeVisible();
});

test('deleting a day asks first and renumbers the rest', async ({ page }) => {
  await loadDemo(page);
  await page.goto('./#/days');
  await page.getByRole('button', { name: 'Удалить День 1' }).click();
  await expect(page.getByRole('dialog')).toContainText(/удалить день 1/i);
  await page.getByRole('button', { name: /отмена/i }).click();
  await expect(page.getByText('Верх тела')).toBeVisible();

  await page.getByRole('button', { name: 'Удалить День 1' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /удалить/i }).click();
  await expect(page.getByText('Верх тела')).toHaveCount(0);
  await expect(page.getByRole('listitem').first()).toContainText(/день 1/i);
  await expect(page.getByRole('listitem').first()).toContainText('Низ тела');
});

test('an exercise used in a day cannot be deleted', async ({ page }) => {
  await loadDemo(page);
  await page.goto('./#/exercises');
  await page.getByRole('button', { name: 'Удалить Жим лёжа' }).click();
  await expect(page.getByRole('dialog')).toContainText(/используется/i);
  await page.getByRole('button', { name: 'Понятно' }).click();
  await expect(page.getByText('Жим лёжа')).toBeVisible();
});

test('exercises can be reordered with the drag handle', async ({ page }) => {
  await loadDemo(page);
  await page.goto('./#/days');
  await page.getByRole('link', { name: /день 1/i }).first().click();
  const rows = page.getByRole('listitem');
  await expect(rows.first()).toContainText(/жим лёжа/i);

  const handles = page.locator('.handle');
  const from = (await handles.nth(0).boundingBox())!;
  const to = (await handles.nth(1).boundingBox())!;
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Wait on SortableJS's own state instead of timing: under load, WebKit can
  // release the mouse before the drag has started or the row has moved.
  await page.mouse.move(startX, startY + 8, { steps: 4 });
  await expect(page.locator('.sortable-fallback')).toBeAttached();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 10, { steps: 12 });
  await expect(page.locator('ul > li').nth(1)).toHaveClass(/sortable-ghost/);
  await page.mouse.up();

  await expect(rows.first()).toContainText(/подтягивания/i);
  await expect(rows.nth(1)).toContainText(/жим лёжа/i);
});

for (const path of ['./', './#/program', './#/days', './#/exercises']) {
  test(`no accessibility violations on ${path}`, async ({ page }) => {
    await loadDemo(page);
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
