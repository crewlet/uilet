// Checks a built Storybook, and fails on anything that breaks the promises
// the built site makes.
//
//   node scripts/check-storybook-static.mjs <directory>
//
// 1. The site is static. A static host reads _worker.js (as server code for
//    the whole hostname), _routes.json, _headers and _redirects out of the
//    files it is given and changes what it serves accordingly. The Storybook
//    build produces none of them, so one appearing means a build dependency or
//    a configuration change put it there, and serving it would run code or
//    rewrite responses the repository never reviewed as such.
// 2. The third-party licenses travel with what they cover. The SIL Open Font
//    License requires its text beside every redistributed copy of the font
//    files, so every directory holding a woff2 file must also hold an OFL.txt
//    with the license text. The Lucide drawings the preview bundles into its
//    JavaScript are ISC, and those derived from Feather MIT as well, and both
//    licenses require their notice to reach every recipient, where nothing
//    about the built site would otherwise say the drawings are in it. Both
//    are written by apps/storybook/scripts/write-font-licenses.mjs.
// 3. Nothing is fetched from a host. The built site is what gets deployed, and
//    every asset it needs ships with it, so a stylesheet or a document that
//    loads a font, a script, an image or a stylesheet from somewhere else is a
//    site an air-gapped deployment cannot render and a strict
//    Content-Security-Policy refuses. check-css-variables.mjs holds that rule
//    over the component SOURCE; this holds it over the BUILD, which is where a
//    stylesheet nobody in this repository wrote can still put one: the tokens
//    package ships an opt-in Material Symbols loader whose whole body is an
//    @import of a Google Fonts URL, and one preview import away it would be
//    inlined into the site's CSS with nothing to say so. A plain <a href> is
//    left alone: a link a reader may click is not a request the page makes.
// 4. Both pages name an icon the build carries. The manager's index.html and
//    the preview's iframe.html are each opened on their own (a story linked
//    by itself, a screenshot, a test), and a page that names no icon makes
//    the browser ask for /favicon.ico, which no build has: a 404 on every
//    story, in the very console a reader checks for real errors. So each page
//    links one, and the file it links is in the build.
//
// It depends on nothing but Node, so the Storybook build runs it on its own
// output, and anything that publishes that output can run it on the files it
// is about to upload without installing the workspace.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORBIDDEN_AT_ROOT = ['_worker.js', '_routes.json', '_headers', '_redirects'];
// The two pages a reader opens: the manager, and the preview each story is.
const PAGES = ['index.html', 'iframe.html'];
const ICON_LINK = /<link\b[^>]*\brel\s*=\s*['"](?:shortcut )?icon['"][^>]*>/i;
const LICENSE_MARKER = 'SIL OPEN FONT LICENSE Version 1.1';
const GLYPHS_LICENSE = 'third-party/lucide/LICENSE';
// Both halves of upstream's LICENSE: a file carrying the ISC text alone would
// leave the Feather icons without the MIT notice their license asks for.
const GLYPHS_LICENSE_MARKERS = { 'ISC License': 'the ISC License text', 'Cole Bemis': 'the Feather MIT notice' };

/*
 * A resource the page LOADS from a host: a CSS url() or @import, or an HTML
 * src, a <link href> or an srcset. Written as one pattern per way of asking
 * rather than one for "https", because the string appears legitimately in the
 * text of a page (a link, an xmlns, a comment) and a match on the scheme alone
 * would refuse those and teach the next reader to switch the check off.
 */
const LOADS_FROM_A_HOST = [
  [/url\(\s*['"]?(?:[a-z][a-z0-9+.-]*:)?\/\//gi, 'a url() reaching a host'],
  [/@import\s+(?:url\()?\s*['"]?(?:[a-z][a-z0-9+.-]*:)?\/\//gi, 'an @import of a remote stylesheet'],
  [/\ssrc\s*=\s*['"](?:[a-z][a-z0-9+.-]*:)?\/\//gi, 'a src attribute reaching a host'],
  [/\ssrcset\s*=\s*['"][^'"]*(?:[a-z][a-z0-9+.-]*:)?\/\//gi, 'a srcset reaching a host'],
  [/<link\b[^>]*\shref\s*=\s*['"](?:[a-z][a-z0-9+.-]*:)?\/\//gi, 'a <link> reaching a host'],
];

/** Every built file whose contents a browser acts on rather than displays. */
function loadedFiles(root) {
  const found = [];
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!/\.(css|html)$/.test(entry.name)) continue;
    found.push(join(entry.parentPath, entry.name));
  }
  return found;
}

export function checkStorybookStatic(root) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    return [`${root} is not a directory`];
  }
  const problems = [];
  for (const name of FORBIDDEN_AT_ROOT) {
    if (statSync(join(root, name), { throwIfNoEntry: false })) {
      problems.push(`${name} is present; the built Storybook is static and must not carry server code or response rules`);
    }
  }

  const fontDirectories = new Set();
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.woff2')) fontDirectories.add(entry.parentPath);
  }
  if (fontDirectories.size === 0) {
    problems.push('no font files found; the preview imports @crewlethq/tokens/css/fonts, so an empty result means the wrong directory was checked');
  }
  for (const directory of fontDirectories) {
    const where = relative(root, directory) || '.';
    const license = join(directory, 'OFL.txt');
    if (!statSync(license, { throwIfNoEntry: false })?.isFile()) {
      problems.push(`${where} holds font files but no OFL.txt, which the SIL Open Font License requires beside them`);
    } else if (!readFileSync(license, 'utf8').includes(LICENSE_MARKER)) {
      problems.push(`${where}/OFL.txt does not contain the SIL Open Font License text`);
    }
  }
  const glyphsLicense = join(root, GLYPHS_LICENSE);
  if (!statSync(glyphsLicense, { throwIfNoEntry: false })?.isFile()) {
    problems.push(`${GLYPHS_LICENSE} is missing; the preview bundles the Lucide drawings, whose license travels with them`);
  } else {
    const text = readFileSync(glyphsLicense, 'utf8');
    for (const [marker, what] of Object.entries(GLYPHS_LICENSE_MARKERS)) {
      if (!text.includes(marker)) problems.push(`${GLYPHS_LICENSE} does not contain ${what}`);
    }
  }
  for (const page of PAGES) {
    const path = join(root, page);
    if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
      problems.push(`${page} is missing; a Storybook build serves the manager and the preview from the root`);
      continue;
    }
    const link = ICON_LINK.exec(readFileSync(path, 'utf8'));
    const href = link && /\bhref\s*=\s*['"]([^'"]+)['"]/i.exec(link[0])?.[1];
    if (!href) {
      problems.push(`${page} names no icon, so a browser asks for /favicon.ico, which the build does not have`);
    } else if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href) && !statSync(join(root, href.replace(/[?#].*$/, '')), { throwIfNoEntry: false })?.isFile()) {
      problems.push(`${page} names the icon ${href}, which is not in the build`);
    }
  }
  for (const path of loadedFiles(root)) {
    const text = readFileSync(path, 'utf8');
    const found = [];
    for (const [pattern, said] of LOADS_FROM_A_HOST) {
      for (const match of text.matchAll(pattern)) found.push({ at: match.index, text: match[0].trim(), said });
    }
    // ONE PROBLEM PER RESOURCE. `@import url(https://...)` matches both the
    // @import pattern and the url() one, and reporting a single remote font
    // twice teaches a reader that the count means nothing. The patterns are
    // sorted by where they start, and a match that begins inside the span of
    // the one before it is the same resource seen a second way.
    found.sort((a, b) => a.at - b.at || b.text.length - a.text.length);
    let end = -1;
    for (const one of found) {
      if (one.at < end) continue;
      end = one.at + one.text.length;
      problems.push(`${relative(root, path)} carries ${one.said} (${one.text}); every asset this site needs ships with it`);
    }
  }

  return problems;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, ...extra] = process.argv.slice(2);
  if (!root || extra.length > 0) {
    console.error('usage: node scripts/check-storybook-static.mjs <directory>');
    process.exitCode = 1;
  } else {
    const problems = checkStorybookStatic(root);
    if (problems.length > 0) {
      console.error(`Storybook build check failed for ${root}:\n${problems.map((problem) => `  ${problem}`).join('\n')}`);
      process.exitCode = 1;
    } else {
      console.warn(`[storybook] ${root} is static and carries every third-party license it redistributes`);
    }
  }
}
