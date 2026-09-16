# @crewlethq/ui-tests

The jsdom suite for `@crewlethq/ui`, and nothing else.

It is a workspace of its own so that no test tooling reaches a published
tarball: `scripts/release.mjs build` installs the published workspaces together
with their devDependencies, and a runner declared on `packages/ui` would be
installed by the release pack job, which has no use for one. Marking this
workspace `private` keeps it out of both the pack job and the registry.

The suites live BESIDE the components they cover, at
`packages/ui/src/<Name>/<Name>.test.tsx`, as uilet's conventions ask. Only the
runner, its setup file and the rules about component source live here.

```sh
npm test --workspace @crewlethq/ui-tests     # one run
npm run dev --workspace @crewlethq/ui-tests  # watch
```

`npm test` at the repository root runs it through turbo, together with the
node:test suites in `packages/tokens`, `packages/icons` and `scripts/`.

## What is asserted here rather than in a story

Storybook play functions are documentation. `ci.yml` runs `release check`,
`npm ci`, build, lint, typecheck and test, and there is no browser runner among
them, so a play function is executed by no job. Anything that must not regress
is a test here.
