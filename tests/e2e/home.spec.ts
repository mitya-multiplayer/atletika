// Home screen layout and artwork: brand and date at the top; the planche illustration, next
// workout and tiles at the bottom; the tile icons supplied on 2026-11-04.
import { expect, test, type Page } from '@playwright/test';

/** Whether points on the 64x64 icon grid are inside the icon's filled shape. */
async function filledAt(page: Page, icon: string, points: [number, number][]) {
  return page.locator(`nav.tiles svg[data-icon="${icon}"] path`).first().evaluate((path, pts) => {
    const shape = path as SVGPathElement;
    return pts.map(([x, y]) => shape.isPointInFill(new DOMPoint(x, y)));
  }, points);
}

/**
 * Waits until the next-workout block has loaded (an empty program: «Создать день»). The bottom
 * group keeps to the bottom edge, so everything above it moves up when that content arrives.
 */
async function homeLoaded(page: Page) {
  await expect(page.getByRole('navigation', { name: 'Разделы' })).toBeVisible();
  await expect(page.getByRole('link', { name: /создать день/i })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await homeLoaded(page);
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
  // The square 2026-11-08 poster (1392x1400).
  expect(hero.natural).toEqual([1392, 1400]);
  expect(hero.ratio).toBeCloseTo(1392 / 1400, 1);
  expect(Math.abs(hero.width - hero.viewport)).toBeLessThan(1);
});

const GUTTER = 18;

/** Decoded pixels of a capture of `clip` (viewport CSS pixels), with its device-pixel scale. */
async function capture(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    // devicePixelRatio, not the image size over the clip size: a narrow clip rounds too coarsely.
    return { w: img.width, h: img.height, scale: devicePixelRatio, px: [...ctx.getImageData(0, 0, img.width, img.height).data] };
  }, png.toString('base64'));
}

/**
 * Viewport y, in CSS pixels, of the top of the first `letter` in `selector`: the topmost cream
 * pixel in that letter's column, scanning from the top edge. Use a flat-topped capital (Т, Н):
 * round letters and digits rise above the cap line, by up to a pixel in Chromium.
 */
async function inkTop(page: Page, selector: string, letter: string) {
  const box = await page.locator(selector).evaluate((el, ch) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.textContent!.toLowerCase().indexOf(ch.toLowerCase());
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      const r = range.getBoundingClientRect();
      // The middle of the letter's advance, clear of its neighbours.
      return { x: r.left + r.width * 0.25, width: r.width * 0.5, bottom: r.bottom };
    }
    throw new Error(`no «${ch}» in the element`);
  }, letter);
  const shot = await capture(page, { x: box.x, y: 0, width: box.width, height: box.bottom });
  for (let y = 0; y < shot.h; y++)
    for (let x = 0; x < shot.w; x++) {
      const [r, g, b] = shot.px.slice((y * shot.w + x) * 4, (y * shot.w + x) * 4 + 3);
      if (r > 150 && g > 150 && b > 150) return y / shot.scale;
    }
  return null;
}

/** Boxes of the home screen's parts, in viewport coordinates. */
function homeGeometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    return {
      viewport: { width: document.documentElement.clientWidth, height: innerHeight },
      top: box('header.top'),
      brand: box('h1.brand'),
      date: box('p.date'),
      hero: box('.hero'),
      img: box('.hero img'),
      next: box('section.next'),
      tiles: box('nav.tiles'),
    };
  });
}

/** Stands in for a phone's safe areas, which the test browsers do not have (env(safe-area-inset-*) is 0). */
async function fakeSafeArea(page: Page, top: number, bottom: number) {
  await page.evaluate(
    ([t, b]) => {
      document.documentElement.style.setProperty('--safe-top', `${t}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${b}px`);
    },
    [top, bottom],
  );
}

test('the date reads the day, month and year first and the weekday under it', async ({ page }) => {
  const lines = page.locator('p.date span');
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toHaveText(/^\d{1,2} [А-Я]{3} \d{4}$/);
  await expect(lines.nth(1)).toHaveText(/^(ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)$/);
  const [first, second] = await lines.evaluateAll((spans) => spans.map((s) => s.getBoundingClientRect().top));
  expect(second).toBeGreaterThan(first);
});

/** Shows 8 Nov 2026, «8 НОЯ 2026»: its first line then has a flat-topped «Н» to measure. */
async function fixDate(page: Page) {
  await page.clock.setFixedTime(new Date(2026, 10, 8, 12));
  await page.reload();
  await expect(page.locator('p.date span').first()).toHaveText('8 НОЯ 2026');
  await homeLoaded(page);
  await page.evaluate(() => document.fonts.ready);
}

