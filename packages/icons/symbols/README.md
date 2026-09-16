# Material Symbols

The glyph drawings behind `@crewlethq/icons/glyphs`. The build compiles each pair into one React component, so a consumer imports `CloseGlyph` rather than a font, a sprite or a URL, and a closed network draws the same glyph an open one does.

| Style | Weight | Grade | Optical sizes | Fills | Files | License | Upstream |
| ----- | ------ | ----- | ------------- | ----- | ----- | ------- | -------- |
| Material Symbols Outlined | 400 | 0 | 20 px (`20/`), 24 px (`24/`) | fill 0 for every glyph, fill 1 for `check_circle`, `error`, `info` and `warning` | 101 glyphs at both optical sizes, 202 files | Apache License 2.0 | <https://github.com/google/material-design-icons> |

Every file is `<svg xmlns height viewBox width><path d="..."/></svg>` on the `0 -960 960 960` viewBox, and the build refuses anything else.

## Why both optical sizes

The optical size axis is a different drawing, not a scaled one: the 20 px `close` is a 51-unit stroke on the 960 grid and the 24 px one is 56. uilet's own components and the Crewlet console already pin `opsz` 20 and 24 in `font-variation-settings`, so a package that shipped one drawing would render a visibly lighter or heavier glyph than the surface beside it. `Glyph` picks the 20 px drawing at and below 20 px and the 24 px drawing above it.

`@material-symbols/svg-400` is not the source for the same reason: it ships the 48 px optical size alone ("Other variations of grade and size are not included to keep the package size small", its README), which is neither of the two sizes this design system draws.

## Provenance

The files are copied byte for byte from the `master` branch of `google/material-design-icons` at commit [`40a7a29`](https://github.com/google/material-design-icons/commit/40a7a292a79d9394157e1ea24f83d52d5e17c556) (11 September 2026). The upstream path of each file follows from its name:

| This file | Upstream path |
| --------- | ------------- |
| `20/close.svg` | `symbols/web/close/materialsymbolsoutlined/close_20px.svg` |
| `24/close.svg` | `symbols/web/close/materialsymbolsoutlined/close_24px.svg` |
| `20/check_circle-fill.svg` | `symbols/web/check_circle/materialsymbolsoutlined/check_circle_fill1_20px.svg` |

A commit rather than a tag: the repository's newest tag is `4.0.0`, which predates Material Symbols and carries no `symbols/` tree at all, so there is no tag to pin. A commit is the stronger pin in any case, because a tag can be moved and a commit cannot.

[`SHA256SUMS`](./SHA256SUMS) holds the checksum of every file. `shasum -a 256 -c SHA256SUMS` verifies them from this directory, and the package build fails when a file is missing, unlisted or does not match its checksum.

## License

The drawings are licensed under the Apache License, Version 2.0. [`LICENSE`](./LICENSE) holds the license text, which section 4(a) requires to travel with every copy, and [`NOTICE`](./NOTICE) the attribution. Upstream ships no `NOTICE` of its own, so section 4(d) adds nothing; that file is this package's own attribution, and it records that the drawings are unchanged, which is what section 4(b) asks of anyone who does change them.

Both travel with every copy: they ship in the npm tarball (`scripts/release.mjs` refuses a tarball that carries the drawings without them), in the built Storybook, and in the third-party notices of any application that bundles the package.

The package's own `license` field is therefore `MIT AND Apache-2.0`. Everything else in `@crewlethq/icons` stays MIT.

## Adding or replacing a glyph

1. Run `node scripts/vendor-symbols.mjs <glyph_name> ...` from the package root. It downloads both optical sizes at the pinned commit, writes them into `20/` and `24/`, and rewrites `SHA256SUMS`. A name ending in `-fill` fetches the fill 1 variant. With no arguments it re-downloads every glyph already here, which is how a commit bump is applied.
2. To move to a newer upstream commit, change `COMMIT` in `scripts/symbols.mjs`, run it with no arguments, and update the commit in this file and in `NOTICE`. Review the diff: a glyph whose drawing changed upstream shows up as a changed path.
3. Run `npm run build` in this package. The glyph components, `GLYPH_NAMES` and the `GlyphName` union are generated from the files in `20/`, so a new glyph needs no other edit.
4. Add the new name to the table in the package [README](../README.md#glyphs) if it carries a meaning the table records.
