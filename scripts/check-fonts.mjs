// Fails when a bundled font family lacks a glyph the Russian UI needs.
// Each family ships as several unicode-range subsets, so coverage is the
// union of all its files (docs/TYPOGRAPHY.md, section 5).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { openSync } from 'fontkit';

const REQUIRED = [
  'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
  'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  '0123456789',
  '.,:;!?()[]«»„“”"\'‘’—–-…№%+×·/*',
].join('');

const FAMILIES = {
  Oswald: '@fontsource-variable/oswald',
  'Roboto Condensed': '@fontsource-variable/roboto-condensed',
};

let failed = false;
for (const [family, pkg] of Object.entries(FAMILIES)) {
  const dir = join('node_modules', pkg, 'files');
  const files = readdirSync(dir).filter((f) => f.endsWith('-wght-normal.woff2'));
  const covered = new Set();
  for (const file of files) {
    for (const cp of openSync(join(dir, file)).characterSet) covered.add(cp);
  }
  const missing = [...REQUIRED].filter((ch) => !covered.has(ch.codePointAt(0)));
  if (missing.length) {
    failed = true;
    console.error(`✗ ${family}: missing ${missing.map((c) => `${c} U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ')}`);
  } else {
    console.log(`✓ ${family}: all ${[...REQUIRED].length} required characters present (${files.length} files)`);
  }
}
process.exit(failed ? 1 : 0);