test('the brand and date capitals start one gutter below the top edge, level with each other', async ({ page }) => {
  await fixDate(page);
  const brand = (await inkTop(page, 'h1.brand', 'Т'))!;
  const date = (await inkTop(page, 'p.date', 'Н'))!;
  expect(Math.abs(brand - GUTTER)).toBeLessThanOrEqual(1);
  expect(Math.abs(date - GUTTER)).toBeLessThanOrEqual(1);
  expect(Math.abs(brand - date)).toBeLessThanOrEqual(1);
});

test('on a tall screen the brand keeps to the top and everything else to the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 1000 });
  // Opened at this size and measured once the next workout has loaded: WebKit once left the
  // bottom group where it was before that content arrived, hanging below the screen.
  await page.reload();
  await homeLoaded(page);
  await page.evaluate(() => document.fonts.ready);
  const g = await homeGeometry(page);
  // The tiles sit one gutter from the bottom and both sides, like the brand from the top.
  expect(Math.abs(g.viewport.height - g.tiles.bottom - GUTTER)).toBeLessThan(1);
  expect(Math.abs(g.tiles.left - GUTTER)).toBeLessThan(1);
  expect(Math.abs(g.viewport.width - g.tiles.right - GUTTER)).toBeLessThan(1);
  // The spare height opens between the brand and the illustration; the picture stays with the
  // next-workout block under it, full width.
  expect(g.img.top).toBeGreaterThan(g.brand.bottom + 40);
  expect(g.next.top - g.img.bottom).toBeLessThan(20);
  expect(Math.abs(g.img.right - g.img.left - g.viewport.width)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(g.viewport.height);
  expect(Math.abs((await inkTop(page, 'h1.brand', 'Т'))! - GUTTER)).toBeLessThanOrEqual(1);
});

test('the illustration has no visible edge where it meets the background', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 1000 });
  const g = await homeGeometry(page);
  expect(g.img.top).toBeGreaterThan(10);
  // A strip across the picture's top edge, at the left where the picture is black.
  const shot = await capture(page, { x: 0, y: g.img.top - 6, width: 40, height: 12 });
  const values = shot.px.filter((_, i) => i % 4 !== 3);
  expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(2);
});

test('on a short screen the illustration loses its top under the brand; nothing scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 640 });
  await page.evaluate(() => document.fonts.ready);
  const g = await homeGeometry(page);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(g.viewport.height);
  expect(Math.abs(g.viewport.height - g.tiles.bottom - GUTTER)).toBeLessThan(1);
  // The picture's frame starts right under the brand; the picture keeps its bottom (the
  // athlete) and loses its top.
  expect(Math.abs(g.hero.top - g.top.bottom)).toBeLessThan(1);
  expect(g.img.top).toBeLessThan(g.hero.top - 1);
  expect(Math.abs(g.img.bottom - g.hero.bottom)).toBeLessThan(1);
  const drawnAbove = await page.evaluate(() =>
    ['h1.brand', 'p.date'].map((selector) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return !!document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)?.closest(selector);
    }),
  );
  expect(drawnAbove).toEqual([true, true]);
});

test('on a very short screen nothing overlaps: the screen scrolls instead', async ({ page }) => {
  // «Программа пуста» takes two lines at this width; it once ran under «Создать день».
  await page.setViewportSize({ width: 375, height: 480 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('section.next .day')).toHaveText(/программа пуста/i);
  const lines = await page.locator('section.next .day').evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  });
  expect(lines).toBe(2);

  const boxes = await page.evaluate(() =>
    ['header.top', '.hero', 'section.next', '.bottom > .btn', 'nav.tiles'].map((selector) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height };
    }),
  );
  // Each part below the one before it, none drawn over another.
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 0.5);
  // A strip of the picture is left; the rest of the height is scrolled to.
  expect(boxes[1].height).toBeGreaterThanOrEqual(90);
  const scroll = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: innerHeight }));
  expect(scroll.height).toBeGreaterThan(scroll.viewport);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const tiles = await page.locator('nav.tiles').evaluate((el) => el.getBoundingClientRect().bottom);
  expect(Math.abs(scroll.viewport - tiles - GUTTER)).toBeLessThan(1);
  await expect(page.getByRole('link', { name: /создать день/i })).toBeInViewport();
});

