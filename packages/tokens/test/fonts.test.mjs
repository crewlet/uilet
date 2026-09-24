/**
 * What the shipped font files are, read out of the files themselves.
 *
 * Three hand-written records describe the woff2 files in fonts/: the family
 * table in fonts/README.md (family, version, axes), the @font-face rules
 * scripts/build.mjs emits (family, weight range, unicode range) and the
 * copyright notices at the top of fonts/OFL.txt. Each was typed from what a
 * font tool printed on the day a file was replaced, and the checksum the build
 * verifies says only that the bytes are the ones recorded, not that the
 * records describe them. A rule naming the wrong family, a clamped weight
 * range or a notice the files do not carry all build, publish and render a
 * fallback font or misstate a license without a single error. So this suite
 * decodes every file and holds all three records to it.
 *
 * Everything it reads ships in the tarball (fonts/ and dist/css/fonts.css),
 * so it describes the files a consumer installs rather than the source they
 * were built from.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { font } from '../dist/index.js';

const fontsPath = (name) => fileURLToPath(new URL(`../fonts/${name}`, import.meta.url));
const fontsCss = readFileSync(fileURLToPath(new URL('../dist/css/fonts.css', import.meta.url)), 'utf8');

/* ------------------------------------------------------------------------ */
/* The WOFF2 reader                                                          */
/* ------------------------------------------------------------------------ */

// The tags a WOFF2 table directory abbreviates to an index (WOFF2 section 5.1).
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH',
  'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];
const WOFF2_HEADER_BYTES = 48;

/**
 * The untransformed tables of a WOFF2 file, by tag.
 *
 * WOFF2 is a fixed header, a table directory, and ONE Brotli stream holding
 * every table back to back in directory order. WOFF2 transforms only glyf,
 * loca and hmtx, so every table read here (name, fvar, GSUB, post, cmap) is a
 * plain slice of the decompressed stream. What the walk has to get right is
 * the tables it skips: a transformed table occupies its transformLength in the
 * stream, not its origLength (a transformed loca occupies nothing at all), and
 * reading origLength would put every later slice in the wrong place.
 */
function decodeWoff2(bytes) {
  if (bytes.length < WOFF2_HEADER_BYTES || bytes.toString('latin1', 0, 4) !== 'wOF2') {
    throw new Error('not a WOFF2 file: it does not start with the wOF2 signature');
  }
  if (bytes.toString('latin1', 4, 8) === 'ttcf') throw new Error('a WOFF2 font collection; this reader reads single fonts');
  const numTables = bytes.readUInt16BE(12);
  const totalCompressedSize = bytes.readUInt32BE(20);

  let offset = WOFF2_HEADER_BYTES;
  // A UIntBase128: seven bits per byte, most significant first, the high bit
  // saying another byte follows. At most five bytes, and never a leading zero.
  const base128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = bytes[offset++];
      if (i === 0 && byte === 0x80) throw new Error('a UIntBase128 with a leading zero byte');
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error('a UIntBase128 longer than five bytes');
  };

  const directory = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = bytes[offset++];
    const index = flags & 0x3f;
    let tag;
    if (index === 63) {
      tag = bytes.toString('latin1', offset, offset + 4);
      offset += 4;
    } else {
      tag = KNOWN_TAGS[index];
    }
    const version = flags >> 6;
    const origLength = base128();
    // glyf and loca are transformed at version 0 and plain at version 3; every
    // other table is plain at version 0 and transformed at any other.
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    const length = transformed ? base128() : origLength;
    directory.push({ tag, transformed, length });
  }

  const stream = brotliDecompressSync(bytes.subarray(offset, offset + totalCompressedSize));
  const tables = new Map();
  let position = 0;
  for (const { tag, transformed, length } of directory) {
    if (!transformed) tables.set(tag, stream.subarray(position, position + length));
    position += length;
  }
  // The stream holds the tables and nothing else, so a walk that ends
  // anywhere but its last byte read a length wrong somewhere on the way.
  if (position !== stream.length) {
    throw new Error(`the table directory accounts for ${position} bytes of a ${stream.length} byte stream`);
  }
  return tables;
}

