# Contributing to the Crewlet design system

Thank you for your interest in contributing. This document covers setting up the workspace, the checks a change has to pass, and the conventions for commits and pull requests.

## Development setup

Prerequisites: the Node version in [`.nvmrc`](.nvmrc), which bundles the npm version recorded in the root `package.json` `packageManager` field. CI installs exactly that pair and fails when npm differs.

```bash
git clone https://github.com/crewlet/uilet.git
cd uilet
nvm use
npm ci --ignore-scripts
npm run build        # tokens, icons, ui and the Storybook
npm run storybook    # http://localhost:3006
```

`npm run dev` watches every package. The workspace layout and the purpose of each package are in the [README](README.md).

## Checks

A pull request runs the same commands CI runs, and a change is ready when all of them pass locally:

```bash
node scripts/release.mjs check   # manifests, workspace pins, lockfile sources, toolchain pins
npm ci --ignore-scripts
npm run build
npm run lint                     # ESLint, plus the CSS custom property check in packages/ui
npm run typecheck
npm test                         # the suites under scripts/
npm run release:pack -- "$(mktemp -d)"
node scripts/check-signoff.mjs
npm run release:version          # the version a merge of this branch would be released as
```

`release.mjs pack` packs the three tarballs from the build exactly as a release would and fails on a manifest, license file, notice or entry point that would break publishing. `check-signoff.mjs` compares your branch with `origin/main` (or `upstream/main` in a fork), and `release:version` reads the release tags, so fetch both first (`git fetch origin --tags`).

CI runs two more checks that are not worth repeating locally. It refreshes the lockfile and fails if that changes it, so commit `package-lock.json` whenever a manifest changes. Its `pack` job runs `node scripts/release.mjs build` and `node scripts/release.mjs version --write` in a fresh checkout, which reinstall only the published packages (and would remove the Storybook's dependencies from a local checkout) and write the computed version into the manifests, which is never committed.

Dependencies install with `--ignore-scripts`: no package in the workspace needs an install script, and CI never runs one. A dependency's lockfile entry must resolve from registry.npmjs.org; `release.mjs check` refuses any other source.

## Making a change

- **Components, icons and tokens belong here.** A visual primitive that more than one application needs is added to this repository with a Storybook story, not reimplemented in an application.
- **Class names and custom properties are namespaced.** Component classes start with `crewlet-`, component custom properties with `--crewlet-`, and colours, spacing and type come from `@crewlethq/tokens`. `npm run lint` rejects a stylesheet that reads a token the tokens build does not emit.
- **Accessible defaults.** Interactive components are reachable and operable from the keyboard and expose their state to assistive technology.
- **No third-party requests.** Nothing a package ships may fetch from a third-party host, apart from the documented, opt-in Material Symbols stylesheet.
- **Breaking changes are called out.** A renamed export, CSS class, CSS variable, icon name or import path is a breaking change. Mark the commit that makes it as breaking (see [Commits](#commits)), because that is what moves the version, and list it in the pull request, because the release notes are built from pull request titles.

## Commits

Commit subjects are semantic: `type(scope): summary`, imperative, lowercase, no trailing period, at most 72 characters. The type is one of `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`, `chore` or `revert`; the scope is the package (`tokens`, `icons`, `ui`), `storybook`, `release`, `deps`, or the workflow name for `ci`.

### Your commit types decide the release version

Every merge to `main` is released automatically, and nobody picks the version: it is computed from the types of the commits merged since the previous release, following [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). So the type is part of the change, not a label on it:

- **`feat`** for a new component, prop, icon, token or export. It moves the minor number.
- **A breaking change** is marked with `!` after the type or scope (`refactor(ui)!: rename the Button export`), or with a footer that tells consumers what to change:

  ```text
  fix(tokens): rename the spacing scale

  BREAKING CHANGE: --crewlet-space-* is now --crewlet-spacing-*; rename every reference.
  ```

  While the major number is `0` it moves the minor number, and from `1.0.0` on the major number.
- **Every other type** (`fix`, `docs`, `refactor`, `build`, and the rest) moves the patch number.

The largest change among the merged commits decides one bump. How the pull request is merged decides which commits count: with a merge commit or a rebase, every commit on your branch; with a squash, the squashed commit alone, whose subject is the pull request title and whose body carries your commit messages (so a `BREAKING CHANGE:` footer in any commit still counts, but a `feat` or `!` in a commit subject does not). A merge that changes nothing the packages publish (documentation, CI, tests, the Storybook) is not released at all. [RELEASING.md](RELEASING.md#how-the-version-is-chosen) has the details.

### Sign your work

Every commit carries a `Signed-off-by` trailer, which certifies the [Developer Certificate of Origin](DCO) for that commit:

```bash
git commit -s
```

CI's `sign-off` job fails a pull request with an unsigned commit. To repair one, rewrite the branch with `git rebase --signoff <the commit your branch started from>` (the job prints the exact command) and force-push.

## Pull requests

- Use the pull request template; its checklist is what reviewers check.
- The title follows the same `type(scope): summary` form and reads as a release note, because the GitHub release body is generated from pull request titles. Its type matches the largest change in the pull request: a squash merge uses the title as the commit subject that decides the version.
- Keep unrelated changes in separate pull requests.

## Reporting security issues

Do not open a public issue or pull request for a vulnerability. Follow [SECURITY.md](SECURITY.md).

## Code of conduct

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE). The Crewlet name, logo and character are not covered by that license; see [TRADEMARKS.md](TRADEMARKS.md).
