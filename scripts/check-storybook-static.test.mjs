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
const LUCIDE = 'ISC License\n\nCopyright (c) 2026 Lucide Icons and Contributors\n\nThe MIT License (MIT) (for the icons listed above)\n\nCopyright (c) 2013-present Cole Bemis\n';

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
  'assets/geist-latin-abc.woff2': 'font',
  'assets/OFL.txt': LICENSE,
  'third-party/lucide/LICENSE': LUCIDE,
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

  it('refuses a _worker.js directory, which a host also runs as server code', () => {
    const problems = checkStorybookStatic(build({ ...valid, '_worker.js/index.js': 'export default {}' }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^_worker\.js is present/);
  });

  for (const [what, path, content] of [
    ['an @import of a remote stylesheet', 'assets/preview.css', "@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');"],
    ['a url() reaching a host', 'assets/preview.css', '@font-face { src: url(https://cdn.example.com/geist.woff2); }'],
    ['a protocol relative url()', 'assets/preview.css', '.a { background: url(//cdn.example.com/a.png); }'],
    ['a src attribute reaching a host', 'iframe.html', '<script src="https://cdn.example.com/a.js"></script>'],
    ['a <link> reaching a host', 'index.html', '<!doctype html><link rel="stylesheet" href="https://cdn.example.com/a.css">'],
  ]) {
    it(`refuses a build carrying ${what}`, () => {
      const problems = checkStorybookStatic(build({ ...valid, [path]: content }));
      assert.equal(problems.length, 1);
      assert.match(problems[0], /every asset this site needs ships with it/);
    });
  }

  it('leaves a plain link alone, which is not a request the page makes', () => {
    // Storybook's own error pages link to its documentation. A rule that
    // refused those would be switched off within a week.
    const files = { ...valid, 'iframe.html': '<a href="https://storybook.js.org/docs">Docs</a>' };
    assert.deepEqual(checkStorybookStatic(build(files)), []);
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
    assert.equal(problems.length, 2);
    assert.match(problems[0], /^no font files found/);
  });

  it('refuses a build without the license of the drawings it bundles', () => {
    const { 'third-party/lucide/LICENSE': _omitted, ...files } = valid;
    assert.deepEqual(checkStorybookStatic(build(files)), [
      'third-party/lucide/LICENSE is missing; the preview bundles the Lucide drawings, whose license travels with them',
    ]);
  });

  it('refuses a drawings license that does not hold the license text', () => {
    const files = { ...valid, 'third-party/lucide/LICENSE': 'Some other terms\n' };
    assert.deepEqual(checkStorybookStatic(build(files)), [
      'third-party/lucide/LICENSE does not contain the ISC License text',
      'third-party/lucide/LICENSE does not contain the Feather MIT notice',
    ]);
  });

  it('refuses a drawings license that has lost the Feather half', () => {
    // The icons Lucide derives from Feather are MIT, and their notice is the
    // second half of the same file: the ISC text alone does not cover them.
    const files = { ...valid, 'third-party/lucide/LICENSE': LUCIDE.slice(0, LUCIDE.indexOf('The MIT License')) };
    assert.deepEqual(checkStorybookStatic(build(files)), ['third-party/lucide/LICENSE does not contain the Feather MIT notice']);
  });

  it('refuses a path that is not a directory', () => {
    const root = build(valid);
    assert.deepEqual(checkStorybookStatic(join(root, 'index.html')), [`${join(root, 'index.html')} is not a directory`]);
  });
});
