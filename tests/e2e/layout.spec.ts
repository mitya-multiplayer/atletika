// Layout decisions that are easy to break with a CSS change.
import { expect, test, type Page } from '@playwright/test';
import { loadDemo, openDemoDay1 } from './helpers';

/** Oswald's metrics in em (src/app.css): a text range's box starts one ascent above the baseline. */
const ASCENT = 1.193;
const CAP = 0.81;
const GUTTER = 18;

type Screen = { name: string; open: (page: Page) => Promise<unknown> };

/** The header illustration, the title's last baseline, and what lies under them. */
async function headerGeometry(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('header .art img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  return page.evaluate(
    ([ascent]) => {
      const art = document.querySelector('header .art')!;
      const title = document.querySelector('header h1')!;
      const box = art.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(title);
      const lines = [...range.getClientRects()];
      const last = lines[lines.length - 1];
      const size = parseFloat(getComputedStyle(title).fontSize);
      const text = title.getBoundingClientRect();
      const overlap = {
        left: Math.max(box.left, text.left),
        right: Math.min(box.right, text.right),
        top: Math.max(box.top, text.top),
        bottom: Math.min(box.bottom, text.bottom),
      };
      const probe = document.elementFromPoint((overlap.left + overlap.right) / 2, (overlap.top + overlap.bottom) / 2);
      const content = title.closest('header')!.nextElementSibling!.getBoundingClientRect();
      return {
        viewportWidth: document.documentElement.clientWidth,
        art: { top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
        baseline: last.top + ascent * size,
        contentTop: content.top,
        titleOnTop: overlap.right > overlap.left && overlap.bottom > overlap.top && probe?.closest('h1') === title,
        titleShadow: getComputedStyle(title).textShadow,
        topShade: getComputedStyle(art, '::after').backgroundImage,
        fade: (() => {
          const cs = getComputedStyle(art) as CSSStyleDeclaration & { webkitMaskImage?: string };
          return cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : (cs.webkitMaskImage ?? '');
        })(),
      };
    },
    [ASCENT],
  );
}

// Tall illustrations (runner, gears): from the top edge of the screen, beside the title.
const BESIDE_SCREENS: Screen[] = [
  { name: 'Days list', open: (page) => page.goto('./#/days') },
  { name: 'Settings', open: (page) => page.goto('./#/settings') },
  { name: 'default rest', open: (page) => page.goto('./#/settings/rest') },
  {
    name: 'day editor',
    open: async (page) => {
      await loadDemo(page);
      await openDemoDay1(page);
    },
  },
];

// Every screen with the wide push-up-bars illustration uses artLayout="behind".
const BEHIND_SCREENS: Screen[] = [
  { name: 'new exercise', open: (page) => page.goto('./#/exercises/new') },
  {
    name: 'new exercise opened from the selector',
    open: (page) => page.goto('./#/exercises/new?back=%2Fdays%2Fx%2Fadd'),
  },
  {
    name: 'edit exercise',
    open: async (page) => {
      await loadDemo(page);
      await page.goto('./#/exercises');
      await page.getByRole('link', { name: 'Жим лёжа' }).click();
      await expect(page.getByLabel('Название')).toHaveValue('Жим лёжа');
    },
  },
  {
    name: 'exercise library',
    open: async (page) => {
      await loadDemo(page);
      await page.goto('./#/exercises');
      await expect(page.getByRole('listitem').first()).toBeVisible();
    },
  },
  {
    name: 'exercise selector',
    open: async (page) => {
      await loadDemo(page);
      await openDemoDay1(page);
      await page.getByRole('link', { name: /добавить упражнение/i }).click();
      await expect(page.getByRole('heading', { name: /выбери упражнение/i })).toBeVisible();
    },
  },
  {
    name: 'set configuration',
    open: async (page) => {
      await loadDemo(page);
      await openDemoDay1(page);
      await page.getByRole('button', { name: 'Настроить Жим лёжа' }).click();
      await expect(page.getByRole('heading', { name: /подходы/i })).toBeVisible();
    },
  },
];

/** Finishes demo Day 1 by skipping its four exercises: Home → workout → summary. */
async function finishDemoDay1(page: Page) {
  await loadDemo(page);
  await page.goto('./');
  await page.getByRole('button', { name: /начать тренировку/i }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /пропустить упражнение/i }).click();
  await expect(page.getByText(/тренировка завершена/i)).toBeVisible();
}