function table(tables, tag) {
  const bytes = tables.get(tag);
  if (bytes === undefined) throw new Error(`the file has no ${tag} table`);
  return bytes;
}

/** The Windows Unicode English strings of a name table, by name ID. */
function names(tables) {
  const bytes = table(tables, 'name');
  const count = bytes.readUInt16BE(2);
  const storage = bytes.readUInt16BE(4);
  const out = new Map();
  for (let i = 0; i < count; i += 1) {
    const record = 6 + i * 12;
    const [platform, encoding, language, id, length, start] = [0, 2, 4, 6, 8, 10].map((field) => bytes.readUInt16BE(record + field));
    if (platform !== 3 || encoding !== 1 || language !== 0x409) continue;
    // UTF-16 big-endian; swap16 turns it into the little-endian Node decodes.
    out.set(id, Buffer.from(bytes.subarray(storage + start, storage + start + length)).swap16().toString('utf16le'));
  }
  return out;
}

/** The fvar axes, with their range in user units. */
function axes(tables) {
  const bytes = table(tables, 'fvar');
  const first = bytes.readUInt16BE(4);
  const count = bytes.readUInt16BE(8);
  const size = bytes.readUInt16BE(10);
  const fixed = (at) => bytes.readInt32BE(at) / 65536;
  return Array.from({ length: count }, (_, i) => {
    const record = first + i * size;
    return { tag: bytes.toString('latin1', record, record + 4), min: fixed(record + 4), max: fixed(record + 12) };
  });
}

/** The feature tags a GSUB table's feature list names. */
function features(tables) {
  const bytes = table(tables, 'GSUB');
  const list = bytes.readUInt16BE(6);
  const count = bytes.readUInt16BE(list);
  return new Set(Array.from({ length: count }, (_, i) => bytes.toString('latin1', list + 2 + i * 6, list + 6 + i * 6)));
}

/** Whether the post table declares every glyph one advance width. */
const fixedPitch = (tables) => table(tables, 'post').readUInt32BE(12) !== 0;

/**
 * The code points the Windows Unicode BMP cmap maps to a real glyph.
 *
 * Only format 4, because a latin or latin-ext subset lives entirely in the
 * Basic Multilingual Plane and every file here carries exactly that
 * subtable. A file without one fails loudly rather than reading as empty.
 */
function codePoints(tables) {
  const bytes = table(tables, 'cmap');
  const count = bytes.readUInt16BE(2);
  let at = null;
  for (let i = 0; i < count; i += 1) {
    const record = 4 + i * 8;
    if (bytes.readUInt16BE(record) === 3 && bytes.readUInt16BE(record + 2) === 1) at = bytes.readUInt32BE(record + 4);
  }
  if (at === null || bytes.readUInt16BE(at) !== 4) throw new Error('the file has no Windows Unicode BMP (3, 1) format 4 cmap');
  const segments = bytes.readUInt16BE(at + 6) / 2;
  const ends = at + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const rangeOffsets = deltas + segments * 2;
  const mapped = new Set();
  for (let s = 0; s < segments; s += 1) {
    const start = bytes.readUInt16BE(starts + s * 2);
    const end = bytes.readUInt16BE(ends + s * 2);
    const delta = bytes.readInt16BE(deltas + s * 2);
    const rangeOffsetAt = rangeOffsets + s * 2;
    const rangeOffset = bytes.readUInt16BE(rangeOffsetAt);
    for (let c = start; c <= end; c += 1) {
      let glyph = rangeOffset === 0 ? c + delta : bytes.readUInt16BE(rangeOffsetAt + rangeOffset + (c - start) * 2);
      if (rangeOffset !== 0 && glyph !== 0) glyph += delta;
      if ((glyph & 0xffff) !== 0) mapped.add(c);
    }
  }
  return mapped;
}

