# @crewlethq/tokens

Single source of truth for the Crewlet design tokens: color, spacing, size, typography (`font`), radius, shadow, blur, breakpoint, density, motion and z-index. Authored as JSON, compiled by Style Dictionary into:

- `dist/css/tokens.css` (CSS custom properties on `:root`)
- `dist/css/themes.css` (the dark and light palettes)
- `dist/css/density.css`, `dist/css/base.css`, `dist/css/breakpoint.css`
- `dist/index.js` + `dist/index.d.ts` (typed JS object for runtime use)

## Use it from a consumer app

```ts
// 1) Canonical variables. Always import this once at the app entrypoint.
import '@crewlethq/tokens/css';

// 2) The dark and light palettes, as a three-state contract on <html>.
//    Import it after the line above; see "Theming" below.
import '@crewlethq/tokens/css/themes';

// 3) Optional: the density contract. Import it if the app has a density
//    control; see "Density" below.
import '@crewlethq/tokens/css/density';

// 4) Optional: self-hosted Geist and Geist Mono (see "Fonts" below).
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
for example `var(--color-brand-accent)` or `var(--spacing-4)`.

## Theming

`@crewlethq/tokens/css/themes` carries the dark and light palettes as three blocks on the root element, dark first:

```css
:root { /* dark */ }
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) { /* light */ }
}
:root[data-theme="light"] { /* light */ }
```

- A document that sets nothing is dark, or light if the reader's system asks for light. A browser that reports no preference at all gets dark: dark is the palette the product is drawn in, and light is its translation.
- `document.documentElement.dataset.theme = 'light'` or `'dark'` pins one, and wins in both directions, which a media query alone cannot do. Light wins by a block of its own. Dark wins by keeping the light media block from matching: there is no dark attribute block, because the bare root already is one, and the `:not([data-theme="dark"])` on the media block is what lets an explicit dark beat a light system.
- Removing the attribute follows the system again. A value the file does not name (`data-theme="system"`, say) passes the media block's guard and misses the light attribute block, so it follows the system as well; `ThemeSwitcher` removes the attribute rather than writing one.
- Both light blocks are generated from one source, `tokens/themes/light.json`, and the palette suite compares them, key for key and value for value.

Import it **after** `@crewlethq/tokens/css`. The two files share the `:root` selector and neither adds specificity, so the later import is the one that paints. `tokens.css` on its own is the base marketing palette, which is dark, and which carries a value for every themed slot so an application that imports only the token layer is never missing one.

`color-scheme` is set by each of the three blocks, so form controls, scrollbars and the canvas behind the page follow the palette that won.

An application that overrides a themed token for one palette mirrors the same three selectors: its dark value on `:root`, its light value under both the media block and the attribute block. An override written only under `:root[data-theme="light"]` misses a reader whose system is light and who has chosen nothing.

### Breaking change in 0.5.0

The palette is dark first. `themes.css` used to paint light on the bare root and dark under `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]`; it now paints dark on the bare root and light under `@media (prefers-color-scheme: light) :root:not([data-theme="dark"])` and `:root[data-theme="light"]`. The palettes themselves did not move.

| What changed | What to change |
| --- | --- |
| A document with no `data-theme`, in a browser that reports no colour-scheme preference, is dark. It was light. A system that asks for light or for dark still gets what it asks for. | Nothing, if the application follows the system. To keep a page light whatever the browser reports, set `data-theme="light"` on `<html>`. |
| The `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` blocks are gone; light is painted by `@media (prefers-color-scheme: light) :root:not([data-theme="dark"])` and `:root[data-theme="light"]`. | Move an application's own per-theme overrides to the same shape: dark values on `:root`, light values under both light selectors. |
| `paletteStates()` in `@crewlethq/tokens/test/palette` returns `base`, `dark`, `light (media query)` and `light (attribute)`. It returned `base`, `light`, `dark (media query)` and `dark (attribute)`. | Rename a state a suite reads: `light` becomes `light (attribute)` (or `light (media query)`), and `dark (media query)` and `dark (attribute)` both become `dark`. |
| The structural rules `the dark media block is present` and `the two dark blocks agree` are `the light media block is present` and `the two light blocks agree`, and the second compares both blocks in both directions. | Rename a rule a suite filters on or expects. |

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

themes.light.color.text.secondary; // '#46464e'
themes.dark.color.data['4']; // '#86efac'
```