test('the illustration never shows under the brand and is cut on a straight line below it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 640 });
  await fixDate(page);
  const g = await homeGeometry(page);
  const cut = g.top.bottom;
  // The picture would reach well above the cut: it is cut there, not merely placed below.
  expect(Math.abs(g.hero.top - cut)).toBeLessThan(1);
  expect(g.img.top).toBeLessThan(cut - 20);

  // With the brand and date made transparent, the header is plain background, edge to edge.
  const style = await page.addStyleTag({ content: '.top, .top * { color: transparent !important; border-color: transparent !important; }' });
  const header = await capture(page, { x: 0, y: 0, width: g.viewport.width, height: Math.floor(cut) });
  // A loop, not Math.max(...px): a spread of a million values overflows the stack.
  let brightest = 0;
  for (let i = 0; i < header.px.length; i++) if (i % 4 !== 3) brightest = Math.max(brightest, header.px[i]);
  expect(brightest).toBeLessThanOrEqual(10);
  await style.evaluate((el) => (el as Element).remove());

  // Nothing of the header (no fade) draws below its box: hiding it leaves those pixels as they are.
  const strip = { x: 0, y: Math.ceil(cut), width: g.viewport.width, height: 24 };
  const withHeader = await capture(page, strip);
  await page.locator('header.top').evaluate((el) => (el.style.visibility = 'hidden'));
  const withoutHeader = await capture(page, strip);
  expect(withHeader.px).toEqual(withoutHeader.px);
  await page.locator('header.top').evaluate((el) => (el.style.visibility = ''));

  // The gap from the brand's baseline to the cut matches the one from «Следующая тренировка»
  // down to the capitals of the line under it. From the Oswald metrics in src/app.css: a text
  // range's box starts one ascent above the baseline.
  const lines = await page.evaluate(() => {
    const metrics = (selector: string) => {
      const el = document.querySelector(selector)!;
      const range = document.createRange();
      range.selectNodeContents(el);
      const top = range.getBoundingClientRect().top;
      const size = parseFloat(getComputedStyle(el).fontSize);
      return { baseline: top + 1.193 * size, capTop: top + (1.193 - 0.81) * size };
    };
    return { brand: metrics('h1.brand'), kicker: metrics('.next .kicker'), day: metrics('.next .day') };
  });
  const titleGap = cut - lines.brand.baseline;
  const wordsGap = lines.day.capTop - lines.kicker.baseline;
  expect(wordsGap).toBeGreaterThan(8);
  expect(Math.abs(titleGap - wordsGap)).toBeLessThanOrEqual(1.5);
});

test('with phone safe areas: extra room under the status bar, the tiles just above the home indicator', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 1000 });
  await fixDate(page);
  await fakeSafeArea(page, 59, 34);
  // iOS 26 blurs content just under the status bar: the capitals start one gutter plus 16 px
  // below the safe area, clear of that edge.
  const EXTRA = 16;
  expect(Math.abs((await inkTop(page, 'h1.brand', 'Т'))! - (59 + EXTRA + GUTTER))).toBeLessThanOrEqual(1);
  expect(Math.abs((await inkTop(page, 'p.date', 'Н'))! - (59 + EXTRA + GUTTER))).toBeLessThanOrEqual(1);
  // The bottom safe area already keeps clear of the home indicator; no gutter is added to it.
  const g = await homeGeometry(page);
  expect(Math.abs(g.viewport.height - g.tiles.bottom - 34)).toBeLessThan(1);

  // A small safe area adds only that much at the top, and the gutter stays the least at the bottom.
  await fakeSafeArea(page, 8, 6);
  expect(Math.abs((await inkTop(page, 'h1.brand', 'Т'))! - (8 + 8 + GUTTER))).toBeLessThanOrEqual(1);
  const small = await homeGeometry(page);
  expect(Math.abs(small.viewport.height - small.tiles.bottom - GUTTER)).toBeLessThan(1);
});

test('«Начать тренировку»: label centred on the button, a larger ▶ at its left edge', async ({ page }) => {
  await page.goto('./#/kit');
  await page.getByRole('button', { name: 'Загрузить демо-данные' }).click();
  await page.getByRole('button', { name: 'Понятно' }).click();
  await page.goto('./');
  const button = page.getByRole('button', { name: /начать тренировку/i });
  await expect(button).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const g = await button.evaluate((b) => {
    const box = b.getBoundingClientRect();
    const label = b.querySelector('.group')!.getBoundingClientRect();
    const play = b.querySelector('svg[data-icon="play"]')!.getBoundingClientRect();
    const chevron = b.querySelector('svg[data-icon="chevron-right"]')!.getBoundingClientRect();
    return { box: [box.left, box.right], label: [label.left, label.right], play: [play.left, play.right, play.width], chevron: [chevron.left, chevron.right] };
  });
  const centre = (g.box[0] + g.box[1]) / 2;
  expect(Math.abs((g.label[0] + g.label[1]) / 2 - centre)).toBeLessThanOrEqual(1);
  // 1.5 × the 26 px of other button icons, near the left edge as the chevron is near the right.
  expect(g.play[2]).toBeCloseTo(39, 0);
  expect(g.play[0] - g.box[0]).toBeLessThanOrEqual(20);
  expect(g.play[1]).toBeLessThan(g.label[0]);
  expect(g.chevron[0]).toBeGreaterThan(g.label[1]);
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
