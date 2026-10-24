// Builds the artifact kit into dist/:
//
//   dist/kit.css      the tokens, every theme, the density steps, the fonts
//                     and the base stylesheet, the brand layer that restyles
//                     them from a company's `--brand-*` inputs, then the
//                     stylesheet of every component the sheet draws, in one
//                     file
//   dist/content.css  the opt-in content stylesheet: the design system's look
//                     for the plain HTML a page writes itself, linked after
//                     kit.css by a page that wants it
//   dist/fonts/       the Geist faces kit.css references, with the OFL.txt
//                     their license requires beside them
//   dist/theme.js     the blocking theme bootstrap, an IIFE
//   dist/kit.js       the sheet as custom elements, an ES module carrying
//                     the design system's own SheetGrid and its React
//   dist/THIRD_PARTY_NOTICES.txt
//                     the notices of the third-party code kit.js carries
//
// The engine serves this directory, unchanged, at /_crewlet/kit/<version>/ on
// the artifact origin, so every path inside it is relative and every name is
// stable: a page links kit.css, content.css and theme.js by those names.
//
// It builds from @crewlethq/tokens and @crewlethq/ui as a consumer installs
// them (their dist), so the kit carries exactly what the published packages
// carry and nothing is copied out of their sources.

import { readFileSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { BUDGETS } from './budgets.mjs';
import { brandSlots, moveThemeValues } from './brand.mjs';

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

// The brand layer, appended to the tokens. Every declaration of a token it
// restyles is first moved aside to `--crewlet-theme-<name>` in the token
// stylesheets (scripts/brand.mjs), so the layer is the one place a public
// token is declared and its fallback is the theme's own value.
const brandSource = await readFile(join(root, 'src', 'brand.css'), 'utf8');
const brand = await build({
  absWorkingDir: root,
  entryPoints: { brand: 'src/brand.css' },
  bundle: true,
  outdir: dist,
  minify: true,
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});
const tokensCss = await readFile(join(dist, 'kit.css'), 'utf8');
await writeFile(join(dist, 'kit.css'), `${moveThemeValues(tokensCss, brandSlots(brandSource))}\n${brand.outputFiles[0].text}`);

// The content stylesheet, a file of its own so a page opts in by linking it
// and a page published before it existed paints as it did. Its source nests
// every rule under the one filter that keeps it off what the kit draws; the
// target is the oldest browsers that read its `:has()`, which predate CSS
// nesting, so the build flattens the nesting into selectors any of them read.
await build({
  absWorkingDir: root,
  entryPoints: { content: 'src/content.css' },
  bundle: true,
  outdir: dist,
  minify: true,
  target: ['chrome105', 'edge105', 'firefox121', 'safari15.4'],
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

// The sheet. Built from @crewlethq/ui's published entries, React and all, so a
// page needs no framework of its own and draws the dashboard's own component.
// Written to memory first: the stylesheets its components import come out as
// a second file, which is appended to kit.css so a page links one stylesheet.
const sheet = await build({
  absWorkingDir: root,
  entryPoints: { kit: 'src/kit.ts' },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  minify: true,
  outdir: dist,
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  // The notices of everything bundled travel in THIRD_PARTY_NOTICES.txt,
  // written below from the packages' own license files.
  legalComments: 'none',
  logLevel: 'warning',
  logOverride: { 'ignored-bare-import': 'silent' },
});
const emitted = (extension) => {
  const file = sheet.outputFiles.find((output) => output.path.endsWith(extension));
  if (!file) throw new Error(`the kit build emitted no ${extension} file`);
  return file.text;
};
await writeFile(join(dist, 'kit.js'), emitted('kit.js'));
await writeFile(join(dist, 'kit.css'), `${await readFile(join(dist, 'kit.css'), 'utf8')}\n${emitted('kit.css')}`);

// What kit.js carries that is not this repository's, with each license as
// its package ships it: React, React DOM and the scheduler under MIT, and the
// Lucide drawings the sheet's glyphs are under ISC (and MIT for those Lucide
// derives from Feather).
const NOTICED = [
  ['react', 'react/package.json'],
  ['react-dom', 'react-dom/package.json'],
  ['scheduler', 'scheduler/package.json'],
];
const notices = [
  'Third-party software carried by kit.js, with the license each is distributed under.',
  ...NOTICED.map(([name, manifest]) => {
    const directory = dirname(fileURLToPath(import.meta.resolve(manifest)));
    const { version } = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    return `${name} ${version}\n\n${readFileSync(join(directory, 'LICENSE'), 'utf8').trim()}`;
  }),
  `Lucide icons (the glyphs of @crewlethq/icons)\n\n${readFileSync(fileURLToPath(import.meta.resolve('@crewlethq/icons/glyphs/LICENSE')), 'utf8').trim()}`,
];
await writeFile(join(dist, 'THIRD_PARTY_NOTICES.txt'), `${notices.join(`\n\n${'-'.repeat(72)}\n\n`)}\n`);

const gzipped = (file) => gzipSync(readFileSync(join(dist, file))).length;
const sizes = {
  themeGzip: gzipped('theme.js'),
  cssGzip: gzipped('kit.css'),
  contentGzip: gzipped('content.css'),
  kitGzip: gzipped('kit.js'),
};
const over = Object.entries(BUDGETS).filter(([name, budget]) => sizes[name] > budget);
if (over.length > 0) {
  throw new Error(over.map(([name, budget]) => `${name} is ${sizes[name]} bytes, over its budget of ${budget}`).join('; '));
}

const fonts = (await readdir(join(dist, 'fonts'))).filter((file) => file.endsWith('.woff2'));
const total = (await Promise.all(fonts.map(async (file) => (await stat(join(dist, 'fonts', file))).size))).reduce((sum, size) => sum + size, 0);
console.warn(
  `[artifact-kit] kit.css ${sizes.cssGzip} B gzip, content.css ${sizes.contentGzip} B gzip, theme.js ${sizes.themeGzip} B gzip, kit.js ${sizes.kitGzip} B gzip, ${fonts.length} font file(s) ${total} B`,
);