Prefer the custom property wherever CSS can reach: a value read here is taken at build time, so it does not follow a theme the reader changes. The package's own suite compares every exported value against the declaration in `themes.css`, in both directions, because two spellings of one palette is the arrangement that drifts.

## Surfaces

Four opaque rungs, lowest first. Every ground a piece of text can land on is one of these, or a translucent overlay over one of them:

| Rung | Token | Dark | Light | What it is for |
| --- | --- | --- | --- | --- |
| Frame | `--color-surface-frame` | `#09090b` | `#ededea` | The application ground: the rail, and the body around the floating sheet. `@crewlethq/tokens/css/base` paints `body` with it. |
| Sheet | `--color-surface-background` | `#101013` | `#f9f9f8` | The page content sits on: the main column, its top bar, a canvas. It keeps its old name because everything that means "the ground content sits on" already reads it. |
| Card | `--color-surface-subtle` | `#141418` | `#ffffff` | A card, a popover, a dialog body, a table's header band. |
| Raised | `--color-surface-elevated` | `#1b1b20` | `#f3f3f1` | A chip, a segmented well, a key cap, a meter track, a lifted row. In light it is a step *down*: a chip on a white card reads by being greyer than it. |

Each step is held to what it has to do, in OKLab dE, by the palette suite:

- **The sheet lifts off the frame by dE 3** (3.37 dark, 3.67 light). That lift is the whole layering device. The approved dark sheet, `#0f0f12`, measured 2.91 and was lifted along lightness alone to `#101013`.
- **A card separates from the sheet by dE 1.5** (1.87 dark, 1.82 light), near-flat on purpose: a card is found by its **hairline**, and a page of cards each lifted by dE 3 is a relief map. So `--color-border-default` is held to dE 3 against both the card and the sheet (6.57 and 8.44 dark, 8.24 and 6.42 light), and `@crewlethq/ui`'s Card suite holds every card variant that stands on this rung to drawing it.
- **Raised separates from the card by dE 3** (3.13 dark, 3.65 light), because a chip or a well has no border of its own.

`--color-surface-hover`, `-pressed` and `-inset` stay **translucent**, so a hovered row is right on every rung. The approved design paints its hover as one opaque colour, which one alpha cannot be on four grounds, so the alpha is fitted: the value that moves the design least across the four rungs and the tertiary text step together (a stronger overlay takes contrast from that step where it lands on raised). It is held from below by a floor the suite measures, that a hovered row separates from every rung by dE 3 and a pressed row from a hovered one by dE 3 more: without it the fit's cheapest answer is an overlay nobody sees, and the design's own light hover sits dE 0.60 off the frame. The inset well is the design's own. `--color-surface-glass` is the card at 0.90, and `--color-surface-veil`, the ground a dialog sits on, is each root's own **frame** at 0.65: the application recedes into its own ground rather than under a film of its page.

Where an approved value failed one of the suite's floors on the new rungs, the floor won and the value moved as little as it could along lightness, keeping its hue. Each token's own comment names the value it replaced, the distance it moved and the measurement that forced it:

| Token | Approved | Shipped | Moved (dE) | Because |
| --- | --- | --- | --- | --- |
| `--color-surface-background` dark | `#0f0f12` | `#101013` | 0.46 | dE 2.91 off the frame, under 3 |
| `--color-text-tertiary` dark | `#8c8c96` | `#9797a1` | 3.63 | 3.92:1 on a pressed row inside a raised surface |
| `--color-text-tertiary` light | `#696972` | `#5e5e67` | 3.88 | 3.83:1 on a pressed row on the frame |
| `--color-text-muted` light | `#a3a3aa` | `#8d8d94` | 7.20 | 2.51:1 on the card and 2.14:1 on the rail, under the decoration band |
| `--color-border-control` dark | `#6e6e78` | `#797983` | 3.78 | 2.59:1 on a pressed row inside a raised surface |
| `--color-border-control` light | `#8e8e96` | `#7a7a82` | 6.71 | 2.29:1 on a pressed row on the frame |
| `--color-data-other` light | `#8e8e96` | `#87878f` | 2.33 | 2.77:1 as a mark on the frame |

### Breaking change in 0.5.0: the four rungs

The surface ramp was three rungs (`background`, `subtle` and `elevated`) plus four names that repeated them: `muted` was byte-identical to `subtle` in both palettes, and the three `topbar` steps held the values of `background`, `subtle` and `elevated`. They are gone, and the frame is new.

