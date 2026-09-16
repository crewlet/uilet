# @crewlethq/tokens

Single source of truth for the Crewlet design tokens: color, spacing, size, typography (`font`), radius, shadow, blur, breakpoint, density, motion and z-index. Authored as JSON, compiled by Style Dictionary into:

- `dist/css/tokens.css` (CSS custom properties on `:root`)
- `dist/css/themes.css` (the light and dark palettes)
- `dist/css/density.css`, `dist/css/base.css`, `dist/css/breakpoint.css`
- `dist/index.js` + `dist/index.d.ts` (typed JS object for runtime use)

## Use it from a consumer app

```ts
// 1) Canonical variables. Always import this once at the app entrypoint.
import '@crewlethq/tokens/css';

// 2) The light and dark palettes, as a three-state contract on <html>.
//    Import it after the line above; see "Theming" below.
import '@crewlethq/tokens/css/themes';

// 3) Optional: the density contract. Import it if the app has a density
//    control; see "Density" below.
import '@crewlethq/tokens/css/density';

// 4) Optional: self-hosted Inter and JetBrains Mono (see "Fonts" below).
//    Skip this if the app already loads its own fonts at the shell.
import '@crewlethq/tokens/css/fonts';

// 5) Optional: the document baseline. The reset, the document's own type and
//    colour, one focus ring, themed scrollbars and the reduced-motion
//    collapse; see "The document baseline" below.
import '@crewlethq/tokens/css/base';

// Or read tokens at runtime / build theme objects
import { color, spacing } from '@crewlethq/tokens';

const accent = color.brand.accent;
```

CSS variables follow Style Dictionary's `--{group}-{path}` convention,
for example `var(--color-brand-primary)` or `var(--spacing-4)`.

## Theming

`@crewlethq/tokens/css/themes` carries the light and dark palettes as three states on the root element:

```css
:root { /* light */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark */ }
}
:root[data-theme="dark"] { /* dark */ }
```

- A document that sets nothing is light, or dark if the reader's system asks for dark.
- `document.documentElement.dataset.theme = 'dark'` or `'light'` pins one, and wins in both directions, which a media query alone cannot do.
- Removing the attribute follows the system again.
- Both dark blocks are generated from one source, `tokens/themes/dark.json`, and the palette suite compares them.

Import it **after** `@crewlethq/tokens/css`. The two files share the `:root` selector and neither adds specificity, so the later import is the one that paints. `tokens.css` on its own is the base marketing palette, which is dark, and which carries a value for every themed slot so an application that imports only the token layer is never missing one.

`color-scheme` is set by the theme layer, so form controls, scrollbars and the canvas behind the page follow the palette.

### Breaking change in 0.3.0

`themes.css` used to repaint the palette under `body.theme-light` and `body.theme-dark`. Those selectors are gone. An application that switched themes by toggling a class on `<body>` sets the attribute on `<html>` instead:

```diff
- document.body.classList.add('theme-dark');
+ document.documentElement.setAttribute('data-theme', 'dark');
```

Three things follow from the move:

- The theme now repaints on the same element the tokens are declared on, so `@crewlethq/tokens/css/legacy` declares its aliases on `:root` alone. It used to repeat every alias on the theme classes, because an alias holding `var()` resolves on the element that declares it and a theme applied lower down could not reach it.
- A document that sets nothing is light rather than dark. The dark palette is still what a reader whose system asks for dark gets.
- `--color-surface-elevated` in the light palette moved from `#e3e3e6` to `#ebebee`. It was darker than the page, which made a dialog body the tightest ground in the palette.

Other changes a consumer may notice, none of which needs an edit:

- Every font size is emitted in `rem` rather than `px`, so a reader's own browser setting moves the page. The typed export still carries pixels.
- Every spacing and size token is emitted as `calc(Npx * var(--density, 1))`. With no density stylesheet imported the `var()` falls back to `1` and every value is exactly what it was.
- The status hues moved to clear the contrast floors and to stay separable under protan and deuteranopic vision. The success family is a teal rather than a green.
- `--shadow-focus` is a crisp two-ring shadow rather than a translucent glow, and every shadow step now has a light value as well as a dark one.

