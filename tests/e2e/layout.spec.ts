// Layout decisions that are easy to break with a CSS change.
import { expect, test, type Page } from '@playwright/test';
import { loadDemo, openDemoDay1 } from './helpers';

async function headerGeometry(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('header img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  return page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('header img')!;
    const title = document.querySelector('header h1')!;
    const art = img.getBoundingClientRect();
    const text = title.getBoundingClientRect();
    const overlap = {
      left: Math.max(art.left, text.left),
      right: Math.min(art.right, text.right),
      top: Math.max(art.top, text.top),
      bottom: Math.min(art.bottom, text.bottom),
    };
    const probe = document.elementFromPoint(
      (overlap.left + overlap.right) / 2,
      (overlap.top + overlap.bottom) / 2,
    );
    const content = title.closest('header')!.nextElementSibling!.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      naturalRatio: img.naturalWidth / img.naturalHeight,
      renderedRatio: art.width / art.height,
      art: { top: art.top, left: art.left, right: art.right, bottom: art.bottom },
      titleBottom: text.bottom,
      titleOverflow: title.scrollWidth - title.clientWidth,
      contentTop: content.top,
      overlapWidth: overlap.right - overlap.left,
      overlapHeight: overlap.bottom - overlap.top,
      titleOnTop: probe?.closest('h1') === title,
    };
  });
}

// Every screen with the wide push-up-bars illustration uses artLayout="behind".
const BEHIND_SCREENS: { name: string; open: (page: Page) => Promise<unknown> }[] = [
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

test.describe('poster titles', () => {
  // A title box taller than its single line means header styles leaked onto it
  // (the "hero" size class once picked up the .hero container's min-height).
  const HERO_TITLES: { name: string; open: (page: Page) => Promise<unknown> }[] = [
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

test.describe('day editor: the runner reaches down behind the day-name field', () => {
  test('starts at the top of the screen and ends just below the field', async ({ page }) => {
    await loadDemo(page);
    await openDemoDay1(page);
    await expect(page.getByPlaceholder('Например, Верх тела')).toHaveValue('Верх тела');
    await page.evaluate(() => document.fonts.ready);
    const g = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const art = box('header .art');
      const field = box('label.name-field');
      const probe = document.elementFromPoint(
        (Math.max(art.left, field.left) + Math.min(art.right, field.right)) / 2,
        (field.top + field.bottom) / 2,
      );
      const back = box('header .bar a');
      const backProbe = document.elementFromPoint((back.left + back.right) / 2, (back.top + back.bottom) / 2);
      return {
        artTop: art.top,
        backOnTop: !!backProbe?.closest('header .bar a'),
        artBelowField: art.bottom - field.bottom,
        artRight: art.right,
        viewportWidth: document.documentElement.clientWidth,
        sectionTop: box('h2.section-title').top,
        artBottom: art.bottom,
        fieldOnTop: !!probe?.closest('label.name-field'),
      };
    });

    // No empty band: the runner starts at the top edge, behind the back button, which stays usable.
    expect(Math.abs(g.artTop)).toBeLessThan(1);
    expect(g.backOnTop).toBe(true);
    // Ends about 12px below the field and before the «Упражнения» heading.
    expect(g.artBelowField).toBeGreaterThanOrEqual(6);
    expect(g.artBelowField).toBeLessThanOrEqual(20);
    expect(g.artBottom).toBeLessThan(g.sectionTop);
    // The field stays usable on top of the illustration.
    expect(g.fieldOnTop).toBe(true);
    expect(Math.abs(g.artRight - g.viewportWidth)).toBeLessThan(1);
  });

  test('the day-name field still accepts input where it overlaps the runner', async ({ page }) => {
    await loadDemo(page);
    await openDemoDay1(page);
    const field = page.getByPlaceholder('Например, Верх тела');
    const box = (await field.boundingBox())!;
    // Click the right end of the field, which lies over the illustration.
    await page.mouse.click(box.x + box.width - 20, box.y + box.height / 2);
    await expect(field).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.type(' и пресс');
    await expect(field).toHaveValue('Верх тела и пресс');
  });

  for (const [name, path] of [
    ['Days list', './#/days'],
    ['Settings', './#/settings'],
  ]) {
    test(`on the ${name} screen the picture runs from the top edge to the bottom of the header`, async ({ page }) => {
      await loadDemo(page);
      await page.goto(path);
      await expect(page.locator('header h1')).toBeVisible();
      const g = await page.evaluate(() => {
        const art = document.querySelector('header .art')!.getBoundingClientRect();
        const hero = document.querySelector('header .hero')!.getBoundingClientRect();
        return { top: art.top, bottom: art.bottom - hero.bottom };
      });
      expect(Math.abs(g.top)).toBeLessThan(1);
      expect(Math.abs(g.bottom)).toBeLessThan(1);
    });
  }
});

test.describe('push-up-bars header: illustration on the right, behind the title', () => {
  for (const screen of BEHIND_SCREENS) {
    test(`keeps its layout on the ${screen.name} screen`, async ({ page }) => {
      await screen.open(page);
      const g = await headerGeometry(page);

      // Natural proportions: not stretched (anything wider than the screen is cut off on the left).
      expect(g.renderedRatio).toBeCloseTo(g.naturalRatio, 1);
      // From the top edge of the screen, flush with its right edge.
      expect(Math.abs(g.art.top)).toBeLessThan(1);
      expect(Math.abs(g.art.right - g.viewportWidth)).toBeLessThan(1);
      // The title overlaps the illustration and is drawn above it.
      expect(g.overlapWidth).toBeGreaterThan(0);
      expect(g.overlapHeight).toBeGreaterThan(0);
      expect(g.titleOnTop).toBe(true);
      // The illustration ends just below the title (about 10px) and stays clear of the content.
      expect(g.art.bottom - g.titleBottom).toBeGreaterThanOrEqual(6);
      expect(g.art.bottom - g.titleBottom).toBeLessThanOrEqual(14);
      expect(g.contentTop - g.art.bottom).toBeGreaterThanOrEqual(12);
      // The title fits the screen width.
      expect(g.titleOverflow).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('headers without an illustration: black-and-red background image', () => {
  const PLAIN_SCREENS: { name: string; open: (page: Page) => Promise<unknown> }[] = [
    { name: 'Program', open: (page) => page.goto('./#/program') },
    { name: 'History', open: (page) => page.goto('./#/history') },
    {
      name: 'Workout summary',
      open: async (page) => {
        await loadDemo(page);
        await page.goto('./');
        await page.getByRole('button', { name: /начать тренировку/i }).click();
        for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /пропустить упражнение/i }).click();
      },
    },
    { name: 'Series', open: (page) => page.goto('./#/days/x/series') },
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
          oldStripe: document.querySelectorAll('header .lone-stripe').length,
        };
      });
      expect(Math.abs(g.top)).toBeLessThan(1);
      expect(Math.abs(g.bottomGap)).toBeLessThan(1);
      expect(Math.abs(g.left)).toBeLessThan(1);
      expect(Math.abs(g.right - g.viewport)).toBeLessThan(1);
      expect(g.titleOnTop).toBe(true);
      expect(g.backOnTop).toBe(true);
      expect(g.oldStripe).toBe(0);
    });
  }

  test('screens with their own illustration do not get the background image', async ({ page }) => {
    await loadDemo(page);
    for (const path of ['./#/days', './#/exercises', './#/settings']) {
      await page.goto(path);
      await expect(page.locator('header h1')).toBeVisible();
      await expect(page.locator('header .backdrop')).toHaveCount(0);
      await expect(page.locator('header .art img')).toHaveCount(1);
    }
  });
});
