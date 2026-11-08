// Active workout (docs/DECISIONS.md, 2026-11-05). Playwright's fake clock jumps through rest
// time; it keeps running in real time otherwise, so timer checks allow a few seconds.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadDemo, sharingResult, stubSharing } from './helpers';

const START = new Date(2026, 10, 5, 18, 40);

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: START });
  await stubSharing(page);
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

/** The rest timer in seconds: «01:30» → 90, «−00:05» → −5. */
async function timerSeconds(page: Page) {
  const text = (await page.getByRole('timer').textContent())!;
  const sign = text.startsWith('−') ? -1 : 1;
  const [m, s] = text.replace('−', '').split(':').map(Number);
  return sign * (m * 60 + s);
}

/** Expects the rest timer to show about `seconds` (it may have run a little), waiting for the screen to update. */
async function expectTimer(page: Page, seconds: number) {
  await expect
    .poll(async () => {
      const shown = await timerSeconds(page);
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
  await expectSet(page, /жим лёжа/i, '1/3', 8);
  await expect(page.locator('.day-label')).toContainText(/день 1/i);
  await expect(page.locator('.day-label')).toContainText(/верх тела/i);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test.describe('actual repetitions', () => {
  const reps = (page: Page) => page.getByRole('group', { name: 'Повторения' }).locator('output');
  const less = (page: Page) => page.getByRole('button', { name: 'Повторения: меньше' });
  const more = (page: Page) => page.getByRole('button', { name: 'Повторения: больше' });

  test('− and + set the repetitions done; the summary and shared text show them', async ({ page }) => {
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
    await page.getByRole('button', { name: /поделиться/i }).click();
    await expect.poll(async () => (await sharingResult(page)).shared).toContain('Жим лёжа: 6/11/8');
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

test.describe('exercise description and video on the set screen', () => {
  const VIDEO = 'https://www.youtube.com/watch?v=rT7DgCr-3pg';
  const DESCRIPTION = 'Лопатки сведены, ноги упираются в пол.\nОпускать штангу к нижней части груди.';

  async function describeBenchPress(page: Page, description: string, videoUrl: string) {
    await page.goto('./#/exercises');
    await page.getByRole('link', { name: 'Жим лёжа' }).click();
    await page.getByLabel('Описание').fill(description);
    await page.getByLabel('Ссылка на видео').fill(videoUrl);
    await page.getByRole('button', { name: /сохранить/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: /упражнения/i })).toBeVisible();
    await page.goto('./');
  }

  const about = (page: Page) => page.getByRole('region', { name: 'Об упражнении' });
  const videoLink = (page: Page) => page.getByRole('link', { name: /видео, откроется в браузере/i });

  test('shows the description and a link that opens outside the app', async ({ page }) => {
    await describeBenchPress(page, DESCRIPTION, VIDEO);
    await startWorkout(page);
    await expect(about(page)).toContainText('Лопатки сведены, ноги упираются в пол.');
    await expect(about(page)).toContainText('Опускать штангу к нижней части груди.');
    await expect(videoLink(page)).toHaveAttribute('href', VIDEO);
    await expect(videoLink(page)).toHaveAttribute('target', '_blank');
    await expect(videoLink(page)).toHaveAttribute('rel', /noopener/);
    // A plain text link: dotted underline in the text colour, no button outline, an arrow.
    const style = await videoLink(page).evaluate((a) => {
      const cs = getComputedStyle(a);
      return {
        decoration: cs.textDecorationLine,
        decorationStyle: cs.textDecorationStyle,
        decorationColor: cs.textDecorationColor,
        color: cs.color,
        border: cs.borderTopStyle,
      };
    });
    expect(style).toMatchObject({ decoration: 'underline', decorationStyle: 'dotted', border: 'none' });
    expect(style.decorationColor).toBe(style.color);
    await expect(videoLink(page).locator('svg[data-icon="external"]')).toHaveCount(1);
    // The link shows the address itself.
    await expect(videoLink(page).locator('.text')).toHaveText(VIDEO);
  });

  test('a long address stays on one line, ends in an ellipsis and keeps its arrow', async ({ page }) => {
    const long = `https://www.youtube.com/watch?v=rT7DgCr-3pg&list=${'PL'.repeat(40)}&index=12&t=95s`;
    await describeBenchPress(page, '', long);
    await startWorkout(page);
    const g = await videoLink(page).evaluate((a) => {
      const url = a.querySelector('.text') as HTMLElement;
      const arrow = a.querySelector('svg')!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(url);
      return {
        lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size,
        truncated: url.scrollWidth > url.clientWidth,
        ellipsis: getComputedStyle(url).textOverflow,
        arrowRight: arrow.right,
        viewport: document.documentElement.clientWidth,
      };
    });
    expect(g.lines).toBe(1);
    expect(g.truncated).toBe(true);
    expect(g.ellipsis).toBe('ellipsis');
    expect(g.arrowRight).toBeLessThanOrEqual(g.viewport);
    await expect(videoLink(page)).toHaveAttribute('href', new URL(long).href);
    // Below the exercise name, above the set panel.
    const name = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    const block = (await about(page).boundingBox())!;
    const panel = (await page.locator('.panel.figures').boundingBox())!;
    expect(block.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
    expect(block.y + block.height).toBeLessThanOrEqual(panel.y + 1);
  });

  test('the link opens the video in a new page and the workout stays put', async ({ page, context }) => {
    await context.route('https://www.youtube.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>video</title>' }),
    );
    await describeBenchPress(page, '', VIDEO);
    await startWorkout(page);
    const popupPromise = page.waitForEvent('popup');
    await videoLink(page).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(VIDEO);
    await expect(page).toHaveURL(/#\/workout$/);
    await expectSet(page, /жим лёжа/i, '1/3', 8);
  });

  test('shows only what the exercise has', async ({ page }) => {
    await startWorkout(page); // demo exercises have neither
    await expect(about(page)).toHaveCount(0);
    await page.getByRole('link', { name: /главная/i }).click();

    await describeBenchPress(page, 'Только описание', '');
    await page.getByRole('link', { name: /продолжить тренировку/i }).click();
    await expect(about(page)).toContainText('Только описание');
    await expect(videoLink(page)).toHaveCount(0);
  });

  test('library edits show up in a workout in progress', async ({ page }) => {
    await startWorkout(page);
    await page.getByRole('link', { name: /главная/i }).click();
    await describeBenchPress(page, DESCRIPTION, VIDEO);
    await page.getByRole('link', { name: /продолжить тренировку/i }).click();
    await expect(videoLink(page)).toBeVisible();
  });

  test('the rest screen does not show them', async ({ page }) => {
    await describeBenchPress(page, DESCRIPTION, VIDEO);
    await startWorkout(page);
    await complete(page);
    await expect(page.getByRole('timer')).toBeVisible();
    await expect(about(page)).toHaveCount(0);
  });

  test('no accessibility violations with a description and video', async ({ page }) => {
    await describeBenchPress(page, DESCRIPTION, VIDEO);
    await startWorkout(page);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test('the set count stays on one line next to the repetitions controls', async ({ page }) => {
  await startWorkout(page);
  const count = page.locator('.panel.figures .big').first();
  await expect(count).toHaveText('1/3');
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

test('the set screen: no shadow under the name, «1/3» tight, the divider spaced, the repetitions centred', async ({ page }) => {
  await startWorkout(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-shadow', 'none');

  const g = await page.locator('.panel.figures').evaluate((panel) => {
    const [setCol, repsCol] = [...panel.children] as HTMLElement[];
    const count = setCol.querySelector('.big')!;
    const range = document.createRange();
    range.selectNodeContents(count);
    const text = range.getBoundingClientRect();
    const divider = repsCol.getBoundingClientRect().left; // its left border
    const box = (el: Element) => el.getBoundingClientRect();
    const reps = box(repsCol.querySelector('.reps')!);
    const less = box(repsCol.querySelector('.adjust')!);
    const label = box(repsCol.querySelector('.label')!);
    const cs = getComputedStyle(repsCol);
    const contentLeft = box(repsCol).left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const contentRight = box(repsCol).right - parseFloat(cs.paddingRight);
    return {
      countText: count.textContent,
      gapBefore: divider - text.right,
      gapAfter: less.left - divider,
      repsOffCentre: (reps.left + reps.right) / 2 - (contentLeft + contentRight) / 2,
      labelOffCentre: (label.left + label.right) / 2 - (contentLeft + contentRight) / 2,
    };
  });
  expect(g.countText).toBe('1/3');
  // Room on both sides of the line between «1/3» and the − button.
  expect(g.gapBefore).toBeGreaterThanOrEqual(12);
  expect(g.gapAfter).toBeGreaterThanOrEqual(12);
  expect(Math.abs(g.repsOffCentre)).toBeLessThanOrEqual(1);
  expect(Math.abs(g.labelOffCentre)).toBeLessThanOrEqual(1);
});

test('finishing a set starts its rest; past 0:00 the timer counts on below zero and pulses', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await expect(page.getByRole('heading', { name: /отдых/i })).toBeVisible();
  await expectTimer(page, 90);
  await expect(page.getByText(/до следующего подхода/i)).toBeVisible();
  await expect(page.locator('.panel.next')).toContainText(/жим лёжа/i);
  await expect(page.getByRole('timer')).toHaveCSS('text-shadow', 'none');
  await expect(page.getByRole('timer')).toHaveCSS('animation-name', 'none');

  await page.clock.fastForward(60_000);
  await expectTimer(page, 30);
  // The rest does not end by itself.
  await page.clock.fastForward(35_000);
  await expectTimer(page, -5);
  await expect(page.getByRole('timer')).toHaveText(/^−00:0\d$/);
  await expect(page.getByRole('timer')).toHaveAttribute('aria-label', /отдых окончен/i);
  await expect(page.getByRole('heading', { name: /отдых/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /завершить подход/i })).toHaveCount(0);
  // It fades in and out in its own colour, and fits the screen with the minus sign.
  const timer = page.getByRole('timer');
  await expect(timer).not.toHaveCSS('animation-name', 'none');
  await expect(timer).toHaveCSS('color', 'rgb(247, 237, 224)');
  const fit = await timer.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right, width: document.documentElement.clientWidth };
  });
  expect(fit.left).toBeGreaterThanOrEqual(0);
  expect(fit.right).toBeLessThanOrEqual(fit.width);

  await page.clock.fastForward(60_000);
  await expectTimer(page, -65);
  await endRest(page);
  await expectSet(page, /жим лёжа/i, '2/3', 8);
});

test('the rest screen has only «Завершить отдых», right under the timer', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await expect(page.getByRole('timer')).toBeVisible();
  for (const name of [/30 секунд/i, /пауза/i, /продолжить отдых/i]) {
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  }
  await expect(page.locator('main').getByRole('button')).toHaveCount(1);
  const [stage, button, next] = await Promise.all([
    page.locator('.stage.rest').boundingBox(),
    page.getByRole('button', { name: /завершить отдых/i }).boundingBox(),
    page.locator('.panel.next').boundingBox(),
  ]);
  // Under the timer block, above the next set.
  expect(button!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height - 1);
  expect(button!.y - (stage!.y + stage!.height)).toBeLessThan(40);
  expect(next!.y).toBeGreaterThan(button!.y + button!.height);
});

test('an over-run rest stays on screen after closing the app', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await expectTimer(page, 90);
  await page.clock.fastForward(100_000);
  await page.reload();
  await expectTimer(page, -10);
  await endRest(page);
  await expectSet(page, /жим лёжа/i, '2/3', 8);
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
  await expectSet(page, /подтягивания/i, '1/3', 10);
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

  // Away longer than the rest: the timer has run on below zero; the next set waits for the user.
  await page.getByRole('link', { name: /главная/i }).click();
  await page.clock.fastForward(120_000);
  await page.getByRole('link', { name: /продолжить тренировку/i }).click();
  await expectTimer(page, -90);
  await endRest(page);
  await expectSet(page, /жим лёжа/i, '2/3', 8);
});

test('the workout survives closing the app', async ({ page }) => {
  await startWorkout(page);
  await complete(page);
  await endRest(page);
  // The screen updates only after the state is saved, so closing now loses nothing.
  await expectSet(page, /жим лёжа/i, '2/3', 8);
  await page.reload();
  await expectSet(page, /жим лёжа/i, '2/3', 8);
});

test('skipping goes straight to the next exercise and is recorded as -/-/-', async ({ page }) => {
  await startWorkout(page);
  await skip(page);
  await expectSet(page, /подтягивания/i, '1/3', 10);
  await expect(page.getByRole('timer')).toHaveCount(0);

  for (let i = 0; i < 3; i++) await skip(page);
  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
  const first = page.getByRole('listitem').first();
  await expect(first).toContainText(/жим лёжа/i);
  await expect(first).toContainText('-/-/-');
  await expect(first).toContainText(/пропущено/i);
});

test('a full workout ends with a summary that shares as text', async ({ page }) => {
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

  await page.getByRole('button', { name: /поделиться/i }).click();
  await expect.poll(async () => (await sharingResult(page)).shared).toBeTruthy();
  const { shared } = await sharingResult(page);
  expect(shared!.split('\n')).toEqual([
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

test.describe('sharing the summary', () => {
  const shareButton = (page: Page) => page.getByRole('button', { name: /поделиться/i });
  const copyButton = (page: Page) => page.getByRole('button', { name: /копировать/i });

  /** Finishes Day 1 by skipping every exercise, then reloads with the given share sheet. */
  async function openSummary(
    page: Page,
    share: Parameters<typeof stubSharing>[1],
    clipboard?: Parameters<typeof stubSharing>[2],
  ) {
    await startWorkout(page);
    for (let i = 0; i < 4; i++) await skip(page);
    await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
    await stubSharing(page, share, clipboard);
    await page.reload();
    await expect(page.getByRole('listitem').first()).toBeVisible();
  }

  test('«Поделиться» opens the share sheet with the summary text, and copies nothing', async ({ page }) => {
    await openSummary(page, 'share');
    await expect(copyButton(page)).toHaveCount(0);
    await shareButton(page).click();
    await expect.poll(async () => (await sharingResult(page)).shared).toBeTruthy();
    const result = await sharingResult(page);
    expect(result.shared!.split('\n').slice(0, 4)).toEqual([
      'Атлетика · День 1 · Верх тела',
      '5 ноя 2026 · 1 мин',
      '',
      'Жим лёжа: -/-/-',
    ]);
    expect(result.shareCalls).toBe(1);
    expect(result.copied).toBeUndefined();
    await expect(page.getByRole('status')).toHaveText('');
  });

  test('closing the share sheet does nothing', async ({ page }) => {
    await openSummary(page, 'abort');
    await shareButton(page).click();
    await expect.poll(async () => (await sharingResult(page)).shareCalls).toBe(1);
    const result = await sharingResult(page);
    expect(result.copied).toBeUndefined();
    await expect(page.getByRole('status')).toHaveText('');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/summary$/);
    // It can be opened again.
    await shareButton(page).click();
    await expect.poll(async () => (await sharingResult(page)).shareCalls).toBe(2);
  });

  test('a second tap while the share sheet is open does not open another', async ({ page }) => {
    await openSummary(page, 'pending');
    await shareButton(page).click();
    await expect.poll(async () => (await sharingResult(page)).shareCalls).toBe(1);
    await shareButton(page).click();
    await shareButton(page).click();
    expect((await sharingResult(page)).shareCalls).toBe(1);
    expect((await sharingResult(page)).copied).toBeUndefined();
  });

  test('when sharing is refused, the text is copied instead', async ({ page }) => {
    await openSummary(page, 'fail');
    await shareButton(page).click();
    await expect(page.getByRole('status')).toHaveText(/скопировано/i);
    const result = await sharingResult(page);
    expect(result.shareCalls).toBe(1);
    expect(result.copied).toContain('Атлетика · День 1 · Верх тела');
  });

  test('without a share sheet (e.g. Firefox on a PC) the button copies', async ({ page }) => {
    await openSummary(page, 'none');
    await expect(shareButton(page)).toHaveCount(0);
    await copyButton(page).click();
    await expect(page.getByRole('status')).toHaveText(/скопировано/i);
    const result = await sharingResult(page);
    expect(result.copied!.split('\n')[0]).toBe('Атлетика · День 1 · Верх тела');
    expect(result.shared).toBeUndefined();
  });

  test('when copying fails too, the text is shown to copy by hand', async ({ page }) => {
    await openSummary(page, 'none', 'fail');
    await copyButton(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(/не удалось скопировать/i);
    await expect(dialog).toContainText('Атлетика · День 1 · Верх тела');
    await expect(page.getByRole('status')).toHaveText('');
  });

  test('no accessibility violations on the summary without a share sheet', async ({ page }) => {
    await openSummary(page, 'none');
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
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
