/**
 * The palette suite, run the way a consumer runs it: from the tarball.
 *
 * `@crewlethq/tokens/test/palette` is published so an application measures the
 * palette it INSTALLED rather than trusting the one this repository built, and
 * that only holds if the published copy works on its own. Every other suite
 * here imports palette.mjs from beside it, in a checkout that also holds the
 * token source, the scripts and the workspace's node_modules, so a shipped
 * file that reached for any of those would pass every one of them and fail in
 * the first application that installed it.
 *
 * So this packs the package with npm, exactly as a release does, installs the
 * tarball into an empty directory, and there, with nothing of this checkout
 * beside it:
 *
 * - runs the shipped palette.test.mjs, which is what it ships for, both ways
 *   the README gives: as a program from the application's root, and by the
 *   package's own `node --test "test/*.test.mjs"` inside the installed copy;
 * - imports the suite by its package name, through the exports map, reads the
 *   two sheets the way a consumer's suite does (Crewlet's palette.test.ts
 *   resolves `@crewlethq/tokens/css` and `/css/themes`), and holds the four
 *   entry points a consumer calls to the shapes palette.d.mts declares.
 *
 * It needs the build (dist/ is what is packed), npm and tar, and it stays out
 * of the tarball itself: it reads the package from outside.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const STATES = ['base', 'dark', 'light (media query)', 'light (attribute)'];

/** Run a command to completion, failing the case with its output if it fails. */
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    // npm run hands its children its own configuration as npm_config_*; a
    // workspace selection among it would pack every workspace, or none. And
    // this file runs under `node --test`, which tells its own children to
    // report to it over a binary channel through NODE_TEST_CONTEXT: a suite run
    // here as an application runs it must not inherit that.
    env: Object.fromEntries([
      ...Object.entries(process.env).filter(([name]) => !/^npm_(config|package|lifecycle)_/i.test(name) && name !== 'NODE_TEST_CONTEXT'),
      ['npm_config_update_notifier', 'false'],
      ['npm_config_loglevel', 'error'],
    ]),
  });
  assert.equal(result.error, undefined, `${command} could not be run: ${result.error}`);
  assert.equal(result.status, 0, `${command} ${args.join(' ')} exited ${result.status}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

let consumer;
let installed;
let tarballs;

before(() => {
  tarballs = mkdtempSync(join(tmpdir(), 'crewlet-tokens-tarball-'));
  // By its REAL path, because the module resolver answers with one: on
  // macOS the temporary directory is reached through a link (`/tmp` and
  // `/var/folders` both live under `/private`), so a path built from the
  // linked name never equals what a consumer's import resolves to.
  consumer = realpathSync(mkdtempSync(join(tmpdir(), 'crewlet-tokens-consumer-')));
  const [{ filename }] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', tarballs], packageDir));
  installed = join(consumer, 'node_modules', '@crewlethq', 'tokens');
  mkdirSync(installed, { recursive: true });
  // What npm install does with a package that has no dependencies and no
  // install scripts: the tarball's package/ directory, as it is.
  run('tar', ['-xzf', join(tarballs, filename), '-C', installed, '--strip-components=1'], consumer);
  writeFileSync(join(consumer, 'package.json'), `${JSON.stringify({ name: 'consumer', private: true, type: 'module' })}\n`);
});

after(() => {
  for (const directory of [consumer, tarballs]) if (directory) rmSync(directory, { recursive: true, force: true });
});

describe('the tarball', () => {
  test('it carries the suite, and nothing from the checkout it would otherwise lean on', () => {
    // The four files the suite is, and no other: build.test.mjs, fonts.test.mjs
    // and intent.test.mjs read the token source and this file packs the
    // package, none of which an installed copy has. The token source, the
    // design record and the scripts (the build, and the palette fit) are
    // not published at all.
    assert.deepEqual(readdirSync(join(installed, 'test')).sort(), ['color.mjs', 'palette.d.mts', 'palette.mjs', 'palette.test.mjs']);
    for (const absent of ['tokens', 'scripts', 'stylesheets', 'src', 'node_modules']) {
      assert.equal(existsSync(join(installed, absent)), false, `the tarball ships ${absent}/`);
    }
  });
});

describe('the shipped suite, over the installed copy', () => {
  /**
   * The TAP summary of a run, which is what says a run ran anything: a glob
   * that matched no file, or a file that declared no test, exits 0 as well.
   * That is not hypothetical here. `node --test` skips every path under
   * node_modules, a glob included, so the command this package's README used
   * to give, `node --test "node_modules/@crewlethq/tokens/test/*.test.mjs"`,
   * ran no test at all and exited 0.
   */
  function summary(output) {
    const count = (name) => Number(new RegExp(`^# ${name} (\\d+)$`, 'm').exec(output)?.[1] ?? NaN);
    return { tests: count('tests'), pass: count('pass'), fail: count('fail') };
  }

  test("the README's command, from the application's own root, runs the suite and it passes", () => {
    // The file run as a program: node:test runs what it declares and sets the
    // exit code, and no test runner's file discovery stands between it and
    // node_modules.
    const output = run('node', ['--test-reporter=tap', 'node_modules/@crewlethq/tokens/test/palette.test.mjs'], consumer);
    const { tests, pass, fail } = summary(output);
    assert.equal(fail, 0, output);
    assert.ok(tests >= 20 && pass === tests, `${pass} of ${tests} tests passed:\n${output}`);
    assert.match(output, /# Subtest: the palette\n/);
    assert.match(output, /# Subtest: the structure of the theme file\n/);
  });

  test("the package's own test command, inside the installed copy, runs the same suite", () => {
    // `node --test "test/*.test.mjs"`, the manifest's test script, from the
    // installed package's own directory: the glob finds exactly the files the
    // tarball carries, which is palette.test.mjs alone.
    const inside = summary(run('node', ['--test', '--test-reporter=tap', 'test/*.test.mjs'], installed));
    const outside = summary(run('node', ['--test-reporter=tap', 'node_modules/@crewlethq/tokens/test/palette.test.mjs'], consumer));
    assert.deepEqual(inside, outside);
    assert.equal(inside.fail, 0);
  });
});

