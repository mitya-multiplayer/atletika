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
      art: { left: art.left, right: art.right, bottom: art.bottom },
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

test.describe('push-up-bars header: illustration on the right, behind the title', () => {
  for (const screen of BEHIND_SCREENS) {
    test(`keeps its layout on the ${screen.name} screen`, async ({ page }) => {
      await screen.open(page);
      const g = await headerGeometry(page);

      // Natural proportions: neither cropped nor stretched to fill the header.
      expect(g.renderedRatio).toBeCloseTo(g.naturalRatio, 1);
      // Flush with the right edge of the screen, occupying only the right side.
      expect(Math.abs(g.art.right - g.viewportWidth)).toBeLessThan(1);
      expect(g.art.left).toBeGreaterThan(g.viewportWidth * 0.15);
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
