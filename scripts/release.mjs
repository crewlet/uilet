// Release tooling for the published workspaces. It depends on nothing but
// Node itself, so the release workflow can run `check` before `npm ci` has
// executed a single line of third-party code.
//
//   node scripts/release.mjs check [--tag <tag>]
//     Verifies that every published package carries one shared version, that
//     every dependency between workspaces pins that version exactly, that
//     each manifest holds exactly the metadata npm provenance and public
//     publishing rely on, that every lockfile installs only from the npm
//     registry, and that the Node and npm pins are exact. With --tag, the tag
//     must also be exactly v<version>.
//
//   node scripts/release.mjs set <version>
//     Writes <version> into every published manifest and every dependency
//     between workspaces, then refreshes package-lock.json.
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
// Why one shared version: @crewlethq/ui is built and tested against the tokens
// and icons in the same commit, and nothing else. Independent versions would
// let a consumer resolve a combination that no commit ever contained.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Semantic Versioning 2.0.0 without build metadata. Build metadata is ignored
// by npm when comparing versions, so two tags differing only in it would
// publish the same version twice.
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?$/;
const EXACT_RELEASE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

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

export function check({ root = ROOT, tag } = {}) {
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
      `the published packages must share one version, but ${listing}. Run: npm run release:version -- <version>`,
    );
  }
  const [version] = versions;
  if (typeof version !== 'string' || !SEMVER.test(version)) {
    throw new ReleaseError(`version "${version}" is not a valid semantic version (MAJOR.MINOR.PATCH[-PRERELEASE])`);
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
    // stable release would silently not move "latest".
    if (Object.hasOwn(manifest, 'tag')) {
      problems.push(`${where}: remove the top-level "tag" field; it overrides the dist-tag the release workflow publishes under`);
    }
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
      problems.push(`${where}: "files" must list what the tarball ships, so nothing else is published by accident`);
    }
  }

  for (const { directory, manifest } of workspaces) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
        if (internalNames.has(name) && spec !== version) {
          problems.push(
            `${directory}/package.json: ${field}["${name}"] is "${spec}", but a workspace dependency must pin the release version "${version}" exactly`,
          );
        }
      }
    }
  }

  for (const lockfile of LOCKFILES) problems.push(...lockfileProblems(root, lockfile));
  problems.push(...toolchainProblems(root, rootManifest));

  if (tag !== undefined && tag !== `v${version}`) {
    problems.push(`the tag "${tag}" does not match the manifests: a release of ${version} is tagged v${version}`);
  }

  if (problems.length > 0) {
    throw new ReleaseError(problems.join('\n'));
  }
  return { version, published };
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

function setVersion(root, version) {
  if (!SEMVER.test(version ?? '')) {
    throw new ReleaseError(`"${version}" is not a valid semantic version (MAJOR.MINOR.PATCH[-PRERELEASE])`);
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

  // The lockfile records every workspace's version and its dependency specs,
  // and `npm ci` refuses a lockfile that disagrees with the manifests.
  npm(root, ['install', '--package-lock-only', '--ignore-scripts']);
  check({ root });
  stdout(`Set the release version to ${version}. Commit the manifests and package-lock.json together.`);
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

function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case 'check': {
      let tag;
      if (rest.length === 2 && rest[0] === '--tag') tag = rest[1];
      else if (rest.length !== 0) throw new ReleaseError('usage: node scripts/release.mjs check [--tag <tag>]');
      const { version } = check({ tag });
      stdout(`Release version ${version} is consistent${tag === undefined ? '' : ` with the tag ${tag}`}.`);
      return;
    }
    case 'set':
      if (rest.length !== 1) throw new ReleaseError('usage: node scripts/release.mjs set <version>');
      setVersion(ROOT, rest[0]);
      return;
    case 'build':
      if (rest.length !== 0) throw new ReleaseError('usage: node scripts/release.mjs build');
      buildPublished(ROOT);
      return;
    case 'pack':
      if (rest.length !== 1) throw new ReleaseError('usage: node scripts/release.mjs pack <directory>');
      pack(ROOT, rest[0]);
      return;
    default:
      throw new ReleaseError(
        'usage: node scripts/release.mjs <check [--tag <tag>] | set <version> | build | pack <directory>>',
      );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof ReleaseError)) throw error;
    console.error(error.message);
    process.exitCode = 1;
  }
}
