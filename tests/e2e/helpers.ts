import type { Page } from '@playwright/test';

/**
 * Fills the empty app with the demo program (10 exercises, some with a description and video;
 * 3 days, a series in Days 2 and 3) via the component gallery.
 */
export async function loadDemo(page: Page) {
  await page.goto('./#/kit');
  await page.getByRole('button', { name: 'Загрузить демо-данные' }).click();
  await page.getByRole('button', { name: 'Понятно' }).click();
}

/** Opens the editor of demo Day 1 («Верх тела»: Жим лёжа, Подтягивания, …). */
export async function openDemoDay1(page: Page) {
  await page.goto('./#/days');
  await page.getByRole('link', { name: /день 1/i }).first().click();
}

/**
 * Replaces the system share sheet and the clipboard (both need a user and permissions in tests).
 * What was shared lands in `window.shared` (each call in `window.shareCalls`), what was copied in
 * `window.copied`.
 * - `share`: the user picks an app; `abort`: the user closes the sheet; `fail`: sharing is refused;
 *   `pending`: the sheet stays open; `none`: the browser has no share sheet (e.g. Firefox on a PC).
 * - `clipboard: 'fail'` makes copying fail too, both the Clipboard API and `execCommand`.
 */
export async function stubSharing(
  page: Page,
  share: 'share' | 'abort' | 'fail' | 'pending' | 'none' = 'share',
  clipboard: 'ok' | 'fail' = 'ok',
) {
  await page.addInitScript(
    ([share, clipboard]) => {
      const w = window as unknown as { shared?: string; copied?: string; shareCalls: number };
      w.shareCalls = 0;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            if (clipboard === 'fail') throw new DOMException('Denied', 'NotAllowedError');
            w.copied = text;
          },
        },
      });
      if (clipboard === 'fail') document.execCommand = () => false;
      const value =
        share === 'none'
          ? undefined
          : async ({ text }: ShareData) => {
              w.shareCalls++;
              if (share === 'abort') throw new DOMException('Share canceled', 'AbortError');
              if (share === 'fail') throw new DOMException('Not allowed', 'NotAllowedError');
              if (share === 'pending') return new Promise<void>(() => {});
              w.shared = text;
            };
      Object.defineProperty(navigator, 'share', { configurable: true, value });
    },
    [share, clipboard] as const,
  );
}

/** What the stubs from `stubSharing` received. */
export function sharingResult(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { shared?: string; copied?: string; shareCalls: number };
    return { shared: w.shared, copied: w.copied, shareCalls: w.shareCalls };
  });
}
