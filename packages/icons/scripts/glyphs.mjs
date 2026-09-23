// What a vendored Lucide drawing is, in one place.
//
// Three callers need the same answers and none may disagree: the build, which
// compiles the drawings into components; scripts/vendor-glyphs.mjs, which
// extracts them from the pinned upstream tarball; and the suite, which checks
// that what shipped is what was extracted. The upstream pin and the shape of a
// file in particular are the kind of thing that drifts the moment it is
// written down twice.
//
// It reads files and hashes them. It fetches nothing and writes nothing, so
// importing it costs a suite nothing.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The pinned release of lucide-static, and the integrity the registry records
// for its tarball (`npm view lucide-static@<version> dist.integrity`). A
// version alone is a name: the integrity is what proves the bytes vendored
// here are the bytes that version was published as. Moving the pin is
// changing both constants and running scripts/vendor-glyphs.mjs with no
// arguments; see glyphs/README.md.
export const VERSION = '1.47.0';
export const INTEGRITY = 'sha512-yWIrkdXc688Feq5VjOktsKmV5Ikc7y5Nu3rrdtbr8nWjkJWk8QlnZfVtIak22Af+fNhZ7k4cTJpZo1zmj7X5sA==';
export const TARBALL = `https://registry.npmjs.org/lucide-static/-/lucide-static-${VERSION}.tgz`;

export const GLYPHS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'glyphs');

/*
 * The drawings a caller may fill, and the only ones whose component takes a
 * `filled` prop.
 *
 * DECLARED RATHER THAN DERIVED, because being closed is necessary and not
 * sufficient. A Lucide glyph is a stroke, so its filled state is the same
 * drawing with its inside painted, and that reads as the mark only where the
 * drawing is ONE silhouette: `compass`, `target` and `camera` are made of
 * closed shapes too, and filled they are a disc with nothing left to say which
 * disc it is. So the list is a judgement about meaning, and `isClosed` is the
 * floor under it: the build refuses a name here whose drawing has an open
 * stroke, which would fill into a blob with a line through it.
 *
 * `star` is the kept state: the Crewlet console's favourite toggle, and the
 * `star-fill` drawing Material Symbols carried as a second glyph.
 */
export const FILLABLE = ['star'];

/*
 * The one root every vendored file has, attribute for attribute. The `class`
 * is the upstream name the file was published under, so it is checked against
 * the file name rather than listed here: a file renamed after it was
 * extracted, or copied from a sibling, fails on it. The stroke width is
 * upstream's 2 and is NOT the one the components draw; the frame in
 * src/Glyph.tsx owns that, and the file is kept exactly as published.
 */
const ROOT = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

/*
 * What a drawing may be made of, and the attributes each element may carry.
 * Geometry and nothing else: a child with its own stroke, transform, style or
 * class would be drawn differently by the component the build writes than by
 * the file it came from. `fill` is the one exception, and only as
 * "currentColor", which is how Lucide draws a dot a stroke cannot.
 */
const ELEMENTS = {
  path: { required: ['d'], optional: [] },
  circle: { required: ['cx', 'cy', 'r'], optional: [] },
  ellipse: { required: ['cx', 'cy', 'rx', 'ry'], optional: [] },
  rect: { required: ['width', 'height'], optional: ['x', 'y', 'rx', 'ry'] },
  line: { required: ['x1', 'y1', 'x2', 'y2'], optional: [] },
  polyline: { required: ['points'], optional: [] },
  polygon: { required: ['points'], optional: [] },
};
const NUMERIC = new Set(['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2']);

