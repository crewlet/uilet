// Downloads the Material Symbols drawings this package redistributes.
//
//   node scripts/vendor-symbols.mjs                 re-fetch every glyph here
//   node scripts/vendor-symbols.mjs close warning   add or replace these
//
// The replacement procedure in symbols/README.md is this command rather than
// prose, so that adding a glyph is one step that cannot be done half right.
// A name ending in `-fill` fetches the fill 1 variant.
//
// Nothing is written until every file has arrived, so an interrupted run
// leaves the vendored tree as it was rather than half replaced.

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { COMMIT, OPTICAL_SIZES, SYMBOLS_DIR, glyphNames, upstreamPath } from './symbols.mjs';

async function download(path) {
  const url = `https://raw.githubusercontent.com/google/material-design-icons/${COMMIT}/${path}`;
  const response = await fetch(url);
  if (response.status === 404) {
    throw new Error(`${url} does not exist. Check the glyph name against the Material Symbols catalogue`);
  }
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const requested = process.argv.slice(2);
const names = requested.length > 0 ? [...new Set(requested)].sort() : await glyphNames();
if (names.length === 0) {
  console.error('nothing to fetch: name a glyph, or run this where some are already vendored');
  process.exit(1);
}

const fetched = [];
for (const name of names) {
  for (const opticalSize of OPTICAL_SIZES) {
    fetched.push({ file: `${opticalSize}/${name}.svg`, bytes: await download(upstreamPath(name, opticalSize)) });
  }
}
for (const { file, bytes } of fetched) {
  await writeFile(resolve(SYMBOLS_DIR, file), bytes);
}

// Rewritten from the directories rather than patched, so a glyph that was
// deleted leaves no checksum behind for the build to fail on.
const lines = [];
for (const opticalSize of OPTICAL_SIZES) {
  const directory = resolve(SYMBOLS_DIR, String(opticalSize));
  for (const file of (await readdir(directory)).filter((entry) => entry.endsWith('.svg')).sort()) {
    const digest = createHash('sha256').update(await readFile(resolve(directory, file))).digest('hex');
    lines.push(`${digest}  ${opticalSize}/${file}`);
  }
}
await writeFile(resolve(SYMBOLS_DIR, 'SHA256SUMS'), `${lines.join('\n')}\n`);

console.warn(`[icons] vendored ${names.length} glyph(s) at ${OPTICAL_SIZES.join(' and ')} px from ${COMMIT.slice(0, 7)}`);
