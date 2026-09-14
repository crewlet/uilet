import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';

import {
  bumpVersion,
  changeOf,
  check,
  compare,
  describePlan,
  integrityOf,
  readTarball,
  registryProblems,
  releasedPackagesOf,
  releaseDecision,
  ReleaseError,
  releasePlan,
  tarballDifferences,
  tarballName,
  tarballProblems,
} from './release.mjs';

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
  });

  it('refuses a manifest version with a pre-release or build suffix, which no release carries', () => {
    for (const version of ['1.3.0-rc.1', '1.2.3+build.5', '01.2.3']) {
      const root = repository({ 'packages/icons/package.json': manifest({ version }) });
      const [problem] = problemsOf(root);
      assert.ok(problem.startsWith(`version "${version}" is not MAJOR.MINOR.PATCH`), problem);
    }
  });

  it('refuses a workspace pin that is not the shared version, which npm would not link', () => {
    const root = repository({
      'package.json': { name: 'fixture', private: true, packageManager: 'npm@11.19.0', workspaces: ['packages/*', 'apps/*'] },
      'apps/showroom/package.json': { name: 'showroom', private: true, dependencies: { '@crewlethq/icons': '^1.2.3' } },
    });
    assert.deepEqual(problemsOf(root), [
      'apps/showroom/package.json: dependencies["@crewlethq/icons"] is "^1.2.3", but a workspace dependency must pin the shared version "1.2.3" exactly',
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

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'author@example.com',
  GIT_COMMITTER_NAME: 'Test Author',
  GIT_COMMITTER_EMAIL: 'author@example.com',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV });
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

// An empty git repository on main. releasePlan reads history only, so no
// commit needs to touch a file.
function history(cwd = mkdtempSync(join(tmpdir(), 'release-history-'))) {
  directories.push(cwd);
  git(cwd, 'init', '--quiet', '--initial-branch=main');
  return cwd;
}

function commit(cwd, message) {
  git(cwd, 'commit', '--quiet', '--allow-empty', '-m', message);
}

function tag(cwd, name) {
  git(cwd, 'tag', '-a', name, '-m', name);
}

describe('changeOf', () => {
  const cases = [
    ['feat: add a date picker', 'feature'],
    ['feat(ui): add a date picker', 'feature'],
    ['FEAT(ui): types are not case sensitive', 'feature'],
    ['feat(ui)!: rename the Button export', 'breaking'],
    ['refactor!: drop the legacy stylesheet', 'breaking'],
    ['fix(ui): correct the focus ring', 'fix'],
    ['build(deps): Bump tsup from 8.3.5 to 8.5.0', 'fix'],
    ['docs: explain the release', 'fix'],
    ['Update README.md', 'fix'],
    ['featuring: not the feat type', 'fix'],
    ['feat:no space after the colon', 'fix'],
    ['feat (ui): a space before the scope', 'fix'],
    ['feat!(ui): the marker after the scope, not before it', 'fix'],
    ['fix(ui): rename a prop\n\nThe old name was misleading.\n\nBREAKING CHANGE: `tone` is now `variant`', 'breaking'],
    ['fix(ui): rename a prop\n\nBREAKING-CHANGE: `tone` is now `variant`', 'breaking'],
    ['docs: windows line endings\r\n\r\nBREAKING CHANGE: still a footer', 'breaking'],
    ['fix: a lower-case token is not the footer\n\nbreaking change: no', 'fix'],
    ['fix: the token has to start the line\n\nThis is not a BREAKING CHANGE: it is prose', 'fix'],
    ['BREAKING CHANGE: in the subject, where no footer can be', 'fix'],
  ];
  for (const [message, expected] of cases) {
    it(`reads ${JSON.stringify(message.split(/\r?\n/)[0])} as ${expected}`, () => {
      assert.equal(changeOf(message), expected);
    });
  }
});

describe('bumpVersion', () => {
  it('moves the minor number for a breaking change while the major number is 0, and the major number after', () => {
    assert.equal(bumpVersion('0.9.4', 'breaking'), '0.10.0');
    assert.equal(bumpVersion('1.9.4', 'breaking'), '2.0.0');
    assert.equal(bumpVersion('1.9.4', 'feature'), '1.10.0');
    assert.equal(bumpVersion('1.9.4', 'fix'), '1.9.5');
  });
});

describe('releasePlan', () => {
  it('releases the manifest version while no release tag exists, whatever the commits say', () => {
    const cwd = history();
    commit(cwd, 'feat!: the first commit');
    commit(cwd, 'feat(ui): a feature');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.2.0', base: null, change: null, commits: 0 });
  });

  it('moves the patch number when no commit is a feature or a breaking change', () => {
    const cwd = history();
    commit(cwd, 'feat: released');
    tag(cwd, 'v0.2.0');
    commit(cwd, 'fix(ui): correct the focus ring');
    commit(cwd, 'docs: explain the release');
    commit(cwd, 'Update README.md');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.2.1', base: 'v0.2.0', change: 'fix', commits: 3 });
  });

  it('moves the minor number for a feature', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v0.2.0');
    commit(cwd, 'fix: a fix');
    commit(cwd, 'feat(icons): a new icon');
    assert.equal(releasePlan({ root: cwd, seed: '0.2.0' }).version, '0.3.0');
  });

  it('moves the minor number for a breaking change while the major number is 0', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v0.2.7');
    commit(cwd, 'refactor(ui)!: rename the Button export');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.3.0', base: 'v0.2.7', change: 'breaking', commits: 1 });
  });

  it('moves the major number for a breaking change from 1.0.0 on', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v1.4.2');
    commit(cwd, 'fix!: drop the legacy stylesheet');
    assert.equal(releasePlan({ root: cwd, seed: '0.2.0' }).version, '2.0.0');
  });

  it('treats a BREAKING CHANGE footer as a breaking change', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v1.0.0');
    commit(cwd, 'fix(ui): rename a prop\n\nBREAKING CHANGE: `tone` is now `variant`');
    assert.equal(releasePlan({ root: cwd, seed: '0.2.0' }).version, '2.0.0');
  });

  it('takes the largest change in a mixed range', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v0.4.1');
    commit(cwd, 'docs: a');
    commit(cwd, 'feat: b');
    commit(cwd, 'fix: c');
    assert.equal(releasePlan({ root: cwd, seed: '0.2.0' }).version, '0.5.0');
    commit(cwd, 'chore: d\n\nBREAKING CHANGE: e');
    commit(cwd, 'fix: f');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.5.0', base: 'v0.4.1', change: 'breaking', commits: 5 });
    tag(cwd, 'v0.5.0');
    commit(cwd, 'feat: g');
    commit(cwd, 'fix: h');
    assert.equal(releasePlan({ root: cwd, seed: '0.2.0' }).version, '0.6.0');
  });

  it('ignores merge commits, whatever their message says, and counts the commits they bring in', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v0.2.0');
    git(cwd, 'checkout', '--quiet', '-b', 'topic');
    commit(cwd, 'fix(ui): on the branch');
    git(cwd, 'checkout', '--quiet', 'main');
    commit(cwd, 'docs: on main');
    git(cwd, 'merge', '--quiet', '--no-ff', 'topic', '-m', 'feat!: a merge message that is not a change');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.2.1', base: 'v0.2.0', change: 'fix', commits: 2 });
  });

  it('moves the patch number for a range that holds nothing but a merge commit', () => {
    const cwd = history();
    commit(cwd, 'chore: base');
    git(cwd, 'checkout', '--quiet', '-b', 'side');
    commit(cwd, 'feat: released on the side');
    tag(cwd, 'v0.2.0');
    git(cwd, 'checkout', '--quiet', 'main');
    git(cwd, 'merge', '--quiet', '--no-ff', 'side', '-m', 'Merge branch side');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.2.1', base: 'v0.2.0', change: 'fix', commits: 0 });
  });

  it('ignores pre-release tags and tags that are not release versions', () => {
    const cwd = history();
    commit(cwd, 'chore: released');
    tag(cwd, 'v0.2.0');
    commit(cwd, 'fix: a');
    tag(cwd, 'v0.3.0-rc.1');
    tag(cwd, 'v1');
    tag(cwd, 'v01.0.0');
    tag(cwd, 'version-9.0.0');
    commit(cwd, 'fix: b');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.2.1', base: 'v0.2.0', change: 'fix', commits: 2 });
  });

  it('builds on the highest release tag reachable from the commit, compared as versions', () => {
    const cwd = history();
    commit(cwd, 'chore: a');
    tag(cwd, 'v0.10.0');
    commit(cwd, 'chore: b');
    tag(cwd, 'v0.9.0');
    git(cwd, 'checkout', '--quiet', '-b', 'unmerged');
    commit(cwd, 'feat: never merged');
    tag(cwd, 'v5.0.0');
    git(cwd, 'checkout', '--quiet', 'main');
    commit(cwd, 'fix: c');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.10.1', base: 'v0.10.0', change: 'fix', commits: 2 });
  });

  it('gives a commit that is itself a release tag the version of that tag', () => {
    const cwd = history();
    commit(cwd, 'feat: released');
    tag(cwd, 'v0.3.0');
    assert.deepEqual(releasePlan({ root: cwd, seed: '0.2.0' }), { version: '0.3.0', base: 'v0.3.0', change: null, commits: 0 });
  });

  it('refuses a shallow clone, which cannot see every tag and commit', () => {
    const origin = history();
    commit(origin, 'chore: released');
    tag(origin, 'v0.2.0');
    commit(origin, 'feat: a');
    const clone = mkdtempSync(join(tmpdir(), 'release-clone-'));
    directories.push(clone);
    git(tmpdir(), 'clone', '--quiet', '--depth=1', `file://${origin}`, clone);
    assert.throws(() => releasePlan({ root: clone, seed: '0.2.0' }), /shallow/);
  });

  it('explains the version it chose', () => {
    assert.equal(
      describePlan({ version: '0.2.0', base: null, change: null, commits: 0 }),
      'No release tag is reachable from this commit, so it is released as the manifest version 0.2.0.',
    );
    assert.equal(
      describePlan({ version: '0.3.0', base: 'v0.2.4', change: 'feature', commits: 3 }),
      'The 3 commits since v0.2.4 (merge commits aside) include a feature and no breaking change, so this commit is released as 0.3.0.',
    );
  });
});

