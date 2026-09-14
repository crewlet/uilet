// Release tooling for the published workspaces. It depends on nothing but
// Node itself and git, so the release workflow can run `check` before `npm ci`
// has executed a single line of third-party code.
//
//   node scripts/release.mjs check
//     Verifies that every published package carries one shared version, that
//     the version is MAJOR.MINOR.PATCH, that every dependency between
//     workspaces pins that version exactly, that each manifest holds exactly
//     the metadata npm provenance and public publishing rely on, that every
//     lockfile installs only from the npm registry, and that the Node and npm
//     pins are exact.
//
//   node scripts/release.mjs version [--write]
//     Prints the version the commit at HEAD is released as, and why. With
//     --write, also writes that version into every published manifest and
//     every dependency between workspaces. Only the release workflow's pack job
//     (and CI's rehearsal of it) writes, in a throwaway checkout; nothing ever
//     commits the result.
//
//   node scripts/release.mjs build
//     Runs `check`, installs only what the published packages need (the root
//     tooling and the published workspaces, with no install scripts), and
//     builds those packages. The Storybook and everything only it depends on
//     are neither installed nor run, so they cannot touch the bytes a release
//     publishes.
//
//   node scripts/release.mjs pack <directory>
//     Runs `check`, packs every published package into <directory>, and
//     verifies each tarball: every entry point the manifest declares is inside
//     it, no source map is, it carries the root LICENSE (and TRADEMARKS.md,
//     when it ships one) unchanged, and every directory of font files carries
//     the OFL.txt the font license requires.
//
//   node scripts/release.mjs compare <directory>
//     Compares every tarball `pack` wrote into <directory> with the latest
//     version of that package on the registry, and writes
//     <directory>/release.json: the release version, and whether anything is
//     to be released at all.
//
// Why one shared version: @crewlethq/ui is built and tested against the tokens
// and icons in the same commit, and nothing else. Independent versions would
// let a consumer resolve a combination that no commit ever contained.
//
// How the release version is chosen. Every merge to main is a release
// candidate, and its version follows from history rather than from a file a
// pull request edits: the highest release tag (vMAJOR.MINOR.PATCH) reachable
// from the commit, bumped by the Conventional Commits types of every non-merge
// commit since that tag. A breaking change (a "!" after the type or scope, or a
// BREAKING CHANGE footer) moves the minor number while the major number is 0
// and the major number after that, a feat moves the minor number, and every
// other commit moves the patch number. The manifests in the tree are never
// rewritten, because main only accepts reviewed pull requests and a bot commit
// would need a bypass of that rule. Their version is therefore the seed of the
// very first release, used only while no release tag exists, and the version
// local builds and the Storybook carry.
//
// Why a release is skipped when nothing changed: the version moves on every
// merge, including merges that only touch documentation, CI or the Storybook.
// Publishing those would put versions on the registry that differ from their
// predecessor in nothing but the number, so `compare` looks at the bytes that
// would be published instead of at the paths a merge touched.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@crewlethq/';
const REPOSITORY_URL = 'git+https://github.com/crewlet/uilet.git';
const REGISTRY = 'https://registry.npmjs.org';
// The SPDX expression each published package must declare. @crewlethq/tokens
// ships the Inter and JetBrains Mono font files, which stay under the SIL Open
// Font License, so MIT alone would misstate the terms of part of that tarball.
const LICENSES = {
  '@crewlethq/tokens': 'MIT AND OFL-1.1',
  '@crewlethq/icons': 'MIT',
  '@crewlethq/ui': 'MIT',
};
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
// Every lockfile an install in this repository reads: the workspace, and the
// deployment tooling the deploy-storybook workflow installs on its own.
const LOCKFILES = ['package-lock.json', '.github/deploy/package-lock.json'];
// Root files a published package ships a copy of. LICENSE is required in
// every tarball; the others are verified whenever a tarball carries them.
const REQUIRED_NOTICES = ['LICENSE'];
const OPTIONAL_NOTICES = ['TRADEMARKS.md'];
// Trusted publishing (the OIDC exchange) arrived in npm 11.5.1; an older npm
// finds no credential and fails the publish with ENEEDAUTH.
const MINIMUM_NPM = [11, 5, 1];

// A release version, and the tag that records one. Pre-release versions are
// deliberately absent: the version is computed on every merge and there is
// one release line, so nothing would ever choose a pre-release, and a
// hand-made pre-release tag is not a release the next version builds on.
// Build metadata is absent too, because npm ignores it when comparing
// versions, so two versions differing only in it would be the same version.
const EXACT_RELEASE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_TAG = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;

