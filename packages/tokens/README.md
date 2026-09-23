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
themes.dark.color.data['4']; // '#c98500'
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
| `--color-text-tertiary` light | `#696972` | `#5f5e67` | 3.79 | 3.84:1 on a pressed row on the frame |
| `--color-text-muted` light | `#a3a3aa` | `#8d8d94` | 7.20 | 2.51:1 on the card and 2.14:1 on the rail, under the decoration band |
| `--color-border-control` dark | `#6e6e78` | `#787983` | 3.70 | 2.59:1 on a pressed row inside a raised surface |
| `--color-border-control` light | `#8e8e96` | `#7a7a82` | 6.71 | 2.29:1 on a pressed row on the frame |
| `--color-data-other` light | `#8e8e96` | `#88888f` | 2.03 | 2.77:1 as a mark on the frame |

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

`--size-control-sm` is `max(24px, calc(26px * var(--density, 1)))` and `--size-row-sm` is `max(24px, calc(28px * var(--density, 1)))`. The floor is deliberate: 26 x 0.82 is 21.32px and 28 x 0.82 is 22.96px, and a target under 24px is one a finger cannot reliably hit. A test resolves both at all three densities.

The control steps are the approved design's control rhythm: `--size-control-md` is 30px, the height of a button, an icon button, a field in a toolbar and a segmented well, and `--size-control-sm` is 26px, a small button's. Every control on a line takes one of them, so a button beside a field beside a segmented row is one height at every density.

`--size-target-min` (24px) is that same floor, named, for a component that DERIVES a height from a control step rather than taking one. Subtracting from a step subtracts from its floor too, so `calc(var(--size-control-md) - 6px)` is 18.6px at compact density; `max(var(--size-target-min), calc(var(--size-control-md) - 6px))` is the 24px a chip in a segmented well stands at density 1, and still a reachable target at every other.

`--radius-chip` is `calc(var(--radius-md) - 1px)`, the corner of a chip lifted inside a well drawn at `--radius-md`. It is derived rather than written as a step of its own, so it follows the well.

### Changed in 0.5.0: the control steps

No token is renamed; two values moved to the approved design.

| What changed | What to change |
| --- | --- |
| `--size-control-md` is 30px (was 32px) and `--size-control-sm` is 26px (was 28px), still floored at 24px. Every control that takes a step (a button, an icon button, a field, a select, a tab) is two pixels shorter. | Nothing, for a stylesheet that reads the tokens. A literal 32 or 28 written to line up with a control reads the token instead. |

## The document baseline

`@crewlethq/tokens/css/base` is the opt-in document baseline: the box-sizing reset, the document's own type and colour (the body on the frame, the lowest of the [four rungs](#surfaces), in Geist at [13px on the 1.45 leading](#type)), headings, controls that inherit the font, `code` and `kbd` in mono with tabular figures, one `:focus-visible` ring, `::selection`, themed scrollbars and the global reduced-motion collapse. Every value comes from a token, so it follows the palette and the density without a rule of its own.

The focus indicator is an **outline**, never a box-shadow alone. Forced-colors mode drops every box-shadow and keeps outlines, so a ring drawn as a shadow disappears for exactly the readers who most need one. `--shadow-focus` is still there for a component that wants a shadow as well, paired with a transparent outline so forced colors substitutes a system colour for it. `--size-focus-ring-inset-offset` is the offset for a focusable row inside a clipping scroller, where an outset ring is clipped by the scroller and painted over by the next row.

The body's height and overflow are deliberately not here. A page that can scroll as a whole moves an application's rail off the top of the window, so the rule that stops it belongs to the shell that owns the rail.

## Type

The body is **13px on a 1.45 leading**, the approved design's dense base: a board is read by scanning rows rather than paragraphs. `@crewlethq/tokens/css/base` sets it on `body`; everything that does not set a size of its own inherits it.