/* ------------------------------------------------------------------------ */
/* The three records                                                         */
/* ------------------------------------------------------------------------ */

/** The family table at the top of fonts/README.md, one entry per row. */
function readmeRows() {
  const lines = readFileSync(fontsPath('README.md'), 'utf8').split('\n');
  const header = lines.findIndex((line) => line.startsWith('| Family |'));
  assert.notEqual(header, -1, 'fonts/README.md has no family table');
  const rows = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const [family, version, axesCell, files] = line.split('|').slice(1, -1).map((cell) => cell.trim());
    rows.push({ family, version, axes: axesCell, files: [...files.matchAll(/`([^`]+)`/g)].map((m) => m[1]) });
  }
  return rows;
}

/** A unicode-range descriptor as [first, last] intervals. */
function parseRange(value) {
  return value.split(',').map((part) => {
    const match = /^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i.exec(part.trim());
    if (!match) throw new Error(`"${part.trim()}" is not a unicode-range interval this test reads`);
    return [parseInt(match[1], 16), parseInt(match[2] ?? match[1], 16)];
  });
}
const inRange = (intervals, c) => intervals.some(([first, last]) => c >= first && c <= last);

/** The @font-face rules in the built dist/css/fonts.css, by file name. */
function builtRules() {
  const rules = new Map();
  for (const [, body] of fontsCss.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const descriptor = (name) => new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1].trim();
    const file = /url\('[^']*\/([^'/]+)'\)/.exec(descriptor('src'))?.[1];
    assert.ok(file, `an @font-face rule with no local url(): ${body.trim()}`);
    assert.ok(!rules.has(file), `${file} has two @font-face rules`);
    rules.set(file, {
      family: descriptor('font-family').replace(/^'(.*)'$/, '$1'),
      weight: descriptor('font-weight'),
      range: parseRange(descriptor('unicode-range')),
    });
  }
  return rules;
}

/** The copyright notices OFL.txt opens with: every line before the first blank one. */
function oflNotices() {
  const lines = readFileSync(fontsPath('OFL.txt'), 'utf8').split('\n');
  return lines.slice(0, lines.indexOf(''));
}

/** The first family a font.family stack names, unquoted. */
const leadingFamily = (stack) => stack.split(',')[0].trim().replace(/^'(.*)'$/, '$1');

const files = readdirSync(fileURLToPath(new URL('../fonts/', import.meta.url)))
  .filter((name) => name.endsWith('.woff2'))
  .sort();
const decoded = new Map(files.map((file) => [file, decodeWoff2(readFileSync(fontsPath(file)))]));
const rows = readmeRows();
const rules = builtRules();

/* ------------------------------------------------------------------------ */
/* The assertions                                                            */
/* ------------------------------------------------------------------------ */

describe('the README family table', () => {
  test('describes every shipped file exactly once', () => {
    // A file no row names is a file nothing below ever compares.
    const described = rows.flatMap((row) => row.files);
    assert.deepEqual([...described].sort(), files);
    assert.equal(new Set(described).size, described.length, 'a file is named by two rows');
  });

  test("names each file's family (name ID 1) and version (name ID 5)", () => {
    for (const row of rows) {
      for (const file of row.files) {
        const record = names(decoded.get(file));
        assert.equal(record.get(1), row.family, `${file} name ID 1`);
        assert.equal(record.get(5), `Version ${row.version}`, `${file} name ID 5`);
      }
    }
  });

  test("states each file's variation axes and their ranges", () => {
    for (const row of rows) {
      for (const file of row.files) {
        const read = axes(decoded.get(file)).map(({ tag, min, max }) => `\`${tag}\` ${min} to ${max}`).join(', ');
        assert.equal(read, row.axes, `${file} fvar`);
      }
    }
  });
});