| What changed | What to change |
| --- | --- |
| `--color-surface-muted` (`color.surface.muted`) is removed. | `--color-surface-subtle`, which held the same value. |
| `--color-surface-topbar` (`color.surface.topbar`) is removed. | `--color-surface-frame` for the ground a rail stands on; `--color-surface-background` for a top bar inside the page, which is the value it held. |
| `--color-surface-topbar-lift` (`color.surface.topbarLift`) is removed. | `--color-surface-subtle`, which held the same value. |
| `--color-surface-topbar-active` (`color.surface.topbarActive`) is removed. | `--color-surface-elevated`, which held the same value. |
| `--color-surface-frame` (`color.surface.frame`) is new, and `@crewlethq/tokens/css/base` paints `body` with it rather than with `--color-surface-background`. | An application that floats its page on the body paints that page `--color-surface-background` itself; one with its own reset paints its application ground with the frame. |
| The four rungs, the overlays, the borders, the neutral text steps and `--color-data-other` take the values above: the approved ones, or the least move from them that clears the suite's floors. | Nothing. |
| `--color-surface-veil` is each root's own frame at 0.65. It was the root's `--color-surface-background` at 0.72. | An application that composed its own veil reads `--color-surface-veil`, or derives it from the frame. |
| In `@crewlethq/tokens/css/legacy`, `--bg-primary`, `--bg-secondary`, `--bg-tertiary` and `--bg-elevated` read `--color-surface-background`, `-subtle`, `-elevated` and `-elevated`. They read the three `topbar` steps. | Nothing under `@crewlethq/tokens/css/themes`, where those held the same values. With `tokens.css` alone, `--bg-primary` is now the marketing root's black rather than `#15171c`. |
| In `@crewlethq/tokens/test/palette`, `OPAQUE_SURFACES` is the four rungs and `RAIL_GROUND` is `--color-surface-frame`. The rule `the card differs from the page` is gone; `the sheet lifts off the frame`, `a card separates from the sheet`, `the hairline that finds a card is visible on both sides of it`, `raised separates from the card`, `a hovered row is visible on every rung` and `a pressed row is visible over a hovered one` are new; `the veil is this root at an alpha, not a colour of its own` is `the veil is this root's frame at an alpha, not a colour of its own`, and `VEIL_ALPHA` is 0.65. `VEIL_GROUND`, `RUNG_STEPS`, `CARD_HAIRLINE`, `HAIRLINE_DE`, `OVERLAY_STEPS` and `OVERLAY_DE` are new exports. | Rename a rule a suite filters on, and measure on `OPAQUE_SURFACES` rather than on a list of surface names of its own. |

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

`@crewlethq/tokens/css/base` is the opt-in document baseline: the box-sizing reset, the document's own type and colour (the body on the frame, the lowest of the [four rungs](#surfaces)), headings, controls that inherit the font, `code` and `kbd` in mono with tabular figures, one `:focus-visible` ring, `::selection`, themed scrollbars and the global reduced-motion collapse. Every value comes from a token, so it follows the palette and the density without a rule of its own.

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
| Accent | what to act on, and what is chosen: the primary action's fill, the focus ring, the selected row, the filter that is on, the count of what is waiting on the reader | `--color-brand-accent`, `-hover`, `-active`, `-ink`, `-soft`, `-soft-strong`, `-rgb`, and `--color-focus` |
| Data | a chart series, and only inside a chart that carries a legend | `--color-data-1` to `-5`, `--color-data-other` |

Two rules travel with them:

- **A fill step is never text, and an `-ink` step is never a background.** A fill clears 3:1 as a mark; an ink clears 4.5:1 as text, including on its own soft tint.
- **Everything else is neutral.** A category with no state in it takes neutral colour, and its identity is carried by its name, its glyph and its position.

A `-soft` step is its own fill at alpha 0.12 and a `-line` step is the same fill at alpha 0.30. They are derived by the build from the fill, per palette, so a tint cannot come to belong to a hue the fill no longer is.

### The accent

The accent is a violet, and it is **per palette**:

