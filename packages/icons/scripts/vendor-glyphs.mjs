// Extracts the Lucide drawings this package redistributes from the pinned
// lucide-static tarball.
//
//   node scripts/vendor-glyphs.mjs              re-extract every glyph here
//   node scripts/vendor-glyphs.mjs x chevron-down   add or replace these
//
// The replacement procedure in glyphs/README.md is this command rather than
// prose, so that adding a glyph is one step that cannot be done half right:
// the file, its checksum, the license beside it and the README's table of the
// set all come from one run.
//
// THE SOURCE IS THE REGISTRY TARBALL, verified against the integrity pinned in
// scripts/glyphs.mjs before a byte of it is read. That is the artifact
// `lucide-static@<version>` IS, signed by the registry, where a CDN path or a
// repository checkout is somebody's copy of it. Node has gunzip but no tar, and
// a tar reader for a regular npm tarball is a header walk, so nothing is
// installed to do this.
//
// Only CANONICAL names are taken. The tarball also carries every deprecated
// alias (`trash-2` beside `trash`, `building-2` beside `building-complex`) as a
// second file with the same drawing, and vendoring one would ship a name
// upstream has already retired. `icon-nodes.json` lists the canonical set.
//
// Nothing is written until every file has arrived and parsed, so an
// interrupted or refused run leaves the vendored tree as it was.

import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  GLYPHS_DIR,
  INTEGRITY,
  LICENSE_FILE,
  TABLE_END,
  TABLE_START,
  TARBALL,
  VERSION,
  glyphNames,
  glyphTable,
  parseGlyph,
  sha256,
} from './glyphs.mjs';

// The regular files of an uncompressed tar archive, by path. npm writes ustar
// with a PAX header where a path outgrows the 100 byte name field, so both are
// read; nothing else in an npm tarball needs to be.
function untar(archive) {
  const files = new Map();
  let offset = 0;
  let paxPath = null;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const field = (start, length) => {
      const raw = header.subarray(start, start + length);
      const end = raw.indexOf(0);
      return raw.subarray(0, end === -1 ? length : end).toString('utf8');
    };
    const size = Number.parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1) || '0';
    const prefix = field(345, 155);
    const body = archive.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      for (const record of body.toString('utf8').split('\n').filter(Boolean)) {
        const match = /^\d+ path=(.*)$/.exec(record);
        if (match) paxPath = match[1];
      }
      continue;
    }
    const path = paxPath ?? (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100));
    paxPath = null;
    if (type === '0') files.set(path, body);
  }
  return files;
}

async function download() {
  const response = await fetch(TARBALL);
  if (!response.ok) throw new Error(`${TARBALL} answered ${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (integrity !== INTEGRITY) {
    throw new Error(
      `${TARBALL} has integrity ${integrity}, but scripts/glyphs.mjs pins ${INTEGRITY}. ` +
        `Compare with \`npm view lucide-static@${VERSION} dist.integrity\` before trusting either`,
    );
  }
  return untar(gunzipSync(bytes));
}

const upstream = await download();
const nodes = JSON.parse(upstream.get('package/icon-nodes.json').toString('utf8'));
const drawingOf = (name) => upstream.get(`package/icons/${name}.svg`)?.toString('utf8').replace(/class="[^"]*"/, '');

const requested = process.argv.slice(2);
const names = requested.length > 0 ? [...new Set(requested)].sort() : await glyphNames();
if (names.length === 0) {
  console.error('nothing to extract: name a glyph, or run this where some are already vendored');
  process.exit(1);
}

const extracted = [];
for (const name of names) {
  if (!Object.hasOwn(nodes, name)) {
    const drawing = drawingOf(name);
    const canonical = drawing === undefined ? undefined : Object.keys(nodes).find((candidate) => drawingOf(candidate) === drawing);
    console.error(
      canonical === undefined
        ? `${name} is not a lucide-static ${VERSION} icon. Check the name against https://lucide.dev/icons`
        : `${name} is a deprecated alias of ${canonical} in lucide-static ${VERSION}; vendor ${canonical}`,
    );
    process.exit(1);
  }
  const bytes = upstream.get(`package/icons/${name}.svg`);
  // Parsed before anything is written, so a drawing the build could not
  // compile is refused here rather than at the next build.
  parseGlyph(name, bytes.toString('utf8'));
  extracted.push({ file: `${name}.svg`, bytes });
}
extracted.push({ file: LICENSE_FILE, bytes: upstream.get('package/LICENSE') });

// The README is read, and its markers found, before anything is written: a
// run that is going to refuse has to refuse with the tree untouched.
const readmePath = resolve(GLYPHS_DIR, 'README.md');
const readme = await readFile(readmePath, 'utf8');
const start = readme.indexOf(TABLE_START);
const end = readme.indexOf(TABLE_END);
if (start === -1 || end === -1 || end < start) {
  throw new Error('glyphs/README.md has lost the markers around its generated table; restore them from git');
}

for (const { file, bytes } of extracted) {
  await writeFile(resolve(GLYPHS_DIR, file), bytes);
}

// Rewritten from the directory rather than patched, so a glyph that was
// deleted leaves no checksum and no table row behind.
const present = await glyphNames();
const lines = [];
for (const file of [LICENSE_FILE, ...present.map((name) => `${name}.svg`)].sort()) {
  lines.push(`${sha256(await readFile(resolve(GLYPHS_DIR, file)))}  ${file}`);
}
await writeFile(resolve(GLYPHS_DIR, 'SHA256SUMS'), `${lines.join('\n')}\n`);
await writeFile(
  readmePath,
  `${readme.slice(0, start + TABLE_START.length)}\n\n${glyphTable(present)}\n\n${readme.slice(end)}`,
);

console.warn(`[icons] vendored ${names.length} glyph(s) from lucide-static ${VERSION}; glyphs/ holds ${present.length}`);
