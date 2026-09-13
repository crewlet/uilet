# Fonts

The type families behind `--font-family-sans`, `--font-family-display` (an alias of sans) and `--font-family-mono`. `@crewlethq/tokens/css/fonts` declares an `@font-face` rule for every file below with a relative URL, so a bundler copies the files next to the application and no font is fetched from a third-party host.

| Family | Version | Axes | Files | License | Upstream |
| ------ | ------- | ---- | ----- | ------- | -------- |
| Inter | 4.001 | `wght` 100 to 900 (optical size fixed at 14) | `inter-latin.woff2`, `inter-latin-ext.woff2` | SIL Open Font License 1.1 | <https://github.com/rsms/inter> |
| JetBrains Mono | 2.211 | `wght` 100 to 800 | `jetbrains-mono-latin.woff2`, `jetbrains-mono-latin-ext.woff2` | SIL Open Font License 1.1 | <https://github.com/JetBrains/JetBrainsMono> |

The version and axes are read from each file's `name` and `fvar` tables. Upright style only; a browser synthesises italics.

## Provenance

The files are the `latin` and `latin-ext` subsets that Google Fonts serves, downloaded unchanged from these stylesheet responses (requested with a current Chrome user agent, which selects variable woff2 files):

| Stylesheet request | Subset | File | Downloaded from |
| ------------------ | ------ | ---- | --------------- |
| `https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap` | latin | `inter-latin.woff2` | `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2` |
| same | latin-ext | `inter-latin-ext.woff2` | `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7W0Q5n-wU.woff2` |
| `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap` | latin | `jetbrains-mono-latin.woff2` | `https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD7OwGtT0rU.woff2` |
| same | latin-ext | `jetbrains-mono-latin-ext.woff2` | `https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbV2o-flEEny0FZhsfKu5WU4xD1OwGtT0rU3BE.woff2` |

[`SHA256SUMS`](./SHA256SUMS) holds the checksum of every file. `shasum -a 256 -c SHA256SUMS` verifies them, and the package build fails when a file does not match its checksum or has none.

Google Fonts builds these subsets from the upstream variable fonts: it keeps only the glyphs in each subset's unicode range, fixes Inter's optical size axis at 14 and drops the license description from the `name` table. Under the definitions in the OFL that makes them Modified Versions. That is permitted, because neither family declares a Reserved Font Name, and they remain under the OFL. The copyright notices are preserved in each file and in `OFL.txt`.

The `latin` subset covers basic Latin, Latin-1 and common punctuation; `latin-ext` adds the extended Latin alphabets. Each `@font-face` rule carries the same `unicode-range` the stylesheet response declares, so a page that renders only basic Latin text downloads one file per family. Other scripts (Cyrillic, Greek, Vietnamese) are not included and render in the fallback system fonts of the family stack.

## License

Both families are licensed under the SIL Open Font License, Version 1.1. [`OFL.txt`](./OFL.txt) holds the copyright notices and the full license text. The OFL requires that text to travel with the font files wherever they are redistributed, and it continues to apply to these files whatever license covers the rest of this package.

An application that bundles the fonts meets that condition by shipping `OFL.txt` with them: import `@crewlethq/tokens/fonts/OFL.txt` as an asset so the bundler emits it beside the font files, or copy its text into the application's third-party notices.

## Replacing a file

1. Request the stylesheet in the table above (with the family's full `wght` range) using a current Chrome user agent, and download the `latin` and `latin-ext` woff2 files it references. Keep the file names.
2. Read the version and the axes from each file (for example with `fonttools ttx -t name -t fvar -t STAT`).
3. Regenerate the checksums with `shasum -a 256 *.woff2 > SHA256SUMS` in this directory.
4. Update both tables above, the `weight` range for the family in `scripts/build.mjs`, the unicode ranges there if the stylesheet response changed them, and the copyright lines in `OFL.txt` if upstream changed them.
5. Run `npm run build` in this package. The build fails if a file referenced by `scripts/build.mjs` is missing or does not match `SHA256SUMS`.
