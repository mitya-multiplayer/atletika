// Series (spec 4.9; docs/DECISIONS.md, 2026-11-05), day-editor option A.
// Demo Day 3 «Жимовые»: Отжимания на упорах; Серия 1 (Подтягивания 5, Отжимания на брусьях 6,
// Отжимания на упорах 10; 5 rounds, 0:30 after an exercise, 2:00 after a round); Сгибания на бицепс.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 5, 18, 0) });
  await loadDemo(page);
});

async function openDay(page: Page, number: number) {
  await page.goto('./#/days');
  await page.getByRole('link', { name: new RegExp(`день ${number}`, 'i') }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`день ${number}`, 'i'));
}

const seriesCards = (page: Page) => page.locator('.series-card');

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, target: ReturnType<Page['locator']>) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 8, { steps: 4 });
  await expect(page.locator('.sortable-fallback')).toBeAttached();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await expect(target).toHaveClass(/sortable-ghost/);
  await page.mouse.up();
}

const center = async (locator: ReturnType<Page['locator']>) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Skips every item of the next day's workout, which finishes it. */
async function finishNextWorkout(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  const total = Number(await page.getByRole('progressbar').getAttribute('aria-valuemax'));
  for (let i = 0; i < total; i++) await page.getByRole('button', { name: /пропустить (упражнение|серию)/i }).click();
  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
}