// The wide clipboard (2026-11-09): artLayout="behind" in its own 16:9 box, not cut on a slant.
const CLIPBOARD_SCREENS: Screen[] = [
  { name: 'History', open: (page) => page.goto('./#/history') },
  {
    name: 'workout opened from History',
    open: async (page) => {
      await finishDemoDay1(page);
      await page.goto('./#/history');
      await page.getByRole('link', { name: /посмотреть тренировку/i }).click();
      await expect(page.getByRole('link', { name: /история/i })).toBeVisible();
    },
  },
];

test.describe('poster titles', () => {
  // A title box taller than its single line means header styles leaked onto it
  // (the "hero" size class once picked up the .hero container's min-height).
  const HERO_TITLES: Screen[] = [
    { name: 'Program', open: (page) => page.goto('./#/program') },
    { name: 'History', open: (page) => page.goto('./#/history') },
    {
      name: 'Day editor',
      open: async (page) => {
        await loadDemo(page);
        await openDemoDay1(page);
      },
    },
  ];

  for (const screen of HERO_TITLES) {
    test(`are only as tall as their line on ${screen.name}`, async ({ page }) => {
      await screen.open(page);
      // The day editor renders its header only after the day loads from IndexedDB.
      await expect(page.locator('header h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const t = await page.evaluate(() => {
        const title = document.querySelector('header h1')!;
        return { height: title.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(title).lineHeight) };
      });
      expect(t.height).toBeLessThanOrEqual(t.lineHeight + 1);
    });
  }
});

test.describe('header pictures end about 5 px below the title letters, darkened at the bottom', () => {
  for (const screen of [...BESIDE_SCREENS, ...BEHIND_SCREENS, ...CLIPBOARD_SCREENS]) {
    test(`on the ${screen.name} screen`, async ({ page }) => {
      await screen.open(page);
      await expect(page.locator('header h1')).toBeVisible();
      const g = await headerGeometry(page);
      expect(Math.abs(g.art.bottom - (g.baseline + 5))).toBeLessThanOrEqual(2);
      // The title is drawn over the picture, without a shadow.
      expect(g.titleOnTop).toBe(true);
      expect(g.titleShadow).toBe('none');
      // A shade at the top (back button, status bar); the lower part fades out by a mask
      // (82 % faded at 85 % of the height, gone at the bottom edge) so the title reads clearly.
      expect(g.topShade).toMatch(/linear-gradient/);
      expect(g.fade).toMatch(/linear-gradient/);
      expect(g.fade).toMatch(/0\.18\) 85%/);
      expect(g.fade).toMatch(/(transparent|rgba\(0, 0, 0, 0\)) 100%/);
      // Clear of the content below; flush with the screen's right edge.
      expect(g.contentTop - g.art.bottom).toBeGreaterThanOrEqual(8);
      expect(Math.abs(g.art.right - g.viewportWidth)).toBeLessThan(1);
    });
  }

  for (const screen of [...BESIDE_SCREENS, ...BEHIND_SCREENS, ...CLIPBOARD_SCREENS]) {
    test(`the ${screen.name} picture starts at the top edge of the screen`, async ({ page }) => {
      await screen.open(page);
      await expect(page.locator('header h1')).toBeVisible();
      const g = await headerGeometry(page);
      expect(Math.abs(g.art.top)).toBeLessThan(1);
    });
  }

  // Light parts of a picture (the gear's rim, the runner's floor) once left a thin grey or red
  // line along its bottom edge: at a fractional device pixel the picture showed through a dark
  // layer laid over it. The picture now fades out by a mask. Both test projects have
  // fractional scales (iPhone 3×, Android 2.625×) and positions.
  for (const screen of [...BESIDE_SCREENS, ...BEHIND_SCREENS, ...CLIPBOARD_SCREENS]) {
    test(`no light line along the bottom of the ${screen.name} picture`, async ({ page }) => {
      await screen.open(page);
      await expect(page.locator('header h1')).toBeVisible();
      await headerGeometry(page);
      const strip = await page.evaluate(() => {
        const art = document.querySelector('header .art')!.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('header h1')!);
        // Right of the title's letters, so only the picture is measured.
        const left = Math.max(art.left, Math.max(...[...range.getClientRects()].map((r) => r.right)) + 2);
        return { x: left, y: art.bottom - 2, width: Math.min(art.right, document.documentElement.clientWidth) - left, height: 2 };
      });
      expect(strip.width).toBeGreaterThan(8);
      const png = await page.screenshot({ clip: strip });
      const brightest = await page.evaluate(async (data) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, img.width, img.height).data;
        let max = 0;
        for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2]);
        return max;
      }, png.toString('base64'));
      // The background is rgb(7, 7, 6); the old 82 % shade left up to ~60 there.
      expect(brightest).toBeLessThanOrEqual(16);
    });
  }

  test('the day-name field sits below the runner, not over it', async ({ page }) => {
    await loadDemo(page);
    await openDemoDay1(page);
    const field = page.getByPlaceholder('Например, Верх тела');
    await expect(field).toHaveValue('Верх тела');
    const g = await headerGeometry(page);
    const fieldTop = (await page.locator('label.name-field').boundingBox())!.y;
    expect(fieldTop).toBeGreaterThan(g.art.bottom);
  });
});

