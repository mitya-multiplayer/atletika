// GitHub Pages hosting: the app runs from a subpath (/<repo>/), installs from its
// manifest, and keeps working offline through the service worker.
import { expect, test, type Page } from '@playwright/test';

async function waitForServiceWorker(page: Page) {
  // clientsClaim + skipWaiting: the first visit becomes controlled once the worker activates.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });
}

test('loads every resource from the Pages subpath', async ({ page, baseURL }) => {
  const base = new URL(baseURL!);
  const outside: string[] = [];
  const failed: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === base.origin && !url.pathname.startsWith(base.pathname)) outside.push(url.pathname);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => failed.push(`failed ${request.url()}`));

  for (const path of ['./', './#/program', './#/days', './#/exercises', './#/settings']) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() => page.locator('img').evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
  }

  expect(outside, 'requests outside the subpath would 404 on GitHub Pages').toEqual([]);
  expect(failed).toEqual([]);
});

test('manifest and icons resolve for installing to the home screen', async ({ page, request, baseURL }) => {
  await page.goto('./');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(manifestHref!, page.url()).href;
  const response = await request.get(manifestUrl);
  expect(response.status()).toBe(200);
  const manifest = await response.json();

  // The name under the home-screen icon is upper case on both phones.
  expect(manifest.name).toBe('АТЛЕТИКА');
  expect(manifest.short_name).toBe('АТЛЕТИКА');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'АТЛЕТИКА');
  expect(manifest.lang).toBe('ru');
  expect(manifest.display).toBe('standalone');
  expect(new URL(manifest.start_url, manifestUrl).href).toBe(baseURL);
  expect(new URL(manifest.scope, manifestUrl).href).toBe(baseURL);
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);

  const appleHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const iconUrls = [
    ...manifest.icons.map((icon: { src: string }) => new URL(icon.src, manifestUrl).href),
    new URL(appleHref!, page.url()).href,
  ];
  for (const url of iconUrls) {
    const icon = await request.get(url);
    expect(icon.status(), url).toBe(200);
    expect(icon.headers()['content-type'], url).toContain('image/png');
  }
});

test('service worker is scoped to the Pages subpath', async ({ page, baseURL }) => {
  await page.goto('./');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(baseURL);
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./#/kit');
  await page.getByRole('button', { name: 'Загрузить демо-данные' }).click();
  await page.getByRole('button', { name: 'Понятно' }).click();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.goto('./#/program');
  await page.reload();

  await expect(page.getByRole('heading', { name: /программа/i })).toBeVisible();
  await expect
    .poll(() => page.locator('img').evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0)))
    .toBe(true);
  expect(await page.evaluate(() => document.fonts.check('700 20px "Oswald Variable"', 'ЁЖЯ'))).toBe(true);

  await page.getByRole('link', { name: /дни/i }).click();
  await expect(page.getByText('Верх тела')).toBeVisible();
});

test('data survives closing and reopening the app', async ({ page }) => {
  await page.goto('./#/days');
  await page.getByRole('button', { name: /добавить день/i }).click();
  await page.getByPlaceholder('Например, Верх тела').fill('Ноги');
  await page.getByRole('link', { name: /дни/i }).first().click();
  await expect(page.getByText('Ноги')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Ноги')).toBeVisible();
  await page.goto('./');
  await expect(page.getByText(/ноги/i)).toBeVisible();
});

test('every home-screen icon has the pixel size it claims', async ({ page }) => {
  await page.goto('./');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(new URL(manifestHref!, page.url()).href)).json();
  const appleHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const expected: [string, number][] = [
    ...manifest.icons.map((icon: { src: string; sizes: string }) => [icon.src, Number(icon.sizes.split('x')[0])]),
    [appleHref!, 180],
  ];
  for (const [src, size] of expected) {
    const natural = await page.evaluate(async (url) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, src);
    expect(natural, src).toEqual([size, size]);
  }
});
