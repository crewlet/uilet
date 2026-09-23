# @crewlethq/icons

Everything a Crewlet surface draws that is not text: the Lucide glyph set, the marks of the applications the platform integrates with, and the Crewlet signature illustrations.

All three are React components compiled from SVG files that ship in the package. Nothing here fetches a font, a sprite or an image from another host, so a closed network draws exactly what an open one does.

| What | Import from | Looks like |
| ---- | ----------- | ---------- |
| Glyphs (Lucide, stroke on the 24 grid) | `@crewlethq/icons/glyphs` | `<XGlyph size="md" />` |
| A glyph chosen from a value | `@crewlethq/icons/glyphs/registry` | `glyphByName(name)` |
| Vendor marks | `@crewlethq/icons` | `<VendorMark vendor="slack" />` |
| Signature illustrations | `@crewlethq/icons` | `<AgentReading />`, `<Icon name="AgentReading" />` |
| The Crewlet character | `@crewlethq/icons` | `<CrewletFigure motion="wave" />` |

## Glyphs

```tsx
import { StarGlyph, XGlyph } from '@crewlethq/icons/glyphs';

<XGlyph size="md" />
<XGlyph size="lg" title="Close" />
<StarGlyph filled={kept} />
```

Lucide drawings, vendored unchanged from `lucide-static` and drawn as the approved design draws them: a stroke on the 24 unit grid at a weight of 1.75, with round caps and round joins. [`glyphs/README.md`](./glyphs/README.md) records which glyphs the set carries and why, their provenance, the checksums and how to add or replace one.