test.describe('push-up bars: the Program card’s box shape, from the top edge, scaled to the header', () => {
  async function cardArt(page: Page) {
    await page.goto('./#/program');
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>('.card.exercises img');
      return !!img && img.complete && img.naturalWidth > 0;
    });
    return (await page.locator('.card.exercises img').boundingBox())!;
  }

  for (const screen of BEHIND_SCREENS) {
    test(`on the ${screen.name} screen`, async ({ page }) => {
      const card = await cardArt(page);
      await screen.open(page);
      await expect(page.locator('header h1')).toBeVisible();
      await headerGeometry(page);
      const img = (await page.locator('header .art img').boundingBox())!;
      // The same shape as the card's picture, never smaller; a taller header shows it larger.
      expect(img.width / img.height).toBeCloseTo(card.width / card.height, 1);
      expect(img.height).toBeGreaterThanOrEqual(card.height - 1);
      // The same crop: the top of the bars, not stretched.
      const fit = await page.locator('header .art img').evaluate((el) => {
        const cs = getComputedStyle(el);
        return [cs.objectFit, cs.objectPosition];
      });
      expect(fit).toEqual(['cover', '50% 0%']);
    });
  }

  test('a one-line title shows it exactly at the card’s size', async ({ page }) => {
    const card = await cardArt(page);
    await loadDemo(page);
    await page.goto('./#/exercises');
    await expect(page.getByRole('listitem').first()).toBeVisible();
    await headerGeometry(page);
    const img = (await page.locator('header .art img').boundingBox())!;
    expect(Math.abs(img.width - card.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(img.height - card.height)).toBeLessThanOrEqual(1);
  });

  test('a title on two lines («Новое упражнение»): larger, still from the top edge to just below the title', async ({ page }) => {
    const card = await cardArt(page);
    await page.goto('./#/exercises/new');
    await expect(page.locator('header h1')).toBeVisible();
    const g = await headerGeometry(page);
    const lines = await page.locator('header h1').evaluate((h) => {
      const range = document.createRange();
      range.selectNodeContents(h);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    expect(lines).toBe(2);
    expect(Math.abs(g.art.top)).toBeLessThan(1);
    expect(Math.abs(g.art.bottom - (g.baseline + 5))).toBeLessThanOrEqual(2);
    expect(g.art.height).toBeGreaterThan(card.height + 10);
  });
});

test.describe('the history clipboard: whole, in its own 16:9 box', () => {
  for (const screen of CLIPBOARD_SCREENS) {
    test(`on the ${screen.name} screen`, async ({ page }) => {
      await screen.open(page);
      await expect(page.locator('header h1')).toBeVisible();
      const g = await headerGeometry(page);
      expect(g.art.width / g.art.height).toBeCloseTo(16 / 9, 2);
      expect(g.art.height).toBeGreaterThanOrEqual(132);
      // No slanted cut: its left side is already the background's black.
      const style = await page.locator('header .art').evaluate((el) => {
        const img = el.querySelector('img')!;
        return { clip: getComputedStyle(el).clipPath, natural: img.naturalWidth / img.naturalHeight };
      });
      expect(style.clip).toBe('none');
      // The picture's own shape, so cover crops nothing.
      expect(style.natural).toBeCloseTo(g.art.width / g.art.height, 2);
    });
  }

  test('the summary right after a workout keeps the background image', async ({ page }) => {
    await finishDemoDay1(page);
    await expect(page.locator('header .art')).toHaveCount(0);
    await expect(page.locator('header .backdrop img')).toHaveCount(1);
  });
});

test.describe('the runner (2026-11-09): centred in its windows', () => {
  for (const path of ['./#/days', './#/program']) {
    test(`on ${path.slice(4)}`, async ({ page }) => {
      await page.goto(path);
      const img = page.locator(path.endsWith('days') ? 'header .art img' : '.card.days img');
      await expect(img).toBeVisible();
      expect(await img.evaluate((el) => getComputedStyle(el).objectPosition)).toBe('50% 50%');
    });
  }

  test('the gears keep the right side of their picture', async ({ page }) => {
    await page.goto('./#/settings');
    const img = page.locator('header .art img');
    await expect(img).toBeVisible();
    expect(await img.evaluate((el) => getComputedStyle(el).objectPosition)).toBe('100% 50%');
  });

  test('the Program cards cut both pictures at one angle', async ({ page }) => {
    await page.goto('./#/program');
    await expect(page.locator('.card.exercises img')).toBeVisible();
    const slopes = await page.evaluate(() =>
      ['.card.days .art', '.card.exercises .art'].map((selector) => {
        const el = document.querySelector(selector)!;
        // How far in from the left the cut starts at the top, per pixel of height.
        const run = parseFloat(getComputedStyle(el).clipPath.match(/polygon\(([\d.]+)px/)![1]);
        return run / el.getBoundingClientRect().height;
      }),
    );
    expect(slopes[0]).toBeGreaterThan(0.2);
    expect(slopes[1]).toBeCloseTo(slopes[0], 2);
  });
});

test.describe('headers without an illustration: black-and-red background image', () => {
  const PLAIN_SCREENS: Screen[] = [
    { name: 'Workout summary', open: finishDemoDay1 },
    {
      name: 'Series editor',
      open: async (page) => {
        await loadDemo(page);
        await page.goto('./#/days');
        await page.getByRole('link', { name: /день 3/i }).first().click();
        await page.getByRole('button', { name: 'Настроить Серия 1' }).click();
      },
    },
  ];

  for (const screen of PLAIN_SCREENS) {
    test(`fills the ${screen.name} header from the top edge`, async ({ page }) => {
      await screen.open(page);
      await expect(page.locator('header h1')).toBeVisible();
      await page.waitForFunction(() => {
        const img = document.querySelector<HTMLImageElement>('header .backdrop img');
        return !!img && img.complete && img.naturalWidth > 0;
      });
      const g = await page.evaluate(() => {
        const backdrop = document.querySelector('header .backdrop')!.getBoundingClientRect();
        const header = document.querySelector('header')!.getBoundingClientRect();
        const title = document.querySelector('header h1')!.getBoundingClientRect();
        const back = document.querySelector('header .bar a')!.getBoundingClientRect();
        const at = (r: DOMRect) => document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        return {
          top: backdrop.top,
          bottomGap: header.bottom - backdrop.bottom,
          left: backdrop.left,
          right: backdrop.right,
          viewport: document.documentElement.clientWidth,
          titleOnTop: !!at(title)?.closest('header h1'),
          backOnTop: !!at(back)?.closest('header .bar a'),
          titleShadow: getComputedStyle(document.querySelector('header h1')!).textShadow,
        };
      });
      expect(Math.abs(g.top)).toBeLessThan(1);
      expect(Math.abs(g.bottomGap)).toBeLessThan(1);
      expect(Math.abs(g.left)).toBeLessThan(1);
      expect(Math.abs(g.right - g.viewport)).toBeLessThan(1);
      expect(g.titleOnTop).toBe(true);
      expect(g.backOnTop).toBe(true);
      expect(g.titleShadow).toBe('none');
    });
  }

  test('the Program screen has no background image: no red line behind its title', async ({ page }) => {
    await page.goto('./#/program');
    await expect(page.getByRole('heading', { level: 1, name: /программа/i })).toBeVisible();
    await expect(page.locator('header .backdrop')).toHaveCount(0);
    await expect(page.locator('header .art')).toHaveCount(0);
    await expect(page.locator('header img')).toHaveCount(0);
  });

  test('screens with their own illustration do not get the background image', async ({ page }) => {
    await loadDemo(page);
    for (const path of ['./#/days', './#/exercises', './#/settings', './#/history']) {
      await page.goto(path);
      await expect(page.locator('header h1')).toBeVisible();
      await expect(page.locator('header .backdrop')).toHaveCount(0);
      await expect(page.locator('header .art img')).toHaveCount(1);
    }
  });
});

test.describe('the same top on every screen: the back label starts where Home’s «АТЛЕТИКА» does', () => {
  const PATHS = [
    './#/program',
    './#/history',
    './#/settings',
    './#/settings/rest',
    './#/days',
    './#/exercises',
    './#/exercises/new',
    './#/workout',
    './#/kit',
  ];

  /** Viewport y of the top of the back label's capitals (22 px Oswald). */
  const backCapTop = (page: Page) =>
    page.locator('main a').first().evaluate(
      (link, [ascent, cap]) => {
        const label = link.querySelector('span')!;
        const range = document.createRange();
        range.selectNodeContents(label);
        const size = parseFloat(getComputedStyle(label).fontSize);
        return range.getBoundingClientRect().top + (ascent - cap) * size;
      },
      [ASCENT, CAP],
    );

  test('one gutter from the top, as on Home', async ({ page }) => {
    for (const path of PATHS) {
      await page.goto(path);
      await expect(page.locator('main a').first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(Math.abs((await backCapTop(page)) - GUTTER), path).toBeLessThanOrEqual(1);
    }
  });

  test('under a phone status bar: the safe area, 16 px more, and the gutter, as on Home', async ({ page }) => {
    for (const path of PATHS) {
      await page.goto(path);
      await expect(page.locator('main a').first()).toBeVisible();
      await page.evaluate(() => {
        document.documentElement.style.setProperty('--safe-top', '59px');
        return document.fonts.ready;
      });
      expect(Math.abs((await backCapTop(page)) - (59 + 16 + GUTTER)), path).toBeLessThanOrEqual(1);
    }
  });
});

test('the exercise selector’s «Создать упражнение» is a regular (outlined) button', async ({ page }) => {
  await loadDemo(page);
  await openDemoDay1(page);
  await page.getByRole('link', { name: /добавить упражнение/i }).click();
  const button = page.getByRole('link', { name: /создать упражнение/i });
  await expect(button).toBeVisible();
  await expect(button).toHaveClass(/secondary/);
  await expect(button).toHaveCSS('background-color', 'rgb(7, 7, 6)');
  await expect(button).toHaveCSS('border-top-color', 'rgb(247, 237, 224)');
});
