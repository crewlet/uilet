## What and why

<!-- What does this pull request change, and what problem does it solve? -->

## Breaking changes

<!-- List every renamed or removed export, CSS class, CSS variable, icon name
     or import path, with its replacement. Write "None" if there are none.
     A breaking change must also be marked in a commit, with "!" after the
     type or scope or with a "BREAKING CHANGE:" footer: that marker, not this
     section, is what moves the release version. -->

## Checklist

- [ ] `npm run build`, `npm run lint`, `npm run typecheck` and `npm test` pass
- [ ] `node scripts/release.mjs pack "$(mktemp -d)"` passes
- [ ] New or changed components have a Storybook story and keyboard and screen reader support
- [ ] Every commit is signed off (`git commit -s`), see CONTRIBUTING.md, "Sign your work"
- [ ] Commit subjects and the pull request title are `type(scope): summary`, and the title reads as a release note
- [ ] Commit types match the change: `feat` for a feature, and `!` or a `BREAKING CHANGE:` footer for a breaking change. They decide the version this pull request is released as when it merges (see CONTRIBUTING.md, "Your commit types decide the release version")