test.describe('day editor', () => {
  test('shows a series as one card with its rounds, rests and exercises', async ({ page }) => {
    await openDay(page, 3);
    const card = seriesCards(page);
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(/серия 1/i);
    await expect(card).toContainText('× 5 кругов');
    await expect(card).toContainText('отдых после круга 2:00');
    const rows = card.locator('.series-list li');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText(/подтягивания/i);
    await expect(rows.nth(0)).toContainText('5');
    await expect(rows.nth(0)).toContainText('отдых 0:30');
    // After the round's last exercise the round rest applies, so no rest of its own is shown.
    await expect(rows.nth(2)).toContainText(/отжимания на упорах/i);
    await expect(rows.nth(2)).not.toContainText('отдых');
  });

  test('«Добавить серию» creates a numbered series and opens its editor', async ({ page }) => {
    await openDay(page, 3);
    await page.getByRole('button', { name: /добавить серию/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/серия 2/i);
    await expect(page.getByText(/в серии пока нет упражнений/i)).toBeVisible();
    await expect(page.getByRole('group', { name: 'Круги' })).toContainText('3');
    await expect(page.getByRole('group', { name: 'Отдых после круга' })).toContainText('2:00');

    await page.getByRole('link', { name: /день 3/i }).click();
    await expect(seriesCards(page)).toHaveCount(2);
    await expect(seriesCards(page).nth(1)).toContainText(/серия 2/i);
    await expect(seriesCards(page).nth(1)).toContainText(/в серии пока нет упражнений/i);
  });

  test('deleting a series asks first', async ({ page }) => {
    await openDay(page, 3);
    await page.getByRole('button', { name: 'Удалить Серия 1' }).click();
    await expect(page.getByRole('dialog')).toContainText(/удалить серия 1/i);
    await page.getByRole('button', { name: /отмена/i }).click();
    await expect(seriesCards(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Удалить Серия 1' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /удалить/i }).click();
    await expect(seriesCards(page)).toHaveCount(0);
    await expect(page.getByRole('listitem')).toHaveCount(2);
  });

  test('the whole series moves with its drag handle', async ({ page }) => {
    await openDay(page, 3);
    const items = page.locator('ul.stack > li');
    await expect(items.nth(1).locator('.series-card')).toBeVisible();
    await drag(
      page,
      await center(items.nth(1).locator('.handle').first()),
      await center(items.nth(0).locator('.handle').first()),
      items.nth(0),
    );
    await expect(items.nth(0).locator('.series-card')).toBeVisible();
    await expect(items.nth(1)).toContainText(/отжимания на упорах/i);
  });
});

test.describe('series editor', () => {
  test('changes rounds, rest and reps, saving each change', async ({ page }) => {
    await openDay(page, 3);
    await page.getByRole('button', { name: 'Настроить Серия 1' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/серия 1/i);

    await page.getByRole('button', { name: 'Круги: больше' }).click();
    await page.getByRole('button', { name: 'Отдых после круга: меньше' }).click();
    const first = page.locator('li.row').first();
    await first.getByRole('button', { name: 'Повторения: больше' }).click();
    await first.getByRole('button', { name: 'Отдых: больше' }).click();
    // The last exercise has no rest of its own.
    await expect(page.locator('li.row').last()).toContainText('Затем отдых после круга: 1:45');
    await expect(page.locator('li.row').last().getByRole('group', { name: 'Отдых' })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('group', { name: 'Круги' })).toContainText('6');
    await page.getByRole('link', { name: /готово/i }).click();
    const card = seriesCards(page);
    await expect(card).toContainText('× 6 кругов');
    await expect(card).toContainText('отдых после круга 1:45');
    await expect(card.locator('.series-list li').first()).toContainText('6');
    await expect(card.locator('.series-list li').first()).toContainText('отдых 0:45');
  });

  test('adds exercises through the picker, which returns to the series', async ({ page }) => {
    await openDay(page, 1);
    await page.getByRole('button', { name: /добавить серию/i }).click();
    await page.getByRole('link', { name: /добавить упражнение/i }).click();
    await expect(page.getByRole('link', { name: /серия 1/i })).toBeVisible(); // back goes to the series
    await page.getByRole('button', { name: 'Подтягивания' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/серия 1/i);
    await page.getByRole('link', { name: /добавить упражнение/i }).click();
    await page.getByRole('button', { name: 'Отжимания на брусьях' }).click();

    const rows = page.locator('li.row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText(/подтягивания/i);
    await expect(rows.nth(0).getByRole('group', { name: 'Повторения' })).toContainText('10');
    await expect(rows.nth(0).getByRole('group', { name: 'Отдых' })).toContainText('0:30');
    await expect(rows.nth(1)).toContainText(/отжимания на брусьях/i);
  });

  test('a new exercise created from the series picker can be added to the series', async ({ page }) => {
    await openDay(page, 1);
    await page.getByRole('button', { name: /добавить серию/i }).click();
    await page.getByRole('link', { name: /добавить упражнение/i }).click();
    await page.getByRole('link', { name: /создать упражнение/i }).click();
    await page.getByLabel('Название').fill('Берпи');
    await page.getByRole('button', { name: /сохранить/i }).click();
    await page.getByRole('button', { name: 'Берпи' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/серия 1/i);
    await expect(page.locator('li.row')).toContainText(/берпи/i);
  });

  test('removing an exercise from a series asks first', async ({ page }) => {
    await openDay(page, 3);
    await page.getByRole('button', { name: 'Настроить Серия 1' }).click();
    await page.getByRole('button', { name: 'Убрать Подтягивания' }).click();
    await expect(page.getByRole('dialog')).toContainText(/убрать «подтягивания» из серии/i);
    await page.getByRole('button', { name: /отмена/i }).click();
    await expect(page.locator('li.row')).toHaveCount(3);
    await page.getByRole('button', { name: 'Убрать Подтягивания' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /убрать/i }).click();
    await expect(page.locator('li.row')).toHaveCount(2);
    await expect(page.locator('li.row').first()).toContainText(/отжимания на брусьях/i);
  });

  test('reorders exercises with the drag handle', async ({ page }) => {
    await openDay(page, 3);
    await page.getByRole('button', { name: 'Настроить Серия 1' }).click();
    const rows = page.locator('li.row');
    await drag(page, await center(rows.nth(0).locator('.handle')), await center(rows.nth(1).locator('.handle')), rows.nth(1));
    await expect(rows.nth(0)).toContainText(/отжимания на брусьях/i);
    await expect(rows.nth(1)).toContainText(/подтягивания/i);
    await page.reload();
    await expect(rows.nth(0)).toContainText(/отжимания на брусьях/i);
  });

  test('a library exercise used in a series cannot be deleted', async ({ page }) => {
    await page.goto('./#/exercises');
    await page.getByRole('button', { name: 'Удалить Подтягивания' }).click();
    await expect(page.getByRole('dialog')).toContainText(/используется/i);
  });
});

test.describe('series in a workout', () => {
  test.beforeEach(async ({ page }) => {
    await finishNextWorkout(page); // Day 1
    await finishNextWorkout(page); // Day 2
    await page.goto('./');
    await page.getByRole('button', { name: /начать тренировку/i }).click();
    await page.getByRole('button', { name: /пропустить упражнение/i }).click(); // Отжимания на упорах
  });

  test('goes through the series round by round, with its rests', async ({ page }) => {
    await expect(page.getByText(/серия 1 · круг 1 из 5/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/подтягивания/i);
    // A long one-word name shrinks to fit instead of running off the screen.
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() => page.getByRole('heading', { level: 1 }).evaluate((h) => h.scrollWidth - h.clientWidth))
      .toBeLessThanOrEqual(1);
    const right = await page.getByRole('heading', { level: 1 }).evaluate((h) => h.getBoundingClientRect().right);
    expect(right).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    await expect(page.locator('.panel.figures')).toContainText(/круг/i);
    await expect(page.locator('.panel.figures')).toContainText('1 / 5');
    await expect(page.locator('.panel.figures')).toContainText('5');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    await page.getByRole('button', { name: /завершить подход/i }).click();
    await expect(page.getByText(/до следующего упражнения/i)).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText(/00:(30|29|28)/);
    await expect(page.locator('.panel.next')).toContainText(/отжимания на брусьях/i);
    await expect(page.locator('.which')).toHaveText(/круг 1 из 5/i);
    await page.getByRole('button', { name: /завершить отдых/i }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/отжимания на брусьях/i);
    await page.getByRole('button', { name: /завершить подход/i }).click();
    await page.getByRole('button', { name: /завершить отдых/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/отжимания на упорах/i);

    // The last exercise of the round: the rest after the round follows.
    await page.getByRole('button', { name: /завершить подход/i }).click();
    await expect(page.getByText(/до следующего круга/i)).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText(/0[12]:\d\d/);
    await expect(page.locator('.panel.next')).toContainText(/следующий круг/i);
    await expect(page.locator('.which')).toHaveText(/круг 2 из 5/i);

    await page.clock.fastForward(121_000);
    await expect(page.getByText(/серия 1 · круг 2 из 5/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/подтягивания/i);
  });

  test('«Пропустить серию» skips the rest of the series; the summary shows each exercise', async ({ page }) => {
    await page.getByRole('button', { name: /завершить подход/i }).click();
    await page.getByRole('button', { name: /завершить отдых/i }).click();
    await page.getByRole('button', { name: /пропустить серию/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/сгибания на бицепс/i);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    await page.getByRole('button', { name: /пропустить упражнение/i }).click();
    const rows = page.getByRole('listitem');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(1)).toContainText(/подтягивания/i);
    await expect(rows.nth(1)).toContainText('5/-/-/-/-');
    await expect(rows.nth(1)).toContainText(/серия 1/i);
    await expect(rows.nth(2)).toContainText('-/-/-/-/-');
  });
});

for (const [name, open] of [
  ['day editor with a series', (page: Page) => openDay(page, 3)],
  [
    'series editor',
    async (page: Page) => {
      await openDay(page, 3);
      await page.getByRole('button', { name: 'Настроить Серия 1' }).click();
      await expect(page.locator('li.row')).toHaveCount(3);
    },
  ],
] as const) {
  test(`no accessibility violations on the ${name}`, async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
