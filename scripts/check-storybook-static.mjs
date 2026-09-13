// Checks a built Storybook, and fails on anything that breaks the two
// promises its deployment makes.
//
//   node scripts/check-storybook-static.mjs <directory>
//
// 1. The site is static. Cloudflare Pages treats a _worker.js file or
//    directory in the upload as server code for the whole hostname, applies a
//    _routes.json to it, and honours _headers and _redirects. The Storybook
//    build produces none of them, so one appearing means a build dependency or
//    a configuration change put it there, and deploying it would run code or
//    rewrite responses the repository never reviewed as such. (Pages Functions
//    are read from a functions directory in the working directory of the
//    deploy command, never from the upload, and the deploy job has no
//    checkout that could hold one.)
// 2. The font license travels with the fonts. The SIL Open Font License
//    requires its text beside every redistributed copy of the font files, so
//    every directory holding a woff2 file must also hold an OFL.txt with the
//    license text (written by apps/storybook/scripts/write-font-licenses.mjs).
//
// It depends on nothing but Node, so the deploy job runs it on the downloaded
// artifact without installing the workspace, and the Storybook build runs it
// on its own output.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORBIDDEN_AT_ROOT = ['_worker.js', '_routes.json', '_headers', '_redirects'];
const LICENSE_MARKER = 'SIL OPEN FONT LICENSE Version 1.1';

export function checkStorybookStatic(root) {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    return [`${root} is not a directory`];
  }
  const problems = [];
  for (const name of FORBIDDEN_AT_ROOT) {
    if (statSync(join(root, name), { throwIfNoEntry: false })) {
      problems.push(`${name} is present; the Storybook deployment is static and must not carry Pages server code or response rules`);
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
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
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
      console.warn(`[storybook] ${root} is static and carries the font license beside its fonts`);
    }
  }
}