| Prop | Type | Default | Purpose |
| ---- | ---- | ------- | ------- |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` (12, 14, 16, 20, 24), a number of px, or any CSS length | `'1em'` | How big it draws. |
| `title` | string | none | Names the glyph for assistive technology. Without one the glyph is `aria-hidden` and unfocusable, which is right wherever a label sits beside it. |
| `filled` | boolean | `false` | Paints the drawing's inside in the text colour. Only a glyph listed in `FILLABLE` takes it; see below. |

Every other SVG attribute a caller sets on an icon passes through (a class, a style, a colour, a handler, an `aria-` or `data-` attribute), and `className` is added to the component's own `crewlet-glyph`. What the frame owns does not: `viewBox`, `fill`, `strokeWidth`, `strokeLinecap` and `strokeLinejoin` are not props, and the frame keeps them even against a caller the types do not reach, because each changes the drawing rather than where it sits or how big it is.

**Names are Lucide's, with a `Glyph` suffix,** because the bare words collide: `Timeline`, `List`, `Menu`, `Tag`, `Link` and `Code` are all `@crewlethq/ui` components, and a glyph taking one of those names would shadow the component at every import site that wanted both. `x` is `XGlyph`, `chevron-down` is `ChevronDownGlyph`, `columns-3` is `Columns3Glyph`. `GLYPH_NAMES` lists every vendored name and `GlyphName` is the union of them, so a name the package does not ship is a compile error.

### The stroke

The weight is 1.75 units of the 24 grid, where Lucide's own files say 2, and it scales with the glyph as the design's does: a 16 px glyph draws a 1.17 px line and a 24 px one a 1.75 px line. `--crewlet-glyph-stroke` moves it for every glyph beneath the element that sets it, and it is the one way to:

```css
.dense-toolbar {
  --crewlet-glyph-stroke: 2;
}
```

The glyph carries the weight twice: as a style that reads the variable, and as a plain `stroke-width="1.75"` attribute beneath it, so markup rendered on a server under a `style-src` policy that refuses style attributes still draws at the design weight rather than at the SVG default of 1. `GLYPH_STROKE` is the number, for a drawing of your own that stands beside a glyph.

### The filled state

**Only a `FILLABLE` glyph takes `filled`.** A stroke drawing with its inside painted reads as the mark only where the drawing is one closed silhouette: `bell` has an open clapper and would fill into a blob with a line through it, and `compass` and `target` are closed but would fill into a disc with nothing left to say which disc it is. So `FILLABLE` is a decision about meaning rather than a property of the geometry, the build refuses a name there whose drawing has an open stroke, and the component of every other glyph has no `filled` prop at all, so passing one is a compile error. It is `['star']` today: the kept state of the Crewlet console's favourite toggle.

A glyph a surface draws in two states that `FILLABLE` does not cover changes colour or changes glyph, rather than filling.

### Choosing a glyph from a value

```ts
import { glyphByName } from '@crewlethq/icons/glyphs/registry';
```

**This entry pulls in every glyph**, because a lookup by name is a lookup over all of them. That is the right trade where the name really is data (a navigation table, an event category, a configured integration kind) and the wrong one everywhere else, which is why it is a separate entry: code that imports one glyph never reaches it. The answer is the component registered under the name, with its own type: `glyphByName('star')` takes `filled` and `glyphByName('x')` does not.

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

A bundler resolves the import to a URL. Outside a bundler, resolve the same specifier with `import.meta.resolve('@crewlethq/icons/svg/crewlet-icon.svg')` to get the file on disk. The vendored glyph drawings are exported the same way, as `@crewlethq/icons/glyphs/x.svg`, and so is the license that travels with them, as `@crewlethq/icons/glyphs/LICENSE`. A raw file is upstream's drawing at upstream's stroke of 2; the components are what draw it at the design's 1.75.

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

A vendor mark goes into `svg/vendor/` instead, and is added to the `VENDORS` list and the `Vendor` union in `src/VendorMark.tsx`. A glyph is vendored rather than drawn; see [`glyphs/README.md`](./glyphs/README.md).

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

## Breaking changes in 0.5.0

**The glyphs are Lucide's stroke drawings, and the Material Symbols set is gone.** The approved design draws every glyph as a stroke on the 24 grid with round caps and joins, and a filled Material Symbol beside one reads as a mark from another set, so `@crewlethq/icons/glyphs` now carries Lucide drawings under Lucide's names. Every glyph changes drawing, and most change name. The `symbols/` tree, its `@crewlethq/icons/symbols/*` export and `scripts/vendor-symbols.mjs` are removed; the drawings are in `glyphs/`, exported as `@crewlethq/icons/glyphs/*`. The package's license is `MIT AND ISC` rather than `MIT AND Apache-2.0`, and the notice an application's third-party notices carry for the glyphs is `@crewlethq/icons/glyphs/LICENSE` rather than `@crewlethq/icons/symbols/LICENSE` and `NOTICE`.

The optical size axis goes with Material: a Lucide drawing is one drawing at every size, so `opsz` and the two functions that chose it are removed. A filled state is a prop rather than a second glyph, and only on a glyph that can carry one: Material's `check_circle-fill`, `error-fill`, `info-fill` and `warning-fill` were solid discs and triangles with the mark knocked out, which a stroke drawing cannot be, so they take the outline, and the tone around them carries the state as it already did.

**One name survives with a different meaning, and it is not a compile error**, so look for it: `FullscreenGlyph` is Lucide's `fullscreen`, the corners with a screen inside that succeed Material's `fit_screen`, and Material's `fullscreen`, the bare corners, is now `MaximizeGlyph`. `TagGlyph` is gone rather than repurposed: Material's `tag` was a hash sign, which is `HashGlyph`, and Lucide's own `tag` is a price label that under the old name would have drawn a different thing without a word.

| Was | Is |
| --- | --- |
| a glyph imported by its Material name | its Lucide successor, from the table below |
| `opsz={20}` or `opsz={24}` on a glyph | nothing: remove the prop |
| `glyphOpticalSize()`, `glyphPixels()`, the `GlyphOpticalSize` and `GlyphDrawing` types | nothing; `cssLength()` still says what length a size means |
| `<StarFillGlyph />` | `<StarGlyph filled />` |
| `fill="currentColor"` or `fill` in a stylesheet to solidify a glyph | `filled` on a `FILLABLE` glyph; a stylesheet `fill` paints a stroke drawing's inside, so drop it from any rule that reaches a `.crewlet-glyph` |
| a stylesheet or `strokeWidth` changing a glyph's weight | `--crewlet-glyph-stroke` on an ancestor |
| `@crewlethq/icons/symbols/20/<name>.svg` or `/24/<name>.svg` | `@crewlethq/icons/glyphs/<lucide-name>.svg` |
| `@crewlethq/icons/symbols/LICENSE` and `NOTICE` in your third-party notices | `@crewlethq/icons/glyphs/LICENSE` |
| a license scan expecting `MIT AND Apache-2.0` | `MIT AND ISC` |
| `glyphByName('close')` and the other Material names in a `GlyphName` | the Lucide name, from the table below |

Every Material Symbols name the package shipped, and its successor. A row's Lucide name is also the `GlyphName` for `glyphByName`.

<!-- The migration table: every Material Symbols name 0.4 shipped, once. test/migration.test.mjs holds it to that. -->

| Material Symbols name | Was | Lucide name | Is |
| --------------------- | --- | ----------- | -- |
| `account_tree` | `AccountTreeGlyph` | `network` | `NetworkGlyph` |
| `add` | `AddGlyph` | `plus` | `PlusGlyph` |
| `apartment` | `ApartmentGlyph` | `building-complex` | `BuildingComplexGlyph` |
| `arrow_downward` | `ArrowDownwardGlyph` | `arrow-down` | `ArrowDownGlyph` |
| `arrow_forward` | `ArrowForwardGlyph` | `arrow-right` | `ArrowRightGlyph` |
| `arrow_outward` | `ArrowOutwardGlyph` | `arrow-up-right` | `ArrowUpRightGlyph` |
| `arrow_upward` | `ArrowUpwardGlyph` | `arrow-up` | `ArrowUpGlyph` |
| `autorenew` | `AutorenewGlyph` | `refresh-cw` | `RefreshCwGlyph` |
| `block` | `BlockGlyph` | `ban` | `BanGlyph` |
| `bolt` | `BoltGlyph` | `zap` | `ZapGlyph` |
| `book_2` | `Book2Glyph` | `book-open` | `BookOpenGlyph` |
| `bug_report` | `BugReportGlyph` | `bug` | `BugGlyph` |
| `build` | `BuildGlyph` | `wrench` | `WrenchGlyph` |
| `cable` | `CableGlyph` | `plug` | `PlugGlyph` |
| `cached` | `CachedGlyph` | `refresh-ccw` | `RefreshCcwGlyph` |
| `calendar_clock` | `CalendarClockGlyph` | `calendar-clock` | `CalendarClockGlyph` |
| `calendar_today` | `CalendarTodayGlyph` | `calendar` | `CalendarGlyph` |
| `chat` | `ChatGlyph` | `message-square` | `MessageSquareGlyph` |
| `check` | `CheckGlyph` | `check` | `CheckGlyph` |
| `check_circle` | `CheckCircleGlyph` | `circle-check` | `CircleCheckGlyph` |
| `check_circle-fill` | `CheckCircleFillGlyph` | `circle-check` | `CircleCheckGlyph` |
| `chevron_left` | `ChevronLeftGlyph` | `chevron-left` | `ChevronLeftGlyph` |
| `chevron_right` | `ChevronRightGlyph` | `chevron-right` | `ChevronRightGlyph` |
| `close` | `CloseGlyph` | `x` | `XGlyph` |
| `code` | `CodeGlyph` | `code` | `CodeGlyph` |
| `computer` | `ComputerGlyph` | `monitor` | `MonitorGlyph` |
| `content_copy` | `ContentCopyGlyph` | `copy` | `CopyGlyph` |
| `create_new_folder` | `CreateNewFolderGlyph` | `folder-plus` | `FolderPlusGlyph` |
| `crown` | `CrownGlyph` | `crown` | `CrownGlyph` |
| `cycle` | `CycleGlyph` | `repeat-2` | `Repeat2Glyph` |
| `dark_mode` | `DarkModeGlyph` | `moon` | `MoonGlyph` |
| `dashboard` | `DashboardGlyph` | `layout-dashboard` | `LayoutDashboardGlyph` |
| `database` | `DatabaseGlyph` | `database` | `DatabaseGlyph` |
| `delete` | `DeleteGlyph` | `trash` | `TrashGlyph` |
| `description` | `DescriptionGlyph` | `file-text` | `FileTextGlyph` |
| `difference` | `DifferenceGlyph` | `diff` | `DiffGlyph` |
| `dns` | `DnsGlyph` | `server` | `ServerGlyph` |
| `drag_indicator` | `DragIndicatorGlyph` | `grip-vertical` | `GripVerticalGlyph` |
| `edit` | `EditGlyph` | `pencil` | `PencilGlyph` |
| `error` | `ErrorGlyph` | `circle-alert` | `CircleAlertGlyph` |
| `error-fill` | `ErrorFillGlyph` | `circle-alert` | `CircleAlertGlyph` |
| `explore` | `ExploreGlyph` | `compass` | `CompassGlyph` |
| `fit_screen` | `FitScreenGlyph` | `fullscreen` | `FullscreenGlyph` |
| `flag` | `FlagGlyph` | `flag` | `FlagGlyph` |
| `folder` | `FolderGlyph` | `folder` | `FolderGlyph` |
| `fork_right` | `ForkRightGlyph` | `split` | `SplitGlyph` |
| `fullscreen` | `FullscreenGlyph` | `maximize` | `MaximizeGlyph` |
| `fullscreen_exit` | `FullscreenExitGlyph` | `minimize` | `MinimizeGlyph` |
| `group` | `GroupGlyph` | `users` | `UsersGlyph` |
| `help` | `HelpGlyph` | `circle-question-mark` | `CircleQuestionMarkGlyph` |
| `inbox` | `InboxGlyph` | `inbox` | `InboxGlyph` |
| `info` | `InfoGlyph` | `info` | `InfoGlyph` |
| `info-fill` | `InfoFillGlyph` | `info` | `InfoGlyph` |
| `key` | `KeyGlyph` | `key` | `KeyGlyph` |
| `keyboard_arrow_down` | `KeyboardArrowDownGlyph` | `chevron-down` | `ChevronDownGlyph` |
| `keyboard_arrow_up` | `KeyboardArrowUpGlyph` | `chevron-up` | `ChevronUpGlyph` |
| `keyboard_double_arrow_left` | `KeyboardDoubleArrowLeftGlyph` | `chevrons-left` | `ChevronsLeftGlyph` |
| `keyboard_double_arrow_right` | `KeyboardDoubleArrowRightGlyph` | `chevrons-right` | `ChevronsRightGlyph` |
| `layers` | `LayersGlyph` | `layers` | `LayersGlyph` |
| `light_mode` | `LightModeGlyph` | `sun` | `SunGlyph` |
| `link` | `LinkGlyph` | `link` | `LinkGlyph` |
| `list` | `ListGlyph` | `list` | `ListGlyph` |
| `manufacturing` | `ManufacturingGlyph` | `cog` | `CogGlyph` |
| `memory` | `MemoryGlyph` | `cpu` | `CpuGlyph` |
| `menu` | `MenuGlyph` | `menu` | `MenuGlyph` |
| `more_vert` | `MoreVertGlyph` | `ellipsis-vertical` | `EllipsisVerticalGlyph` |
| `move_item` | `MoveItemGlyph` | `folder-input` | `FolderInputGlyph` |
| `neurology` | `NeurologyGlyph` | `brain` | `BrainGlyph` |
| `notifications` | `NotificationsGlyph` | `bell` | `BellGlyph` |
| `open_in_new` | `OpenInNewGlyph` | `external-link` | `ExternalLinkGlyph` |
| `package_2` | `Package2Glyph` | `package` | `PackageGlyph` |
| `pause` | `PauseGlyph` | `pause` | `PauseGlyph` |
| `person` | `PersonGlyph` | `user` | `UserGlyph` |
| `person_add` | `PersonAddGlyph` | `user-plus` | `UserPlusGlyph` |
| `photo_camera` | `PhotoCameraGlyph` | `camera` | `CameraGlyph` |
| `power_settings_new` | `PowerSettingsNewGlyph` | `power` | `PowerGlyph` |
| `redo` | `RedoGlyph` | `redo` | `RedoGlyph` |
| `refresh` | `RefreshGlyph` | `rotate-cw` | `RotateCwGlyph` |
| `remove` | `RemoveGlyph` | `minus` | `MinusGlyph` |
| `save` | `SaveGlyph` | `save` | `SaveGlyph` |
| `schedule` | `ScheduleGlyph` | `clock` | `ClockGlyph` |
| `search` | `SearchGlyph` | `search` | `SearchGlyph` |
| `settings` | `SettingsGlyph` | `settings` | `SettingsGlyph` |
| `settings_backup_restore` | `SettingsBackupRestoreGlyph` | `rotate-ccw` | `RotateCcwGlyph` |
| `shield` | `ShieldGlyph` | `shield` | `ShieldGlyph` |
| `shield_person` | `ShieldPersonGlyph` | `shield-user` | `ShieldUserGlyph` |
| `smart_toy` | `SmartToyGlyph` | `bot` | `BotGlyph` |
| `star` | `StarGlyph` | `star` | `StarGlyph` |
| `star-fill` | `StarFillGlyph` | `star` | `<StarGlyph filled />` |
| `swap_vert` | `SwapVertGlyph` | `arrow-up-down` | `ArrowUpDownGlyph` |
| `tag` | `TagGlyph` | `hash` | `HashGlyph` |
| `target` | `TargetGlyph` | `target` | `TargetGlyph` |
| `terminal` | `TerminalGlyph` | `square-terminal` | `SquareTerminalGlyph` |
| `timeline` | `TimelineGlyph` | `chart-no-axes-gantt` | `ChartNoAxesGanttGlyph` |
| `token` | `TokenGlyph` | `coins` | `CoinsGlyph` |
| `tune` | `TuneGlyph` | `sliders-vertical` | `SlidersVerticalGlyph` |
| `undo` | `UndoGlyph` | `undo` | `UndoGlyph` |
| `unfold_more` | `UnfoldMoreGlyph` | `chevrons-up-down` | `ChevronsUpDownGlyph` |
| `view_column` | `ViewColumnGlyph` | `columns-3` | `Columns3Glyph` |
| `visibility` | `VisibilityGlyph` | `eye` | `EyeGlyph` |
| `visibility_off` | `VisibilityOffGlyph` | `eye-off` | `EyeOffGlyph` |
| `warning` | `WarningGlyph` | `triangle-alert` | `TriangleAlertGlyph` |
| `warning-fill` | `WarningFillGlyph` | `triangle-alert` | `TriangleAlertGlyph` |
| `zoom_in` | `ZoomInGlyph` | `zoom-in` | `ZoomInGlyph` |
| `zoom_out` | `ZoomOutGlyph` | `zoom-out` | `ZoomOutGlyph` |

## License

MIT AND ISC.

The package's own code and artwork are MIT; the license text is in [`LICENSE`](./LICENSE), which ships in the package. The vendored Lucide drawings in `glyphs/` are under the ISC License, and those Lucide derives from Feather are under Feather's MIT License as well; upstream's own [`glyphs/LICENSE`](./glyphs/LICENSE) carries both texts and ships beside them.

Both licenses cover copyright only. The Crewlet name, logo and character are trademarks, and so are the third-party marks in `svg/vendor/`. [`TRADEMARKS.md`](./TRADEMARKS.md), which also ships in the package, says how each may be used.
