// What a vendored Material Symbols drawing is, in one place.
//
// Three callers need the same answers and none may disagree: the build, which
// compiles the drawings into components; scripts/vendor-symbols.mjs, which
// downloads them; and the suite, which checks that what shipped is what was
// downloaded. The upstream path rule in particular is the kind of thing that
// drifts the moment it is written down twice.
//
// It reads files and hashes them. It fetches nothing and writes nothing, so
// importing it costs a suite nothing.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The pinned upstream commit of google/material-design-icons. A commit rather
// than a tag because the newest tag predates Material Symbols and carries no
// symbols/ tree at all; see symbols/README.md. Moving the pin is changing this
// constant and running scripts/vendor-symbols.mjs with no arguments.
export const COMMIT = '40a7a292a79d9394157e1ea24f83d52d5e17c556';
const STYLE = 'materialsymbolsoutlined';

// Both drawings uilet and the Crewlet console already render. The optical size
// axis is a different drawing rather than a scaled one, so one of them cannot
// stand in for the other; Glyph picks between them per rendered size.
export const OPTICAL_SIZES = [20, 24];
const FILL_SUFFIX = '-fill';

export const SYMBOLS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'symbols');

// Every vendored file is exactly one path on the Material Symbols viewBox.
// Anything else (a group, a mask, a second path, a fill attribute) would be
// drawn differently by the component the build writes, so the build refuses it
// rather than emitting a glyph that silently does not match its source.
const SINGLE_PATH = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" height="(\d+)" viewBox="0 -960 960 960" width="\1"><path d="([^"]+)"\/><\/svg>\s*$/;

// The upstream file a vendored name and optical size come from.
export function upstreamPath(name, opticalSize) {
  const filled = name.endsWith(FILL_SUFFIX);
  const glyph = filled ? name.slice(0, -FILL_SUFFIX.length) : name;
  const file = filled ? `${glyph}_fill1_${opticalSize}px.svg` : `${glyph}_${opticalSize}px.svg`;
  return `symbols/web/${glyph}/${STYLE}/${file}`;
}

// The glyph names this package ships, in one stable order. The 20 px directory
// is the set: the build then insists that every other optical size holds
// exactly the same names, so a half-vendored glyph fails rather than shipping.
export async function glyphNames() {
  const files = await readdir(resolve(SYMBOLS_DIR, String(OPTICAL_SIZES[0])));
  return files
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.slice(0, -'.svg'.length))
    .sort();
}

// symbols/SHA256SUMS, in the `shasum -a 256` output format, as a map of the
// path it names to its checksum.
export async function checksums() {
  const recorded = new Map();
  const text = await readFile(resolve(SYMBOLS_DIR, 'SHA256SUMS'), 'utf8');
  for (const line of text.split('\n').filter(Boolean)) {
    const match = /^([0-9a-f]{64}) [ *](\S+)$/.exec(line);
    if (!match) throw new Error(`symbols/SHA256SUMS: malformed line "${line}"`);
    recorded.set(match[2], match[1]);
  }
  return recorded;
}

/**
 * Reads every vendored drawing, verifying each one against its checksum.
 *
 * Returns a map of glyph name to `{ [opticalSize]: pathData }`. A missing
 * file, a file with no checksum, a checksum with no file and a file whose
 * bytes have changed are all errors: the point of vendoring is that the bytes
 * are the upstream bytes, and a drawing nobody can prove came from upstream is
 * worth less than one fetched at build time.
 */
export async function readGlyphs() {
  const names = await glyphNames();
  const recorded = await checksums();
  const seen = new Set();
  const glyphs = new Map();
  for (const name of names) {
    const drawings = {};
    for (const opticalSize of OPTICAL_SIZES) {
      const file = `${opticalSize}/${name}.svg`;
      seen.add(file);
      const expected = recorded.get(file);
      if (expected === undefined) {
        throw new Error(`symbols/SHA256SUMS has no checksum for ${file}; see "Adding or replacing a glyph" in symbols/README.md`);
      }
      let bytes;
      try {
        bytes = await readFile(resolve(SYMBOLS_DIR, file));
      } catch {
        throw new Error(`symbols/${file} is missing; run node scripts/vendor-symbols.mjs ${name}`);
      }
      const actual = createHash('sha256').update(bytes).digest('hex');
      if (actual !== expected) {
        throw new Error(
          `symbols/${file} has SHA-256 ${actual}, but symbols/SHA256SUMS records ${expected}; see "Adding or replacing a glyph" in symbols/README.md`,
        );
      }
      const match = SINGLE_PATH.exec(bytes.toString('utf8'));
      if (!match) {
        throw new Error(`symbols/${file} is not a single <path> on the Material Symbols viewBox; the build cannot compile it`);
      }
      if (Number(match[1]) !== opticalSize) {
        throw new Error(`symbols/${file} draws at ${match[1]} px, but sits in the ${opticalSize} px directory`);
      }
      drawings[opticalSize] = match[2];
    }
    glyphs.set(name, drawings);
  }
  const stale = [...recorded.keys()].filter((file) => !seen.has(file));
  if (stale.length > 0) {
    throw new Error(`symbols/SHA256SUMS lists files no glyph uses: ${stale.join(', ')}`);
  }
  return glyphs;
}

// The component name a glyph is exported under. The Glyph suffix is not
// decoration: Timeline, List, Menu, Tag, Link and Code are all uilet
// components, and a glyph that took the bare word would shadow one of them at
// every import site.
export function componentName(name) {
  return `${name
    .split(/[-_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Glyph`;
}