### The palettes in JavaScript

`themes.light` and `themes.dark` carry the same two palettes as typed objects, for the code that cannot read a custom property: the tool chrome around a preview, a chart library that wants a series colour as a string, a canvas painting its own pixels.

```ts
import { themes } from '@crewlethq/tokens';

themes.light.color.text.secondary; // '#52525b'
themes.dark.color.data['4']; // '#86efac'
```

Prefer the custom property wherever CSS can reach: a value read here is taken at build time, so it does not follow a theme the reader changes. The package's own suite compares every exported value against the declaration in `themes.css`, in both directions, because two spellings of one palette is the arrangement that drifts.

## Density

`@crewlethq/tokens/css/density` sets `--density` from an attribute on the root element:

```css
:root { --density: 1 }
:root[data-density="compact"] { --density: 0.82 }
:root[data-density="comfortable"] { --density: 1.14 }
```

Every spacing and size token is emitted as `calc(Npx * var(--density, 1))`, so a density setting is a real change to every gap, pad, row and control rather than to three font sizes, and every value is unchanged at density 1. The stylesheet is a separate import because a product with no density control should not ship the selectors that switch one; the tokens themselves work without it.

`--size-control-sm` and `--size-row-sm` are `max(24px, calc(28px * var(--density, 1)))`. The floor is deliberate: 28 x 0.82 is 22.96px, and a target under 24px is one a finger cannot reliably hit. A test resolves both at all three densities.

`--size-target-min` (24px) is that same floor, named, for a component that DERIVES a height from a control step rather than taking one. Subtracting from a step subtracts from its floor too, so `calc(var(--size-control-sm) - 4px)` is 20px at compact density; `max(var(--size-target-min), calc(var(--size-control-sm) - 4px))` is the same value at density 1 and still a reachable target at every other.

`--radius-chip` is `calc(var(--radius-md) - 1px)`, the corner of a chip lifted inside a well drawn at `--radius-md`. It is derived rather than written as a step of its own, so it follows the well.

## The document baseline

`@crewlethq/tokens/css/base` is the opt-in document baseline: the box-sizing reset, the document's own type and colour, headings, controls that inherit the font, `code` and `kbd` in mono with tabular figures, one `:focus-visible` ring, `::selection`, themed scrollbars and the global reduced-motion collapse. Every value comes from a token, so it follows the palette and the density without a rule of its own.

The focus indicator is an **outline**, never a box-shadow alone. Forced-colors mode drops every box-shadow and keeps outlines, so a ring drawn as a shadow disappears for exactly the readers who most need one. `--shadow-focus` is still there for a component that wants a shadow as well, paired with a transparent outline so forced colors substitutes a system colour for it. `--size-focus-ring-inset-offset` is the offset for a focusable row inside a clipping scroller, where an outset ring is clipped by the scroller and painted over by the next row.

The body's height and overflow are deliberately not here. A page that can scroll as a whole moves an application's rail off the top of the window, so the rule that stops it belongs to the shell that owns the rail.

## Breakpoints

A media query cannot read a custom property, so a stylesheet that switches layout at a breakpoint spells the number. `@crewlethq/tokens/css/breakpoint` is the generated partial that says which number, and `breakpoint` in the typed export carries the same values, so a check can compare a query's literal against them instead of trusting a comment.

`--breakpoint-shell` (900px) is where an application shell stops being a rail beside a pane: a 280px rail plus a 620px minimum content column.

## What colour means

Four families, and the meanings never move:

| Use | Meaning | Tokens |
| --- | --- | --- |
| Status | `success` a good terminal state, `warning` a person is needed, `danger` failure, `info` neutral information | `--color-feedback-{success,warning,danger,info}` and their `-ink`, `-soft` and `-line` steps |
| Phase | onboarding, execute, review | `--color-phase-{onboarding,execute,review}` and their `-ink` and `-soft` steps |
| Accent | where the reader is: the active nav indicator, the focus ring, the selected row, the filter that is on | `--color-brand-accent`, `-hover`, `-active`, `-ink`, `-soft`, `-soft-strong` |
| Data | a chart series, and only inside a chart that carries a legend | `--color-data-1` to `-5`, `--color-data-other` |