// Registry requests. The packuments and tarballs read here are at most a few
// megabytes and the registry answers them in well under a second, so thirty
// seconds only ever cuts off a request that has stalled. Three attempts with a
// doubling delay ride out the brief 5xx and 429 answers the registry gives
// under load without holding a failing run for long.
const REQUEST_TIMEOUT_MS = 30_000;
const REQUEST_ATTEMPTS = 3;
// How long `compare` waits for the registry to serve a version the previous
// release published. Releases run one after another, so the run for the next
// merge can start seconds after the last publish, while a registry edge may
// still serve the previous record. Thirty checks ten seconds apart is the same
// five minutes the publish job waits for a version it published to appear.
const REGISTRY_LAG_ATTEMPTS = 30;
const REGISTRY_LAG_INTERVAL_MS = 10_000;
export const TIMING = {
  retryDelayMs: 2_000,
  lagAttempts: REGISTRY_LAG_ATTEMPTS,
  lagIntervalMs: REGISTRY_LAG_INTERVAL_MS,
};

export class ReleaseError extends Error {}

function stdout(line) {
  process.stdout.write(`${line}\n`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function loadWorkspaces(root) {
  const rootManifest = readJson(join(root, 'package.json'));
  const workspaces = [];
  for (const pattern of rootManifest.workspaces ?? []) {
    if (!pattern.endsWith('/*') || pattern.slice(0, -2).includes('*')) {
      throw new ReleaseError(
        `package.json: workspace pattern "${pattern}" is not of the form "<directory>/*", which is the only form this script expands`,
      );
    }
    const parent = join(root, pattern.slice(0, -2));
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = join(parent, entry.name);
      let manifest;
      try {
        manifest = readJson(join(directory, 'package.json'));
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      workspaces.push({
        directory: relative(root, directory),
        manifestPath: join(directory, 'package.json'),
        manifest,
      });
    }
  }
  return workspaces;
}

function publishedOf(workspaces) {
  const published = workspaces.filter((workspace) => workspace.manifest.private !== true);
  if (published.length === 0) {
    throw new ReleaseError('no published workspace found: every workspace is marked "private": true');
  }
  return published;
}

function isDependencyKey(key) {
  return key.startsWith('node_modules/') || key.includes('/node_modules/');
}

// A lockfile entry records where npm ci downloads a package from and the hash
// it must match, and both come from the same file. A pull request that points
// one transitive entry at another host, with a hash computed for that host's
// tarball, installs cleanly and hides in a diff nobody reads line by line, so
// every dependency must resolve from the npm registry with a sha512 hash.
export function lockfileProblems(root, path) {
  let lock;
  try {
    lock = readJson(join(root, path));
  } catch (error) {
    if (error.code === 'ENOENT') return [`${path} is missing; every install in this repository runs from a committed lockfile`];
    throw error;
  }
  const problems = [];
  if (lock.lockfileVersion !== 3) {
    problems.push(
      `${path}: lockfileVersion is ${lock.lockfileVersion}, but only version 3 records every entry this check reads. Regenerate it with the npm in packageManager`,
    );
  }
  const packages = lock.packages ?? {};
  const workspaceDirectories = new Set(Object.keys(packages).filter((key) => key !== '' && !isDependencyKey(key)));
  for (const [key, entry] of Object.entries(packages)) {
    if (!isDependencyKey(key)) continue;
    if (entry.link === true) {
      if (!workspaceDirectories.has(entry.resolved)) {
        problems.push(`${path}: "${key}" links to "${entry.resolved}", which is not a workspace recorded in the lockfile`);
      }
      continue;
    }
    // A bundled dependency is inside its parent's tarball and covered by the
    // parent's integrity, so it has no download of its own to check.
    if (entry.inBundle === true) continue;
    if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith(`${REGISTRY}/`)) {
      const location = entry.resolved === undefined ? 'no recorded location' : `"${entry.resolved}"`;
      problems.push(`${path}: "${key}" resolves from ${location}, but every dependency must come from ${REGISTRY}/`);
    }
    if (typeof entry.integrity !== 'string' || !entry.integrity.startsWith('sha512-')) {
      problems.push(`${path}: "${key}" has no sha512 integrity hash`);
    }
  }
  return problems;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function parseRelease(version) {
  const match = EXACT_RELEASE.exec(version);
  return match === null ? null : match.slice(1, 4).map(Number);
}

// .nvmrc names the Node release every job installs, and that release fixes
// the npm it bundles, which the root packageManager field records. A range
// in either would let the toolchain that installs, packs and publishes change
// with nothing in a reviewed commit to show it.
export function toolchainProblems(root, rootManifest) {
  const problems = [];
  let nvmrc;
  try {
    nvmrc = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (nvmrc === undefined || !EXACT_RELEASE.test(nvmrc)) {
    const found = nvmrc === undefined ? 'no file' : `"${nvmrc}"`;
    problems.push(`.nvmrc must name one exact Node release (for example 24.21.0), found ${found}`);
  }
  const match = /^npm@(\d+)\.(\d+)\.(\d+)$/.exec(rootManifest.packageManager ?? '');
  if (!match) {
    problems.push(
      `package.json: "packageManager" must be npm@<exact version>, the npm the Node release in .nvmrc bundles; found "${rootManifest.packageManager}"`,
    );
  } else if (compareVersions(match.slice(1).map(Number), MINIMUM_NPM) < 0) {
    problems.push(
      `package.json: "packageManager" is ${rootManifest.packageManager}, but trusted publishing needs npm ${MINIMUM_NPM.join('.')} or later. Move .nvmrc to a Node release that bundles one`,
    );
  }
  return problems;
}

export function check({ root = ROOT } = {}) {
  const rootManifest = readJson(join(root, 'package.json'));
  const workspaces = loadWorkspaces(root);
  const published = publishedOf(workspaces);
  const internalNames = new Set(workspaces.map((workspace) => workspace.manifest.name));
  const problems = [];

  const versions = new Set(published.map((workspace) => workspace.manifest.version));
  if (versions.size !== 1) {
    const listing = published
      .map((workspace) => `${workspace.directory}/package.json has ${workspace.manifest.version}`)
      .join(', ');
    throw new ReleaseError(
      `the published packages must share one version, but ${listing}. Give every published manifest, and every dependency between workspaces, the same version`,
    );
  }
  const [version] = versions;
  if (typeof version !== 'string' || !EXACT_RELEASE.test(version)) {
    throw new ReleaseError(
      `version "${version}" is not MAJOR.MINOR.PATCH. The manifest version seeds the first release, and releases have no pre-release or build suffix`,
    );
  }

  for (const { directory, manifest } of published) {
    const where = `${directory}/package.json`;
    if (!manifest.name?.startsWith(SCOPE)) {
      problems.push(`${where}: "name" must be in the ${SCOPE} scope, found "${manifest.name}"`);
    }
    const license = LICENSES[manifest.name];
    if (license === undefined) {
      problems.push(`${where}: ${manifest.name} has no expected license in scripts/release.mjs LICENSES; add it there`);
    } else if (manifest.license !== license) {
      problems.push(`${where}: "license" must be "${license}"`);
    }
    // npm provenance refuses a publish whose repository does not match the
    // repository the workflow ran in, and only after the build has finished.
    if (manifest.repository?.url !== REPOSITORY_URL || manifest.repository?.directory !== directory) {
      problems.push(
        `${where}: "repository" must be { "type": "git", "url": "${REPOSITORY_URL}", "directory": "${directory}" }`,
      );
    }
    // npm publish applies every publishConfig key it is not given on the
    // command line: a scoped registry key sends the publish, and the OIDC
    // token exchanged for it, to another host, and a tag key moves a
    // different dist-tag. So the object holds these two keys and nothing else.
    const publishConfig = manifest.publishConfig ?? {};
    if (
      Object.keys(publishConfig).sort().join(',') !== 'access,registry' ||
      publishConfig.access !== 'public' ||
      publishConfig.registry !== REGISTRY
    ) {
      problems.push(`${where}: "publishConfig" must be exactly { "access": "public", "registry": "${REGISTRY}" }`);
    }
    // A top-level tag field wins over the --tag npm publish is given, so a
    // release would silently not move "latest".
    if (Object.hasOwn(manifest, 'tag')) {
      problems.push(`${where}: remove the top-level "tag" field; it overrides the dist-tag the release workflow publishes under`);
    }
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
      problems.push(`${where}: "files" must list what the tarball ships, so nothing else is published by accident`);
    }
  }

  // An exact pin is also what makes npm link the workspace: a pin the
  // workspace's own version does not satisfy installs a copy from the
  // registry instead, and the build would silently use it.
  for (const { directory, manifest } of workspaces) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
        if (internalNames.has(name) && spec !== version) {
          problems.push(
            `${directory}/package.json: ${field}["${name}"] is "${spec}", but a workspace dependency must pin the shared version "${version}" exactly`,
          );
        }
      }
    }
  }

  for (const lockfile of LOCKFILES) problems.push(...lockfileProblems(root, lockfile));
  problems.push(...toolchainProblems(root, rootManifest));

  if (problems.length > 0) {
    throw new ReleaseError(problems.join('\n'));
  }
  return { version, published };
}

