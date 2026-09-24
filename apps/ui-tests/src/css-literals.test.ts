/**
 * The literal check's own suite, for the two rules whose failure is SILENT:
 * a motion whose reduced-motion stop does not win, and a media query nobody
 * read.
 *
 * Both passed for as long as they were wrong. The motion rule asked only that
 * a stylesheet mention `prefers-reduced-motion`, and three components passed
 * it while still moving for a reader who had asked them not to: a catch-all
 * outranked by the row it was meant to stop, a stop one class short of its
 * start, and a stop written above the rules it cancelled. The breakpoint rule
 * read a rule's selector for `@media`, and a top-level query's prelude is no
 * rule's selector, so it checked not one of them.
 *
 * Each case is a stylesheet of its own, and the check runs once over all of
 * them as a command, which is how a consumer's build runs it (and what
 * `crewlet-css-check` wraps), so what is asserted is the exit status and the
 * findings a person would read.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const REPOSITORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = join(REPOSITORY, 'packages/ui/scripts/check-css-literals.mjs');

/** Runs the check over the given stylesheets, and answers its exit status and each file's findings. */
function check(sheets: Record<string, string>): { status: number; found: Record<string, string[]> } {
  const directory = mkdtempSync(join(tmpdir(), 'crewlet-css-literals-'));
  for (const [name, css] of Object.entries(sheets)) writeFileSync(join(directory, `${name}.css`), css);
  let status = 0;
  let output = '';
  try {
    execFileSync(process.execPath, [SCRIPT, directory], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const failed = error as { status: number; stderr: string };
    status = failed.status;
    output = failed.stderr;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  const found: Record<string, string[]> = {};
  for (const line of output.split('\n')) {
    const finding = /([\w-]+)\.css:(\d+): (.*)$/.exec(line);
    if (finding) (found[finding[1]!] ??= []).push(`${finding[2]}: ${finding[3]}`);
  }
  return { status, found };
}

const STOP = '@media (prefers-reduced-motion: reduce)';
/** A duration from the scale, so no case trips the literal-duration rule instead of the one it is about. */
const T = 'var(--motion-duration-slow)';

/** Stylesheets the check has to pass: every one pairs its motion with a stop that wins. */
const PASSES: Record<string, string> = {
  paired: `.chart .ghost { animation: k ${T}; }\n${STOP} {\n  .chart .ghost { animation: none; }\n}`,
  // Motion started only for a reader who has not asked for less needs no stop.
  'only-with-motion': `@media (prefers-reduced-motion: no-preference) {\n  .a { animation: k ${T}; }\n}`,
  // An element taken out of the page moves nowhere.
  'display-none': `.bar { animation: k ${T}; }\n${STOP} {\n  .bar { display: none; }\n}`,
  // One selector is one selector however it is laid out or ordered in a list.
  lists: `.a,\n.b > .c { transition: opacity ${T}; }\n${STOP} {\n  .b>.c, .a { transition: none; }\n}`,
  // Setting a motion to nothing starts nothing.
  'not-a-start': `.a { transition: none; animation: none; }`,
  // Motion declared FOR a reader who asked for less is a chosen alternative.
  alternative: `.a { transition: transform ${T}; }\n${STOP} {\n  .a { transition: none; }\n  .b { transition: opacity ${T}; }\n}`,
  important: `.a { animation: k ${T} !important; }\n${STOP} {\n  .a { animation: none !important; }\n}`,
  // Nesting is resolved: a stop nested in its own rule, and a nested start.
  nested: `.a {\n  animation: k ${T};\n  ${STOP} {\n    animation: none;\n  }\n}\n.b {\n  &:hover { transition: opacity ${T}; }\n}\n${STOP} {\n  .b:hover { transition: none; }\n}`,
  // Declarations resumed after a nested block are the block's own, stopped by
  // a later rule naming the block.
  resumed: `.a {\n  &:hover { color: inherit; }\n  animation: k ${T};\n}\n${STOP} {\n  .a { animation: none; }\n}`,
  breakpoint: `@media (width < 1024px) {\n  .a { width: 0; }\n}`,
};

test('a stylesheet that pairs every motion with a winning stop passes', () => {
  const { status, found } = check(PASSES);
  expect(found).toEqual({});
  expect(status).toBe(0);
});

test('every stop that would lose is refused, by file and by line', () => {
  const { status, found } = check({
    // Tied on specificity, and FIRST, so source order hands the tie back.
    'stop-above': `${STOP} {\n  .a { transition: none; }\n}\n.a { transition: opacity ${T}; }`,
    // One class short of the rule it stops.
    'stop-short': `.chart .ghost { animation: k ${T}; }\n${STOP} {\n  .ghost { animation: none; }\n}`,
    // Two classes against two classes and two elements.
    'catch-all': `.t--x .t__table tbody tr { transition: background-color ${T}; }\n${STOP} {\n  .t.t * { transition: none; }\n}`,
    // Applies only at some widths, so it is not a stop.
    combined: `.a { animation: k ${T}; }\n@media (prefers-reduced-motion: reduce) and (width < 1024px) {\n  .a { animation: none; }\n}`,
    // Half a list stopped is half a list still moving.
    'list-half': `.a, .b { transition: opacity ${T}; }\n${STOP} {\n  .a { transition: none; }\n}`,
    // A normal stop loses to an important start.
    'important-start': `.a { animation: k ${T} !important; }\n${STOP} {\n  .a { animation: none; }\n}`,
    // Stopping the transition leaves the animation running.
    'wrong-family': `.a { animation: k ${T}; }\n${STOP} {\n  .a { transition: none; }\n}`,
    // Written BELOW a nested stop, so a browser places it after the stop in a
    // nested-declarations rule of the same specificity, and it wins. Read as
    // part of `.a` at `.a`'s own line, it passed as a start above its stop.
    'resumed-after-stop': `.a {\n  ${STOP} { animation: none; }\n  animation: k ${T};\n}`,
  });
  expect(status).toBe(1);
  const lines = Object.fromEntries(Object.entries(found).map(([file, each]) => [file, each.map((one) => one.split(':')[0])]));
  expect(lines).toEqual({
    'stop-above': ['4'],
    'stop-short': ['1'],
    'catch-all': ['1'],
    combined: ['1'],
    'list-half': ['1'],
    'important-start': ['1'],
    'wrong-family': ['1'],
    // The line of the declaration itself, which is where the browser has it.
    'resumed-after-stop': ['3'],
  });
  expect(found['list-half']![0]).toContain('transition on .b has no reduced-motion stop');
  expect(found['stop-short']![0]).toContain('animation on .chart .ghost has no reduced-motion stop');
});

test('a top-level media query is read, and must switch at a breakpoint token', () => {
  const { status, found } = check({
    query: `.a { width: 0; }\n\n@media (max-width: 901px) {\n  .a { width: 1px; }\n}`,
  });
  expect(status).toBe(1);
  // Named at the query's own line, not the line the rule before it closed on.
  expect(found['query']).toEqual([expect.stringMatching(/^3: the media query switches at 901px, which is not a breakpoint token/)]);
});

test('a nested query is read once, however many runs of declarations it holds', () => {
  // The declarations after `.b` are an entry of their own, carrying the
  // query's head again; the head is still one query and one finding.
  const { status, found } = check({
    nested: `.a {\n  @media (max-width: 901px) {\n    .b { width: 0; }\n    width: 1px;\n  }\n}`,
  });
  expect(status).toBe(1);
  expect(found['nested']).toEqual([expect.stringMatching(/^2: the media query switches at 901px/)]);
});
