# @crewlethq/tokens

Single source of truth for the Crewlet design tokens: color, spacing, typography (`font`), radius, shadow, blur, breakpoint, motion and z-index. Authored as JSON, compiled by Style Dictionary into:

- `dist/css/tokens.css` (CSS custom properties on `:root`)
- `dist/index.js` + `dist/index.d.ts` (typed JS object for runtime use)

## Use it from a consumer app

```ts
// 1) Canonical variables. Always import this once at the app entrypoint.
import '@crewlethq/tokens/css';

// 2) Optional: self-hosted Inter and JetBrains Mono (see "Fonts" below).
//    Skip this if the app already loads its own fonts at the shell.
import '@crewlethq/tokens/css/fonts';

// 3) Required when the app renders @crewlethq/ui components and does not load
//    the Material Symbols Outlined icon font itself. This is the only
//    stylesheet in the package that contacts a third-party host (see
//    "Material Symbols" below).
import '@crewlethq/tokens/css/material-symbols';

// 4) Optional: legacy aliases. Map short, unprefixed names (--accent,
//    --bg-primary, --text-primary, --accent-pink, etc.) onto the canonical
//    tokens. Use this while migrating an existing stylesheet that already
//    uses those names, so it keeps working without a sweeping
//    find-and-replace.
import '@crewlethq/tokens/css/legacy';

// Or read tokens at runtime / build theme objects
import { color, spacing } from '@crewlethq/tokens';

const accent = color.brand.primary;
```

CSS variables follow Style Dictionary's `--{group}-{path}` convention,
for example `var(--color-brand-primary)` or `var(--spacing-4)`.

## Fonts

The design system uses two type families, both self-hosted inside this package and licensed under the SIL Open Font License 1.1:

| Token | Family |
| ----- | ------ |
| `--font-family-sans` | Inter |
| `--font-family-display` | An alias of `--font-family-sans` (see the note below) |
| `--font-family-mono` | JetBrains Mono |

`--font-family-display` is declared on `:root` as `var(--font-family-sans)`. A custom property that holds `var()` is resolved on the element that declares it and inherited as a finished value, so the alias follows an override of `--font-family-sans` declared on `:root` and no other. An app that overrides the sans family on `body`, a theme class or any narrower selector sets `--font-family-display` in the same rule.

`@crewlethq/tokens/css/fonts` declares `@font-face` rules whose URLs point at the woff2 files in `fonts/`, relative to the stylesheet. A bundler (Vite, webpack, Rollup, esbuild) resolves those URLs and emits the files with the application's other assets, so the fonts render on a closed network and no request leaves for a third-party host. The files are also exported individually (for example `@crewlethq/tokens/fonts/inter-latin.woff2`) for apps that preload them or serve them from their own static directory.

Versions, subsets and the replacement procedure are in [`fonts/README.md`](./fonts/README.md). The license text and copyright notices are in [`fonts/OFL.txt`](./fonts/OFL.txt), which must accompany the files wherever they are redistributed. An application that bundles the fonts ships it by importing `@crewlethq/tokens/fonts/OFL.txt` as an asset, so the bundler emits it beside the font files, or by copying its text into the application's third-party notices.

## Material Symbols

The `@crewlethq/ui` components render their glyphs (chevrons, close, copy, search and similar) as ligatures of the Material Symbols Outlined icon font, inside `<span class="material-symbols-outlined">`. That font is not part of this package. `@crewlethq/tokens/css/material-symbols` is a separate, opt-in stylesheet that loads it from Google Fonts: it requests `fonts.googleapis.com`, which serves the `@font-face` rule and the `material-symbols-outlined` class, and the browser then downloads the font from `fonts.gstatic.com`.

Material Symbols is published by Google under the Apache License 2.0 (<https://github.com/google/material-design-icons>). Because this package only references the hosted font and redistributes none of its files, it carries no copy of that license.

Keep `@crewlethq/tokens/css/fonts` and `@crewlethq/tokens/css/material-symbols` as separate imports: the first never leaves the application's own origin, so an app that must not contact third-party hosts imports only that one and loads the icon font from its own origin under the same class name.

## Add or change a token

1. Edit a JSON file in `tokens/`.
2. Run `npm run build` (or `npm run dev` for watch).
3. The generated `dist/` and `src/index.ts` are regenerated.

Never edit files in `dist/` or `src/index.ts` directly. They are
regenerated on every build.

## License

The tokens, stylesheets and scripts are licensed under the MIT License, whose text is in [`LICENSE`](./LICENSE). The font files in `fonts/` are licensed under the SIL Open Font License 1.1, whose text and copyright notices are in [`fonts/OFL.txt`](./fonts/OFL.txt). The package manifest records both as the SPDX expression `MIT AND OFL-1.1`.