// The whole file, as lucide-static prints every icon: the license comment,
// the root one attribute per line, each child on its own line.
const FILE = /^<!-- @license lucide-static v(\S+) - ISC -->\n<svg\n((?: {2}[a-zA-Z][a-zA-Z0-9-]*="[^"]*"\n)+)>\n((?: {2}<[a-z]+(?: [a-zA-Z][a-zA-Z0-9-]*="[^"]*")+ \/>\n)+)<\/svg>\n?$/;
const ATTRIBUTE = /([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g;

const attributes = (text) => Object.fromEntries([...text.matchAll(ATTRIBUTE)].map((match) => [match[1], match[2]]));

/**
 * The elements of one vendored file, or an error naming what is wrong with
 * it. Everything the build and the suite know about a drawing comes through
 * here, so a file that would compile into something other than what upstream
 * drew never reaches either.
 */
export function parseGlyph(name, text) {
  const where = `glyphs/${name}.svg`;
  const match = FILE.exec(text);
  if (!match) {
    throw new Error(`${where} is not a lucide-static drawing: one <svg> root, one child element per line, nothing else`);
  }
  if (match[1] !== VERSION) {
    throw new Error(`${where} is from lucide-static ${match[1]}, but the pin is ${VERSION}; run node scripts/vendor-glyphs.mjs`);
  }
  const root = attributes(match[2]);
  const expected = { class: `lucide lucide-${name}`, ...ROOT };
  const keys = [...new Set([...Object.keys(root), ...Object.keys(expected)])];
  for (const key of keys) {
    if (root[key] !== expected[key]) {
      throw new Error(`${where}: the root's ${key} is ${JSON.stringify(root[key])}, where every vendored drawing has ${JSON.stringify(expected[key])}`);
    }
  }
  const elements = [];
  for (const line of match[3].split('\n').filter(Boolean)) {
    const tag = /^ {2}<([a-z]+)/.exec(line)[1];
    const rule = ELEMENTS[tag];
    if (rule === undefined) throw new Error(`${where}: <${tag}> is not a drawing primitive the build compiles`);
    const attrs = attributes(line);
    for (const key of rule.required) {
      if (!(key in attrs)) throw new Error(`${where}: a <${tag}> without ${key}`);
    }
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'fill') {
        if (value !== 'currentColor') throw new Error(`${where}: a <${tag}> filled with ${value}; only currentColor follows the text colour`);
        continue;
      }
      if (!rule.required.includes(key) && !rule.optional.includes(key)) {
        throw new Error(`${where}: a <${tag}> carrying ${key}, which is not geometry`);
      }
      if (NUMERIC.has(key) && !Number.isFinite(Number(value))) {
        throw new Error(`${where}: a <${tag}> whose ${key} is ${JSON.stringify(value)}, not a number`);
      }
    }
    elements.push({ tag, attrs });
  }
  return elements;
}

/**
 * Whether filling a drawing paints a shape rather than a smear: every element
 * encloses an area (a circle, an ellipse, a rect, a polygon, or a path each of
 * whose subpaths ends in a close), and none paints a fill of its own, which
 * the filled state would swallow.
 */
export function isClosed(elements) {
  return elements.every(({ tag, attrs }) => {
    if ('fill' in attrs) return false;
    if (tag === 'circle' || tag === 'ellipse' || tag === 'rect' || tag === 'polygon') return true;
    if (tag !== 'path') return false;
    return attrs.d
      .split(/(?=[Mm])/)
      .map((subpath) => subpath.trim())
      .filter(Boolean)
      .every((subpath) => /[Zz]$/.test(subpath));
  });
}

// The glyph names this package ships, in one stable order: the drawings in
// glyphs/, by file name.
export async function glyphNames() {
  const files = await readdir(GLYPHS_DIR);
  return files
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.slice(0, -'.svg'.length))
    .sort();
}

// glyphs/SHA256SUMS, in the `shasum -a 256` output format, as a map of the
// file it names to its checksum.
export async function checksums() {
  const recorded = new Map();
  const text = await readFile(resolve(GLYPHS_DIR, 'SHA256SUMS'), 'utf8');
  for (const line of text.split('\n').filter(Boolean)) {
    const match = /^([0-9a-f]{64}) [ *](\S+)$/.exec(line);
    if (!match) throw new Error(`glyphs/SHA256SUMS: malformed line "${line}"`);
    recorded.set(match[2], match[1]);
  }
  return recorded;
}

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// The upstream LICENSE is vendored and checksummed with the drawings, because
// it is as much a copy of upstream's bytes as they are: the ISC text and the
// Feather MIT text beneath it are what every copy has to carry.
export const LICENSE_FILE = 'LICENSE';

