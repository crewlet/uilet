import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';

import { check, ReleaseError, tarballProblems } from './release.mjs';

const directories = [];
after(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true });
});

const REGISTRY_ENTRY = {
  version: '19.2.3',
  resolved: 'https://registry.npmjs.org/react/-/react-19.2.3.tgz',
  integrity: 'sha512-AAAA',
};

function manifest(overrides = {}) {
  return {
    name: '@crewlethq/icons',
    version: '1.2.3',
    license: 'MIT',
    repository: { type: 'git', url: 'git+https://github.com/crewlet/uilet.git', directory: 'packages/icons' },
    exports: { '.': './dist/index.js' },
    files: ['dist'],
    publishConfig: { access: 'public', registry: 'https://registry.npmjs.org' },
    ...overrides,
  };
}

// A repository shaped like this one: one published workspace, the workspace
// lockfile, the deployment lockfile and the toolchain pins. Each override
// replaces one file's content; a value of null removes the file.
function repository(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'release-'));
  directories.push(root);
  const files = {
    'package.json': { name: 'fixture', private: true, packageManager: 'npm@11.19.0', workspaces: ['packages/*'] },
    '.nvmrc': '24.21.0\n',
    LICENSE: 'MIT License\n',
    'packages/icons/package.json': manifest(),
    'packages/icons/LICENSE': 'MIT License\n',
    'package-lock.json': {
      lockfileVersion: 3,
      packages: {
        '': { name: 'fixture' },
        'node_modules/@crewlethq/icons': { resolved: 'packages/icons', link: true },
        'node_modules/react': REGISTRY_ENTRY,
        'packages/icons': { name: '@crewlethq/icons', version: '1.2.3' },
      },
    },
    '.github/deploy/package-lock.json': {
      lockfileVersion: 3,
      packages: { '': { name: 'deploy' }, 'node_modules/react': REGISTRY_ENTRY },
    },
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  }
  return root;
}

function lockWith(entries) {
  return {
    lockfileVersion: 3,
    packages: {
      '': { name: 'fixture' },
      'node_modules/@crewlethq/icons': { resolved: 'packages/icons', link: true },
      'packages/icons': { name: '@crewlethq/icons', version: '1.2.3' },
      ...entries,
    },
  };
}

function problemsOf(root, options = {}) {
  try {
    check({ root, ...options });
    return [];
  } catch (error) {
    if (!(error instanceof ReleaseError)) throw error;
    return error.message.split('\n');
  }
}