| Token | px | What it is for |
| --- | --- | --- |
| `--font-size-2xs` | 11 | Micro labels, table column heads, a keycap |
| `--font-size-xs` | 12 | Dense secondary text, a badge, a group label |
| `--font-size-compact` | 13 | **The body**, and table cells and captions |
| `--font-size-sm` | 14 | A step over the body: a section heading, a page's title in the top bar |
| `--font-size-md` to `--font-size-2xl` | 16, 18, 20, 24 | Headings |
| `--font-size-display` | 28 | The one number on a stat tile, and a page's greeting |
| `--font-size-3xl` to `--font-size-5xl` | 32, 48, 64 | Large display headings |

Sizes are authored in px and emitted in rem, so a reader who has set a larger default text size gets one; the typed export (`font.size`) carries the pixels. `compact` and `display` are named for their jobs rather than squeezed onto the ramp, so a component reads the role and the step can move without a rename.

| Token | Value | What it is for |
| --- | --- | --- |
| `--font-line-height-tight` | 1.2 | Headings |
| `--font-line-height-snug` | 1.4 | A subtitle under a heading |
| `--font-line-height-body` | 1.45 | **The document's own**: the body's 18.85px line. A keycap, a monogram and the rail's lockup take it, because they are drawn inside a line of the document and have to stand on it |
| `--font-line-height-normal` | 1.5 | A component's own line: a card title, a rail row |
| `--font-line-height-relaxed` | 1.7 | Long-form prose |

## Radii

| Token | px | What it is for |
| --- | --- | --- |
| `--radius-xs` | 4 | A keycap, inline code, a tag's corner, the focus ring |
| `--radius-sm` | 6 | A row or a node inside a surface: a table row, an organisation chart's node |
| `--radius-chip` | 7 | A chip lifted inside a well at `--radius-md`, one hairline tighter (derived from `md`) |
| `--radius-md` | 8 | A control: a button, a field, a menu, a rail row |
| `--radius-lg` | 12 | A card, a popover, a stat tile |
| `--radius-sheet` | 14 | The sheet an application floats on the frame, one step rounder than every card inside it |
| `--radius-xl` | 16 | A dialog |
| `--radius-2xl` | 24 | Marketing surfaces |
| `--radius-pill`, `--radius-circle` | 999px, 50% | A pill, and a dot or an avatar |

## The application shell