// Runs git in root and returns its output. With allowFailure, a non-zero exit
// returns null instead of throwing, for commands whose failure is an answer.
function git(root, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new ReleaseError(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

// What one commit message asks of the version, under Conventional Commits
// 1.0.0. The type is matched without regard to case, as the specification
// requires, and the footer token only in upper case, as it also requires.
// Anything that is not a conventional header (a merge button's default
// subject, a revert, a typo) is a patch: an unrecognised commit still changed
// something, and guessing it was a feature would move the minor number on
// nothing but a spelling.
const HEADER = /^([a-z]+)(?:\([^()\r\n]*\))?(!)?: \S/i;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: \S/;

export function changeOf(message) {
  const [subject = '', ...body] = message.split(/\r?\n/);
  const header = HEADER.exec(subject);
  if (header?.[2] === '!' || body.some((line) => BREAKING_FOOTER.test(line))) return 'breaking';
  if (header?.[1].toLowerCase() === 'feat') return 'feature';
  return 'fix';
}

const CHANGE_RANK = { fix: 0, feature: 1, breaking: 2 };

export function bumpVersion(version, change) {
  const parsed = parseRelease(version);
  if (parsed === null) throw new ReleaseError(`"${version}" is not MAJOR.MINOR.PATCH`);
  const [major, minor, patch] = parsed;
  if (change === 'breaking') return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
  if (change === 'feature') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// The version <head> is released as. See "How the release version is chosen"
// at the top of this file.
export function releasePlan({ root = ROOT, head = 'HEAD', seed }) {
  // A shallow clone knows neither the tags below its boundary nor the commits
  // since them, and would silently answer with the seed or a smaller bump.
  if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new ReleaseError(
      'this checkout is shallow, so the release tags and the commits since them are not all present. Check out with fetch-depth: 0, or run: git fetch --unshallow --tags',
    );
  }
  const commit = git(root, ['rev-parse', '--verify', '--quiet', `${head}^{commit}`], { allowFailure: true })?.trim();
  if (commit === undefined) throw new ReleaseError(`"${head}" does not name a commit in ${root}`);

  let base = null;
  for (const tag of git(root, ['tag', '--merged', commit, '--list', 'v*']).split('\n')) {
    const match = RELEASE_TAG.exec(tag);
    if (match === null) continue;
    if (base === null || compareVersions(parseRelease(match[1]), parseRelease(base.slice(1))) > 0) base = tag;
  }
  if (base === null) {
    if (!EXACT_RELEASE.test(seed ?? '')) throw new ReleaseError(`the manifest version "${seed}" is not MAJOR.MINOR.PATCH`);
    return { version: seed, base: null, change: null, commits: 0 };
  }

  // refs/tags/ in full, so a branch that happens to carry a tag's name cannot
  // stand in for it.
  const range = `refs/tags/${base}..${commit}`;
  if (git(root, ['rev-list', '--count', range]).trim() === '0') {
    return { version: base.slice(1), base, change: null, commits: 0 };
  }
  // Merge commits are skipped: their subject is whatever the merge button
  // wrote, and the commits they bring in are in the range themselves. A range
  // holding nothing but merges still changed the tree, so it is a patch.
  const output = git(root, ['log', '--no-merges', '--no-show-signature', '-z', '--format=%B', range]);
  const messages = output === '' ? [] : output.split('\0');
  if (messages.at(-1) === '') messages.pop();
  const change = messages.map(changeOf).reduce((highest, next) => (CHANGE_RANK[next] > CHANGE_RANK[highest] ? next : highest), 'fix');
  return { version: bumpVersion(base.slice(1), change), base, change, commits: messages.length };
}

export function describePlan(plan) {
  if (plan.base === null) {
    return `No release tag is reachable from this commit, so it is released as the manifest version ${plan.version}.`;
  }
  if (plan.change === null) {
    return `This commit is ${plan.base} itself, so its version is ${plan.version}.`;
  }
  const found = {
    breaking: 'include a breaking change',
    feature: 'include a feature and no breaking change',
    fix: 'include no feature and no breaking change',
  }[plan.change];
  const commits = plan.commits === 1 ? '1 commit' : `${plan.commits} commits`;
  return `The ${commits} since ${plan.base} (merge commits aside) ${found}, so this commit is released as ${plan.version}.`;
}

function writeVersion(root, version) {
  if (!EXACT_RELEASE.test(version ?? '')) {
    throw new ReleaseError(`"${version}" is not MAJOR.MINOR.PATCH`);
  }
  const workspaces = loadWorkspaces(root);
  const published = new Set(publishedOf(workspaces));
  const internalNames = new Set(workspaces.map((workspace) => workspace.manifest.name));

  for (const workspace of workspaces) {
    const { manifest } = workspace;
    if (published.has(workspace)) manifest.version = version;
    for (const field of DEPENDENCY_FIELDS) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        if (internalNames.has(name)) manifest[field][name] = version;
      }
    }
    writeJson(workspace.manifestPath, manifest);
  }
}