describe('check', () => {
  it('passes a consistent repository', () => {
    assert.deepEqual(problemsOf(repository()), []);
    assert.deepEqual(problemsOf(repository(), { tag: 'v1.2.3' }), []);
  });

  it('refuses a tag that is not v<version>', () => {
    assert.deepEqual(problemsOf(repository(), { tag: 'v1.2.4' }), [
      'the tag "v1.2.4" does not match the manifests: a release of 1.2.3 is tagged v1.2.3',
    ]);
  });

  describe('lockfiles', () => {
    it('refuses a dependency resolved from a host other than the npm registry', () => {
      const root = repository({
        'package-lock.json': lockWith({
          'node_modules/left-pad': { ...REGISTRY_ENTRY, resolved: 'https://codeload.github.com/example/left-pad/tar.gz/abc' },
        }),
      });
      assert.deepEqual(problemsOf(root), [
        'package-lock.json: "node_modules/left-pad" resolves from "https://codeload.github.com/example/left-pad/tar.gz/abc", but every dependency must come from https://registry.npmjs.org/',
      ]);
    });

    it('refuses a registry host that only starts like the npm registry', () => {
      const root = repository({
        'package-lock.json': lockWith({
          'node_modules/left-pad': { ...REGISTRY_ENTRY, resolved: 'https://registry.npmjs.org.example.com/left-pad.tgz' },
        }),
      });
      assert.equal(problemsOf(root).length, 1);
    });

    it('refuses a nested dependency without a sha512 integrity hash', () => {
      const root = repository({
        'package-lock.json': lockWith({
          'node_modules/tsup/node_modules/esbuild': { ...REGISTRY_ENTRY, integrity: 'sha1-AAAA' },
        }),
      });
      assert.deepEqual(problemsOf(root), [
        'package-lock.json: "node_modules/tsup/node_modules/esbuild" has no sha512 integrity hash',
      ]);
    });

    it('refuses a dependency with no recorded location, such as a git or file dependency', () => {
      const root = repository({
        'package-lock.json': lockWith({ 'node_modules/local': { version: '1.0.0' } }),
      });
      assert.deepEqual(problemsOf(root), [
        'package-lock.json: "node_modules/local" resolves from no recorded location, but every dependency must come from https://registry.npmjs.org/',
        'package-lock.json: "node_modules/local" has no sha512 integrity hash',
      ]);
    });

    it('accepts a bundled dependency, which its parent tarball carries', () => {
      const root = repository({
        'package-lock.json': lockWith({ 'node_modules/npm/node_modules/abbrev': { version: '1.0.0', inBundle: true } }),
      });
      assert.deepEqual(problemsOf(root), []);
    });

    it('refuses a link to a directory that is not a workspace', () => {
      const root = repository({
        'package-lock.json': lockWith({ 'node_modules/outside': { resolved: '../outside', link: true } }),
      });
      assert.deepEqual(problemsOf(root), [
        'package-lock.json: "node_modules/outside" links to "../outside", which is not a workspace recorded in the lockfile',
      ]);
    });

    it('checks the deployment lockfile as well, and requires it to exist', () => {
      const tampered = repository({
        '.github/deploy/package-lock.json': {
          lockfileVersion: 3,
          packages: { 'node_modules/wrangler': { ...REGISTRY_ENTRY, resolved: 'https://example.com/wrangler.tgz' } },
        },
      });
      assert.match(problemsOf(tampered)[0], /^\.github\/deploy\/package-lock\.json: "node_modules\/wrangler" resolves from/);
      assert.deepEqual(problemsOf(repository({ '.github/deploy/package-lock.json': null })), [
        '.github/deploy/package-lock.json is missing; every install in this repository runs from a committed lockfile',
      ]);
    });

    it('refuses a lockfile version that does not record every entry', () => {
      const root = repository({ 'package-lock.json': { ...lockWith({}), lockfileVersion: 2 } });
      assert.match(problemsOf(root)[0], /^package-lock\.json: lockfileVersion is 2/);
    });
  });

  describe('publish metadata', () => {
    it('refuses a publishConfig key npm would apply at publish time', () => {
      for (const extra of [{ '@crewlethq:registry': 'https://example.com' }, { tag: 'beta' }]) {
        const root = repository({
          'packages/icons/package.json': manifest({
            publishConfig: { access: 'public', registry: 'https://registry.npmjs.org', ...extra },
          }),
        });
        assert.deepEqual(problemsOf(root), [
          'packages/icons/package.json: "publishConfig" must be exactly { "access": "public", "registry": "https://registry.npmjs.org" }',
        ]);
      }
    });

    it('refuses a top-level tag field, which overrides the dist-tag', () => {
      const root = repository({ 'packages/icons/package.json': manifest({ tag: 'beta' }) });
      assert.deepEqual(problemsOf(root), [
        'packages/icons/package.json: remove the top-level "tag" field; it overrides the dist-tag the release workflow publishes under',
      ]);
    });

    it('refuses a license other than the one expected for the package', () => {
      const root = repository({ 'packages/icons/package.json': manifest({ license: 'ISC' }) });
      assert.deepEqual(problemsOf(root), ['packages/icons/package.json: "license" must be "MIT"']);
    });
  });

  describe('toolchain pins', () => {
    it('refuses a Node version range in .nvmrc', () => {
      assert.deepEqual(problemsOf(repository({ '.nvmrc': '24\n' })), [
        '.nvmrc must name one exact Node release (for example 24.21.0), found "24"',
      ]);
      assert.deepEqual(problemsOf(repository({ '.nvmrc': null })), [
        '.nvmrc must name one exact Node release (for example 24.21.0), found no file',
      ]);
    });

    it('refuses a packageManager that is not an exact npm version', () => {
      const root = repository({
        'package.json': { name: 'fixture', private: true, packageManager: 'npm@^11', workspaces: ['packages/*'] },
      });
      assert.deepEqual(problemsOf(root), [
        'package.json: "packageManager" must be npm@<exact version>, the npm the Node release in .nvmrc bundles; found "npm@^11"',
      ]);
    });

    it('refuses an npm too old for trusted publishing', () => {
      const root = repository({
        'package.json': { name: 'fixture', private: true, packageManager: 'npm@11.5.0', workspaces: ['packages/*'] },
      });
      assert.equal(problemsOf(root).length, 1);
      assert.match(problemsOf(root)[0], /needs npm 11\.5\.1 or later/);
      const minimum = repository({
        'package.json': { name: 'fixture', private: true, packageManager: 'npm@11.5.1', workspaces: ['packages/*'] },
      });
      assert.deepEqual(problemsOf(minimum), []);
    });
  });
});

