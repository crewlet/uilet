# @crewlethq/icons

Everything a Crewlet surface draws that is not text: the Material Symbols glyph set, the marks of the applications the platform integrates with, and the Crewlet signature illustrations.

All three are React components compiled from SVG files that ship in the package. Nothing here fetches a font, a sprite or an image from another host, so a closed network draws exactly what an open one does.

| What | Import from | Looks like |
| ---- | ----------- | ---------- |
| Glyphs (101 Material Symbols) | `@crewlethq/icons/glyphs` | `<CloseGlyph size="md" />` |
| A glyph chosen from a value | `@crewlethq/icons/glyphs/registry` | `glyphByName(name)` |
| Vendor marks | `@crewlethq/icons` | `<VendorMark vendor="slack" />` |
| Signature illustrations | `@crewlethq/icons` | `<AgentReading />`, `<Icon name="AgentReading" />` |
| The Crewlet character | `@crewlethq/icons` | `<CrewletFigure motion="wave" />` |

## Glyphs

```tsx
import { CloseGlyph, KeyboardArrowDownGlyph } from '@crewlethq/icons/glyphs';

<CloseGlyph size="md" />
<CloseGlyph size="lg" title="Close" />
```

Material Symbols Outlined, weight 400, grade 0, vendored at the 20 px and 24 px optical sizes from `google/material-design-icons`. [`symbols/README.md`](./symbols/README.md) records the provenance, the checksums and how to add or replace one.

| Prop | Type | Default | Purpose |
| ---- | ---- | ------- | ------- |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` (12, 14, 16, 20, 24), a number of px, or any CSS length | `'1em'` | How big it draws. |
| `title` | string | none | Names the glyph for assistive technology. Without one the glyph is `aria-hidden` and unfocusable, which is right wherever a label sits beside it. |
| `opsz` | `20 \| 24` | follows `size` | Which vendored drawing to use. |

Every SVG attribute passes through, and `className` is added to the component's own `crewlet-glyph`.

**Names carry a `Glyph` suffix** because the bare words collide: `Timeline`, `List`, `Menu`, `Tag`, `Link` and `Code` are all `@crewlethq/ui` components, and a glyph taking one of those names would shadow the component at every import site that wanted both. `close` is `CloseGlyph`, `keyboard_arrow_down` is `KeyboardArrowDownGlyph`, `check_circle-fill` is `CheckCircleFillGlyph`.

`GLYPH_NAMES` lists every vendored name and `GlyphName` is the union of them, so a name the package does not ship is a compile error.

### The optical size

The optical size axis is a different drawing, not a scaled one: the 20 px `close` is a 51-unit stroke on the 960 unit grid and the 24 px one is 56. `Glyph` takes the 20 px drawing at and below 20 px and the 24 px drawing above it, which it can work out whenever `size` says how many px it is.

It cannot when `size` is left at `1em` and an ancestor's `font-size` decides, because CSS has no way to hand a computed font size back to the component that would have to choose. The default there is the 20 px drawing, on the grounds that a glyph inheriting a font size sits in body text or a control label, every step of which is at or below 20 px. A surface that sets a larger font size passes `opsz={24}`.

### Choosing a glyph from a value

```ts
import { glyphByName } from '@crewlethq/icons/glyphs/registry';
```

**This entry pulls in every glyph**, because a lookup by name is a lookup over all of them. That is the right trade where the name really is data (a navigation table, an event category, a configured integration kind) and the wrong one everywhere else, which is why it is a separate entry: code that imports one glyph never reaches it.

## Vendor marks

```tsx
import { VendorMark } from '@crewlethq/icons';

<VendorMark vendor="slack" size={24} />
<VendorMark vendor="datadog" size={24} muted />
```

| Prop | Type | Default | Purpose |
| ---- | ---- | ------- | ------- |
| `vendor` | `Vendor`: `'atlassian' \| 'clickup' \| 'datadog' \| 'discord' \| 'figma' \| 'github' \| 'gitlab' \| 'mattermost' \| 'microsoft-teams' \| 'notion' \| 'slack' \| 'telegram'` | required | Which mark. |
| `size` | as `Glyph` | `'1em'` | How big it draws. |
| `title` | string | none | Names the mark. Without one it is `aria-hidden`. |
| `muted` | boolean | `false` | Drains the colour, for an application that is available but not connected. |

**This is the one place the design system draws somebody else's colours.** Colour here carries state and never identity, and a third-party application's mark is the deliberate exception: identity is exactly what a mark is for, and a recoloured Slack mark is not Slack's. No hue in `svg/vendor/` is a token, nothing reads state from a mark, and a mark appears only beside the name of the application it belongs to.

GitHub's and Notion's marks are monochrome by design and take the current text colour, so they read on either theme. That is each vendor's own instruction rather than an exemption: both publish one mark, black on a light ground and white on a dark one, so a fixed hex would be wrong in one theme whichever was picked.

A mark keeps its own viewBox, so one that is not square (Figma's is 2:3) is drawn to fit the square `size` and centred in it, at the aspect ratio the vendor draws.

The marks and the terms on which they may be used are in [`TRADEMARKS.md`](./TRADEMARKS.md), which ships in the package. The Mattermost, Datadog, Notion, Discord, ClickUp, Telegram and Microsoft Teams drawings are Simple Icons' renderings, whose path data is CC0 1.0.

`VENDORS` lists every mark the package carries.

## Signature illustrations

```tsx
import { AgentReading, CrewletIcon } from '@crewlethq/icons';

