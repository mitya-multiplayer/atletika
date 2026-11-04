// Renders the home-screen icons with the bundled Oswald font in headless Chromium.
// Run: node scripts/make-icons.mjs   (needs: npx playwright install chromium)
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = 'public/icons';
const font = readFileSync('node_modules/@fontsource-variable/oswald/files/oswald-cyrillic-wght-normal.woff2');

const ICONS = [
  { file: 'icon-192.png', size: 192, letterScale: 0.66 },
  { file: 'icon-512.png', size: 512, letterScale: 0.66 },
  { file: 'apple-touch-icon.png', size: 180, letterScale: 0.66 },
  // Maskable icons get cropped to a circle or squircle: keep the letter in the inner 60%.
  { file: 'icon-maskable-512.png', size: 512, letterScale: 0.5 },
];

const page = (size, letterScale) => `<!doctype html><html><head><style>
  @font-face { font-family: Oswald; src: url(data:font/woff2;base64,${font.toString('base64')}) format('woff2'); font-weight: 200 700; }
  html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: #070706; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .letter { position: absolute; inset: 0; display: grid; place-items: center;
    font: 700 ${Math.round(size * letterScale)}px/1 Oswald; color: #f7ede0; }
</style></head><body>
  <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="0,66 100,30 100,58 0,80" fill="#f91621"/></svg>
  <div class="letter">А</div>
</body></html>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const { file, size, letterScale } of ICONS) {
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(page(size, letterScale));
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `${OUT}/${file}` });
  console.log(`${OUT}/${file}`);
}
await browser.close();