const INTERNAL_NAMES = new Set(['@crewlethq/tokens', '@crewlethq/icons', '@crewlethq/ui']);

function uiManifest(version, overrides = {}) {
  return {
    name: '@crewlethq/ui',
    version,
    license: 'MIT',
    files: ['dist'],
    dependencies: { '@crewlethq/icons': version, '@crewlethq/tokens': version },
    peerDependencies: { react: '>=18' },
    ...overrides,
  };
}

// Writes a package directory and packs it with npm itself, so the reader is
// exercised against the archives npm really writes.
function packed(files) {
  const directory = mkdtempSync(join(tmpdir(), 'release-package-'));
  const destination = mkdtempSync(join(tmpdir(), 'release-tarball-'));
  directories.push(directory, destination);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  }
  const result = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, npm_config_update_notifier: 'false', npm_config_loglevel: 'error' },
  });
  assert.equal(result.status, 0, result.stderr);
  const [{ filename }] = JSON.parse(result.stdout);
  return readFileSync(join(destination, filename));
}

function differencesOf(previous, current) {
  return tarballDifferences(readTarball(packed(previous), 'previous'), readTarball(packed(current), 'current'), INTERNAL_NAMES);
}

describe('tarballDifferences', () => {
  const base = { LICENSE: 'MIT License\n', 'dist/index.js': 'export const a = 1;\n', 'dist/styles.css': '.a {}\n' };

  it('finds nothing when the contents are identical', () => {
    const files = { ...base, 'package.json': uiManifest('0.2.0') };
    assert.deepEqual(differencesOf(files, files), []);
  });

  it('finds a changed file', () => {
    assert.deepEqual(
      differencesOf(
        { ...base, 'package.json': uiManifest('0.2.0') },
        { ...base, 'dist/index.js': 'export const a = 2;\n', 'package.json': uiManifest('0.2.0') },
      ),
      ['changed dist/index.js'],
    );
  });

  it('finds an added file and a removed file', () => {
    const { 'dist/styles.css': _removed, ...withoutStyles } = base;
    assert.deepEqual(
      differencesOf(
        { ...base, 'package.json': uiManifest('0.2.0') },
        { ...withoutStyles, 'dist/Button.css': '.b {}\n', 'package.json': uiManifest('0.2.0') },
      ),
      ['added dist/Button.css', 'removed dist/styles.css'],
    );
  });

  it('ignores a package.json that differs only in its version and its workspace pins', () => {
    assert.deepEqual(differencesOf({ ...base, 'package.json': uiManifest('0.2.0') }, { ...base, 'package.json': uiManifest('0.3.0') }), []);
  });

  it('finds any other package.json change, including a workspace pin that is not the package version', () => {
    assert.deepEqual(
      differencesOf(
        { ...base, 'package.json': uiManifest('0.2.0') },
        { ...base, 'package.json': uiManifest('0.3.0', { peerDependencies: { react: '>=19' } }) },
      ),
      ['changed package.json'],
    );
    assert.deepEqual(
      differencesOf(
        { ...base, 'package.json': uiManifest('0.2.0') },
        { ...base, 'package.json': uiManifest('0.3.0', { dependencies: { '@crewlethq/icons': '0.3.0', '@crewlethq/tokens': '^0.3.0' } }) },
      ),
      ['changed package.json'],
    );
  });
});