<AgentReading style={{ fontSize: 32 }} />
```

Each illustration is a named export, and a bundler keeps only the one that is imported. There is also a by-name component:

```tsx
import { Icon } from '@crewlethq/icons';

<Icon name="AgentReading" size="lg" title="Documentation" />
```

`size` accepts `'sm' | 'md' | 'lg' | 'xl'` (16, 20, 24 and 32 px), a number of px, or any CSS length. `title` exposes the icon to assistive technology with `role="img"`; without it the icon is `aria-hidden`. `name` is typed as `IconName`, so a name the package does not ship is a compile error; `ICON_NAMES` lists them in file-name order, and it is a set rather than a sequence, because adding or renaming an illustration shifts the order.

**`Icon` carries every illustration into the bundle**, which is most of half a megabyte, nearly all of it `crewlet-reading`. A lookup by name is a lookup over all of them, so use it where the name really is data and import the component everywhere else.

### Raw SVG files

The source SVGs ship in the package and are exported as `@crewlethq/icons/svg/*`, for an `<img>`, a favicon or any other surface that needs a file rather than a React component:

```ts
import markUrl from '@crewlethq/icons/svg/crewlet-icon.svg';
```

A bundler resolves the import to a URL. Outside a bundler, resolve the same specifier with `import.meta.resolve('@crewlethq/icons/svg/crewlet-icon.svg')` to get the file on disk. The vendored glyph drawings are exported the same way, as `@crewlethq/icons/symbols/20/close.svg`.

### Favicons

An icon slot is square and the mark is 3:2, so the mark sits in a band across the middle of a tab whichever file is linked: framing cannot make a wide drawing fill a square. What `favicon/` carries instead is a square SOURCE, which is what a raster pipeline and a search engine both ask for. Google considers a favicon candidate only if it is square and larger than 48px, and every generator that renders PNGs from the mark takes the padding from its viewBox rather than inventing it. The square frame is also the wide file's own side margins trimmed off, so the same paths draw about 8 percent larger in the same slot.

| File | For |
| ---- | --- |
| `favicon/crewlet.svg` | Any product's `<link rel="icon">`. The mark, framed square. |
| `favicon/crewlet-admin.svg` | An operator console, in a red that tells a superadmin tab from a tenant tab at a glance. |
| `favicon/crewlet.ico` | The raster fallback, at 16, 32 and 48 px, for a browser or a bookmark that asks for one. |

```html
<link rel="icon" type="image/svg+xml" href="/crewlet.svg" />
<link rel="icon" sizes="any" href="/favicon.ico" />
```

All three are one drawing: the square files are `svg/crewlet-icon.svg` path for path, and differ only in the viewBox that frames them and the fill. `test/brand.test.mjs` holds that, because four products each kept their own copy of the mark and copies of one drawing drift silently. It also measures the frame against the drawing inside it, so a square viewBox that crops the mark, parks it off centre or leaves it swimming in air fails rather than shipping: a favicon is the one asset nobody looks at closely enough to catch that by eye.

### CrewletFigure

`CrewletFigure` renders the Crewlet character as five separately animated body parts:

```tsx
import { CrewletFigure } from '@crewlethq/icons';

<CrewletFigure motion="wave" style={{ fontSize: 96 }} />
```

| Prop | Type | Default | Purpose |
| ---- | ---- | ------- | ------- |
| `motion` | `CrewletMotion`: `'idle' \| 'dance' \| 'wave' \| 'jump' \| 'walk' \| 'spin'` | `'idle'` | The looping motion. |
| `delay` | number (seconds) | `0` | Phase offset, so several figures do not move in lockstep. |
| `color` | CSS colour | `--color-brand-mark`, falling back to the crewlet purple | Body fill. |
| `fillGaps` | boolean | `true` | Backs each joint with body, so a moving limb never uncovers a gap. `false` renders the plain trim, where the pieces meet with visible seams. |

The figure is sized in `em` like the icons (set `font-size` or pass `width` and `height`) and is `aria-hidden`; give the surrounding element an accessible name when the figure carries meaning. Every motion stops when the user prefers reduced motion. The geometry lives in `src/crewletParts.ts` and the motions in `src/CrewletFigure.css`, which the component imports.

## Stylesheets

Two components carry rules, and each imports its own stylesheet as a side effect, so a bundler emits the CSS beside the JavaScript and a consumer gets it without being told to. Nothing here depends on `@crewlethq/tokens`: a rule that wants a token reads it with the literal value as a fallback.

Loading the built entry in plain Node, with no bundler, therefore fails on the stylesheet import. That is the same contract `@crewlethq/ui` has.

## Add an illustration

1. Drop `<your-icon>.svg` into `svg/`. File names become PascalCase component names (for example, `agent-celebrating.svg` becomes `AgentCelebrating`).
2. Run `npm run build`.
3. The new illustration is exported from `@crewlethq/icons` and appears in `ICON_NAMES`.

A vendor mark goes into `svg/vendor/` instead, and is added to the `VENDORS` list and the `Vendor` union in `src/VendorMark.tsx`. A glyph is vendored rather than drawn; see [`symbols/README.md`](./symbols/README.md).

## Conventions for source SVGs

Four families coexist in this package:

**Brand artwork**: `crewlet-icon` (the Crewlet mark) and `crewlet-reading` (a full-colour illustration of the Crewlet character reading a newspaper), together with `CrewletFigure`. Filled artwork on its own viewBox; render it as supplied. `crewlet-reading` is a large, detailed illustration (about 670 KB of SVG), so reserve it for hero and empty-state surfaces rather than inline icon slots. The Crewlet name, mark and character are trademarks that the MIT License does not cover; see [TRADEMARKS.md](./TRADEMARKS.md) before using them outside an official Crewlet product.

**Feature illustrations** (80x80): `hierarchy`, `company-as-code`, `turn-engine`, `code-sandbox`, `knowledge` and `human-in-loop`. One per capability the platform leads with, so a reader arriving from the README, the marketing site or the docs meets the same six marks. Self-contained artwork with its own gradients and background disc, so it does not inherit `currentColor`. The build prefixes every `id` in a file with that file's name, because inline SVGs share the page's id space; keep gradient and other `id` references inside the file that defines them.

A gradient in one of these **must** declare `gradientUnits="userSpaceOnUse"` and span the 80x80 canvas. Left to the SVG default, `objectBoundingBox`, a gradient is measured from the box of each shape that paints with it, and a horizontal or vertical stroke has a box with no area: the gradient degenerates and the shape does not paint at all. Several strokes in this set are exactly that, and the failure is silent, so `test/gradients.test.mjs` holds the rule over every file in `svg/`. It stops at `svg/vendor/`, where a gradient is the vendor's own and respanning it would repaint somebody else's logo; what the marks are held to instead is the failure, that no axis-aligned shape there paints from a box-measured gradient.

The gradient stops in these files carry their colour in a `style` attribute, as the drawings were authored. Rendered through the React component it is a `style` prop, which React writes through the CSSOM and `style-src` does not govern, and an SVG referenced as an image is its own document outside the page's policy either way. Inlining one of the raw files into a page served with a strict `style-src` is the case that loses the colours, so inline the component rather than the file.

**Signature illustrations** (32x32): the crewlet "agent" character in different contexts (`agent-idle`, `agent-working`, `agent-thinking`, `agent-reading`, `agent-greeting`, `agent-success`, `agent-error` and `agent-loading`). The set reads as one character through a shared line style and scale rather than an identical outline: the head and shoulders move, shrink or give way to a torso when the pose needs room for a prop (a book, a desk, a thought bubble). Name new variants `agent-<pose>.svg`.

Signature illustrations follow these rules so they recolor from CSS and sit on one visual weight:
- A `0 0 32 32` viewBox.
- `stroke="currentColor"` and `fill="none"`.
- A single 1.6 stroke weight.
- `stroke-linecap="round"` and `stroke-linejoin="round"`.
- No hard-coded width or height attributes (the build strips them).

**Vendor marks** (`svg/vendor/`): each application's own drawing in its own colours, on its own viewBox. The root element declares the fill it wants, because the build only supplies `currentColor` where a source declares none.

## License

MIT AND Apache-2.0.

The package's own code and artwork are MIT; the license text is in [`LICENSE`](./LICENSE), which ships in the package. The vendored Material Symbols drawings in `symbols/` are Google's, under the Apache License 2.0, whose text and attribution are in [`symbols/LICENSE`](./symbols/LICENSE) and [`symbols/NOTICE`](./symbols/NOTICE) and ship beside them.

Both licenses cover copyright only. The Crewlet name, logo and character are trademarks, and so are the third-party marks in `svg/vendor/`. [`TRADEMARKS.md`](./TRADEMARKS.md), which also ships in the package, says how each may be used.
