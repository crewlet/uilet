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

/**
 * Every block in a stylesheet, in source order, whatever it is nested in.
 *
 * Each is `{ selector, body, index, context, nestedDeclarations }`: the text
 * before its brace (a selector list, or an at-rule's prelude such as
 * `@media (width < 1024px)`), the declarations it makes ITSELF before the
 * first block nested in it, where that text starts, and the heads of the
 * blocks it sits inside, outermost first. A keyframe's `from` or `50%` is a
 * block too, with its `@keyframes` in its context.
 *
 * NESTING-AWARE, because the regex this replaced, `([^{}]+)\{([^{}]*)\}`, saw
 * only the innermost blocks. It never saw an at-rule's prelude, so the literal
 * check's breakpoint rule read not one top-level `@media` query in the package;
 * it could not say which query a rule sat inside, which is the whole of
 * pairing a motion with the reduced-motion rule that stops it; and it never
 * saw the declarations of a rule with a rule nested in it. Its offsets also
 * started after the previous block's brace, so a finding named the line that
 * block closed on rather than the line of the selector.
 *
 * DECLARATIONS AFTER A NESTED BLOCK ARE AN ENTRY OF THEIR OWN, at their own
 * offset, with the block's selector and context and `nestedDeclarations: true`,
 * because that is where a browser puts them: in a nested-declarations rule
 * that matches what its parent matches, at the parent's specificity, AFTER the
 * nested block in source order. Folded into the parent at the parent's offset,
 * an `animation` written below a nested reduced-motion stop read as written
 * above it, and the pairing check passed a motion that beats its own stop. The
 * flag lets a check that reads the HEAD rather than the declarations, such as
 * the breakpoint rule, read each head once.
 */
export function rules(text) {
  const found = [];
  const open = [];
  // Where the statement being read began: a declaration, or the head of the
  // next block, which is everything since the last `;`, `{` or `}`.
  let statement = 0;
  let quote = null;
  /**
   * A block's own declarations from where they resume to `end`: its body while
   * nothing is nested in it yet, and an entry of their own once something is,
   * since a browser places them after that nested block.
   */
  const declarationsUntil = (frame, end) => {
    const declared = text.slice(frame.from, end);
    if (!frame.nested) {
      frame.body += declared;
    } else if (declared.trim() !== '') {
      found.push({
        selector: frame.selector,
        body: declared,
        index: frame.from + declared.length - declared.trimStart().length,
        context: frame.context,
        nestedDeclarations: true,
      });
    }
  };
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (quote !== null) {
      if (char === '\\') at += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ';') {
      statement = at + 1;
    } else if (char === '{') {
      const parent = open.at(-1);
      if (parent) {
        declarationsUntil(parent, statement);
        parent.nested = true;
      }
      const head = text.slice(statement, at);
      open.push({
        selector: head.trim(),
        index: statement + head.length - head.trimStart().length,
        context: open.map((each) => each.selector),
        from: at + 1,
        body: '',
        nested: false,
      });
      statement = at + 1;
    } else if (char === '}') {
      const frame = open.pop();
      if (frame) {
        declarationsUntil(frame, at);
        found.push({
          selector: frame.selector,
          body: frame.body,
          index: frame.index,
          context: frame.context,
          nestedDeclarations: false,
        });
        const parent = open.at(-1);
        if (parent) parent.from = at + 1;
      }
      statement = at + 1;
    }
  }
  return found.sort((a, b) => a.index - b.index);
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