describe('readTarball', () => {
  it('reads every file npm packs, including paths too long for a plain tar header', () => {
    const deep = `dist/${'nested/'.repeat(16)}deep.js`;
    const long = `dist/${'x'.repeat(120)}.js`;
    const files = readTarball(
      packed({ 'package.json': uiManifest('0.2.0'), 'dist/index.js': 'a\n', [deep]: 'b\n', [long]: 'c\n' }),
      'fixture',
    );
    assert.deepEqual([...files.keys()].sort(), [deep, long, 'dist/index.js', 'package.json'].sort());
    assert.equal(files.get(long).toString(), 'c\n');
    assert.equal(files.get(deep).toString(), 'b\n');
  });

  it('refuses an archive that is not gzip, or that ends early', () => {
    assert.throws(() => readTarball(Buffer.from('not an archive'), 'fixture'), ReleaseError);
    const archive = packed({ 'package.json': uiManifest('0.2.0'), 'dist/index.js': 'a\n' });
    const truncated = gzipSync(gunzipSync(archive).subarray(0, 700));
    assert.throws(() => readTarball(truncated, 'fixture'), /truncated|ends before/);
  });
});

describe('the release decision', () => {
  const tagged = { version: '0.2.1', base: 'v0.2.0', change: 'fix', commits: 1 };

  it('releases when a package is not on the registry yet', () => {
    assert.equal(releaseDecision({ version: '0.2.0', base: null, change: null, commits: 0 }, [{ name: '@crewlethq/ui', previous: null, differences: [] }]), true);
  });

  it('releases nothing when every package has the contents of its latest version', () => {
    const packages = [...INTERNAL_NAMES].map((name) => ({ name, previous: '0.2.0', differences: [] }));
    assert.equal(releaseDecision(tagged, packages), false);
  });

  it('releases every package when any one of them changed', () => {
    const packages = [...INTERNAL_NAMES].map((name) => ({ name, previous: '0.2.0', differences: [] }));
    packages[1].differences = ['changed dist/index.js'];
    assert.equal(releaseDecision(tagged, packages), true);
  });

  it('refuses contents that differ from a version this commit already released', () => {
    assert.throws(
      () =>
        releaseDecision({ version: '0.2.0', base: 'v0.2.0', change: null, commits: 0 }, [
          { name: '@crewlethq/ui', previous: '0.2.0', differences: ['changed dist/index.js'] },
        ]),
      /@crewlethq\/ui at 0\.2\.0 is already on the registry, but this commit packs different contents for it/,
    );
  });

  it('refuses a registry that holds a version no reachable release tag records', () => {
    assert.deepEqual(registryProblems({ version: '0.2.0', base: null }, [{ name: '@crewlethq/ui', previous: '0.2.0' }]), [
      '@crewlethq/ui@0.2.0 is on the registry, but no release tag is reachable from this commit. A release was published without the tag that records it; see "If a release goes wrong" in RELEASING.md',
    ]);
    assert.deepEqual(registryProblems(tagged, [{ name: '@crewlethq/ui', previous: '0.2.1' }]), [
      '@crewlethq/ui: the latest version on the registry is 0.2.1, but the latest release tag reachable from this commit is v0.2.0. The tags and the registry disagree; see "If a release goes wrong" in RELEASING.md',
    ]);
    assert.deepEqual(registryProblems(tagged, [{ name: '@crewlethq/ui', previous: '0.2.0' }, { name: '@crewlethq/icons', previous: null }]), []);
  });

  it('refuses a registry that does not serve a package the previous release published', () => {
    const released = new Set(['@crewlethq/ui']);
    assert.deepEqual(registryProblems(tagged, [{ name: '@crewlethq/ui', previous: null }], released), [
      '@crewlethq/ui was released as v0.2.0, but the registry does not serve the package. Check it on the registry (npm view @crewlethq/ui versions) before re-running; see "If a release goes wrong" in RELEASING.md',
    ]);
    assert.deepEqual(registryProblems(tagged, [{ name: '@crewlethq/icons', previous: null }], released), []);
  });
});

