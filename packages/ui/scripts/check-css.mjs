#!/usr/bin/env node
// `crewlet-css-check`: both CSS checks, over the folders you give it.
//
// The bin a consumer runs over its own stylesheets, so an application holds
// itself to the same rules the design system holds itself to:
//
//     npx crewlet-css-check src/styles src/features
//
// With no folder it checks the package's own src/. The two checks are separate
// files because they answer different questions (see each one's header), and
// this runs them together because a caller almost never wants one of them.

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findings as literalFindings } from './check-css-literals.mjs';
import { findings as variableFindings } from './check-css-variables.mjs';
import { report } from './css-source.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roots = process.argv.slice(2).map((path) => resolve(process.cwd(), path));
const scanned = roots.length > 0 ? roots : [join(packageRoot, 'src')];
const base = roots.length > 0 ? process.cwd() : packageRoot;

const variables = await variableFindings(scanned, base);
report('CSS custom property check', variables.problems, variables.checked);
const literals = await literalFindings(scanned, base);
report('CSS literal check', literals.problems, literals.checked);