| Token | Dark (and the marketing root) | Light | What it is |
| --- | --- | --- | --- |
| `--color-brand-accent` | `#7c56ff` | `#6b45f0` | The fill of the primary action, a selected card's ring, a selected row's rail, the attention count. A fill and a mark, never text. |
| `--color-brand-accent-hover` | `#744bf4` | `#633ae5` | The primary action under the pointer. |
| `--color-brand-accent-active` | `#6c40e9` | `#5b2dda` | The primary action pressed. |
| `--color-brand-accent-ink` | `#b3a1ff` | `#5a33de` | The accent as text: a link, an outline button's label. |
| `--color-brand-accent-soft` | the accent at 0.16 | the accent at 0.109 | The tint behind a selected row or a toggle that is on. |
| `--color-brand-accent-soft-strong` | the accent at 0.32 | the accent at 0.32 | The border paired with the soft tint. |
| `--color-brand-accent-rgb` | `124, 86, 255` | `107, 69, 240` | The accent as an `r, g, b` triple, for a translucent tint of a stylesheet's own. `--shadow-glow` is composed from it. |
| `--color-focus` | `#805bff` | `#6b45f0` | The focus ring. |
| `--color-text-on-accent` | `#ffffff` | `#ffffff` | The label on the accent's three fills, and on the danger fill. |

`-rgb` and `-soft-strong` are derived from the accent by the build, per palette, and the build suite holds the written `-soft` to the accent's own channels.

- **The primary action is the accent.** The monochrome `--color-brand-primary` (white on dark, black on light) is gone: a white primary beside a light-grey secondary was one pair of greys. White clears 4.53:1 on the dark accent and 5.62:1 on the light one.
- **Its hover and its press are darker, a step each, never brighter.** The label is white, so a brighter fill is a step toward it: the approved design's `brightness(1.08)` hover took the dark accent's label to 4.18:1, under the text floor at the moment the reader is about to press. Each step is the least move along lightness a reader can see, dE 3, and the palette suite holds both halves: `a hovered primary action is a visible step away from its label` and `a pressed primary action is a visible step past a hovered one`.
- **The focus ring is the accent**, except where the floor forbids it. The dark accent measured 2.88:1 on a pressed row inside a raised surface, under the 3:1 a ring clears, and it cannot lighten itself without taking the primary action's label under 4.5:1; so the dark ring is the accent lifted dE 1.24.
- **Where the reader is in a rail is not the accent.** The rail's current row stands on raised with the plain border round it (`RAIL_CURRENT_ROW`), and the rail's one hue is the attention count, the accent's fill with the on-accent label: the one thing in the chrome that asks the reader to act.

Where an approved value failed a floor, the floor won and the value moved the least it could, keeping its hue. Each token's comment names the value it replaced, the distance and the measurement:

| Token | Was | Shipped | Moved (dE) | Because |
| --- | --- | --- | --- | --- |
| `--color-brand-accent-hover` dark | `#865dff`, the approved `brightness(1.08)` | `#744bf4` | | 4.18:1 under the white label; the shipped step is darker by dE 3.08 |
| `--color-brand-accent-hover` light | `#744bff`, the approved `brightness(1.08)` | `#633ae5` | | it moved toward the label; the shipped step is darker by dE 3.03 |
| `--color-focus` dark | `#7c56ff`, the accent | `#805bff` | 1.24 | 2.88:1 on a pressed row inside a raised surface |
| `--color-brand-accent-soft` light | 0.10 | 0.109 | | a selected row sat dE 2.64 from a hovered one on the frame, under 3 |
| `--color-phase-execute` dark | `#ac6bff` | `#ae6dff` | 0.57 | dE 9.6 from the new accent under normal vision, 7.7 under protanopia |
| `--color-phase-execute` light | `#5b37da` | `#480fbe` | 8.14 | dE 5.2 from the new accent under every vision; the least move that also keeps it 10 from onboarding |

The light `--color-feedback-warning-ink` is back at `#92400e`. It had moved to `#903f0c` for the attention count drawn on the warning tint over the accent tint of the rail's current row, a composite that is gone.

### Breaking change in 0.5.0: the accent is the primary action