describe('releasedPackagesOf', () => {
  it('names the packages that were public at the release tag under the same name', () => {
    const root = repository({
      'package.json': { name: 'fixture', private: true, packageManager: 'npm@11.19.0', workspaces: ['packages/*'] },
      'packages/tokens/package.json': manifest({ name: '@crewlethq/tokens', private: true }),
      'packages/old/package.json': manifest({ name: '@crewlethq/old' }),
    });
    history(root);
    git(root, 'add', '.');
    commit(root, 'feat: released');
    tag(root, 'v1.2.3');
    const workspaces = [
      { directory: 'packages/icons', manifest: manifest() },
      { directory: 'packages/tokens', manifest: manifest({ name: '@crewlethq/tokens' }) },
      { directory: 'packages/old', manifest: manifest({ name: '@crewlethq/renamed' }) },
      { directory: 'packages/ui', manifest: manifest({ name: '@crewlethq/ui' }) },
    ];
    assert.deepEqual([...releasedPackagesOf(root, 'v1.2.3', workspaces)], ['@crewlethq/icons']);
    assert.deepEqual([...releasedPackagesOf(root, null, workspaces)], []);
  });
});

// A registry on the loopback interface serving abbreviated records and
// tarballs. `latest` is either one version or a list served one request
// after another, which is how a registry that lags behind a publish looks.
// `missing` and `tarballMissing` answer that many requests for the record or
// a tarball with 404 before serving it, and `tarballHost` names the tarballs
// on another host.
async function startRegistry(t, packages) {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(request.url);
    for (const [name, entry] of Object.entries(packages)) {
      if (path === `/${name}`) {
        if (entry.missing > 0) {
          entry.missing -= 1;
          break;
        }
        const latest = Array.isArray(entry.latest) ? (entry.latest.length > 1 ? entry.latest.shift() : entry.latest[0]) : entry.latest;
        const versions = Object.fromEntries(
          Object.entries(entry.tarballs).map(([version, bytes]) => [
            version,
            {
              dist: {
                tarball: `${entry.tarballHost ?? address}/${name}/-/${name.split('/')[1]}-${version}.tgz`,
                integrity: entry.integrity ?? integrityOf(bytes),
              },
            },
          ]),
        );
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ 'dist-tags': { latest }, versions }));
        return;
      }
      for (const [version, bytes] of Object.entries(entry.tarballs)) {
        if (path === `/${name}/-/${name.split('/')[1]}-${version}.tgz`) {
          if (entry.tarballMissing > 0) {
            entry.tarballMissing -= 1;
            response.writeHead(404).end('{}');
            return;
          }
          response.writeHead(200).end(bytes);
          return;
        }
      }
    }
    response.writeHead(404).end('{}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = `http://127.0.0.1:${server.address().port}`;
  t.after(() => server.close());
  return address;
}

