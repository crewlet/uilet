# Fonts

The type families behind `--font-family-sans`, `--font-family-display` (an alias of sans) and `--font-family-mono`. `@crewlethq/tokens/css/fonts` declares an `@font-face` rule for every file below with a relative URL, so a bundler copies the files next to the application and no font is fetched from a third-party host.

| Family | Version | Axes | Files | License | Upstream |
| ------ | ------- | ---- | ----- | ------- | -------- |
| Geist | 1.800 | `wght` 100 to 900 | `geist-latin.woff2`, `geist-latin-ext.woff2` | SIL Open Font License 1.1 | <https://github.com/vercel/geist-font> |
| Geist Mono | 1.701 | `wght` 100 to 900 | `geist-mono-latin.woff2`, `geist-mono-latin-ext.woff2` | SIL Open Font License 1.1 | <https://github.com/vercel/geist-font> |

The family is each file's name ID 1, the version its name ID 5 (`Version 1.800`), and the axes its `fvar` table. Geist Mono's unique identifier (name ID 3) still reads `1.700`; its version string and its `head` revision both read 1.701. Upright style only; a browser synthesises italics.

The package's `test/fonts.test.mjs` (in the repository, not the tarball) reads those values out of every file and fails when this table, the weight range the build declares, or the notices at the top of [`OFL.txt`](./OFL.txt) disagree with them.

## Provenance

The files are the `latin` and `latin-ext` subsets that Google Fonts serves (Geist v5 and Geist Mono v6 on its CDN), downloaded unchanged from these stylesheet responses (requested with a current Chrome user agent, which selects variable woff2 files):

| Stylesheet request | Subset | File | Downloaded from |
| ------------------ | ------ | ---- | --------------- |
| `https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap` | latin | `geist-latin.woff2` | `https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFU.woff2` |
| same | latin-ext | `geist-latin-ext.woff2` | `https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwSGFWfOw.woff2` |
| `https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap` | latin | `geist-mono-latin.woff2` | `https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmg.woff2` |
| same | latin-ext | `geist-mono-latin-ext.woff2` | `https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrkdmgPn.woff2` |

[`SHA256SUMS`](./SHA256SUMS) holds the checksum of every file. `shasum -a 256 -c SHA256SUMS` verifies them, and the package build fails when a file does not match its checksum or has none.

Google Fonts builds these subsets from the upstream variable fonts. It keeps the whole `wght` axis and only the glyphs in each subset's unicode range (plus the few that a kept feature composes from), and it drops the `meta` table and the license description (name ID 13; the license URL, name ID 14, stays). Under the definitions in the OFL that makes them Modified Versions. That is permitted, because neither family declares a Reserved Font Name, and they remain under the OFL. The copyright notices are preserved in each file and in `OFL.txt`.

It also keeps only some of the layout features, and which ones matters to the kit:

- `geist-latin.woff2` keeps `ccmp`, `dnom`, `frac`, `liga`, `locl`, `numr`, `pnum` and `tnum`. So `font-variant-numeric: tabular-nums`, which the document baseline and every numeric component set, draws tabular figures, and `proportional-nums` and `diagonal-fractions` work too.
- `geist-mono-latin.woff2` keeps `ccmp`, `dnom`, `frac`, `locl` and `numr`. It has no `tnum` and needs none: the face is fixed-pitch (its `post` table says so), so every figure already has one width.
- Both `latin-ext` files keep only `locl`. The figures live in the `latin` files.
- Upstream's stylistic sets (`ss01` to `ss11`), `case`, `sups`, `subs`, `sinf`, `ordn`, `dlig` and `aalt` are in neither family's served subsets, so a `font-feature-settings` naming one of them does nothing.

The `latin` subset covers basic Latin, Latin-1 and common punctuation; `latin-ext` adds the extended Latin alphabets. Each `@font-face` rule carries the same `unicode-range` the stylesheet response declares (the two families' responses declare identical ranges), so a page that renders only basic Latin text downloads one file per family. Other scripts (Cyrillic, Greek, Vietnamese) and Geist Mono's box-drawing characters (Google Fonts' `symbols2` subset) are not included and render in the fallback system fonts of the family stack.

## License

Both families are licensed under the SIL Open Font License, Version 1.1. [`OFL.txt`](./OFL.txt) holds the copyright notices and the full license text. The OFL requires that text to travel with the font files wherever they are redistributed, and it continues to apply to these files whatever license covers the rest of this package.

An application that bundles the fonts meets that condition by shipping `OFL.txt` with them: import `@crewlethq/tokens/fonts/OFL.txt` as an asset so the bundler emits it beside the font files, or copy its text into the application's third-party notices.

## Replacing a file

1. Request the stylesheet in the table above (with the family's full `wght` range) using a current Chrome user agent, and download the `latin` and `latin-ext` woff2 files it references. Keep the file names.
2. Read the family, the version and the axes from each file (for example with `fonttools ttx -t name -t fvar -t STAT`), and its copyright notice (name ID 0).
3. Regenerate the checksums with `shasum -a 256 *.woff2 > SHA256SUMS` in this directory.
4. Update both tables above, the `weight` range for the family in `scripts/build.mjs`, the unicode ranges there if the stylesheet response changed them, and the notices at the top of `OFL.txt` if a file's name ID 0 changed.
5. Run `npm run build` and then `npm test` in this package. The build fails if a file referenced by `scripts/build.mjs` is missing or does not match `SHA256SUMS`; the tests fail if a file's family, version, axes or copyright notice no longer matches what this README, the built `@font-face` rules and `OFL.txt` say about it.
