// What both CSS checks read, so the two cannot come to disagree about which
// files they cover or where a finding is.
//
// Comments are BLANKED rather than removed, so a line number in a finding is
// the line a person will open, and so prose about a rule is never mistaken for
// the rule being broken: `check-css-variables` had already caught a stylesheet
// whose own header explained why a style element is forbidden.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export function sourceFiles(directory, extensions = /\.(css|tsx?)$/) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path, extensions));
    else if (extensions.test(entry.name)) found.push(path);
  }
  return found;
}

export function withoutComments(text, isStylesheet) {
  const pattern = isStylesheet ? /\/\*[\s\S]*?\*\//g : /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  return text.replace(pattern, (comment) => comment.replace(/[^\n]/g, ' '));
}

export function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** Every file under the given roots, with its comments blanked. */
export function readSources(roots, base, extensions) {
  const files = [];
  for (const root of roots) {
    if (!statSync(root).isDirectory()) throw new Error(`${root} is not a directory`);
    for (const path of sourceFiles(root, extensions)) {
      const raw = readFileSync(path, 'utf8');
      files.push({
        path,
        where: relative(base, path),
        isStylesheet: path.endsWith('.css'),
        text: withoutComments(raw, path.endsWith('.css')),
      });
    }
  }
  return files;
}

/** Every rule body in a stylesheet, with its selector and its start offset. */
export function rules(text) {
  const found = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of text.matchAll(pattern)) {
    found.push({ selector: match[1].trim(), body: match[2], index: match.index });
  }
  return found;
}

export function report(name, problems, checked) {
  if (problems.length > 0) {
    console.error(`${name} failed:\n${problems.map((problem) => `  ${problem}`).join('\n')}`);
    process.exitCode = 1;
    return false;
  }
  console.warn(`[ui] ${name}: ${checked}`);
  return true;
}
