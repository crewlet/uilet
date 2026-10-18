// Builds the artifact kit into dist/:
//
//   dist/kit.css      the tokens, every theme, the density steps, the fonts
//                     and the base stylesheet, in one file
//   dist/fonts/       the Geist faces kit.css references, with the OFL.txt
//                     their license requires beside them
//   dist/theme.js     the blocking theme bootstrap, an IIFE
//
// The engine serves this directory, unchanged, at /_crewlet/kit/<version>/ on
// the artifact origin, so every path inside it is relative and every name is
// stable: a page links kit.css and theme.js by those names.
//
// It builds from @crewlethq/tokens and @crewlethq/ui as a consumer installs
// them (their dist), so the kit carries exactly what the published packages
// carry and nothing is copied out of their sources.

import { readFileSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { BUDGETS } from './budgets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: { kit: 'src/kit.css' },
  bundle: true,
  outdir: dist,
  minify: true,
  // A font is copied beside the stylesheet under its own name, and kit.css
  // points at it relatively: the directory is served as it is.
  loader: { '.woff2': 'file' },
  assetNames: 'fonts/[name]',
  // The font license note in the tokens' fonts stylesheet travels in
  // dist/fonts/OFL.txt, which is the file the license names.
  legalComments: 'none',
  logLevel: 'warning',
});

await build({
  absWorkingDir: root,
  entryPoints: ['src/theme.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  outfile: join(dist, 'theme.js'),
  legalComments: 'none',
  logLevel: 'warning',
  // @crewlethq/ui's per-folder entries re-import their shared chunks bare,
  // to keep evaluation order, and declare their JavaScript free of side
  // effects. Dropping such an import is exactly right here (the symbols the
  // bootstrap uses arrive through named imports), so the notice is silenced
  // rather than printed on every build.
  logOverride: { 'ignored-bare-import': 'silent' },
});

await copyFile(fileURLToPath(import.meta.resolve('@crewlethq/tokens/fonts/OFL.txt')), join(dist, 'fonts', 'OFL.txt'));

const gzipped = (file) => gzipSync(readFileSync(join(dist, file))).length;
const sizes = { themeGzip: gzipped('theme.js'), cssGzip: gzipped('kit.css') };
const over = Object.entries(BUDGETS).filter(([name, budget]) => sizes[name] > budget);
if (over.length > 0) {
  throw new Error(over.map(([name, budget]) => `${name} is ${sizes[name]} bytes, over its budget of ${budget}`).join('; '));
}

const fonts = await readdir(join(dist, 'fonts'));
const total = (await Promise.all(fonts.map(async (file) => (await stat(join(dist, 'fonts', file))).size))).reduce((sum, size) => sum + size, 0);
console.warn(
  `[artifact-kit] kit.css ${sizes.cssGzip} B gzip, theme.js ${sizes.themeGzip} B gzip, ${fonts.length} font file(s) ${total} B`,
);