| What changed | What to change |
| --- | --- |
| `--color-brand-primary`, `--color-brand-primary-hover` and `--color-brand-primary-active` (`color.brand.primary`, `.primaryHover`, `.primaryActive`) are removed. | `--color-brand-accent`, `-hover` and `-active`, which is what the primary `Button` already painted. A surface that wanted the monochrome fill itself takes `--color-surface-inverse`. |
| `--color-text-on-brand` (`color.text.onBrand`) is removed. | `--color-text-on-accent` on an accent fill, or `--color-text-inverse` on the inverse ground. |
| The accent is per palette: `#7c56ff` on the dark root and the marketing root, `#6b45f0` in light. It was `#5469d4` in every palette, and its hover, press, ink, soft tint, triple and `--color-focus` move with it (the table above). | Nothing, for a stylesheet that reads the tokens. A literal `#5469d4` or `84, 105, 212` spelled in an application is the old accent: read the token instead. |
| The accent is a THEMED slot now, declared by all three blocks of `@crewlethq/tokens/css/themes`. It was declared by `tokens.css` alone. | An application that rebinds the accent on `:root` alone is beaten by `:root[data-theme="light"]` in light: mirror the three selectors, as for any themed token (see [Theming](#theming)), and rebind `-rgb`, `-soft` and `-soft-strong` with it. |
| `--color-brand-accent-rgb` and `--color-brand-accent-soft-strong` are derived from the accent by the build. | Nothing. |
| `--shadow-glow` is `rgba(var(--color-brand-accent-rgb), …)` rather than a literal indigo. | Nothing; it follows a rebound accent now. |
| In `@crewlethq/tokens/css/legacy`, `--accent`, `--primary-blue` and `--accent-purple` read `--color-brand-accent`. They read `--color-brand-primary`. | Nothing, unless a stylesheet relied on them being white on dark. |
| In `@crewlethq/tokens/test/palette`, `LABEL_ON_FILL` no longer carries the three `--color-text-on-brand` pairs; the rail's current row is `RAIL_CURRENT_ROW` (raised, with the plain border) and the attention count is the on-accent label on the accent in `RAIL_PAINTS`; `text on glass clears 4.5:1` measures over the inverse ground and the accent fill rather than over the brand-primary fill. `a hovered primary action is a visible step away from its label`, `a pressed primary action is a visible step past a hovered one`, `the rail's current row lifts off the rail` and `the hairline round the rail's current row is visible on it` are new, with the exports `ACTION_STEPS`, `ACTION_LABEL`, `ACTION_DE`, `RAIL_CURRENT_ROW` and `RAIL_CURRENT_LIFT`. | Rename a subject a suite filters on. |

## The palette suite

`test/palette.mjs` holds the rule table and the colour maths, and `test/palette.test.mjs` runs it over `dist/css` in import order, in every theme state: the base marketing root (`base`), the dark root (`dark`), light by media query (`light (media query)`) and light by attribute (`light (attribute)`), which are the keys `paletteStates()` returns. It measures every text step on every surface it can land on (the four opaque rungs in `OPAQUE_SURFACES`, and the translucent overlays composited over each of them), every ink on its own soft tint, every fill as a mark, the primary action's three fills under its label and the steps between them, the focus ring, the control boundary, the rail's current row, the steps between the rungs and the hairline that finds a card, whether a hovered and a pressed row can be seen, the hue separations under normal, protan and deuteranopic vision, and the structure of the theme file itself. A component suite that measures a colour of its own measures it on `OPAQUE_SURFACES` too, rather than on a list of surface names it keeps itself.

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

The tarball ships `test/color.mjs`, `test/palette.mjs` and `test/palette.test.mjs`, so `node --test "node_modules/@crewlethq/tokens/test/*.test.mjs"` runs the whole table over the installed version with no configuration at all. `test/build.test.mjs` stays out of it: it reads the token source the build compiles from, which a tarball does not carry. So does `test/fonts.test.mjs`, which decodes every file in `fonts/` and holds [`fonts/README.md`](./fonts/README.md), the built `@font-face` rules and [`fonts/OFL.txt`](./fonts/OFL.txt) to what the files say about themselves: a replaced file is caught in this repository, before it is published, not in an installed copy.

## Fonts

The design system uses two type families, both self-hosted inside this package and licensed under the SIL Open Font License 1.1:

| Token | Family |
| ----- | ------ |
| `--font-family-sans` | Geist |
| `--font-family-display` | An alias of `--font-family-sans` (see the note below) |
| `--font-family-mono` | Geist Mono |

`--font-family-display` is declared on `:root` as `var(--font-family-sans)`. A custom property that holds `var()` is resolved on the element that declares it and inherited as a finished value, so the alias follows an override of `--font-family-sans` declared on `:root` and no other. An app that overrides the sans family on `body`, a theme class or any narrower selector sets `--font-family-display` in the same rule.

`@crewlethq/tokens/css/fonts` declares `@font-face` rules whose URLs point at the woff2 files in `fonts/`, relative to the stylesheet. A bundler (Vite, webpack, Rollup, esbuild) resolves those URLs and emits the files with the application's other assets, so the fonts render on a closed network and no request leaves for a third-party host. The files are also exported individually (for example `@crewlethq/tokens/fonts/geist-latin.woff2`) for apps that preload them or serve them from their own static directory.

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