Two rules travel with them:

- **A fill step is never text, and an `-ink` step is never a background.** A fill clears 3:1 as a mark; an ink clears 4.5:1 as text, including on its own soft tint.
- **Everything else is neutral.** A category with no state in it takes neutral colour, and its identity is carried by its name, its glyph and its position.

A `-soft` step is its own fill at alpha 0.12 and a `-line` step is the same fill at alpha 0.30. They are derived by the build from the fill, per palette, so a tint cannot come to belong to a hue the fill no longer is.

## The palette suite

`test/palette.mjs` holds the rule table and the colour maths, and `test/palette.test.mjs` runs it over `dist/css` in import order, in every theme state: the base marketing root, light, dark by media query and dark by attribute. It measures every text step on every surface it can land on (the translucent overlays composited over each opaque ground included), every ink on its own soft tint, every fill as a mark, the focus ring, the control boundary, the hue separations under normal, protan and deuteranopic vision, and the structure of the theme file itself.

The module is **published**, as `@crewlethq/tokens/test/palette`, so a consumer runs the same rules over the version it installed:

```ts
import { readFileSync } from 'node:fs';
import { runPalette, describeFailure } from '@crewlethq/tokens/test/palette';

const dir = 'node_modules/@crewlethq/tokens/dist/css';
const { failures } = runPalette({
  tokens: readFileSync(`${dir}/tokens.css`, 'utf8'),
  themes: readFileSync(`${dir}/themes.css`, 'utf8'),
});
expect(failures.map(describeFailure)).toEqual([]);
```

One implementation, two gates. The constraint is that the floors are kept, not only that the measurement moves, and a tokens bump that lowered a ratio would otherwise reach a consumer through an auto-merged dependency update with nothing measuring a ratio again.

The tarball ships `test/color.mjs`, `test/palette.mjs` and `test/palette.test.mjs`, so `node --test "node_modules/@crewlethq/tokens/test/*.test.mjs"` runs the whole table over the installed version with no configuration at all. `test/build.test.mjs` stays out of it: it reads the token source the build compiles from, which a tarball does not carry.

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

`@crewlethq/tokens/css/material-symbols` is an opt-in stylesheet that loads the Material Symbols Outlined icon font from Google Fonts: it requests `fonts.googleapis.com`, which serves the `@font-face` rule and the `material-symbols-outlined` class, and the browser then downloads the font from `fonts.gstatic.com`.

No `@crewlethq/ui` component needs it. Those draw their glyphs as SVG from `@crewlethq/icons`, which is vendored and makes no network request. This stylesheet stays for an application that writes its own `<span class="material-symbols-outlined">` ligatures.

Material Symbols is published by Google under the Apache License 2.0 (<https://github.com/google/material-design-icons>). Because this package only references the hosted font and redistributes none of its files, it carries no copy of that license.

It is the one stylesheet in this package that contacts a third-party host, which is why it is a separate import: an app that must not do that imports the other stylesheets and loads its icons from its own origin.

## Add or change a token

1. Edit a JSON file in `tokens/`, or `tokens/themes/light.json` and `tokens/themes/dark.json` for a slot that changes with the palette. A themed slot needs an entry in **both** theme files and a value in `tokens/color.json`, which the palette suite checks.
2. Run `npm run build` (or `npm run dev` for watch).
3. Run `npm test`. A colour change that lowers a measured floor fails here.
4. The generated `dist/` and `src/index.ts` are regenerated.

Never edit files in `dist/` or `src/index.ts` directly. They are
regenerated on every build. `stylesheets/base.css` is the one stylesheet in this package written by hand rather than generated; the build copies it into `dist/css/`.

## License

The tokens, stylesheets and scripts are licensed under the MIT License, whose text is in [`LICENSE`](./LICENSE). The font files in `fonts/` are licensed under the SIL Open Font License 1.1, whose text and copyright notices are in [`fonts/OFL.txt`](./fonts/OFL.txt). The package manifest records both as the SPDX expression `MIT AND OFL-1.1`.