const QUICK = { retryDelayMs: 0, lagAttempts: 3, lagIntervalMs: 0 };

// The fixture workspace in a git repository: released as v1.2.3, followed by
// one fix, and packed at 1.2.4 as the pack job would after `version --write`.
// With addedAfterRelease, the package was private when v1.2.3 was tagged, so
// that release did not publish it.
function releasedWorkspace({ build = 'export const icon = 1;\n', addedAfterRelease = false } = {}) {
  const root = repository({
    'packages/icons/dist/index.js': 'export const icon = 1;\n',
    ...(addedAfterRelease ? { 'packages/icons/package.json': manifest({ private: true }) } : {}),
  });
  history(root);
  git(root, 'add', '.');
  commit(root, 'feat(icons): the first icons');
  tag(root, 'v1.2.3');
  const published = packDirectory(join(root, 'packages/icons'));
  commit(root, 'fix(icons): the next change');
  writeFileSync(join(root, 'packages/icons/package.json'), `${JSON.stringify(manifest({ version: '1.2.4' }), null, 2)}\n`);
  writeFileSync(join(root, 'packages/icons/dist/index.js'), build);
  const directory = mkdtempSync(join(tmpdir(), 'release-packages-'));
  directories.push(directory);
  writeFileSync(join(directory, tarballName('@crewlethq/icons', '1.2.4')), packDirectory(join(root, 'packages/icons')));
  return { root, directory, published };
}