describe('the built @font-face rules', () => {
  test('there is one rule per shipped file and no rule without one', () => {
    assert.deepEqual([...rules.keys()].sort(), files);
  });

  test("each rule names its file's family and declares its whole wght range", () => {
    // A rule under another family name is a face nothing asks for, so the
    // text renders in the fallback; a narrower weight range clamps weights
    // the file draws, and a wider one makes the browser synthesise them.
    for (const [file, rule] of rules) {
      const tables = decoded.get(file);
      assert.equal(rule.family, names(tables).get(1), `${file} font-family`);
      const wght = axes(tables).find(({ tag }) => tag === 'wght');
      assert.ok(wght, `${file} has no wght axis`);
      assert.equal(rule.weight, `${wght.min} ${wght.max}`, `${file} font-weight`);
    }
  });

  test("each rule's file draws every character of its family that only its own range covers", () => {
    // A unicode-range is the promise the browser downloads a file on: for a
    // character inside it, this is the face. So a latin rule pointing at the
    // latin-ext file (the swap nothing else here tells apart for a family
    // with no tabular feature to miss) renders basic Latin in the fallback.
    // Where two rules' ranges overlap, either file may answer, so each rule
    // is held to the part only it covers.
    const families = new Map();
    for (const [file, rule] of rules) families.set(rule.family, [...(families.get(rule.family) ?? []), file]);
    for (const [family, members] of families) {
      const drawn = new Map(members.map((file) => [file, codePoints(decoded.get(file))]));
      const familyDraws = new Set(members.flatMap((file) => [...drawn.get(file)]));
      for (const file of members) {
        const others = members.filter((other) => other !== file).map((other) => rules.get(other).range);
        const onlyHere = [...familyDraws].filter((c) => inRange(rules.get(file).range, c) && !others.some((range) => inRange(range, c)));
        assert.ok(onlyHere.length > 0, `${family}: ${file}'s range covers nothing only it could answer, so this checked nothing`);
        const missing = onlyHere.filter((c) => !drawn.get(file).has(c)).map((c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`);
        assert.deepEqual(missing, [], `${file} lacks characters only its rule's unicode-range covers`);
      }
    }
  });
});

describe('tabular figures', () => {
  // The document baseline and every numeric component set
  // font-variant-numeric: tabular-nums. The figures come from whichever rule's
  // range covers U+0030 to U+0039.
  const figureFiles = (family) =>
    [...rules].filter(([, rule]) => rule.family === family && inRange(rule.range, 0x30) && inRange(rule.range, 0x39)).map(([file]) => file);

  test('the sans figures carry tnum, and the pnum and frac the README promises', () => {
    const family = leadingFamily(font.family.sans);
    const figures = figureFiles(family);
    assert.equal(figures.length, 1, `${family} has ${figures.length} files for its figures`);
    const gsub = features(decoded.get(figures[0]));
    for (const tag of ['tnum', 'pnum', 'frac']) assert.ok(gsub.has(tag), `${figures[0]} GSUB lacks ${tag}: ${[...gsub].join(', ')}`);
  });

  test('the mono faces are fixed-pitch, which is what makes their figures tabular', () => {
    // Geist Mono carries no tnum feature; it needs none only because every
    // glyph has one advance width.
    const family = leadingFamily(font.family.mono);
    const members = [...rules].filter(([, rule]) => rule.family === family).map(([file]) => file);
    assert.ok(members.length > 0, `no @font-face rule declares ${family}`);
    for (const file of members) assert.ok(fixedPitch(decoded.get(file)), `${file} is not fixed-pitch`);
    assert.ok(!fixedPitch(decoded.get(figureFiles(leadingFamily(font.family.sans))[0])), 'the sans face reads as fixed-pitch, so this reader is not reading post');
  });
});

describe('the license notice', () => {
  test('OFL.txt opens with the copyright notice (name ID 0) every file carries, each once', () => {
    // The OFL requires the notice to travel with the files. Geist and Geist
    // Mono state theirs differently (the Mono one names the repository with a
    // .git suffix), so each is reproduced as its files state it, in the order
    // of the README table.
    const notices = [];
    for (const row of rows) {
      for (const file of row.files) {
        const notice = names(decoded.get(file)).get(0);
        assert.ok(notice, `${file} has no name ID 0`);
        if (!notices.includes(notice)) notices.push(notice);
      }
    }
    assert.deepEqual(oflNotices(), notices);
  });

  test('no file reserves a font name', () => {
    // fonts/README.md and OFL.txt both say neither family declares a Reserved
    // Font Name, which is what lets a subset keep the family's name.
    for (const [file, tables] of decoded) assert.doesNotMatch(names(tables).get(0), /reserved font name/i, file);
  });
});

describe('the reader these tests rely on', () => {
  test('it refuses what is not a WOFF2 file rather than reading nothing', () => {
    assert.throws(() => decodeWoff2(Buffer.alloc(64)), /wOF2 signature/);
    assert.throws(() => decodeWoff2(readFileSync(fontsPath('OFL.txt'))), /wOF2 signature/);
  });

  test('it reads a format 4 cmap the way a shaper does', () => {
    // The coverage test above only ever asks "is this code point mapped", and
    // a real subset exercises that answer in ways no single file pins down, so
    // the arithmetic is held to a table built here. A segment's delta can send
    // a code point to glyph 0, a glyph array can hold 0 for a gap, and the
    // array's own values take the delta too.
    const cmap = format4Cmap([
      { start: 0x40, end: 0x42, delta: -0x40 },
      { start: 0x100, end: 0x103, delta: 1, glyphs: [5, 0, 7, 0xffff] },
      // The closing segment every format 4 table ends with maps U+FFFF to 0.
      { start: 0xffff, end: 0xffff, delta: 1 },
    ]);
    assert.deepEqual([...codePoints(cmap)].sort((a, b) => a - b), [0x41, 0x42, 0x100, 0x102]);
  });

  test('it found files to read', () => {
    assert.ok(files.length >= 2, `fonts/ holds ${files.length} woff2 files`);
    assert.ok(rows.length >= 2, `the README family table has ${rows.length} rows`);
  });
});

/** A cmap table holding one (3, 1) format 4 subtable over these segments. */
function format4Cmap(segments) {
  const count = segments.length;
  const glyphIds = segments.flatMap(({ glyphs }) => glyphs ?? []);
  const subtable = Buffer.alloc(16 + count * 8 + glyphIds.length * 2);
  const ends = 14;
  const starts = ends + count * 2 + 2;
  const deltas = starts + count * 2;
  const offsets = deltas + count * 2;
  const array = offsets + count * 2;
  subtable.writeUInt16BE(4, 0);
  subtable.writeUInt16BE(subtable.length, 2);
  subtable.writeUInt16BE(count * 2, 6);
  let used = 0;
  segments.forEach(({ start, end, delta, glyphs }, i) => {
    subtable.writeUInt16BE(end, ends + i * 2);
    subtable.writeUInt16BE(start, starts + i * 2);
    subtable.writeInt16BE(delta, deltas + i * 2);
    if (glyphs === undefined) return;
    // idRangeOffset is measured from its own slot to the segment's first
    // entry in the glyph array.
    subtable.writeUInt16BE(array + used * 2 - (offsets + i * 2), offsets + i * 2);
    glyphs.forEach((glyph, j) => subtable.writeUInt16BE(glyph, array + (used + j) * 2));
    used += glyphs.length;
  });
  const header = Buffer.alloc(12);
  header.writeUInt16BE(1, 2); // one encoding record
  header.writeUInt16BE(3, 4); // Windows
  header.writeUInt16BE(1, 6); // Unicode BMP
  header.writeUInt32BE(header.length, 8);
  return new Map([['cmap', Buffer.concat([header, subtable])]]);
}
