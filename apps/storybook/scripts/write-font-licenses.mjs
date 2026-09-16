// Writes the third-party licenses a built Storybook redistributes.
//
//   node scripts/write-font-licenses.mjs <storybook-static directory>
//
// The build redistributes two sets of fonts, both under the SIL Open Font
// License: the Inter and JetBrains Mono files the preview imports from
// @crewlethq/tokens/css/fonts, and the Nunito Sans files Storybook ships for
// its own interface. The OFL requires its text to accompany every copy, and
// this build is deployed, so each directory that ends up holding a woff2 file
// gets an OFL.txt carrying the copyright notice of every family in it and the
// license text. scripts/check-storybook-static.mjs at the repository root
// verifies the result, at the end of the build and again before a deployment.
//
// A font file this script has no notice for fails the build instead of
// shipping without one; add its family to FAMILIES.

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';

const require = createRequire(import.meta.url);
const tokensLicense = readFileSync(require.resolve('@crewlethq/tokens/fonts/OFL.txt'), 'utf8');

// The tokens OFL.txt is the notice for the families that package ships
// followed by the license text, divided by the first rule line.
const RULE = '-----------------------------------------------------------';
const ruleIndex = tokensLicense.indexOf(RULE);
if (ruleIndex === -1) {
  throw new Error('@crewlethq/tokens/fonts/OFL.txt no longer has the rule line that separates its notice from the license text');
}
const tokensNotice = tokensLicense.slice(0, ruleIndex).trim();
const licenseText = tokensLicense.slice(ruleIndex);

const FAMILIES = [
  { prefixes: ['inter-', 'jetbrains-mono-'], notice: tokensNotice },
  {
    prefixes: ['nunito-sans-'],
    notice: [
      'The Nunito Sans faces are the Storybook interface font, redistributed',
      'unmodified from Storybook under the SIL Open Font License, Version 1.1.',
      '',
      '  Nunito Sans',
      '    Copyright 2016 The Nunito Sans Project Authors',
      '    https://github.com/Fonthausen/NunitoSans',
    ].join('\n'),
  },
];

// Where the drawings' own notices land in the built site. The same path
// scripts/check-storybook-static.mjs looks for.
const SYMBOLS_NOTICE_DIRECTORY = 'third-party/material-symbols';

const [root, ...extra] = process.argv.slice(2);
if (!root || extra.length > 0) {
  console.error('usage: node scripts/write-font-licenses.mjs <storybook-static directory>');
  process.exit(1);
}

// Font file names grouped by the directory that holds them.
const fontsByDirectory = new Map();
for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.woff2')) continue;
  const names = fontsByDirectory.get(entry.parentPath) ?? [];
  names.push(entry.name);
  fontsByDirectory.set(entry.parentPath, names);
}

for (const [directory, fonts] of fontsByDirectory) {
  const families = new Set();
  for (const font of fonts) {
    const family = FAMILIES.find(({ prefixes }) => prefixes.some((prefix) => font.startsWith(prefix)));
    if (!family) {
      console.error(
        `${join(relative(root, directory), font)}: no license notice is known for this font. Add its family and copyright notice to FAMILIES in apps/storybook/scripts/write-font-licenses.mjs`,
      );
      process.exit(1);
    }
    families.add(family);
  }
  const notices = [...families].map(({ notice }) => notice).join('\n\n');
  writeFileSync(join(directory, 'OFL.txt'), `${notices}\n\n${licenseText}`);
}
const written = fontsByDirectory.size;
console.warn(`[storybook] wrote OFL.txt into ${written} font director${written === 1 ? 'y' : 'ies'}`);

// The Material Symbols drawings, which the preview bundles into its JavaScript
// rather than into a file of their own, so nothing about the built site says
// they are there. The Apache License 2.0 still requires its text to reach
// every recipient, and this deployment has thousands of them.
const symbolsDirectory = join(root, SYMBOLS_NOTICE_DIRECTORY);
mkdirSync(symbolsDirectory, { recursive: true });
for (const notice of ['LICENSE', 'NOTICE']) {
  copyFileSync(require.resolve(`@crewlethq/icons/symbols/${notice}`), join(symbolsDirectory, notice));
}
console.warn(`[storybook] wrote the Material Symbols license into ${SYMBOLS_NOTICE_DIRECTORY}/`);
