// Home screen artwork: the planche illustration and the tile icons supplied on 2026-11-04.
import { expect, test, type Page } from '@playwright/test';

/** Whether points on the 64x64 icon grid are inside the icon's filled shape. */
async function filledAt(page: Page, icon: string, points: [number, number][]) {
  return page.locator(`nav.tiles svg[data-icon="${icon}"] path`).first().evaluate((path, pts) => {
    const shape = path as SVGPathElement;
    return pts.map(([x, y]) => shape.isPointInFill(new DOMPoint(x, y)));
  }, points);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('navigation', { name: 'Разделы' })).toBeVisible();
});

test('the hero shows the planche illustration full width at its own proportions', async ({ page }) => {
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('.hero img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  const hero = await page.locator('.hero img').evaluate((img: HTMLImageElement) => {
    const box = img.getBoundingClientRect();
    return {
      natural: [img.naturalWidth, img.naturalHeight],
      ratio: box.width / box.height,
      width: box.width,
      viewport: document.documentElement.clientWidth,
    };
  });
  // The 2026-11-05 poster (1390x1105), with black space at the top for the brand.
  expect(hero.natural).toEqual([1390, 1105]);
  expect(hero.ratio).toBeCloseTo(1390 / 1105, 1);
  expect(Math.abs(hero.width - hero.viewport)).toBeLessThan(1);
});

test('the hero starts at the top edge, with the brand and date over it', async ({ page }) => {
  await page.evaluate(() => document.fonts.ready);
  const g = await page.evaluate(() => {
    const img = document.querySelector('.hero img')!.getBoundingClientRect();
    const onTop = (selector: string) => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      const hit = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      return { inside: box.top >= img.top && box.bottom <= img.bottom, drawnAbove: !!hit?.closest(selector) };
    };
    return { imgTop: img.top, brand: onTop('h1.brand'), date: onTop('p.date') };
  });
  expect(Math.abs(g.imgTop)).toBeLessThan(1);
  expect(g.brand).toEqual({ inside: true, drawnAbove: true });
  expect(g.date).toEqual({ inside: true, drawnAbove: true });
});

test('the next-workout lines have equal visible gaps', async ({ page }) => {
  await page.goto('./#/kit');
  await page.getByRole('button', { name: 'Загрузить демо-данные' }).click();
  await page.getByRole('button', { name: 'Понятно' }).click();
  await page.goto('./');
  await expect(page.getByText(/верх тела/i)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  // Rows of cream pixels in a capture of the block: one band per line of text.
  const shot = await page.locator('section.next').screenshot();
  const bands = await page.evaluate(async (png) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const found: { top: number; bottom: number }[] = [];
    let current: { top: number; bottom: number } | null = null;
    for (let y = 0; y < img.height; y++) {
      let ink = false;
      for (let x = 0; x < img.width && !ink; x++) ink = data[(y * img.width + x) * 4] > 150;
      if (ink) current ? (current.bottom = y) : (current = { top: y, bottom: y });
      else if (current) found.push(current), (current = null);
    }
    if (current) found.push(current);
    return found;
  }, shot.toString('base64'));

  // «Следующая тренировка», «ДЕНЬ 1», «Верх тела»
  expect(bands).toHaveLength(3);
  const scale = (await page.evaluate(() => devicePixelRatio)) || 1;
  const gap1 = (bands[1].top - bands[0].bottom) / scale;
  const gap2 = (bands[2].top - bands[1].bottom) / scale;
  expect(Math.abs(gap1 - gap2)).toBeLessThanOrEqual(3);
});

test('the tiles use the chart, dumbbell and gear icons', async ({ page }) => {
  const tiles = page.getByRole('navigation', { name: 'Разделы' }).getByRole('link');
  await expect(tiles).toHaveCount(3);
  await expect(tiles.nth(0).locator('svg')).toHaveAttribute('data-icon', 'history');
  await expect(tiles.nth(1).locator('svg')).toHaveAttribute('data-icon', 'dumbbell');
  await expect(tiles.nth(2).locator('svg')).toHaveAttribute('data-icon', 'settings');
});

test('the history icon is three separate bars rising to the right', async ({ page }) => {
  const [short, middle, tall, gap1, gap2, aboveShort, aboveMiddle] = await filledAt(page, 'history', [
    [15, 50], // inside the short bar
    [32, 40], // inside the middle bar
    [49, 15], // inside the tall bar
    [24, 50], // between the short and middle bars
    [41, 50], // between the middle and tall bars
    [15, 25], // above the short bar
    [32, 15], // above the middle bar
  ]);
  expect([short, middle, tall]).toEqual([true, true, true]);
  expect([gap1, gap2, aboveShort, aboveMiddle]).toEqual([false, false, false, false]);
});

test('the history bars have rounded corners, as in the supplied icon', async ({ page }) => {
  // The tall bar's top edge runs from x 42.25 at y 8 (scripts/trace-icons.py, radius 1.5).
  const [corner, topEdge] = await filledAt(page, 'history', [
    [42.35, 8.1], // the very corner: cut off by the rounding
    [44, 8.1], // the top edge just past the rounding
  ]);
  expect(corner).toBe(false);
  expect(topEdge).toBe(true);
});

test('the settings icon is a filled gear with an open centre', async ({ page }) => {
  const [centre, ring, tooth, betweenTeeth, outside] = await filledAt(page, 'settings', [
    [32, 32], // the hole
    [32, 19], // the solid ring around the hole
    [55, 32], // the tooth pointing right
    [52.5, 23.5], // the gap between the right and upper-right teeth
    [3, 3], // well outside the gear
  ]);
  expect(centre).toBe(false);
  expect(ring).toBe(true);
  expect(tooth).toBe(true);
  expect(betweenTeeth).toBe(false);
  expect(outside).toBe(false);
});

test('the program icon is a filled, symmetric dumbbell', async ({ page }) => {
  // Shapes from scripts/trace-icons.py: inner plates x 14.69-22.57 / 41.43-49.31 (y 18.3-45.7),
  // bar y 29.1-34.9, outer plates x 8-13.31 / 50.69-56 (y 24.8-39.2), outer corners radius 2.4.
  const filled = await filledAt(page, 'dumbbell', [
    [18.6, 20], // left inner plate, near its top
    [45.4, 44], // right inner plate, near its bottom
    [32, 32], // the bar
    [10, 32], // left outer plate
    [54, 32], // right outer plate
    [13.2, 25], // left outer plate, inner top corner: square
  ]);
  expect(filled).toEqual([true, true, true, true, true, true]);

  const empty = await filledAt(page, 'dumbbell', [
    [14, 32], // gap between the left plates
    [50, 32], // gap between the right plates
    [32, 26], // above the bar
    [32, 38], // below the bar
    [8.1, 24.9], // left outer plate, outer top corner: rounded off
    [14.8, 18.4], // left inner plate, top-left corner: rounded off
  ]);
  expect(empty).toEqual([false, false, false, false, false, false]);
});

test('the three tile labels line up whatever the icon sizes', async ({ page }) => {
  const tops = await page
    .getByRole('navigation', { name: 'Разделы' })
    .locator('a span')
    .evaluateAll((spans) => spans.map((span) => Math.round(span.getBoundingClientRect().top)));
  expect(tops).toHaveLength(3);
  expect(new Set(tops).size).toBe(1);
});

for (const [label, heading] of [
  ['История', /история/i],
  ['Программа', /программа/i],
  ['Настройки', /настройки/i],
] as const) {
  test(`the ${label} tile opens its screen`, async ({ page }) => {
    await page.getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  });
}