describe('tarballProblems', () => {
  const workspace = { directory: 'packages/icons', manifest: manifest() };
  const filename = 'crewlethq-icons-1.2.3.tgz';

  it('passes a tarball with its entry points and an unchanged LICENSE', () => {
    const root = repository();
    assert.deepEqual(tarballProblems(root, workspace, filename, new Set(['package.json', 'LICENSE', 'dist/index.js'])), []);
  });

  it('refuses a tarball without a LICENSE', () => {
    const root = repository();
    assert.deepEqual(tarballProblems(root, workspace, filename, new Set(['package.json', 'dist/index.js'])), [
      'crewlethq-icons-1.2.3.tgz: ships no LICENSE; copy the root LICENSE into packages/icons',
    ]);
  });

  it('refuses a package copy of a notice that differs from the root file', () => {
    const root = repository({
      'packages/icons/LICENSE': 'Another license\n',
      'TRADEMARKS.md': '# Trademarks\n',
      'packages/icons/TRADEMARKS.md': '# Outdated trademarks\n',
    });
    const files = new Set(['package.json', 'LICENSE', 'TRADEMARKS.md', 'dist/index.js']);
    assert.deepEqual(tarballProblems(root, workspace, filename, files), [
      'crewlethq-icons-1.2.3.tgz: packages/icons/LICENSE differs from the root LICENSE; copy the root file again',
      'crewlethq-icons-1.2.3.tgz: packages/icons/TRADEMARKS.md differs from the root TRADEMARKS.md; copy the root file again',
    ]);
  });

  it('refuses font files shipped without the OFL.txt beside them', () => {
    const root = repository();
    const files = new Set(['package.json', 'LICENSE', 'dist/index.js', 'fonts/inter-latin.woff2', 'other/OFL.txt']);
    assert.deepEqual(tarballProblems(root, workspace, filename, files), [
      'crewlethq-icons-1.2.3.tgz: ships font files in fonts/ without the OFL.txt their license requires beside them',
    ]);
    files.add('fonts/OFL.txt');
    assert.deepEqual(tarballProblems(root, workspace, filename, files), []);
  });

  it('refuses a missing entry point and a shipped source map', () => {
    const root = repository();
    assert.deepEqual(tarballProblems(root, workspace, filename, new Set(['package.json', 'LICENSE', 'dist/index.js.map'])), [
      'crewlethq-icons-1.2.3.tgz: packages/icons/package.json points at "dist/index.js", which the tarball does not contain',
      'crewlethq-icons-1.2.3.tgz: ships the source map "dist/index.js.map"',
    ]);
  });
});