function printVersion(root, { write }) {
  const { version: seed } = check({ root });
  const plan = releasePlan({ root, seed });
  stdout(describePlan(plan));
  if (!write) return;
  // The lockfile is left alone: it records the seed version for every
  // workspace, and nothing after this step installs. npm pack reads the
  // manifests only.
  writeVersion(root, plan.version);
  check({ root });
  stdout(`Wrote ${plan.version} into the manifests of this checkout. Do not commit them.`);
}

function npm(root, args, { capture = false } = {}) {
  const result = spawnSync('npm', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new ReleaseError(`npm ${args.join(' ')} exited with status ${result.status}`);
  }
  return result.stdout;
}

function buildPublished(root) {
  const { published } = check({ root });
  npm(root, [
    'ci',
    '--ignore-scripts',
    '--include-workspace-root',
    ...published.flatMap(({ directory }) => ['--workspace', directory]),
  ]);
  npm(root, ['exec', '--no', '--', 'turbo', 'run', 'build', ...published.map(({ manifest }) => `--filter=${manifest.name}`)]);
  stdout(`Built ${published.map(({ manifest }) => manifest.name).join(', ')}`);
}

// Every file an `exports` entry, `main`, `module` or `types` points at must be
// inside the tarball. A missing one installs cleanly and fails only when a
// consumer imports it.
function entryPoints(manifest) {
  const targets = new Set();
  const collect = (value) => {
    if (typeof value === 'string') targets.add(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(manifest.exports);
  for (const field of ['main', 'module', 'types']) collect(manifest[field]);
  return [...targets].map((target) => target.replace(/^\.\//, ''));
}

function matches(target, files) {
  const star = target.indexOf('*');
  if (star === -1) return files.has(target);
  const prefix = target.slice(0, star);
  const suffix = target.slice(star + 1);
  return [...files].some(
    (file) => file.length > prefix.length + suffix.length && file.startsWith(prefix) && file.endsWith(suffix),
  );
}

// Verifies one packed tarball's file list against its manifest and against
// the notices every copy has to carry.
export function tarballProblems(root, { directory, manifest }, filename, files) {
  const problems = [];
  for (const entry of entryPoints(manifest)) {
    if (!matches(entry, files)) {
      problems.push(`${filename}: ${directory}/package.json points at "${entry}", which the tarball does not contain`);
    }
  }
  for (const file of files) {
    if (file.endsWith('.map')) {
      problems.push(`${filename}: ships the source map "${file}"`);
    }
  }
  for (const notice of [...REQUIRED_NOTICES, ...OPTIONAL_NOTICES]) {
    if (!files.has(notice)) {
      if (REQUIRED_NOTICES.includes(notice)) {
        problems.push(`${filename}: ships no ${notice}; copy the root ${notice} into ${directory}`);
      }
      continue;
    }
    if (!readFileSync(join(root, directory, notice)).equals(readFileSync(join(root, notice)))) {
      problems.push(`${filename}: ${directory}/${notice} differs from the root ${notice}; copy the root file again`);
    }
  }
  const fontDirectories = new Set(
    [...files].filter((file) => file.endsWith('.woff2')).map((file) => posix.dirname(file)),
  );
  for (const fontDirectory of fontDirectories) {
    if (!files.has(posix.join(fontDirectory, 'OFL.txt'))) {
      problems.push(`${filename}: ships font files in ${fontDirectory}/ without the OFL.txt their license requires beside them`);
    }
  }
  return problems;
}

function pack(root, destination) {
  if (!destination) {
    throw new ReleaseError('pack needs a destination directory: node scripts/release.mjs pack <directory>');
  }
  const { version, published } = check({ root });
  const target = resolve(destination);
  mkdirSync(target, { recursive: true });

  const problems = [];
  for (const workspace of published) {
    const [result] = JSON.parse(
      npm(root, ['pack', '--workspace', workspace.manifest.name, '--pack-destination', target, '--json'], {
        capture: true,
      }),
    );
    const files = new Set(result.files.map((file) => file.path));
    problems.push(...tarballProblems(root, workspace, result.filename, files));
    stdout(
      `${result.filename}  ${result.entryCount} files  ${result.size} bytes packed  ${result.unpackedSize} bytes unpacked  ${result.integrity}`,
    );
  }
  if (problems.length > 0) {
    throw new ReleaseError(problems.join('\n'));
  }
  stdout(`Packed ${published.length} packages at ${version} into ${target}`);
}

// The file name npm pack gives a package's tarball.
export function tarballName(name, version) {
  return `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;
}

export function integrityOf(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

// A minimal reader for the gzipped tar archives npm pack writes and the
// registry serves: POSIX ustar entries, with pax extended headers (and GNU
// long names) for paths that do not fit a header. It returns every regular
// file's bytes keyed by its path inside the package, which is its path in the
// archive without the first directory, exactly as npm extracts it. Anything a
// package tarball never contains (links, devices) is refused rather than
// skipped, so a comparison is never made over an archive only partly read.
// Written here rather than taken from a dependency because `compare` runs on
// Node alone, like the rest of this file.
const BLOCK = 512;

function headerField(block, start, length) {
  const bytes = block.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return bytes.subarray(0, end === -1 ? length : end).toString('utf8');
}

function headerNumber(block, start, length, what) {
  const text = headerField(block, start, length).trim();
  if (!/^[0-7]+$/.test(text)) {
    throw new ReleaseError(`${what}: a tar header holds "${text}" where an octal number belongs`);
  }
  return Number.parseInt(text, 8);
}

function paxPath(body, what) {
  let path;
  let offset = 0;
  while (offset < body.length) {
    const space = body.indexOf(0x20, offset);
    const length = space === -1 ? Number.NaN : Number(body.subarray(offset, space).toString('ascii'));
    if (!Number.isSafeInteger(length) || length <= space - offset || offset + length > body.length) {
      throw new ReleaseError(`${what}: a pax extended header is malformed`);
    }
    const record = body.subarray(space + 1, offset + length - 1).toString('utf8');
    const equals = record.indexOf('=');
    if (equals !== -1 && record.slice(0, equals) === 'path') path = record.slice(equals + 1);
    offset += length;
  }
  return path;
}

export function readTarball(archive, what) {
  let data;
  try {
    data = gunzipSync(archive);
  } catch (error) {
    throw new ReleaseError(`${what} is not a readable gzip archive: ${error.message}`);
  }
  const files = new Map();
  let offset = 0;
  let longPath;
  for (;;) {
    if (offset + BLOCK > data.length) {
      throw new ReleaseError(`${what} ends before its end-of-archive marker`);
    }
    const header = data.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break;

    let sum = 0;
    for (let index = 0; index < BLOCK; index += 1) sum += index >= 148 && index < 156 ? 0x20 : header[index];
    if (sum !== headerNumber(header, 148, 8, what)) {
      throw new ReleaseError(`${what}: a tar header fails its checksum`);
    }

    const size = headerNumber(header, 124, 12, what);
    const bodyStart = offset + BLOCK;
    if (bodyStart + size > data.length) {
      throw new ReleaseError(`${what} is truncated inside an entry`);
    }
    const body = data.subarray(bodyStart, bodyStart + size);
    offset = bodyStart + Math.ceil(size / BLOCK) * BLOCK;

    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    if (type === 'x') {
      longPath = paxPath(body, what) ?? longPath;
      continue;
    }
    if (type === 'L') {
      longPath = headerField(body, 0, body.length);
      continue;
    }
    if (type === 'g') continue;

    let path = longPath;
    longPath = undefined;
    if (path === undefined) {
      const name = headerField(header, 0, 100);
      // "ustar" followed by a NUL is the POSIX layout, where bytes 345 to 499
      // are a path prefix. The GNU layout spells its magic "ustar " and keeps
      // other fields there.
      const prefix = headerField(header, 257, 6) === 'ustar' ? headerField(header, 345, 155) : '';
      path = prefix === '' ? name : `${prefix}/${name}`;
    }
    if (type === '5') continue;
    if (type !== '0' && type !== '7') {
      throw new ReleaseError(`${what}: "${path}" is a tar entry of type "${type}", which a package tarball never contains`);
    }
    const slash = path.indexOf('/');
    if (slash === -1 || slash === path.length - 1) {
      throw new ReleaseError(`${what}: "${path}" is not inside the package directory of the archive`);
    }
    files.set(path.slice(slash + 1), Buffer.from(body));
  }
  return files;
}

// Stands in for the release version when two manifests are compared. It is
// not a valid version, so no real version or dependency spec can equal it.
const VERSION_PLACEHOLDER = '<release version>';

// A package.json with its own version, and every pin on another published
// package that equals that version, replaced by the placeholder. Those are the
// only fields the release itself writes, so they are the only ones a
// comparison ignores; a pin that does not equal the manifest's own version is
// a real change and stays visible.
function releaseIndependentManifest(bytes, internalNames) {
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString('utf8'));
  } catch {
    return null;
  }
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) return null;
  const { version } = manifest;
  if (Object.hasOwn(manifest, 'version')) manifest.version = VERSION_PLACEHOLDER;
  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field];
    if (dependencies === null || typeof dependencies !== 'object') continue;
    for (const name of Object.keys(dependencies)) {
      if (internalNames.has(name) && dependencies[name] === version) dependencies[name] = VERSION_PLACEHOLDER;
    }
  }
  return JSON.stringify(manifest);
}

// Every difference between two package tarballs' contents, as "added <path>",
// "removed <path>" or "changed <path>", ignoring only what the release version
// itself changes in package.json. An empty list means publishing the current
// tarball would publish the previous version again under a new number.
export function tarballDifferences(previous, current, internalNames) {
  const differences = [];
  for (const path of [...new Set([...previous.keys(), ...current.keys()])].sort()) {
    const before = previous.get(path);
    const after = current.get(path);
    if (before === undefined) {
      differences.push(`added ${path}`);
    } else if (after === undefined) {
      differences.push(`removed ${path}`);
    } else if (path === 'package.json') {
      const left = releaseIndependentManifest(before, internalNames);
      const right = releaseIndependentManifest(after, internalNames);
      const same = left === null || right === null ? before.equals(after) : left === right;
      if (!same) differences.push(`changed ${path}`);
    } else if (!before.equals(after)) {
      differences.push(`changed ${path}`);
    }
  }
  return differences;
}

// The registry must be exactly where the last release left it: every package
// already on it has the latest release tag reachable from this commit as its
// latest version. Anything else means a version was published without the tag
// that records it (the bootstrap before its tag, or a run that failed between
// publishing and tagging), or the registry was changed by hand, and computing
// a version from the tags would collide with, or fall behind, what is there.
export function registryProblems(plan, packages) {
  const problems = [];
  for (const { name, previous } of packages) {
    if (previous === null) continue;
    if (plan.base === null) {
      problems.push(
        `${name}@${previous} is on the registry, but no release tag is reachable from this commit. A release was published without the tag that records it; see "If a release goes wrong" in RELEASING.md`,
      );
    } else if (previous !== plan.base.slice(1)) {
      problems.push(
        `${name}: the latest version on the registry is ${previous}, but the latest release tag reachable from this commit is ${plan.base}. The tags and the registry disagree; see "If a release goes wrong" in RELEASING.md`,
      );
    }
  }
  return problems;
}

// Whether anything is to be released: a package that is not on the registry
// yet, or one whose contents differ from its latest version. A commit that is
// itself the latest release has nothing new to publish, so contents that
// differ there mean the build did not reproduce the published bytes, and
// publishing would be refused as a replacement of that version.
export function releaseDecision(plan, packages) {
  const changed = packages.filter(({ previous, differences }) => previous === null || differences.length > 0);
  const rebuilt = changed.filter(({ previous }) => previous !== null && previous === plan.version);
  if (rebuilt.length > 0) {
    throw new ReleaseError(
      `${rebuilt.map(({ name }) => name).join(', ')} at ${plan.version} is already on the registry, but this commit packs different contents for it. The build is not reproducible; find what differs before releasing anything`,
    );
  }
  return changed.length > 0;
}

async function registryRequest(url, { accept, what, timing }) {
  let failure;
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    if (attempt > 1) await sleep(timing.retryDelayMs * 2 ** (attempt - 2));
    try {
      const response = await fetch(url, {
        headers: { Accept: accept, 'Cache-Control': 'no-cache' },
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404) return null;
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      failure = `HTTP ${response.status}`;
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      failure = error.cause?.message ?? error.message;
    }
  }
  throw new ReleaseError(`could not read ${what} from ${url}: ${failure}`);
}

// The registry's abbreviated record of a package, or null when the package is
// not on the registry at all.
async function fetchPackument(registry, name, timing) {
  const body = await registryRequest(`${registry}/${name.replace('/', '%2F')}`, {
    accept: 'application/vnd.npm.install-v1+json',
    what: `the registry record of ${name}`,
    timing,
  });
  if (body === null) return null;
  let record;
  try {
    record = JSON.parse(body.toString('utf8'));
  } catch {
    throw new ReleaseError(`the registry record of ${name} is not JSON`);
  }
  const latest = record?.['dist-tags']?.latest;
  if (!EXACT_RELEASE.test(latest ?? '')) {
    throw new ReleaseError(`the registry record of ${name} names "${latest}" as its latest version, which is not MAJOR.MINOR.PATCH`);
  }
  return record;
}

async function registryRecords(registry, names, plan, { timing, log }) {
  const baseVersion = plan.base === null ? null : parseRelease(plan.base.slice(1));
  for (let attempt = 1; ; attempt += 1) {
    const records = new Map();
    for (const name of names) records.set(name, await fetchPackument(registry, name, timing));
    const lagging = [...records.values()].some(
      (record) => record !== null && baseVersion !== null && compareVersions(parseRelease(record['dist-tags'].latest), baseVersion) < 0,
    );
    if (!lagging || attempt >= timing.lagAttempts) return records;
    log(`The registry does not serve ${plan.base.slice(1)} as the latest version yet; checking again in ${timing.lagIntervalMs / 1000} seconds.`);
    await sleep(timing.lagIntervalMs);
  }
}

// The published tarball of one version, verified against the integrity the
// registry recorded for it and fetched only from the registry itself.
async function publishedTarball(registry, name, record, version, timing) {
  const dist = record.versions?.[version]?.dist;
  if (typeof dist?.tarball !== 'string' || !dist.tarball.startsWith(`${registry}/`)) {
    throw new ReleaseError(`the registry record of ${name}@${version} names no tarball on ${registry}`);
  }
  if (typeof dist.integrity !== 'string' || !dist.integrity.startsWith('sha512-')) {
    throw new ReleaseError(`the registry record of ${name}@${version} has no sha512 integrity`);
  }
  const bytes = await registryRequest(dist.tarball, {
    accept: 'application/octet-stream',
    what: `the tarball of ${name}@${version}`,
    timing,
  });
  if (bytes === null) throw new ReleaseError(`the registry has no tarball for ${name}@${version} at ${dist.tarball}`);
  if (integrityOf(bytes) !== dist.integrity) {
    throw new ReleaseError(`the tarball of ${name}@${version} does not match the integrity the registry records for it`);
  }
  return bytes;
}

// How many differences a package lists in the log before summarising the
// rest. A dependency update can change every built file, and the log is read
// by a person.
const LISTED_DIFFERENCES = 20;

export async function compare({ root = ROOT, directory, registry = REGISTRY, timing = TIMING, log = stdout } = {}) {
  if (!directory) {
    throw new ReleaseError('compare needs the directory pack wrote into: node scripts/release.mjs compare <directory>');
  }
  const { version, published } = check({ root });
  const plan = releasePlan({ root, seed: version });
  if (plan.version !== version) {
    throw new ReleaseError(
      `the manifests carry ${version}, but this commit is released as ${plan.version}. Run node scripts/release.mjs version --write before pack and compare`,
    );
  }
  const target = resolve(directory);
  const names = published.map(({ manifest }) => manifest.name);
  const internalNames = new Set(names);

  const tarballs = new Map();
  for (const name of names) {
    const file = tarballName(name, version);
    try {
      tarballs.set(name, { file, bytes: readFileSync(join(target, file)) });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      throw new ReleaseError(`${file} is not in ${target}; run node scripts/release.mjs pack ${directory} first`);
    }
  }

  const records = await registryRecords(registry, names, plan, { timing, log });
  const packages = names.map((name) => ({
    name,
    previous: records.get(name)?.['dist-tags'].latest ?? null,
    differences: [],
  }));
  const problems = registryProblems(plan, packages);
  if (problems.length > 0) throw new ReleaseError(problems.join('\n'));

  log(describePlan(plan));
  for (const entry of packages) {
    const { file, bytes } = tarballs.get(entry.name);
    if (entry.previous === null) {
      log(`${entry.name}: not on the registry yet`);
      continue;
    }
    const archive = await publishedTarball(registry, entry.name, records.get(entry.name), entry.previous, timing);
    entry.differences = tarballDifferences(
      readTarball(archive, `the registry tarball of ${entry.name}@${entry.previous}`),
      readTarball(bytes, file),
      internalNames,
    );
    if (entry.differences.length === 0) {
      log(`${entry.name}: the same contents as ${entry.previous}`);
      continue;
    }
    log(`${entry.name}: ${entry.differences.length} difference(s) from ${entry.previous}`);
    for (const difference of entry.differences.slice(0, LISTED_DIFFERENCES)) log(`  ${difference}`);
    if (entry.differences.length > LISTED_DIFFERENCES) {
      log(`  and ${entry.differences.length - LISTED_DIFFERENCES} more`);
    }
  }

  const release = releaseDecision(plan, packages);
  const metadata = {
    version,
    release,
    base: plan.base,
    packages: packages.map(({ name, previous, differences }) => {
      const { file, bytes } = tarballs.get(name);
      return { name, file, integrity: integrityOf(bytes), previous, changed: previous === null || differences.length > 0 };
    }),
  };
  writeJson(join(target, 'release.json'), metadata);
  log(
    release
      ? `Release ${version}: at least one package differs from its latest published version, so all ${names.length} are released at ${version}.`
      : `Nothing to release: no package differs from its latest published version.`,
  );
  return metadata;
}

async function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case 'check': {
      if (rest.length !== 0) throw new ReleaseError('usage: node scripts/release.mjs check');
      const { version: seed } = check();
      stdout(`The release metadata is consistent. The manifest version is ${seed}.`);
      return;
    }
    case 'version':
      if (rest.length > 1 || (rest.length === 1 && rest[0] !== '--write')) {
        throw new ReleaseError('usage: node scripts/release.mjs version [--write]');
      }
      printVersion(ROOT, { write: rest.length === 1 });
      return;
    case 'build':
      if (rest.length !== 0) throw new ReleaseError('usage: node scripts/release.mjs build');
      buildPublished(ROOT);
      return;
    case 'pack':
      if (rest.length !== 1) throw new ReleaseError('usage: node scripts/release.mjs pack <directory>');
      pack(ROOT, rest[0]);
      return;
    case 'compare':
      if (rest.length !== 1) throw new ReleaseError('usage: node scripts/release.mjs compare <directory>');
      await compare({ directory: rest[0] });
      return;
    default:
      throw new ReleaseError(
        'usage: node scripts/release.mjs <check | version [--write] | build | pack <directory> | compare <directory>>',
      );
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof ReleaseError)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  }
}