function packDirectory(directory) {
  const destination = mkdtempSync(join(tmpdir(), 'release-tarball-'));
  directories.push(destination);
  const result = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, npm_config_update_notifier: 'false', npm_config_loglevel: 'error' },
  });
  assert.equal(result.status, 0, result.stderr);
  return readFileSync(join(destination, JSON.parse(result.stdout)[0].filename));
}

// Runs compare against the fixture registry, collecting what it logs.
async function compareQuietly(options) {
  const lines = [];
  const result = await compare({ ...options, timing: QUICK, log: (line) => lines.push(line) });
  return { result, lines };
}

describe('compare', () => {
  it('releases nothing when the packed contents equal the latest published version', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    const registry = await startRegistry(t, { '@crewlethq/icons': { latest: '1.2.3', tarballs: { '1.2.3': published } } });
    const { result, lines } = await compareQuietly({ root, directory, registry });
    const file = tarballName('@crewlethq/icons', '1.2.4');
    const expected = {
      version: '1.2.4',
      release: false,
      base: 'v1.2.3',
      packages: [
        { name: '@crewlethq/icons', file, integrity: integrityOf(readFileSync(join(directory, file))), previous: '1.2.3', changed: false },
      ],
    };
    assert.deepEqual(result, expected);
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'release.json'), 'utf8')), expected);
    assert.equal(lines.at(-1), 'Nothing to release: no package differs from its latest published version.');
  });

  it('releases when a published file changed, and lists what changed', async (t) => {
    const { root, directory, published } = releasedWorkspace({ build: 'export const icon = 2;\n' });
    const registry = await startRegistry(t, { '@crewlethq/icons': { latest: '1.2.3', tarballs: { '1.2.3': published } } });
    const { result, lines } = await compareQuietly({ root, directory, registry });
    assert.equal(result.release, true);
    assert.equal(result.packages[0].changed, true);
    assert.ok(lines.includes('  changed dist/index.js'), lines.join('\n'));
  });

  it('releases a package that is not on the registry yet and was not part of the previous release', async (t) => {
    const { root, directory } = releasedWorkspace({ addedAfterRelease: true });
    const registry = await startRegistry(t, {});
    const { result } = await compareQuietly({ root, directory, registry });
    assert.equal(result.release, true);
    assert.equal(result.packages[0].previous, null);
  });

  it('waits for a registry that does not serve a package the previous release published, then refuses', async (t) => {
    const { root, directory } = releasedWorkspace();
    const registry = await startRegistry(t, { '@crewlethq/icons': { latest: '1.2.3', tarballs: {}, missing: Infinity } });
    const lines = [];
    await assert.rejects(
      compare({ root, directory, registry, timing: QUICK, log: (line) => lines.push(line) }),
      /@crewlethq\/icons was released as v1\.2\.3, but the registry does not serve the package/,
    );
    assert.equal(lines.filter((line) => line.startsWith('The registry does not serve 1.2.3')).length, QUICK.lagAttempts - 1);
  });

  it('releases nothing when the registry only briefly failed to serve a released package', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    const registry = await startRegistry(t, {
      '@crewlethq/icons': { latest: '1.2.3', tarballs: { '1.2.3': published }, missing: 2, tarballMissing: 2 },
    });
    const { result } = await compareQuietly({ root, directory, registry });
    assert.equal(result.release, false);
  });

  it('refuses a published tarball the registry record places on another host', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    const registry = await startRegistry(t, {
      '@crewlethq/icons': { latest: '1.2.3', tarballs: { '1.2.3': published }, tarballHost: 'https://registry.example.com' },
    });
    await assert.rejects(compareQuietly({ root, directory, registry }), /names no tarball on http:\/\/127\.0\.0\.1/);
  });

  it('waits for a registry that still serves the version before the latest release', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    const registry = await startRegistry(t, {
      '@crewlethq/icons': { latest: ['1.2.2', '1.2.2', '1.2.3'], tarballs: { '1.2.2': published, '1.2.3': published } },
    });
    const { result } = await compareQuietly({ root, directory, registry });
    assert.equal(result.release, false);
  });

  it('refuses a registry whose latest version is not the latest release tag', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    const registry = await startRegistry(t, { '@crewlethq/icons': { latest: '1.2.4', tarballs: { '1.2.4': published } } });
    await assert.rejects(
      compareQuietly({ root, directory, registry }),
      /the latest version on the registry is 1\.2\.4, but the latest release tag reachable from this commit is v1\.2\.3/,
    );
  });

  it('refuses a published tarball that does not match the integrity the registry records', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    const registry = await startRegistry(t, {
      '@crewlethq/icons': { latest: '1.2.3', tarballs: { '1.2.3': published }, integrity: integrityOf(Buffer.from('other')) },
    });
    await assert.rejects(
      compareQuietly({ root, directory, registry }),
      /does not match the integrity the registry records for it/,
    );
  });

  it('refuses manifests that do not carry the version the commit is released as', async (t) => {
    const { root, directory, published } = releasedWorkspace();
    writeFileSync(join(root, 'packages/icons/package.json'), `${JSON.stringify(manifest(), null, 2)}\n`);
    const registry = await startRegistry(t, { '@crewlethq/icons': { latest: '1.2.3', tarballs: { '1.2.3': published } } });
    await assert.rejects(
      compareQuietly({ root, directory, registry }),
      /the manifests carry 1\.2\.3, but this commit is released as 1\.2\.4\. Run node scripts\/release\.mjs version --write/,
    );
  });
});