/**
 * Reads every vendored drawing, verifying it against its checksum and its
 * shape.
 *
 * Returns a map of glyph name to its elements. A missing file, a file with no
 * checksum, a checksum with no file, a file whose bytes have changed and a
 * FILLABLE name whose drawing is open are all errors: the point of vendoring
 * is that the bytes are the upstream bytes, and a drawing nobody can prove came
 * from upstream is worth less than one fetched at build time.
 */
export async function readGlyphs() {
  const names = await glyphNames();
  const recorded = await checksums();
  const seen = new Set();
  const verify = async (file) => {
    seen.add(file);
    const expected = recorded.get(file);
    if (expected === undefined) {
      throw new Error(`glyphs/SHA256SUMS has no checksum for ${file}; see "Adding or replacing a glyph" in glyphs/README.md`);
    }
    let bytes;
    try {
      bytes = await readFile(resolve(GLYPHS_DIR, file));
    } catch {
      throw new Error(`glyphs/${file} is missing; run node scripts/vendor-glyphs.mjs`);
    }
    const actual = sha256(bytes);
    if (actual !== expected) {
      throw new Error(
        `glyphs/${file} has SHA-256 ${actual}, but glyphs/SHA256SUMS records ${expected}; see "Adding or replacing a glyph" in glyphs/README.md`,
      );
    }
    return bytes;
  };
  await verify(LICENSE_FILE);
  const glyphs = new Map();
  for (const name of names) {
    const bytes = await verify(`${name}.svg`);
    glyphs.set(name, parseGlyph(name, bytes.toString('utf8')));
  }
  const stale = [...recorded.keys()].filter((file) => !seen.has(file));
  if (stale.length > 0) {
    throw new Error(`glyphs/SHA256SUMS lists files no glyph uses: ${stale.join(', ')}`);
  }
  const refused = fillableProblems(glyphs);
  if (refused.length > 0) throw new Error(refused.join('; '));
  return glyphs;
}

/**
 * Why each name in a FILLABLE list cannot be drawn filled, or nothing. A
 * function of the list rather than a check of the constant, so the suite can
 * hand it a list that is wrong and watch it refuse.
 */
export function fillableProblems(glyphs, fillable = FILLABLE) {
  const problems = [];
  for (const name of fillable) {
    const elements = glyphs.get(name);
    if (elements === undefined) {
      problems.push(`FILLABLE names ${name}, which glyphs/ does not carry`);
    } else if (!isClosed(elements)) {
      problems.push(`FILLABLE names ${name}, whose drawing has an open stroke; filled, it paints a blob rather than the mark`);
    }
  }
  return problems;
}

// The component name a glyph is exported under. The Glyph suffix is not
// decoration: Timeline, List, Menu, Tag, Link and Code are all uilet
// components, and a glyph that took the bare word would shadow one of them at
// every import site.
export function componentName(name) {
  return `${name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}Glyph`;
}

// The generated table in glyphs/README.md lives between these two lines, and
// scripts/vendor-glyphs.mjs rewrites it with the files, so the list a reader
// sees is the list that shipped.
export const TABLE_START = '<!-- The table below is written by scripts/vendor-glyphs.mjs. Do not edit it by hand. -->';
export const TABLE_END = '<!-- End of the generated table. -->';

export function glyphTable(names) {
  return [
    '| Glyph | Component | Upstream file |',
    '| ----- | --------- | ------------- |',
    ...names.map((name) => `| \`${name}\` | \`${componentName(name)}\` | \`package/icons/${name}.svg\` |`),
  ].join('\n');
}
