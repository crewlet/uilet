import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { checkStorybookStatic } from './check-storybook-static.mjs';

const directories = [];
after(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
});

const LICENSE = 'Copyright notice\n\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n';

// A build shaped like the real one: the Storybook interface fonts at the root
// and the preview's fonts under assets/, each directory with its license.
function build(files) {
  const root = mkdtempSync(join(tmpdir(), 'check-storybook-static-'));
  directories.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const valid = {
  'index.html': '<!doctype html>',
  'nunito-sans-regular.woff2': 'font',
  'OFL.txt': LICENSE,
  'assets/inter-latin-abc.woff2': 'font',
  'assets/OFL.txt': LICENSE,
};

describe('checkStorybookStatic', () => {
  it('passes a static build whose font directories each carry the license', () => {
    assert.deepEqual(checkStorybookStatic(build(valid)), []);
  });

  for (const name of ['_worker.js', '_routes.json', '_headers', '_redirects']) {
    it(`refuses a build that carries ${name} at its root`, () => {
      const problems = checkStorybookStatic(build({ ...valid, [name]: 'export default {}' }));
      assert.equal(problems.length, 1);
      assert.match(problems[0], new RegExp(`^${name} is present`));
    });
  }

  it('refuses a _worker.js directory, which Pages also runs as server code', () => {
    const problems = checkStorybookStatic(build({ ...valid, '_worker.js/index.js': 'export default {}' }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^_worker\.js is present/);
  });

  it('refuses a font directory without OFL.txt', () => {
    const { 'assets/OFL.txt': _omitted, ...files } = valid;
    const problems = checkStorybookStatic(build(files));
    assert.deepEqual(problems, ['assets holds font files but no OFL.txt, which the SIL Open Font License requires beside them']);
  });

  it('refuses an OFL.txt that does not hold the license text', () => {
    const problems = checkStorybookStatic(build({ ...valid, 'OFL.txt': 'Copyright notice only\n' }));
    assert.deepEqual(problems, ['./OFL.txt does not contain the SIL Open Font License text']);
  });

  it('refuses a directory with no fonts, which means the wrong directory was checked', () => {
    const problems = checkStorybookStatic(build({ 'index.html': '<!doctype html>' }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^no font files found/);
  });

  it('refuses a path that is not a directory', () => {
    const root = build(valid);
    assert.deepEqual(checkStorybookStatic(join(root, 'index.html')), [`${join(root, 'index.html')} is not a directory`]);
  });
});