describe('the entry points, reached by package name', () => {
  let report;

  before(() => {
    // The consumer's own module, resolving everything through the installed
    // package's exports map rather than through a path into it.
    writeFileSync(
      join(consumer, 'shapes.mjs'),
      `import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describeFailure, paletteStates, runPalette, tightest } from '@crewlethq/tokens/test/palette';

const require = createRequire(import.meta.url);
const at = (name) => readFileSync(require.resolve('@crewlethq/tokens/css' + name), 'utf8');
const sources = { tokens: at(''), themes: at('/themes') };
const result = runPalette(sources);
const states = paletteStates(sources);
const sample = result.checks.find((check) => check.value !== null);
process.stdout.write(JSON.stringify({
  resolved: fileURLToPath(import.meta.resolve('@crewlethq/tokens/test/palette')),
  sheets: [require.resolve('@crewlethq/tokens/css'), require.resolve('@crewlethq/tokens/css/themes')],
  result: Object.keys(result),
  states: Object.entries(result.states).map(([name, values]) => [name, values instanceof Map, values.size]),
  sameStates: JSON.stringify(Object.entries(states).map(([name, values]) => [name, [...values]])) ===
    JSON.stringify(Object.entries(result.states).map(([name, values]) => [name, [...values]])),
  checks: result.checks,
  failures: result.failures,
  described: describeFailure(sample),
  sample,
  tightest: tightest(result.checks),
}));
`,
    );
    report = JSON.parse(run('node', ['shapes.mjs'], consumer));
  });

  test('the suite and the sheets resolve inside the installed copy', () => {
    // Through the exports map: the suite by `import`, the sheets by
    // `require.resolve`, as Crewlet's palette.test.ts reads them.
    assert.equal(report.resolved, join(installed, 'test', 'palette.mjs'));
    assert.deepEqual(report.sheets, [join(installed, 'dist', 'css', 'tokens.css'), join(installed, 'dist', 'css', 'themes.css')]);
  });

  test('runPalette answers states, checks and failures, and the palette clears every rule', () => {
    assert.deepEqual(report.result, ['states', 'checks', 'failures']);
    assert.deepEqual(report.states.map(([name]) => name), STATES);
    for (const [name, isMap, size] of report.states) {
      assert.equal(isMap, true, `${name} is not a Map`);
      assert.ok(size > 80, `${name} resolved ${size} tokens`);
    }
    assert.ok(report.checks.length > 400, `only ${report.checks.length} checks ran`);
    for (const check of report.checks) {
      assert.deepEqual(Object.keys(check), ['state', 'rule', 'ok', 'subject', 'value', 'detail']);
      assert.equal(typeof check.state, 'string');
      assert.equal(typeof check.rule, 'string');
      assert.equal(typeof check.ok, 'boolean');
      assert.equal(typeof check.subject, 'string');
      assert.ok(check.value === null || typeof check.value === 'number', `${check.rule}: value ${check.value}`);
      assert.equal(typeof check.detail, 'string');
    }
    assert.deepEqual(report.failures, report.checks.filter((check) => !check.ok));
    assert.deepEqual(report.failures, []);
  });

  test('paletteStates answers the same four states runPalette measured', () => {
    assert.equal(report.sameStates, true);
  });

  test('describeFailure is one line: state, rule, subject and detail', () => {
    const { state, rule, subject, detail } = report.sample;
    assert.equal(report.described, `${state}: ${rule}: ${subject}: ${detail}`);
  });

  test('tightest is the lowest measured check under each rule that has a number', () => {
    const byRule = new Map();
    for (const check of report.checks) {
      if (check.value === null) continue;
      byRule.set(check.rule, Math.min(byRule.get(check.rule) ?? Infinity, check.value));
    }
    assert.deepEqual(report.tightest.map((check) => check.rule).sort(), [...byRule.keys()].sort());
    for (const check of report.tightest) assert.equal(check.value, byRule.get(check.rule), check.rule);
  });

  test('the types a TypeScript consumer resolves declare the same four', () => {
    const types = readFileSync(join(installed, 'test', 'palette.d.mts'), 'utf8');
    const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
    assert.equal(manifest.exports['./test/palette'].types, './test/palette.d.mts');
    for (const signature of [
      'export function runPalette(sources: PaletteSources): PaletteResult;',
      'export function paletteStates(sources: PaletteSources): Record<string, Map<string, string>>;',
      'export function describeFailure(check: PaletteCheck): string;',
      'export function tightest(checks: readonly PaletteCheck[]): PaletteCheck[];',
    ]) {
      assert.ok(types.includes(signature), `palette.d.mts does not declare ${signature}`);
    }
  });
});
