# Uilet

Crewlet design system. One repository, three published packages, and a Storybook showroom.

## Packages

| Package             | Purpose                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `@crewlethq/tokens` | Design tokens (color, spacing, typography, radius, shadow, blur, breakpoint, motion, z-index) and fonts |
| `@crewlethq/icons`  | Signature illustrated icons as React components                                                           |
| `@crewlethq/ui`     | Cross-app React components built on tokens and icons                                                      |

## Install

The packages are public on registry.npmjs.org, so no registry configuration or token is needed:

```bash
npm install --save-exact @crewlethq/tokens @crewlethq/icons @crewlethq/ui
```

All three are released together under one version, and `@crewlethq/ui` depends on the tokens and icons of exactly its own version. Upgrade the three together and keep them at the same version, or the app installs a second copy of the tokens and icons for `@crewlethq/ui` to use.

## Stack

- npm workspaces
- Turborepo for caching and task orchestration
- TypeScript 5 (strict, ES2022, Bundler resolution)
- ESLint flat config with `typescript-eslint`
- Vite 8, Storybook 10 for the showroom
- Style Dictionary 5 for token transforms
- SVGR for the icon pipeline
- tsup for package bundling
- GitHub Actions CI on the exact Node release in `.nvmrc`

## Local development

```bash
nvm use                        # the Node release in .nvmrc
npm ci --ignore-scripts
npm run build                  # build all packages once
npm run storybook              # open the Storybook at http://localhost:3006
npm run dev                    # watch mode across all packages
npm run lint && npm run typecheck
```

## Layout

```
.
├── apps/
│   └── storybook/             # @crewlethq/storybook (private)
├── packages/
│   ├── tokens/                # @crewlethq/tokens
│   ├── icons/                 # @crewlethq/icons
│   └── ui/                    # @crewlethq/ui
├── scripts/
│   ├── release.mjs            # release version, consistency check, build, pack and registry comparison
│   ├── check-signoff.mjs      # Signed-off-by gate for pull requests and main
│   └── check-storybook-static.mjs  # static-site and font license check for the Storybook build
└── .github/
    ├── actions/               # composite actions the workflows share
    ├── deploy/                # the locked Wrangler release the Storybook deployment installs
    └── workflows/             # ci, release, deploy-storybook
```

## Adding a new package

1. Create `packages/<name>/` with a `package.json` named `@crewlethq/<name>`.
2. Extend `tsconfig.base.json` from the new package's `tsconfig.json`.
3. Re-run `npm install` at the repo root to wire the workspace link.
4. Reference it from another workspace with the exact version the published manifests carry, never a range. `npm run release:check` enforces this, and every release writes its own version into the pin.
5. A package that is not `"private": true` is published with the others. It needs the manifest metadata `npm run release:check` asks for, and the one-time setup in [RELEASING.md](RELEASING.md#adding-a-published-package-later) before its first release.

## Releasing

Every merge to `main` that changes what the packages publish is released to npm automatically, through npm trusted publishing with provenance, and tagged `v<version>`. The version is computed from the Conventional Commits types merged since the previous release; `npm run release:version` prints the version the current commit would be released as. See [RELEASING.md](RELEASING.md) for the full runbook.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, the checks a pull request has to pass, and the commit conventions, including the sign-off every commit carries under the [Developer Certificate of Origin](DCO). Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md). Do not open a public issue for them.

## License

The code and assets in this repository are licensed under the [MIT License](LICENSE); each published package carries the same `LICENSE` file. The Inter and JetBrains Mono font files in `@crewlethq/tokens` are licensed under the SIL Open Font License 1.1 (see [`packages/tokens/fonts/OFL.txt`](packages/tokens/fonts/OFL.txt)).

The Crewlet name, logo and character are trademarks and are not licensed under the MIT License. See [TRADEMARKS.md](TRADEMARKS.md).