The shell is a rail and a floating sheet on the frame (see [Surfaces](#surfaces) for the rungs they stand on):

| Token | Value | What it is |
| --- | --- | --- |
| `--size-shell-rail` | 236px | The rail, the sidebar column on the frame. Fixed at every density |
| `--size-shell-topbar` | 52px | The sheet's top bar, and the rail's head beside it. Fixed at every density |
| `--size-shell-inset` | 8px | The gap between the frame's edge and the sheet, on its top, its inline end and its bottom. Density-scaled like every gap: 6.56px compact, 9.12px comfortable |
| `--radius-sheet` | 14px | The sheet's corner |

The rail and the bar do not follow the density because `--breakpoint-shell` is derived from the rail: a rail that grew with the density would move a breakpoint that a density setting cannot move.

## Breakpoints

A media query cannot read a custom property, so a stylesheet that switches layout at a breakpoint spells the number. `@crewlethq/tokens/css/breakpoint` is the generated partial that says which number, and `breakpoint` in the typed export carries the same values, so a check can compare a query's literal against them instead of trusting a comment.

`--breakpoint-shell` (**1024px**) is where the application shell stops being a rail beside a sheet and the rail becomes a drawer. It is derived, at density 1:

```text
  236px   --size-shell-rail
+   8px   --size-shell-inset
+ 780px   the sheet's floor: the two-pane Inbox, a 320px list beside a 460px detail
= 1024px  --breakpoint-shell
```

At exactly 1024px the sheet is exactly its floor and the wide layout fits, so the switch is **strictly under** the step: `@media (width < 1024px)`, and `matchMedia('(width < 1024px)')` in script. `(max-width: 1024px)` would draw the drawer at the one width the arithmetic says the rail still fits. `@crewlethq/ui`'s `AppShell` switches there, and so does every component that changes shape with the shell (a side sheet going full width, a toolbar folding into its overflow, a toolbar's search field dropping its label, a stat row going to two columns); its suite holds all of them to the same query and asserts the sum. It shares its number with `--breakpoint-lg` by arithmetic, not by name: a change to the rail or the inset moves the shell step and leaves `lg` where it is.

`--breakpoint-phone` (**640px**) is the single-pane layout: under it a screen shows one pane at a time, a detail replacing its list with a way back, rather than the two side by side. It is the Inbox's 320px list twice: under it a detail beside the list would be narrower than the list itself. It switches strictly under the step too, `(width < 640px)`.

### Changed in 0.5.0: the body, the shell and its breakpoint

No token is renamed or removed here; values moved to the approved design, and six tokens are new.

| What changed | What to change |
| --- | --- |
| `@crewlethq/tokens/css/base` sets the body at `--font-size-compact` (13px) on `--font-line-height-body` (1.45). It was `--font-size-sm` (14px) on `--font-line-height-normal` (1.5). | Nothing, for text that inherits. A component of your own drawn inside a line of the document on `--font-line-height-normal` (a keycap, a monogram) takes `--font-line-height-body` to stay on it. |
| `--font-size-sm` is no longer the body step; its comment and role are "a step over the body". | A stylesheet that set body copy at `--font-size-sm` to match the document sets `--font-size-compact`. |
| `--size-shell-rail` is 236px (was 280px) and `--size-shell-topbar` is 52px (was 64px). | Nothing, for a stylesheet that reads them. A literal 280 or 64 written to line up with the shell reads the token instead. |
| `--breakpoint-shell` is 1024px (was 900px), derived as above, and the switch is strictly under it. | A query written to switch with the shell, `(max-width: 900px)`, becomes `(width < 1024px)`. |
| `--font-size-display`, `--font-line-height-body`, `--radius-sheet`, `--size-shell-inset`, `--breakpoint-phone` and `--motion-duration-breath` are new (`font.size.display`, `font.lineHeight.body`, `radius.sheet`, `size.shell.inset`, `breakpoint.phone`, `motion.duration.breath`). | Nothing. |

## Motion

| Token | Value | What it is for |
| --- | --- | --- |
| `--motion-duration-instant` | 75ms | A tooltip's flash, a dropdown indicator's nudge |
| `--motion-duration-fast` | 120ms | A hover or an active state |
| `--motion-duration-base` | 150ms | The default transition |
| `--motion-duration-moderate` | 200ms | A rail row's hover, a bar's background |
| `--motion-duration-slow` | 300ms | A dialog entering, a drawer sliding |
| `--motion-duration-breath` | 2200ms | The PERIOD of a mark saying work is still happening: one full round, out and back, 0.45 cycles a second. Not a transition. A pulsing `StatusDot` breathes one round of it |

A component that moves stops every motion it starts in the same stylesheet, naming the rule's selector again, after it, inside `@media (prefers-reduced-motion: reduce)`, which is what `crewlet-css-check` in `@crewlethq/ui` holds it to; and `@crewlethq/tokens/css/base` collapses motion for the whole document under `prefers-reduced-motion: reduce`.

## What colour means

Three families, and the meanings never move:

| Use | Meaning | Tokens |
| --- | --- | --- |
| State | what a piece of work is doing: `info` is working, `warning` needs a person, `danger` is stopped, `success` is done. The names stay generic, because a badge, a callout and a toast mean the same four things | `--color-feedback-{success,warning,danger,info}` and their `-ink`, `-soft` and `-line` steps, and `--color-feedback-danger-hover` |
| Accent | what to act on, and what is chosen: the primary action's fill, the focus ring, the selected row, the filter that is on, the count of what is waiting on the reader | `--color-brand-accent`, `-hover`, `-active`, `-ink`, `-soft`, `-soft-strong`, `-rgb`, and `--color-focus` |
| Data | a series, and only inside a figure that names it: a legend for two series or more, the label for one | `--color-data-1` to `-4`, in that order, and `--color-data-other` for the rest |

Two rules travel with them:

- **A fill step is never text, and an `-ink` step is never a background.** A fill clears 3:1 as a mark; an ink clears 4.5:1 as text, including on its own soft tint.
- **Everything else is neutral.** A category with no state in it takes neutral colour, and its identity is carried by its name, its glyph and its position.

A phase is a category. The agent's phases (onboarding, execute, review, and whatever an engine adds) are drawn in the neutral colour with their word: a neutral tag, or the word itself, beside the state badge that says what the work is doing. There is no phase hue: a hue per phase spends the budget the four states and the four series are held apart in, and asks a reader to learn a second colour vocabulary that says nothing the word does not. Inside a figure a phase is a series like any other: the application declares which phase takes which series (`--color-data-1` to `-4`), keeps that mapping in every figure it draws, and the legend names each one.

A `-soft` step is its own fill at alpha 0.12 and a `-line` step is the same fill at alpha 0.30. They are derived by the build from the fill, per palette, so a tint cannot come to belong to a hue the fill no longer is.

### The accent

The accent is a violet, and it is **per palette**:

| Token | Dark (and the marketing root) | Light | What it is |
| --- | --- | --- | --- |
| `--color-brand-accent` | `#7c56ff` | `#6b45f0` | The fill of the primary action, a selected card's ring, a selected row's rail, the attention count. A fill and a mark, never text. |
| `--color-brand-accent-hover` | `#744bf4` | `#633ae5` | The primary action under the pointer. |
| `--color-brand-accent-active` | `#6c40e9` | `#5b2eda` | The primary action pressed. |
| `--color-brand-accent-ink` | `#b3a1ff` | `#5a33de` | The accent as text: a link, an outline button's label. |
| `--color-brand-accent-soft` | the accent at 0.16 | the accent at 0.108 | The tint behind a selected row or a toggle that is on. |
| `--color-brand-accent-soft-strong` | the accent at 0.32 | the accent at 0.32 | The border paired with the soft tint. |
| `--color-brand-accent-rgb` | `124, 86, 255` | `107, 69, 240` | The accent as an `r, g, b` triple, for a translucent tint of a stylesheet's own. `--shadow-glow` is composed from it. |
| `--color-focus` | `#7e5bff` | `#6b45f0` | The focus ring. |
| `--color-text-on-accent` | `#ffffff` | `#ffffff` | The label on the accent's three fills, and on the danger fill. |

`-rgb` and `-soft-strong` are derived from the accent by the build, per palette, and the build suite holds the written `-soft` to the accent's own channels.

- **The primary action is the accent.** The monochrome `--color-brand-primary` (white on dark, black on light) is gone: a white primary beside a light-grey secondary was one pair of greys. White clears 4.53:1 on the dark accent and 5.62:1 on the light one.
- **Its hover and its press are darker, a step each, never brighter.** The label is white, so a brighter fill is a step toward it: the approved design's `brightness(1.08)` hover took the dark accent's label to 4.18:1, under the text floor at the moment the reader is about to press. Each step is the least move along lightness a reader can see, dE 3, and the palette suite holds both halves: `a hovered primary action is a visible step away from its label` and `a pressed primary action is a visible step past a hovered one`.
- **The focus ring is the accent**, except where the floor forbids it. The dark accent measured 2.88:1 on a pressed row inside a raised surface, under the 3:1 a ring clears, and it cannot lighten itself without taking the primary action's label under 4.5:1; so the dark ring is the accent lifted dE 1.06, the least lift that clears it.
- **Where the reader is in a rail is not the accent.** The rail's current row stands on raised with the plain border round it (`RAIL_CURRENT_ROW`), and the rail's one hue is the attention count, the accent's fill with the on-accent label: the one thing in the chrome that asks the reader to act.

Where an approved value failed a floor, the floor won and the value moved the least it could, keeping its hue. Each token's comment names the value it replaced, the distance and the measurement:

| Token | Was | Shipped | Moved (dE) | Because |
| --- | --- | --- | --- | --- |
| `--color-brand-accent-hover` dark | `#865dff`, the approved `brightness(1.08)` | `#744bf4` | | 4.18:1 under the white label; the shipped step is darker by dE 3.08 |
| `--color-brand-accent-hover` light | `#744bff`, the approved `brightness(1.08)` | `#633ae5` | | it moved toward the label; the shipped step is darker by dE 3.03 |
| `--color-focus` dark | `#7c56ff`, the accent | `#7e5bff` | 1.06 | 2.88:1 on a pressed row inside a raised surface |
| `--color-brand-accent-soft` light | 0.10 | 0.108 | | a selected row sat dE 2.67 from a hovered one on the frame, under 3 |

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
| In `@crewlethq/tokens/test/palette`, `SCRIM_GROUNDS` is the ten avatar tints and no longer carries `--color-brand-accent`, so `a label on the scrim clears 4.5:1` measures over the opaque rungs and the tints alone: `@crewlethq/ui`'s `Avatar` has no accent-filled tone any more (a selected badge is a ring round a neutral one), so no upload overlay lands on the accent. | Nothing, unless a suite of your own reads `SCRIM_GROUNDS` for an accent-filled badge; measure that pair yourself. |

### The states and the chart series

The four states say what a piece of work is doing, and nothing else: **info is working, warning needs a person, danger is stopped, success is done**. Done stays a green in both palettes. The token names stay generic (`success`, `warning`, `danger`, `info`), because a badge, a callout and a toast mean the same four things wherever they are drawn.

The chart ramp is **four series**, blue, orange, aqua and yellow in that order, and `--color-data-other` for everything past the fourth. A series hue is legal only inside a figure that names it: a legend when it carries two series or more, the label when it carries one, which is what a `Meter` is.

Both families are the approved design's hues, or the least move from them that the palette suite's floors forced, found by [the fit](#the-approved-palette-and-the-fit). A state or a series moves inside its own hue family, 15 degrees either way, and each moved token's comment names the design value, the distance and the measurement:

| Token | Palette | Design | Shipped | Moved (dE) | Because |
| --- | --- | --- | --- | --- | --- |
| `--color-feedback-danger` | dark | `#f26d6d` | `#e50055` | 13.35 | white on it 2.92:1; dE 5.7 from done under deuteranopia; dE 7.8 from the chart orange under normal vision. It turns toward crimson as well as darkening, which is what lets the orange stay within dE 3.22 of the design |
| `--color-feedback-danger` | light | `#e5484d` | `#c01d32` | 10.40 | white on it 3.91:1; dE 8.4 from done under protanopia; dE 6.3 from the chart orange under normal vision |
| `--color-feedback-warning` | dark | `#f2b33d` | `#f4b221` | 1.32 | dE 8.5 from done under protanopia |
| `--color-feedback-warning` | light | `#e09a12` | `#c57600` | 10.32 | 2.03:1 as a mark on the frame |
| `--color-feedback-success` | dark | `#3fcf8e` | `#3ecf8f` | 0.13 | dE 9.9 from warning under protanopia |
| `--color-feedback-success` | light | `#23a26d` | `#009b74` | 2.80 | 2.77:1 as a mark on the frame |
| `--color-feedback-info` | light | `#2f7fe0` | `#3081de` | 0.67 | dE 7.4 from the accent under deuteranopia |
| `--color-feedback-info-ink` | light | `#1d63b8` | `#1a5eb3` | 1.56 | 4.21:1 on a pressed row on the frame |
| `--color-feedback-warning-ink` | light | `#935600` | `#8e5000` | 1.89 | 4.16:1 on a pressed row on the frame |
| `--color-feedback-danger-ink` | light | `#bf282e` | `#b61426` | 3.05 | 4.17:1 on a pressed row on the frame, and 3.94:1 on a code chip over the fitted fill's soft tint |
| `--color-feedback-success-ink` | light | `#17744c` | `#106d46` | 2.28 | 4.08:1 on a pressed row on the frame |
| `--color-data-1` | dark | `#3987e5` | `#458adc` | 1.95 | dE 6.0 from the accent under deuteranopia |
| `--color-data-1` | light | `#2a78d6` | `#3879ce` | 1.58 | dE 6.5 from the accent under deuteranopia |
| `--color-data-2` | dark | `#d95926` | `#e4631f` | 3.22 | dE 12.0 from danger under normal vision |
| `--color-data-2` | light | `#eb6834` | `#e45f28` | 2.39 | 2.73:1 as a mark on the frame |
| `--color-data-3` | dark | `#199e70` | `#009c79` | 1.62 | dE 6.3 from danger under deuteranopia |
| `--color-data-3` | light | `#1baf7a` | `#009b74` | 6.04 | 2.40:1 as a mark on the frame |
| `--color-data-4` | light | `#eda100` | `#c57600` | 13.09 | 1.85:1 as a mark on the frame: a yellow dark enough to be seen on a light page is an ochre |

Every other state and series step ships as designed: the dark inks, dark info, and the dark yellow. The design's soft tints are drawn at their own alphas; the kit derives every `-soft` step at 0.12 and every `-line` step at 0.30 from the fill, per palette.

In light, two series land on a state's own value: the aqua on done's green (`#009b74`) and the yellow on the warning ochre (`#c57600`). The design drew each pair a few steps apart, and each was darkened onto the same floor, a mark that clears 3:1 on the frame, where the two meet at the edge of what a screen can show. Nothing in the suite keeps a series from a state other than the reserved red, and a series is read only inside a figure that names it.

- **The danger fill carries a white label**, on a toast's destructive action and on an upload's remove button, so it is dark enough for 4.5:1 in both palettes (4.71:1 dark, 6.06:1 light), and its hover, `--color-feedback-danger-hover`, is a step darker again, the least a reader can see (dE 3.14 dark, 3.04 light). The palette suite holds the hover as it holds the primary action's: `a hovered destructive action is a visible step away from its label`.
- **The reserved red is kept away from every series**: dE 14 under normal vision and 8 under protanopia and deuteranopia, where red, orange and green fall onto one axis. The approved aqua sat dE 0.73 from the approved red under protanopia.
- **Neighbouring series** sit dE 9 apart under every vision and dE 15 under normal vision. The second floor is new: on its own, the dichromat floor let a pair sit dE 9 apart for every reader, which to full-colour vision is two shades of one hue.

The marketing root takes the dark palette's state and series values.

### Breaking change in 0.5.0: the state and chart hues

| What changed | What to change |
| --- | --- |
| `--color-data-5` (`color.data.5`) is removed: the ramp is four series. | A fifth series is the residual, `--color-data-other`; a figure with more than four series folds the rest into it or is split. |
| `--color-data-1` to `-4` are the approved blue, orange, aqua and yellow (the table above). They were an indigo, a yellow, a sky blue and a green in dark, and an indigo, an amber, a blue and a green in light. | Nothing, for a figure that reads the tokens and names its series. A figure that relied on a series' colour meaning something (a green series for "passed") takes a state token instead, which is what a meaning is for. |
| The four state fills, their inks and `--color-feedback-danger-hover` take the values above, and so do their derived `-soft` and `-line` steps. The dark fills were a teal, an amber, a red and a sky blue, and the light ones a dark teal, a brown, a dark red and a dark blue. | Nothing, for a stylesheet that reads the tokens. |
| Nine neutral and accent steps move by one 8-bit step or one thousandth of alpha, because the fit places them jointly with the state inks drawn on them: in light, `--color-surface-hover` 0.045 to 0.044, `--color-surface-pressed` 0.089 to 0.088, `--color-surface-inset` 0.025 to 0.026, `--color-text-tertiary` `#5e5e67` to `#5f5e67`, `--color-data-other` `#87878f` to `#88888f`, `--color-brand-accent-soft` 0.109 to 0.108 and `--color-brand-accent-active` `#5b2dda` to `#5b2eda`; in dark and on the marketing root, `--color-focus` `#805bff` to `#7e5bff`; in dark, `--color-border-control` `#797983` to `#787983`. | Nothing. |
| In `@crewlethq/tokens/test/palette`, `DATA` is the four series, and `adjacent data hues stay separable` holds a neighbouring pair to dE 15 under normal vision as well as 9 under every vision (the new exports `DATA_ADJACENT_DE` and `DATA_ADJACENT_NORMAL_DE`). `ACTION_STEPS` gains `a hovered destructive action is a visible step away from its label`. | Rename a subject a suite filters on. |

### Breaking change in 0.5.0: the phase family is removed

| What changed | What to change |
| --- | --- |
| `--color-phase-onboarding`, `--color-phase-execute` and `--color-phase-review`, with their `-ink` and `-soft` steps, are removed from every palette, and so is `color.phase` (and `themes.*.color.phase`) in the typed export. | A phase is drawn in the neutral colour with its word: `--color-text-secondary` or `--color-text-tertiary` for the word, on a neutral ground, never a hue of its own. Inside a figure, map each phase to a series, `--color-data-1` to `-4`, and name it in the legend. |
| In `@crewlethq/tokens/test/palette`, the `PHASE` export is removed, `INK_STEPS` and `FILL_STEPS` no longer carry the phase steps, and the rules `phase hues stay separable` and `a phase hue clears the status family` are removed. | Drop a suite's filter on those rule names. |

## The palette suite

`test/palette.mjs` holds the rule table and the colour maths, and `test/palette.test.mjs` runs it over `dist/css` in import order, in every theme state: the base marketing root (`base`), the dark root (`dark`), light by media query (`light (media query)`) and light by attribute (`light (attribute)`), which are the keys `paletteStates()` returns. It measures every text step on every surface it can land on (the four opaque rungs in `OPAQUE_SURFACES`, and the translucent overlays composited over each of them), every ink on its own soft tint, every fill as a mark, the primary action's three fills under its label and the steps between them, the destructive action's fill and its hover under the same label, the focus ring, the control boundary, the rail's current row, the steps between the rungs and the hairline that finds a card, whether a hovered and a pressed row can be seen, the hue separations under normal, protan and deuteranopic vision (the states from each other, the chart series from their neighbours and from the danger red, and every hue from the accent), and the structure of the theme file itself. A component suite that measures a colour of its own measures it on `OPAQUE_SURFACES` too, rather than on a list of surface names it keeps itself.

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

The tarball ships `test/color.mjs`, `test/palette.mjs`, `test/palette.d.mts` and `test/palette.test.mjs`, so the whole table runs over the installed version with no configuration at all, from the application's root:

```sh
node node_modules/@crewlethq/tokens/test/palette.test.mjs
```

or with the package's own `node --test "test/*.test.mjs"` from inside `node_modules/@crewlethq/tokens`. Not with `node --test` over a path into `node_modules` from outside it: the test runner skips `node_modules`, a glob included, runs no test at all and exits 0. `test/tarball.test.mjs` packs this package with npm, installs the tarball into an empty directory and runs both commands there, counting the tests that ran, and imports the suite by its package name to hold `runPalette`, `paletteStates`, `describeFailure` and `tightest` to the shapes `test/palette.d.mts` declares, which is how an application's own suite reaches them.

`test/build.test.mjs` stays out of the tarball: it reads the token source the build compiles from, which a tarball does not carry. So do `test/intent.test.mjs`, which reads the design record below, `test/tarball.test.mjs`, which packs the package from outside it, and `test/fonts.test.mjs`, which decodes every file in `fonts/` and holds [`fonts/README.md`](./fonts/README.md), the built `@font-face` rules and [`fonts/OFL.txt`](./fonts/OFL.txt) to what the files say about themselves: a replaced file is caught in this repository, before it is published, not in an installed copy.

### The approved palette, and the fit

[`tokens/intent.json`](./tokens/intent.json) is the approved design's palette: the two token blocks every artboard declares (`.app` for dark, `.app.light` for light), declaration for declaration, each with the custom property that ships it, and the colours the artboards spell outside those blocks. It is a record rather than a token file: the build skips it and nothing is emitted from it. `test/intent.test.mjs` holds it to naming only tokens the palettes declare, the same names for the same tokens in both palettes, and values that parse.

Every colour the record names ships the value recorded there, or the least move from it that one of the palette suite's floors forced: the surfaces, the neutral text and border steps, the accent, the four states and their inks, and the four chart series. [`scripts/fit-palette.mjs`](./scripts/fit-palette.mjs) is what finds those moves:

```sh
npm run build --workspace @crewlethq/tokens
node packages/tokens/scripts/fit-palette.mjs          # both palettes, about three minutes
node packages/tokens/scripts/fit-palette.mjs light    # one of them
```

From the recorded values it searches for the palette that moves the design least in all, in OKLab dE, while clearing every rule, each candidate measured by `runPalette` itself over the candidate stylesheets:

- a neutral step and the accent's family move along lightness alone, as every move before the fit was made; a state or chart hue moves inside a hue family 15 degrees either side of the design's; a translucent step moves its alpha;
- only a value that fails a floor of its own moves, never the ground it was measured on, and never a value that clears every floor it has to spare another;
- the four rungs keep the design's order, and so does the text ramp, because the suite holds a step to a distance and not to a direction (in light, raised is below the card);
- a token the design never drew (the focus ring, a pressed row, the primary action's hover and press, the destructive action's hover, a control's boundary) is fitted from the value it is a step of, and only after the design's own values: it never buys a design value back by moving itself. A step is seated first, where its own rule holds, because at the value it is a step of that rule refuses it, and the design is then repaired around it;
- a value's own floors are repaired before a separation between two values, because where a hue's floor sends it does not depend on anything else;
- a hue is looked for along lightness first, keeping its hue and chroma, the move every hand fit made, and then in drawn directions inside its family; and a seat found along a drawn direction is then turned toward the design, the direction rotated in halving angles until no turn brings the seat nearer, because a seat on a drawn direction is only as near as that direction lets it be;
- a value that another is measured ON moves together with it: a state's ink is held to 4.5:1 on its own fill's soft tint and on a code chip over that tint, so a fill walked back toward the design takes its ink with it, the ink repaired at every step. Moved one at a time, neither could go nearer, and the light danger red ended as a muted maroon dE 15.19 from the design where the red and its ink moved together need 10.40 and 3.05.

It is seeded (mulberry32 at seed 1). The search spends a fixed budget of palette evaluations repairing and improving the palette, and the finish then runs until no move it knows pays, so the same built stylesheets give the same fit, to the byte. The fit is the best it finds, not a proof that nothing moves the design less; its first line says how many evaluations the search and the finish took, and says so plainly if the finish ever stopped at its ceiling with moves still paying. For each value it fits it prints the design value, the value the fit ships, the dE between them and the binding rule, which is what fails when that value alone goes back to the design; then every token whose built value is not the fit. A token the floors moved says the same three things in its own comment in `tokens/themes/*.json`: the design value, the dE of the move and the measurement that forced it.

The fit is a development tool. It is not published, and no test runs it or reads what it prints: the gate is the palette suite, and the fit is how a value that passes it is chosen.

The fit is held to every rule in the table, and the shipped palette is exactly what it prints: run over this release's stylesheets, it reports that every value it fits ships its fitted value, in both palettes.

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

1. Edit a JSON file in `tokens/`, or `tokens/themes/light.json` and `tokens/themes/dark.json` for a slot that changes with the palette. A themed slot needs an entry in **both** theme files and a value in `tokens/color.json`, which the palette suite checks. A colour the design draws starts from its value in `tokens/intent.json`, which changes first when the design does, and `scripts/fit-palette.mjs` gives the least move from it that clears the suite (see [The approved palette, and the fit](#the-approved-palette-and-the-fit)).
2. Run `npm run build` (or `npm run dev` for watch).
3. Run `npm test`. A colour change that lowers a measured floor fails here.
4. The generated `dist/` and `src/index.ts` are regenerated.

Never edit files in `dist/` or `src/index.ts` directly. They are
regenerated on every build. `stylesheets/base.css` is the one stylesheet in this package written by hand rather than generated; the build copies it into `dist/css/`.

## License

The tokens, stylesheets and scripts are licensed under the MIT License, whose text is in [`LICENSE`](./LICENSE). The font files in `fonts/` are licensed under the SIL Open Font License 1.1, whose text and copyright notices are in [`fonts/OFL.txt`](./fonts/OFL.txt). The package manifest records both as the SPDX expression `MIT AND OFL-1.1`.
