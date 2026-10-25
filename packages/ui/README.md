# @crewlethq/ui

Crewlet shared React components. Built on top of `@crewlethq/tokens` (CSS variables) and `@crewlethq/icons`.

## Use it

```tsx
import '@crewlethq/tokens/css';          // the variables, once at the application entry
import '@crewlethq/tokens/css/themes';   // dark, light and follow-the-system
import '@crewlethq/tokens/css/density';  // compact and comfortable, optional
import '@crewlethq/tokens/css/fonts';    // self-hosted Geist and Geist Mono
import '@crewlethq/ui/styles.css';       // every component stylesheet, in one file
import { Button, Card } from '@crewlethq/ui';
import { BookOpenGlyph } from '@crewlethq/icons/glyphs';

<Card>
  <Card.Body>
    <Button variant="primary" leadingIcon={<BookOpenGlyph />}>
      Open documentation
    </Button>
    <Button variant="outline">Cancel</Button>
  </Card.Body>
</Card>
```

**Nothing here contacts a third-party host.** A glyph is an SVG that ships in
`@crewlethq/icons`, never a ligature of a font fetched from somewhere else: a
ligature renders the WORD until the font arrives, renders it for good on a
closed network, and is read aloud as that word by a screen reader.

**One component, one stylesheet.** `@crewlethq/ui/styles.css` is every
component's CSS in one file, for a consumer that wants it that way. Import the
folder instead and you carry that component's stylesheet and nothing else:

```tsx
import { Button } from '@crewlethq/ui/Button';  // 8 KB of CSS, not 182 KB
```

## What is in here

| Area | Components |
| ---- | ---------- |
| Actions | `Button` and `ButtonLink` (variants `primary`, `secondary`, `outline`, `ghost`, `accent`, `danger`; sizes `small`, `medium`, `large`; shapes `square`, `pill`), `IconButton`, `Menu`, `Link`, `Copyable`, `CopyButton`, `DownloadButton`, `Kbd` |
| Content and text | `Text` (the eight registers and `inherit`), `Prose`, `Statement`, `Document`, `DocumentTitle` and `DocumentTitleField`, the Markdown grammar (`parseMarkdown`, `parseMarkdownSpans`, `markdownInline`, `safeHref` and the line readers, with no React in it), `Highlight`, `InlineCode`, `List` and `ListItem`, `DescriptionList`, `Timeline`, `RelativeTime`, `Note`, `Divider` |
| Forms | `Input`, `Textarea`, `Label`, `FormField`, `FormRow`, `Checkbox`, `CheckboxGroup`, `ConfirmField`, `Select`, `Tag`, `TagsInput`, `DateTimePicker`, `TimeWindowPicker`, `TimeRangePicker`, `ImageUpload`, `CharacterPicker`, `HuePicker`, `AvatarPicker`, `FactList`, `ChoiceList`, `Composer`, `MarkdownEditor`, `RichEditor` (with `preloadRichEditor`, and the round trip `roundTripMarkdown` and `canonicalMarkdown` from `@crewlethq/ui/RichEditorMarkdown`) |
| Data display | `DataGrid` (with `useDataGridDriving`, `useAnyDataGridDriving` and `countDataGridRows`), `DataTable`, `CopyableCell`, `Table`, the read-only table cells (`TableKeyCell`, `TableNumberCell`, `TableDateCell`, `TableEntityCell`, `TableStatusCell`, `TableTagsCell`, `TableTextCell`), `StatCard`, `Meter`, `SegmentedMeter`, `Stepper`, `PricingCard`, `Avatar`, `AvatarStack`, `EntityChip`, `CodeBlock`, `QrCode`, `ObjectHeader`, `FactLine`, `SetByLine`, `Skeleton`, `Eyebrow`, `StatGroup`, `PinTile`, `IconTile`, `SettingsTable` (with `SettingsTable.Row`), `CatalogTile` |
| List screens | `DataView`, and its parts on their own: `DataViewToolbar`, `FilterAxisBar`, `FilterAxisChip`, plus the filter model (`filterDefsFromColumns`, `applyColumnFilters`, `filterPredicate`, `blankFilterValue`) |
| Feedback and overlays | `Callout`, `ConflictNote`, `EditingStatus`, `Toaster`, `Modal` (with `variant="sheet"`), `ConfirmModal`, `CommandPalette`, `Tooltip`, `Popover`, `Announcer` |
| Documents and review | `DiffView` and `DiffSummary` with the line diff they draw (`diffLines`, `diffStat`, `collapseDiff`, `firstChangedLines`, `splitLines`, `MAX_DIFF_LINES`, with no React in it), `DiffList`, `VersionCompare`, `CommentThread` |
| Conversations and the assistant | `ChatThread` (with `ChatThreadHandle`), `MessageBubble`, `RunChip`, `StepList` and `StepStateMark`, `ProposalCard`, `ChangeList` (with `shortenUnchanged`), `StatusCard`, `ReceiptStrip`, `RefusalStrip`, `ResultTableCard`, `OpenInAppCard`, `EntityList`, `RefusalCard`, `SuggestionRow` and `SuggestionList`, `SendButton` |
| Charts | `Legend`, `BarList`, `StackedBar`, `StackedColumns`, `ActivityStrip`, `TimeSeries`, `Sparkline`, the reading layer they share (`ChartTooltip`, `useChartHover`), and the ramp (`DATA_COLORS`, `DATA_COLOR_OTHER`, `dataColor`) |
| Marks | `Count`, `StatusDot`, `Spinner`, `EmptyValue`, `VisuallyHidden` |
| Hooks and seams | `useModalLayer`, `usePopupLayer`, `LayerHost`, `useListbox`, `useOptionKeys`, `useHighlightRest` and `HIGHLIGHT_REST_MS`, `useClipboard`, `useDownload`, `downloadText`, `downloadBlob`, `safeFilename`, `toCsv`, `elementToPng` and `ElementToPngError`, `useOutcome`, `useAnnouncer`, `useNow`, `formatRelative`, `HeadingLevelProvider`, `cx`, the node hues (`NODE_HUES`, `NODE_HUE_NAMES`, `isNodeHue`) |
| Layout | `Container`, `Section`, `Card`, `TileGrid`, `ListDetail`, `AsideLayout`, `Tabs`, `Accordion`, `Disclosure`, `Outline` (with `useActiveHeading` and `scrollToHeading`), `TreeGrid` |
| Arranging a page | `ArrangeBoard`, `ArrangeGrid`, `ArrangeFrame` (with `useGridResize`), `ArrangeGroup`, `ArrangeList`, and the reorder hooks under them (`useReorder`, `useReorderLists`, `moveKey`) |
| Application shell | `AppShell` with `AppShell.Rail`, the `aside` track and the `peek` slot (`useAppShellAside`, `useAppShellPeek`), `AppShell.ResizeHandle` (also `ResizeHandle`) and `useStoredWidth`, `SidePanel` and `SidePanelFrame`, `PeekRail` and `PeekHost` (with `PeekNeighbours`, `usePeekNeighbours`, `usePeekStep`, `peekClickHandler`, `peekRowActivation`), `SectionFrame` (with `SectionFrame.Nav` and `SectionFrame.Body`), `LockedLabel`, `AppShell.Topbar`, `AppShell.AccountRow` and `useAppShell`, `AuthLayout`, `SidebarNav` and `NavItem`, `DirectoryList`, `BrandLockup`, `SearchTrigger`, `PageHeader`, `Toolbar`, `Stack`, `Inline`, `Spacer`, `AutoGrid`, `ErrorBoundary`, `useShortcut`, `useFullscreen`, `useIdle`, `useMediaMatch` |
| Preferences | `ThemeToggle`, `ThemeSwitcher`, `DensitySwitcher`, `ThemeGallery`, `ThemeSwatch`, `useThemePreference`, `useDensityPreference`, `useSystemTheme`, `resolveTheme`, `applyStoredPreferences`, and the framework-free `applyTheme`, `applyPalette`, `applyDensity` with `THEME_PREFERENCES`, `DENSITY_PREFERENCES` and their guards |
| Artifacts | `SandboxedFrame` (with `SandboxedFramePlaceholder` and `SandboxedFrameNotice`), `LinkInterstitial` and `openExternal`, `VersionTimeline`, `ShareDialog` with the role ladder (`ARTIFACT_ROLES`, `SHAREABLE_ROLES`, `roleAtLeast`), `PrincipalPicker`, `Principal` and `PrincipalAvatar`, `ArtifactCard`, `ArtifactKindGlyph` and `ArtifactPreviewGlyph` (the preview a card draws with no cover, for a cover with nothing to draw), `ArtifactBar` and `ArtifactVersionChip` (an open artifact's one slim bar), `ArtifactPanel` and `ArtifactWorkspace` (the panels it opens beside or over the artifact), `CanvasBoard` (a design's artboards and notes on a `Canvas`, with the visibility budget `liveBoards`), `CanvasToolbar` (a canvas's tool palette, with `toolForKey`), `LayersList` (the list of a canvas's items beside it, marked by the canvas's selection), `CanvasSchematic` (a design's cover, drawn from its boards' frames), `AccessDeniedCard`, `ArtifactIcon` (with `artifactIconGlyph` and `ARTIFACT_ICON_WORDS`), the native gallery covers (`DocCover`, `SheetCover`, `DashboardCover`), `MergeConflicts`, the dashboard pieces (`WidgetFrame`, `DatasetSource` and `DatasetSourceList`), and `FrameProtocol` (the wire between a host page and an embedded artifact, with no React in it), `ArtifactNameCell` and `ArtifactAccessLabel` (with `ArtifactAccessGlyph`) for a list of artifacts |
| Sheets | `SheetGrid`, the cells on their own (`CheckboxCell`, `TextCell`, `LongTextCell`, `NumberCell`, `SelectCell`, `MultiSelectCell`, `PersonCell`, `StatusCell`, `DateCell`, `UrlCell`, `RatingCell`, and `SheetCell` for any type), `ChangeMark`, and `SheetModel` (every rule a sheet is drawn from, with no React in it: values, parsing, the keyboard model, TSV, the pending edits of D23) |
| Presence | `PresenceStack`, `PresenceRing` and `presenceHueClass`, `CursorFlag`, `LiveCursor`, `FollowBanner`, `PeopleRail` (with `peopleRailKey`), and `PresenceModel` (the roster order, one entry per person, the session hues from `PRESENCE_HUES`, with no React in it) |
| Presentations | `SlideStage` (a slide laid out at 1920 by 1080 and scaled to its box, with `SLIDE_WIDTH` and `SLIDE_HEIGHT`), `useSlideKeys` (the keys a show and a clicker send), `SlideNav` (Previous, the position and Next, with `SLIDE_NAV_LABELS`), `SlideFilmstrip`, `SlideGrid`, `SlideCompare` (with `SLIDE_COMPARE_LABELS`), `PresenterView` (with `formatStopwatch`) |

Storybook stories live under `apps/storybook/src/stories`.

Add new components under `src/<Name>/` with a `Component.tsx`, an optional
`Component.css`, an `index.ts` and a colocated `Component.test.tsx`. The root
barrel is GENERATED from the folder list by `scripts/write-barrel.mjs`, so
there is no shared index to edit and no conflict in it when several components
land at once.

## Theming hooks

- **Dark and light palettes.** Import `@crewlethq/tokens/css/themes` and set
  `data-theme="dark"` or `data-theme="light"` on `<html>`. With the attribute
  absent the document follows the system, and is dark in a browser that
  reports no preference: the palette is dark first. `ThemeSwitcher` writes the
  attribute for an explicit choice and removes it for "Follow the system";
  `ThemeToggle` flips the palette actually on the screen and writes the
  explicit opposite. Every component reads the canonical `--color-*`
  variables, so no provider is needed. Every stored control on one
  `storageKey` shows one value; an application that owns the preference holds
  it with one `useThemePreference` and passes `value` and `onChange` to each
  control, which then writes nothing of its own.
- **Named themes.** Import `@crewlethq/tokens/css/themes/all` after
  `css/themes` and set `data-palette` on `<html>` to a theme's id; removing it
  paints the default. A theme is a pair of palettes, so `data-theme` keeps
  choosing light or dark for every theme alike: the interface calls that
  choice Mode and the palette Theme. `ThemeGallery` offers the themes and
  `ThemeSwatch` draws one, both from the registry `@crewlethq/tokens`
  exports, so a thumbnail shows a theme that is not the one on screen.
- **Density.** Import `@crewlethq/tokens/css/density` and set
  `data-density="compact"` or `"comfortable"` on `<html>`. Every spacing and
  size token scales with it, and the small control and row steps floor at 24px
  so no density takes a pointer target under the size a finger can hit.
- **Surfaces.** The components stand on the four rungs `@crewlethq/tokens`
  defines, lowest first the frame, the sheet, the card and raised. `AppShell`
  paints the window and its rail on `--color-surface-frame` and floats the
  screen, its top bar and its one scroller on a sheet of
  `--color-surface-background`, inset from the frame by `--size-shell-inset`
  inside the `--color-border-default` hairline at `--radius-sheet`; a card, a popover, a menu and a
  dialog body are `--color-surface-subtle`, the card rung, and a `Card` is
  found by the `--color-border-default` hairline it draws round itself rather
  than by its fill or a shadow: the card is flat, and only an `elevated` one
  lifts. Rebind a rung on `<html>` and everything standing on it follows.
- **Accent colour.** The primary `Button`, the selected, active and focus
  states and the rail's attention count read `--color-brand-accent` and its
  companions from `@crewlethq/tokens`: `--color-brand-accent-rgb` (the same
  colour as a comma-separated `r, g, b` triple, for translucent tints),
  `--color-brand-accent-hover`, `--color-brand-accent-active`,
  `--color-brand-accent-ink`, `--color-brand-accent-soft`,
  `--color-brand-accent-soft-strong` and `--color-focus`. The accent is PER
  PALETTE (`#725be6` dark, `#735af2` light), so rebind the set together, and
  under the same three selectors the theme layer paints it with: an override
  on `:root` alone is beaten by `:root[data-theme="light"]` in light. Declare
  it on the root rather than on `<body>` or a wrapper: `--shadow-focus`,
  `--shadow-selection` and `--shadow-glow` are composed from the accent where
  the tokens declare them, on the root, so they follow only an override
  declared there.

```css
/* Retint every accent state to an indigo, in both palettes. The hover and the
   press step DARKER, so the white label gains contrast as the button is used.
   Import it after @crewlethq/tokens/css/themes: each block here weighs the
   same as the one it overrides, so the later one wins. */
:root {
  --color-brand-accent: #5469d4;
  --color-brand-accent-hover: #4a5cc2;
  --color-brand-accent-active: #3e50b8;
  --color-brand-accent-ink: #8b9ff5;
  --color-brand-accent-rgb: 84, 105, 212;
  --color-brand-accent-soft: rgba(84, 105, 212, 0.18);
  --color-brand-accent-soft-strong: rgba(84, 105, 212, 0.32);
  --color-focus: #8b9ff5;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --color-brand-accent: #5469d4;
    --color-brand-accent-hover: #4a5cc2;
    --color-brand-accent-active: #3e50b8;
    --color-brand-accent-ink: #3e50b8;
    --color-brand-accent-rgb: 84, 105, 212;
    --color-brand-accent-soft: rgba(84, 105, 212, 0.14);
    --color-brand-accent-soft-strong: rgba(84, 105, 212, 0.32);
    --color-focus: #5469d4;
  }
}
:root[data-theme="light"] {
  --color-brand-accent: #5469d4;
  --color-brand-accent-hover: #4a5cc2;
  --color-brand-accent-active: #3e50b8;
  --color-brand-accent-ink: #3e50b8;
  --color-brand-accent-rgb: 84, 105, 212;
  --color-brand-accent-soft: rgba(84, 105, 212, 0.14);
  --color-brand-accent-soft-strong: rgba(84, 105, 212, 0.32);
  --color-focus: #5469d4;
}
```

  That is the accent this kit shipped before 0.5.0, and it clears every floor
  the violet is held to. Hold a retint of your own to the same floors by
  appending it to the theme layer the palette suite reads:
  `runPalette({ tokens, themes: themes + override })` from
  `@crewlethq/tokens/test/palette`.

- **Component variables.** A few components expose their own `--crewlet-*` variables for values that are not tokens, for example `--crewlet-data-table-active-sort-color`, `--crewlet-data-table-row-hover-bg`, `--crewlet-data-table-archived-rail` and `--crewlet-data-table-row-height` (the list row token, `--size-row-md`, by default; rebind `--crewlet-data-table-cell-pad-y` with it) on the compact `DataTable`, `--crewlet-avatar-stack-ground` for the cut-out round each badge of an `AvatarStack` (the sheet, `--color-surface-background`, by default, which is where the design draws every stack; on a card or any other surface, set it to that surface), `--crewlet-spark-ground` for the ring a `Sparkline`'s current point is cut out of the ground by (the card, `--color-surface-subtle`, by default, where a sparkline stands beside its number), `--crewlet-statcard-trend-width` for the figure at the end of a `StatCard`'s value line (96px), `--crewlet-bar-list-label-width` (128px) and `--crewlet-bar-list-value-room` (`6ch` and a gap) for the words' column and the value's room in a `BarList layout="beside"`, and `--crewlet-search-trigger-width` for a `SearchTrigger variant="toolbar"` at rest (200px). Override them from a rule that targets the component's root.

The component stylesheets read only variables that `@crewlethq/tokens` emits or
that the components declare themselves, and the same check refuses a glyph
drawn as a ligature, anything loaded from a host, a theme painted on a body
class, the decoration step used as text, and a focus rule that turns the
outline off without putting one back. A second, literal check refuses a colour,
font size, radius, duration or z-index spelled out where a token belongs, a
`color-mix()`, a media query off the breakpoint steps and a hover overlay drawn
on a pseudo element. `npm run lint` in this package runs both over every
stylesheet in `src`, and `npx crewlet-css-check <folder>` runs both over an
application's own stylesheets.

The literal check also pairs every motion with a stop that WINS. A rule that
starts an animation or a transition is named again, selector for selector, by a
later rule in the same file inside `@media (prefers-reduced-motion: reduce)`
that sets it to `none` (or takes the element out with `display: none`), unless
the motion only starts inside `@media (prefers-reduced-motion: no-preference)`.
The same selector, later, is the one arrangement the cascade guarantees: the
two tie on specificity and the stop wins on source order. A stop that names a
broader selector, a shorter one, or sits above the rule it stops is refused,
because each of those can lose, and each of them did in this package. "Later"
is where a browser places it: in nested CSS, declarations written after a
block nested in their rule come after that block, so a motion written below a
nested stop beats it and is refused.

## Overlays

Every overlay in this package is on ONE layer stack, so a press of Escape
closes exactly one surface, a press outside dismisses the surface it belongs
to, and a modal traps Tab. A surface's z-index is its DEPTH in the stack inside
the token layer band, never a counter, so the tenth dialog of a session still
paints below a toast.

An application does not have to do anything to get this. It matters in two
places:

- A container that can go FULLSCREEN wraps its content in a `LayerHost`. A
  fullscreen element renders only its own subtree, so a dialog portalled to
  `document.body` while a canvas is fullscreen is not painted at all.
- A surface that pans or zooms dispatches `LAYER_REPOSITION_EVENT` on its host
  when the content beneath it moves, and every panel anchored inside follows.

## Changes in 0.57.0

**`AppShell` takes `asideModal`**, so an `overlay` aside can leave the page live beside it. `true`, the default, keeps the 0.56.0 overlay: a modal dialog behind a veil with Tab held inside. `false` draws the overlay with no veil, no trap and nothing made inert: it is a complementary region named by `asideLabel`, focus moves into it when it opens, Escape from inside it calls `onAsideClose` (unless a control inside answered the key, or a menu or dialog on the layer stack owns it), and focus goes back to what opened it if it was still inside when it closed. A column is never modal and a `sheet` always is, whatever the prop says. The aside carries `data-modal`.

**`ProposalCard` takes `failureOutcome`** (`unchanged` or `unknown`; `ProposalFailureOutcome`, `PROPOSAL_FAILURE_OUTCOMES`), so a failed card says "Nothing changed." only when it is true. `unchanged`, the default, keeps the 0.56.0 drawing: the Tag "Not applied" and the engine's sentence followed by "Nothing changed.". `unknown` is a change sent without an answer, which may have landed: the Tag reads "Not confirmed" (`labels.notConfirmed`) and the strip is the `failure` sentence alone, or `labels.unknownNotice` ("Could not confirm whether this was applied. It may have landed.") without one. A failed card carries `data-outcome`. A consumer that drew an unknown outcome as `failed` passes `failureOutcome="unknown"`; nothing else changes.

**`ProposalCard` takes `decisionRefusal`** (`{ sentence, hint? }`; `ProposalDecisionRefusal`): why the person's last decision was refused while the card still waits on one, such as an approval that needs a fresh sign-in or that met a moved record, so the card stays `pending` or `stepup`. It is drawn above the decision as the inline `RefusalStrip`, and announced politely from a live region the foot keeps from the moment it holds a decision, through `applying`, so words that arrive later are heard. The consumer clears it. It is ignored once the card has settled. In `pending` and `stepup` the foot therefore holds one more `status` region, empty and visually hidden until a refusal arrives; a test that read the step-up notice with `getByRole('status')` should read it from the strip.

**`ReceiptStrip` and `RefusalStrip` take `announce`** (true by default). False drops the strip's own `alert` or `status` role, for a host that keeps the live region around it.

## Changes in 0.56.0

### The frame and its panels

**`AppShell` takes an `aside`**: a panel the frame keeps beside every screen, such as an assistant, as a third track of the shell's grid that mirrors the rail. The host decides its shape (`asideShape`) from its own arithmetic, never a media query. A `column` is a complementary region named by `asideLabel`, a second sheet on the frame to the right of the page's: opening it pushes the page narrower, and the bar, the sticky heads, the one scroller and the measured gutter are the page's own and only narrower. An `overlay` covers the page's end edge behind a veil, and a `sheet` is the whole window on a phone. Both are modal dialogs on the shared layer stack: Tab stays in them, Escape and a press on the veil call `onAsideClose`, and focus goes back to what opened them. The panel is one element in every shape, so a window resized across the threshold does not remount it. `asideWidth` (420 by default) sizes the track, and `asideReserve` caps it so the page keeps its floor. `asideResize` (`min`, `max`, `defaultValue`, `onChange`, `onCommit`, `label`) puts a grip in the seam between the two sheets while the aside is a column. The panel arrives with a short entrance, never an exit, and none under reduced motion.

**`AppShell` takes a `peek`**: a detail panel beside the scroller, inside the sheet and under the bar, as a `column` or a `drawer` (`peekShape`, the host's decision). The scroller now stands in a body row (`crewlet-app-shell__body`) that is always rendered, so opening an aside or a peek never remounts `main` or its scroll position. A stylesheet that selected `main` as a direct child of `.crewlet-app-shell__sheet` should select it as a descendant.

**`AppShell.ResizeHandle` is new** (also exported as `ResizeHandle`): the WAI-ARIA window splitter, a focusable `separator` with `aria-orientation="vertical"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and a value text. It moves by pointer drag (measured from where the drag started, with the pointer captured), by ArrowLeft and ArrowRight (16px, 64px with Shift, `RESIZE_HANDLE_STEP` and `RESIZE_HANDLE_LARGE_STEP`), to its bounds by Home and End, and back to `defaultValue` by Enter or a double press. `onValueChange` reports every step and `onValueCommit` the end of each gesture. It is drawn as nothing at rest and a soft accent wash under the pointer, the keyboard and a drag, with a 24px target whatever its drawn width. **`useStoredWidth({ key, min, max, storage })`** keeps the width a reader dragged per browser: `width` is null until they choose one, `setWidth` draws, `commitWidth` draws and keeps, and a stored value is read back only when it is a finite number inside the bounds. Storage that throws leaves the width working for the session.

**`SidePanel` and `SidePanelFrame` are new.** `SidePanel` is the panel beside what the reader works on: a head at the page bar's height (`title`, `icon`, `actions`, Close), a scrolling body and a `footer`. It is a complementary region named by its heading (`hideTitle` keeps the name and hides the words), never a dialog except as a sheet. It takes focus to its heading on open without drawing a ring there, or to a field (`initialFocus`, or `'none'`), hands focus back on close, and closes on Escape from anywhere inside unless something inside answered first. `SidePanelFrame` lays it beside the content as a `column` (capped by `reserve`, with a grip on the panel's edge when `resizable`), over the content's end as a `drawer`, or over all of it as a `sheet` (a modal dialog), as the host decides; with no `shape` it measures itself. In the shell's aside a `SidePanel` fills the track and leaves the landmark, the width and the grip to the shell. **`ArtifactPanel` and `ArtifactWorkspace` are now presets of the two**, with the same props, drawing, class names, container names and `--crewlet-artifact-panel-inset`. The panel's root is a `div` with the complementary role, where it was an `aside`.

**`SidePanel` takes `flush`**: the body draws no inset, for content that owns its own edges, such as a `ChatThread`, which scrolls and insets itself, so the inset is drawn once and the thread's scrollbar stands on the panel's edge. `--crewlet-side-panel-inset` reads 0 inside a flush body, so a sticky foot that offsets itself by the inset still sits on the edge. A host that set the variable to 0 for the same result can pass `flush` instead.

**`ArtifactBar` takes `end`**: a control the host ends every page head with, such as an assistant's Ask button, placed after More as `start` is placed before everything, so an open artifact's own bar keeps it where every other page's bar does. It stands a step further from the bar's own tools than they stand from each other, never wraps, keeps its size while the title gives way, and is never folded into More at any width; a control that should draw smaller on a phone does so itself.

**`PeekRail` and `PeekHost` are new, moved from the engine dashboard.** `PeekRail` is the rail a list opens on one object: a bar with Previous and Next (`onStep`), Open (`openHref`) and Close, and a scrolling body that is a size container. As a column it is capped by `reserve` so the list keeps its floor, with a grip the keyboard moves; as a drawer it stands behind a veil a press on which closes it. In the shell's peek slot its shape is the shell's. `PeekHost` wires the generic half: the order a list publishes (`PeekNeighbours`, `usePeekNeighbours(tokens, query)`, `usePeekOrder`), the step through it (`usePeekStep(current, move)`), a body keyed on its object, a kind with no body closing the rail, an `openHref` that carries the list's query only for an object in the list, and an optional error `boundary`. The address, the keys and the bodies stay the host's. `peekClickHandler` and `peekRowActivation` hold the one rule for which presses on a row peek in place and which open elsewhere (`isPlainPress`).

**`useDataGridDriving(drivable)` decides which grid takes the row keys**, moved from the engine dashboard's grid wrapper: with several grids on one screen, the one the reader last pointed at (`claim`, passed as the grid's `onPointerDown`), and with no gesture yet the first mounted grid with rows. `useAnyDataGridDriving` tells a screen with keys of its own to stand aside, and `countDataGridRows` counts rows through bands.

**`TimeRangePicker` is new, moved from the engine dashboard**: the windows a screen offers as one row of radio segments, in the order given (`options`, `value`, `onChange`), and a window of the reader's own behind Custom (`custom`). It sits beside `TimeWindowPicker` rather than replacing it: this one is inline and never interprets a window, so a custom window comes back as the two typed strings for the screen to read on its own clock. The dialog is prefilled with the window on screen and takes two moments (`mode: 'instants'`) or two whole days (`mode: 'days'`). Each way the fields can be wrong is its own sentence (`timeRangeProblem`), a screen's own `validate` runs after them, Apply is the form's submit button, and a dismissed dialog leaves the reader on Custom as the group's one tab stop.

### The assistant's pieces

The parts the engine dashboard's assistant drawer is built from, each generic enough for any conversation, approval or result surface. Every one ships with a story for each state, holds still under reduced motion, and reads the same in the light, dark and named palettes.

**`Spinner` is new**: the package's one ring, a 2px ring in the current ink with its right quarter open, `inline-block` so it is a box inside a line of text, sized by the text (`em`) or on the glyph scale (`xs`, `sm`, `md`: 12, 14 and 16px). Under reduced motion it stops and stays open, because a closed ring reads as an empty status circle. A pending `Button` now draws it in its leading icon's place (`crewlet-btn__spinner` stays on the element), so a button, a request's state column and a status tag share one mark.

**`IconButton` takes `variant="primary"`**, the accent square, for the one icon-only control that is the decision on its surface. **The current place keeps its ink on every variant**: `IconButtonLink current` was declared above the variants and tied with them, so a ghost square's secondary ink won; it now follows them.

**`Composer` sends on Enter, carries attachments and says why it is disabled.** `submitOn="enter"` sends on Enter and writes a line on Shift+Enter, never on an Enter that ends an input method's composition (`mod-enter`, Command or Control with Enter, stays the default). `trailing` puts a control on the field's row, its corner nested in the box's, and the field then starts at one line and grows to six; a placeholder never wraps it taller. `attachments` is a group of tags above the field inside the edge, named by `attachmentsLabel` and read before the field. `disabledReason` fades the whole composer once (the field and its button inside keep full opacity), shows the reason as the placeholder, describes the field with it and keeps the draft. The edge is now `--color-border-field`, the 3:1 field edge, where it was the 1.46:1 `--color-border-strong`, stepping up to `--color-border-control` under the pointer.

**`SendButton` is new**: a chat composer's send, which becomes Stop while a request runs (`mode`, `onPress`), on one element so focus stays on it. Send is the primary `IconButton` with the arrow, Stop the secondary one with a filled square (`square` is now in the icons' `FILLABLE`). A `disabledReason` holds Send soft disabled; Stop is always available. `labels` words both.

**`StepList` and `StepStateMark` are new, beside `Stepper`**: the steps of a request, each with its own state (`running`, `done`, `failed`, `refused`, `stopped`, `waiting`; `STEP_STATES`) said in words after its label (`STEP_STATE_LABELS`) and drawn by `StepStateMark` in one 16px column on the label's first line, with a mono `duration` and `detail` on the inset ground. A string detail breaks only at a space or after `/`, `?` or `&`, never inside a name such as `sign-in` (`stepDetailPieces`).

**`RunChip` is new**: a request's state as the disclosure of its steps, eight states (`thinking`, `working`, `done`, `waiting`, `applying`, `stopped`, `failed`, `refused`; `RUN_STATES`) on the disclosure trigger with `StepStateMark` as its mark, the chevron hanging into the gutter, the title in the warning ink while it waits and the danger ink when it failed, and a `meta` behind a visible " · " that is hidden from assistive technology (a comma is said instead). Uncontrolled, it is open while the request works and closes itself when it settles. With nothing to open (`expandable`, or no children) it is words with the chevron's slot kept, so its mark does not move when the first step arrives. **`DisclosureAnatomy` takes `icon` and `expandable`** for it.

**`ChatThread` is new**: a conversation as it grows. A focusable `role="log"` with `aria-live="off"` (the host announces a completed answer once, through its `Announcer`) and `aria-busy` while a request runs. It follows the end while the reader is within 48px of it (`CHAT_THREAD_FOLLOW_WITHIN`), anchored in code with the browser's scroll anchoring off, stays put once they scroll up, and shows Jump to latest with a count of what arrived. Its handle (`ChatThreadHandle`) offers `scrollToLatest` and `reveal(element)`, which brings a card that needs a decision into view whole, or with its head at the top when it does not fit.

**`MessageBubble` is new**: one message on its writer's side, the reader's own at the end on the raised ground with a tail corner, anybody else's at the start inside a hairline, at most 85% of the thread and wrapping anywhere. An article named for who said it ("You said" by default), with an `attachment` slot for what it carried (the page a question was sent with, as a read-only `Tag`) and a `footer`.

**`StatusCard` is new**: a record with a state on the default `Card`, a sentence-case title, the state as a `Tag` at the end of the head, and a section named by both. What happened goes in `strip`, and the foot follows one rule (`actionsAlign`): a decision ends the row (its buttons share it as blocks on a card under 360px), utilities start it with a ghost button pulled onto the text edge. `settled` steps the body back to the secondary ink. No tone rail.

**`ReceiptStrip` and `RefusalStrip` are new**: what happened at a card's foot, on the card's hairline, a tone's soft tint under its ink and a 16px mark, a polite status or, for `danger`, an alert. `RefusalStrip` is the one drawing of a refusal, `inline` under the control that caused it or at a card's `foot`, with Try again (`onRetry`, `retrying`) and Dismiss (`onDismiss`) only where offered, and always in the caller's own sentence. The engine dashboard's write buttons can draw their refusal with it.

**`DiffList` takes `layout`**: `stacked` stands each path over its value and wraps both, so a value is read rather than cut by the 200px path track, and `auto` does so under 480px of the list's own width. `columns` stays the default.

**`ChangeList` is new**: a change as before and after pairs (decision D10) on `PropertyList`'s grid in `DiffList`'s tones. `fact`, `changed` (the old value struck through, an arrow and the new value on the added tint, wrapping as a unit), `added` (with a "New" tag for a field new to an existing record), `removed` and `text` rows, the last a word diff whose long unchanged runs are shortened at word boundaries (`shortenUnchanged`, `CHANGE_LIST_COLLAPSE_OVER`) with "Show the whole change" opening a stacking `DiffList`. A pair is said "Changed from X to Y", and added and removed values and words say so. `settled` keeps every pair in the secondary ink.

**`ProposalCard` is new**: a change from proposal to outcome. The title is the action, the subtitle its scope, and the Tag its state (`pending`, `stepup`, `applying`, `applied`, `declined`, `expired`, `stale`, `failed`; `PROPOSAL_STATES`), worded for where it lands (`scope`: Applying and Applied on a page, Saving and Saved on the server). The `ChangeList` heading follows `kind` and the state ("What will change", "What will be created", "What changed", "What was created", "What was proposed"). The foot is Decline and the primary named for its effect, or a strip saying what happened, with Prepare it again (`onPrepareAgain`) and Try again (`onRetry`) where offered. Nothing takes focus when it arrives; while the approved change is carried out the primary keeps its label with the spinner, soft disabled, and Decline is held with its reason. A refusal is the engine's sentence (`failure`) followed by "Nothing changed.". Every word is in `labels` (`PROPOSAL_CARD_LABELS`).

**`ProposalCard` takes `failureHint` and `approveBlocked`.** `failureHint` is what the person can do next about a failure, drawn on its own quieter line in the failure strip after the engine's sentence and "Nothing changed.", and only with `failure`. `approveBlocked` holds the primary soft disabled with a reason while the card is `pending` or `stepup` (a page action whose screen refuses the prepared change): it keeps its focus, says it is unavailable, is described by the reason, which the foot also shows above the decision, and never calls `onApprove`. Decline stays available, and the prop is ignored once the card is applying or settled.

**`Table` takes `footer`, `align` and `framed`**: a total row whose first cell heads the row, a column of figures standing at the end with tabular figures, and `framed={false}` for a table that fills a card, with no edge of its own and its outer cells on the card's inset.

**`DownloadButton` takes `file`**, an async source beside `text` for an export the server builds: the label stays with the spinner while it waits, a second press fetches nothing more, and a rejected fetch reads as a failed download. `useDownload` gains `downloadFile`. `DownloadButtonProps` is now a union of `DownloadButtonBaseProps` and `DownloadButtonSource`; an `interface` that extended it extends `DownloadButtonBaseProps` and adds its own source.

**`ResultTableCard` is new**: a result as a flush `Table` in a `StatusCard`, its title (also the table's hidden caption) over its `window`, end-aligned figures and a `total` row, and a foot of utilities: `downloads` fetched on their press and the host's `link` at the far end. Over `maxRows` (20) rows it shows the first `collapsedRows` (10) and "Show all 48".

**`IconTile` takes `tone="neutral"`**, the raised ground in the secondary ink, for a place or a record rather than a kind.

**`OpenInAppCard` is new**: a place an answer points to, opened only by the person's press, its glyph on a neutral tile with its name and last two crumbs, Open in new tab (drawn only for an address `safeHref` trusts, without opener or referrer) and Open here (`onOpenHere`); once `opened`, a success Tag and a strip.

**`EntityList`, `RefusalCard`, `SuggestionRow` and `SuggestionList` are new.** `EntityList` names people, seats or records as divided rows with one fact and the host's own link, bare or as a card under a `title`. `RefusalCard` says a request the person's access does not allow: Not permitted as a neutral Tag with the lock, the product's sentence, always "Nothing changed.", and utilities only. `SuggestionRow` is a suggested question or request in the list row's grammar, with an optional `detail`, `count` and `chevron`; a `fills` row says ", fills the message box" to assistive technology. `SuggestionList` puts each row in its own list item, plain or `divided` in a card.

**`ToastProvider` and `Toaster` take `inset`** (`ToasterInset`, `{ inline?, block? }` in pixels): room the stack keeps clear on its own side and edge, added to the window inset it already keeps. A host sets `inline` to the width a panel beside the page occupies, so a toast stands beside the panel rather than over its composer, and `block` to the height of a phone sheet's foot, so it stands above it. It may change while toasts are up and they move with it; anything but a finite number of zero or more reads as zero. It is drawn through `--crewlet-toaster-inset-inline` and `--crewlet-toaster-inset-block` on the stack (`toasterInsetStyle` builds them), which a host may also set itself. With no inset the stack stands exactly where it did.

**`ArtifactNameCell` takes words for some kinds only**: `ArtifactNameCellLabels.kinds` is now `Partial<Record<ArtifactKind, string>>`, merged over the kit's own words, so an application that words only the kinds it knows (one built before `brand`) compiles, and a kind it does not word reads in the kit's own word.

**The shared clock reads the time now after sitting idle.** `useNow` and `currentNow` (and so `RelativeTime` and `EditingStatus`'s "Saved 2m ago") read an instant the interval moves only while a reader is subscribed, so a reader mounted after a quiet spell rendered the time the last reader left, until the first tick: a save two minutes old read "1m ago". While the clock is idle, a reading more than a second old is now replaced before it is used.

**`@crewlethq/icons` adds `square-pen`, `square` and `circle-stop`** (`SquarePenGlyph`, `SquareGlyph`, which may be drawn filled, and `CircleStopGlyph`), vendored from the pinned `lucide-static`. Lucide publishes `history` as a retired alias of `rotate-ccw-clock`, which the package already carries, so a conversations list takes `RotateCcwClockGlyph`.

**`ProductMark` takes `product="assistant"`**: Orbit, the crewmate octagon opened into four chamfered blades turning around one core, on the family's tile and lower facet. No eyes and no visor, because the assistant acts as the signed-in person and is drawn as a capability rather than a crew member. Its blades and core are separate detail paths, so a working state can turn the blades and hold the core still.

**`@crewlethq/icons/product-mark` is new**: `ProductMark` and `PRODUCTS` on an entry of their own, whose import graph never reaches the root's illustrations, vendor marks or their stylesheets, so an Ask button in a first paint carries the marks alone. The root exports the same functions.

## Changes in 0.55.0

**`ProductMark` names its products `worklet` and `doclet`** (`@crewlethq/icons`). Worklet (projects and tasks) and Doclet (spaces and pages) are the two services' names, so the product values are `'worklet'`, `'doclet'` and `'chat'`. What to change: replace `product="works"` with `product="worklet"` and `product="knowledge"` with `product="doclet"`; the `crewlet-product-mark--*` modifier classes and the `svg/product/*.svg` files follow the values.

## Changes in 0.54.0

The setup wizard's review step and footer, laid out for a decision.

**`ReviewList` is new**: a setup's parts reviewed before it is finished, as rows of one bordered box. Each `ReviewList.Item` carries the part's glyph on a tile (`icon`), its name as a heading one level under where the list sits (`title`), its state as a pill (`status`, a `label` and a `tone` of `success`, `neutral`, `warning` or `danger`), the way back to it at the end of the row (`action`), and the values it holds under the name (`children`). What keeps a part from being finished is said under its values as an alert (`error`), once a finish was tried. Rows share the box's hairline, so a tall row of logos never leaves holes beside a one-line name as a grid of cards does; under 28rem of the list's own width the values take the whole row.

**`SetupWizard`'s tracks are its measure, not the window.** The content's track is at most its 640px column, so on a wide window the aside stands right beside the content and the header and the footer end where the parts do, rather than the preview standing at the window's far edge with a void between. A `wide` step takes the content's and the aside's columns together (1000px at most), so its footer ends where every other step's does. A wizard with no `aside` holds no row for one under 70rem, and no second gap above the footer. The tracks are `--crewlet-setup-wizard-rail`, `-column`, `-aside` and `-gap` on the root. What to change: the content no longer carries `max-width: 640px` of its own (the track holds it).

**`SetupWizard`'s footer ends the screen.** Inside an `AppShell` the footer takes back the shell's room under the content, so at the end of a scroll it rests on the scroller's bottom edge, where it stood while scrolling, with no strip of empty sheet under it. The wizard is meant to be the screen's last element. On a phone the actions share two rows: the way out and the step's other actions on the first, and the step's last action (its primary) the whole width on the second.

**`AppShell` names the room under its content**: `--crewlet-app-shell-content-end` (64px, 48px under the shell breakpoint, 20px on a `fill` screen) pads the content column's end, and a bar docked to the bottom of the scroller takes it back with a negative margin of the same length. The drawn padding is unchanged.

## Changes in 0.53.0

The folder tile, made production grade.

**A folder tile's facts are one run.** Who can see the folder and what is inside are now separated by the gallery card's quiet dot ("Everyone · 12 artifacts · 2 folders"), in the facts' one tertiary ink. Where the tile is narrow the run breaks before the count, which moves as one; a count too long even for its own line breaks only after a dot. No line opens on a dot. `folderContentsParts` is new: the count as its parts, which `describeFolderContents` joins.

**The glyph follows the shape.** The folder glyph is drawn at the shape's size: 20px in a 40px tint on a tile, 16px in a 32px tint on a row. A tile that takes the row's shape under the phone breakpoint draws the row's glyph, where it used to keep the tile's 20px glyph in a 28px tint.

**A row's visibility is its glyph.** On a row, and a tile on a phone, who can see the folder is drawn as its glyph alone, as a gallery card draws an artifact's access, so every row keeps one line of facts. The word stays in the tile's description and in the label's title.

**Hover and states match the gallery card.** Under the pointer the hairline darkens and the card's hairline shadow settles, at the card's quick step, and the glyph's tint steps up with it. A chosen tile keeps its selected edge and a drop target its accent edge under the pointer, where Card's hover used to replace both. A drop target's glyph takes the accent.

Hosts that lay folder tiles above artifact cards should use the cards' column count and column step, so each tile's edges line up with the card below it.

## Changes in 0.52.2

**A `LogoSlotGroup`'s action rows start at the top of their shared row.** Where one slot's actions wrap onto two lines (Replace and Remove in a narrow column), the row is as tall as they are, and the other slots' single buttons stood centred in it, half a line below the first button beside them. Every slot's first button now stands on one line.

## Changes in 0.52.1

**`LogoSlotGroup` fits three slots in a form's column, with no gap above an action row.** The columns are as many as fit at 9rem (they were 14rem), so three slots stand in one row in a 480px column, a setup step's, and the group stacks them one under another below 30rem of its own width. The group's rows no longer carry a grid gap, which a subgrid's rows drew too: a row no slot uses (no notes under any stage) took two gaps between the stage and the action row, and now takes none. Lines of slots on a narrow page are set off by each slot's end margin.

## Changes in 0.52.0

A second polish of the brand setup pieces.

**`LogoSlotGroup` is new**: logo slots side by side, aligned row by row. Each slot is a subgrid of one set of rows, so the names and descriptions, the stages, the notes under them and the action rows each start on one line across the slots whatever their copy; a row no slot uses takes no room. What may be brought is written once under the row (`hint`) and describes every slot's picker, and a slot inside a group draws no caption of its own. The columns are as many as fit at 14rem, then one under another on a phone. A slot's empty note and refusal now share one element (`.crewlet-logo-slot__notes`).

**`LogoSlot` takes `size="sm"`**: a thumbnail for a summary of what is set, at half the stage's height with a tighter inset and smaller words, best read-only.

**`ChoiceButtons` takes `size="sm"`, per-option `media` and `chosen`.** The Inbox's one-press answer option, compact (the small control height, the compact and micro type steps) in a row that wraps, for suggestions beside a field. `media` is a decorative picture before the words (a `ColorChip` on a suggested colour). `chosen` keeps an applied option marked in the selected edge and fill, with every option a toggle button (`aria-pressed`) saying whether it is the one applied; left out, the options send and say nothing of a choice, as in the Inbox. Hover, press and focus are the Inbox's own.

**`ListInput` counts its items, matches its Add to the field and aligns its rows.** With `maxItems` the help line ends in a plain count (`tallyLabel`, "3 of 5"), joined into the group's description, and a full list says "That's the most. Remove one to add another." (`fullMessage`'s new default). The Add button stands at the field's medium height on the box's first line. A row's number sits on the text's first line at its line height, so the two share a baseline however long the item; the row's gap is a step and a half; and an edited item keeps an inset for its ring that a margin takes back, so the words never move when it is focused. What to change: a test that reads the old "The list is full at N" sentence.

**`FormField` takes `tally`**: a count that is not a length, drawn at the end of the help line where a length count would be and joined into the description the same way.

## Changes in 0.51.0

Polish of the setup wizard pieces, and the parts the brand setup asked for.

**`ColorField` draws its `#` and reads more than six digits.** The `#` is drawn at the start of the field, so a person types the six hex digits alone, and a pasted `#rrggbb` loses its own `#` to it. When the reader leaves the field (Enter or Tab), `rrggbb`, the three digit shorthand and `rgb(r, g, b)` or `rgb(r g b)` are normalised to lowercase `#rrggbb`; anything else is refused with one sentence. Six digits are still reported as they are typed, and `onChange` still receives only a colour, or `''` for an emptied optional field. What to change: a test that reads the text field's value reads the six digits without the `#`. The default `labels.invalid` and `labels.placeholder` changed, and `labels.prefix` is new.

**`ContrastHelp` is new**: a small info button beside a contrast heading that opens a short panel saying what AA, AAA and Low or Fails mean, each drawn as `ContrastBadge` draws it. It is a `Popover` the button toggles, so it opens by touch and from the keyboard, and closes on Escape with focus handed back. Place it beside the heading, not inside it. `ContrastLevelTag` is the one drawing of a level, shared by the badge and the panel.

**`ColorChip` is new**: a colour as a small decorative chip (12px `xs` or 16px `sm`, round or square) with an edge of its own and the hatch of no colour, for the mark on a button that applies a suggested colour.

**`SetupWizard` takes `footerStart` and `wide`.** `footerStart` stands at the start of the footer row (the way out), with `footer`, the step's actions, held at its end. `wide` lets a step that lays out columns of its own take the whole width beside the rail. A wizard with no `aside` no longer holds an empty 320px column from 70rem.

**`Callout`'s actions stand one step apart.** The action slot is a wrapping row with the kit's step between, so two actions never draw touching.

**`EditingStatus` reads cleanly.** Its text is "Draft Saved 24s ago", drawn "Draft · Saved 24s ago": no hidden comma and no second "Saved". The live region holds only the label and the state, and the time follows it in a `time` element outside the region, so it is shown and never announced. What to change: `labels.saved` is now the word alone (`'Saved'`), and `labels.savedSpoken` is gone. A test that reads `getByRole('status')` reads the label and the state only.

**`ListInput` ends its new-item row with an Add button.** The add control no longer floats beside the legend as a `+` square: it is a text button at the end of the box's own row, with or without a shown legend, beside Enter. It shows `addText` ("Add") and is named by `addLabel` ("Add policy").

**Folder tiles are set on the artifact card's type scale.** A `FolderTile`'s name and facts take a gallery card's title and facts steps at every width, on one 1.35 line height with the card's step between; a row, and a tile on a phone, no longer drop to smaller steps beside cards that keep theirs. `ArtifactCard`'s gallery facts take the title's line height. `ArtifactNameCell` is unchanged: a folder's row in the list is set as every artifact's row there.

## Changes in 0.50.0

The pieces of a setup a person walks step by step, first used by the brand setup.

**`SetupWizard` is new**: a page of its own for a setup walked step by step. The header is a `PageHeader` title with the trail above it (`trail`) and the draft's status (`status`) and the way out (`actions`) beside it. The rail is a `nav` named by `stepsLabel`, holding a vertical `Stepper` of `steps` with `current`, `reached` and `onSelect`. The content is a `section` named by the step's `heading`, with a `lead` sentence and the step's fields (`children`) in one column of at most 640px. The optional `aside` is a complementary landmark named by `asideLabel` (required with it), held in view beside the content. The `footer` holds the step's actions at the bottom of the view, above the device's safe area. From 70rem of the wizard's own width the rail, the content and the aside stand side by side (240px, the content, 320px); under that, as in a 1024px window beside the application's rail, the aside moves under the content. Under the phone breakpoint the rail becomes a row of steps under "Step 3 of 6 · Colours" (`labels.progress`) and the aside folds into a disclosure (`labels.asideToggle`, "Preview"). Focus moves to the step's heading when the step changes, and the step's content and the aside start one heading level under it.

**`Stepper` takes `orientation`, a per-step `status` and `description`, and `onSelect`.** `orientation="vertical"` draws a column of rows: a 20px mark per step (the check, the dot, the warning glyph, or the step's number) on a hairline that joins them, the label beside it, and the description and the status words under it, with the current row lifted as the sidebar's is. A step's `status` (`done`, `current`, `upcoming`, `optional` or `attention`) draws it where its position does not say it all: an optional step says "Optional" (`optionalLabel`), and one that needs attention carries the warning glyph on the warning tint and says "Needs attention" (`attentionLabel`); in a row the words are said rather than shown. The current step is always drawn current, and `status: 'current'` on any other step is refused. With `onSelect`, every visited step (the current one, every step before it, and every step up to `reached`) is a button, the current one carrying `aria-current="step"`, and a step not reached yet stays words rather than a disabled button. The horizontal row draws exactly as before; its step-still-to-come class is now `crewlet-stepper__step--upcoming` (it was `--later`).

**`ContrastBadge` takes `advisory`**: under its scale's AA floor the badge reads "Low" in the warning tone with the warning glyph (`crewlet-contrast-badge--low`), rather than "AA large text" or "Fails" in the danger tone, for a pair a person is told about and may keep. A pair that blocks leaves it off and keeps today's behaviour. `labels.levels` now takes any of the level words on its own (`ContrastBadgeLabelsInput`), and the drawn level is typed `ContrastBadgeLevel`.

**`EditingStatus` takes `savedAt`**: with nothing unsaved and no save in flight, the status says how long ago the last save landed (`labels.saved`, "Saved 2m ago"; "Draft · Saved 2m ago" with `labels.editing` "Draft"). The time follows the shared clock and is hidden from the live region, which says "Saved" (`labels.savedSpoken`) once rather than every minute.

**`@crewlethq/tokens` exports `nearestContrastShade(hex, ground, min)`**: the colour nearest `hex` that clears `min` against `ground`, keeping its hue and moving only its OKLab lightness, or `null` when no shade can. `#00baba` on `#f6f7fb` gives `#007f7f` at 4.5:1. It is the one implementation a "Use #007f7f (4.51:1)" suggestion is computed with; see the tokens README.

## Changes in 0.49.1

**`@crewlethq/tokens` keeps its palettes and its theme registry in modules of their own.** The `themes` object (both palettes, every value) was generated into the same module as `themeRegistry`, `themeGroups`, `DEFAULT_THEME_ID` and `isThemeId`, and a bundler keeps a module whole in the chunk that first needs it: an application that reads the registry at boot (a theme preference) carried every palette value in its entry as soon as any later screen imported `themes` (since 0.47.0, `LogoSlot`), about 8 KB raw and 2 KB gzipped on every first paint of the engine dashboard. `themes` now comes from a module of its own (`dist/palettes.js`), so a consumer of the registry never carries it and the palettes land in the chunk that uses them. The package's exports are unchanged: `import { themes, themeRegistry } from '@crewlethq/tokens'` works as before.

## Changes in 0.49.0

The pieces of a company's brand and of the folders artifacts are filed in.

**`@crewlethq/icons` adds four glyphs**: `swatch-book` (`SwatchBookGlyph`) for a company's brand, `blend` (`BlendGlyph`) for its colours, `badge-check` (`BadgeCheckGlyph`) for an artifact drawn in the current brand, and `folder-open` (`FolderOpenGlyph`) for a folder with nothing in it, or nothing the reader can open. Each is vendored from the pinned `lucide-static`; see the icons package's `glyphs/README.md`.

**`ArtifactKind` takes `brand`**, a company's brand kit. `ARTIFACT_KINDS` lists it last, in the engine's order; `ArtifactKindGlyph` draws it with `swatch-book`; `crewlet-kind--brand` tints it in the kind's own orchid (`--color-artifact-kind-brand`, below); `ArtifactKindIllustration` and `ArtifactKindGround` draw a mark over a row of swatches; and `ArtifactCard` and `ArtifactNameCell` label it "Brand". What to change: a `Record<ArtifactKind, ...>` of your own, and a full `kinds` label set passed to either component, needs a `brand` key.

**`@crewlethq/tokens` adds `--color-artifact-kind-brand`** with its `-ink`, `-fill` and `-line` steps: `#cc7bd1` in dark and `#8f3884` in light, an orchid apart from design's purple and HTML's rose. The six node hues each already draw a kind, so brand is the one kind with a hue of its own, declared by every theme; the palette suite now measures every kind's hue as a mark, its ink on its own fill, and every pair of kind hues dE 8 apart. See the tokens README.

**`@crewlethq/tokens` exports the WCAG contrast maths at runtime**: `parseHex` (a `#rrggbb` value as channels, or `null`), `contrast` (the ratio between two colours, 1 to 21, unrounded), `luminance`, the frozen floors `WCAG_CONTRAST` (`aa` 4.5, `aaLarge` 3, `aaa` 7, `aaaLarge` 4.5) and the `Rgb` type. They are the functions the palette suite measures with, not copies, for an interface that shows whether two colours a person chose read on each other.

**`@crewlethq/artifact-kit` reads a company's brand from `--brand-*` input slots.** The kit's own tokens (`--color-brand-accent` and its hover, press, ink, soft fills and deep stop, the selected edge, the label on the accent, the quiet link, the glow, the grounds, the body text and the faces) read `--brand-primary`, `--brand-primary-on-dark`, `--brand-secondary`, `--brand-text`, `--brand-light-ground`, `--brand-dark-ground`, `--brand-font-heading` and `--brand-font-body`, mixing the family from one colour with `color-mix()` in each mode, so a page already written with kit tokens follows the brand. With no slot set every token is the theme's own value, under every theme. The `crewlet-logo` class draws the brand's logo from `--brand-logo-primary`, `--brand-logo-on-dark` or `--brand-logo-mark` (`data-variant`), at its ratio, choosing the on-dark logo in dark mode where there is one and drawing nothing where there is none. An engine-generated brand stylesheet defines only `--brand-*` custom properties and `@font-face` rules. See the kit README.

**`FolderTile` is new**: a folder in a gallery, shorter than an artifact's card and with no preview, the `folder` glyph on a neutral tint, the name on one line (the whole of it on hover), who can see it (`visibility`, an `ArtifactAccessLabel` with the folder's word) and what the reader can open inside (`contents`), with a More menu (`actions`) beside its link. The whole tile is one link. Who can see it and what is inside wrap onto a second line where the tile is narrow (four or three across a laptop's page) and are never cut; only the name is cut to one line, with the whole of it on hover. A folder holding nothing the reader can open says "Nothing you can open yet", never "Empty". `size="row"` is the full width, 44px row a phone takes, and a tile takes that shape by itself under the phone breakpoint. `selected` and `dropTarget` draw the chosen and the drop target states; dragging is the host's to drive. `describeFolderContents` is the one phrasing of the count ("12 artifacts · 2 folders").

**`ArtifactNameCell` takes `kind="folder"`**: a folder's row in the list, the folder glyph on a neutral tint and the word "Folder" over what is inside (`detail`, from `describeFolderContents`).

**`SelectionBar` is new**: what is picked and what can be done to all of it, the count ("3 selected"), the bulk actions as children and Clear, one toolbar in the tab order. It sticks under the top of the scroller (`--crewlet-selection-bar-top`) and docks at the foot of the screen under the phone breakpoint. The count is said politely through the shell's `Announcer` as it changes, and clearing the last pick says so. Nothing is drawn at zero, and `returnFocusRef` is where focus goes once Clear takes the bar away.

**`ArtifactCard` takes `selectable`, `selected`, `selecting` and `onSelectedChange`**: a box on the preview's foot, opposite the kind's badge and drawn as its twin (a cover's own title starts at the top corner, which the box would hide), shown on hover, on focus, on a screen with no hover and always once the card is picked, with the selected edge and fill on a picked card. While the gallery is choosing (`selecting`) every box shows and a press anywhere on the card ticks it rather than opening it. `onSelectedChange` says whether Shift was held (`range`), so the host that keeps the selection draws the range.

**`DataGrid` takes `selection`**: a box before the first column on every row and one in the head over every row drawn, mixed while some are picked, keyed by `rowKey` and controlled. Shift with a box sets every row between it and the box pressed before it, in drawn order. `isSelectable` disables the box of a row the reader cannot act on. A picked row takes the selected fill, apart from `isSelected`, the row the reader is on. The column is the grid's own: it is never in a column set and never gives way.

**`ThemeGallery` can draw a theme's `tag` on its card**, where the theme asks for it with `tagTone`: `'quiet'` draws a caption under the name (cut to one line, the whole of it on hover), and `'brand'` the accent's pill, for the company's own theme among the product's ("Your company brand" on the slides create page). A theme with no `tagTone` keeps its tag in its accessible name only and draws nothing, so the product's own theme picker looks exactly as it did. The card's name carries the tag once either way, so it is never read twice, and `tag` is now optional: a theme without one is its name alone.

**`ArtifactBar`'s read-only title is cut with an ellipsis**: its words sit in a block of their own (`.crewlet-artifact-bar__text`) that takes the ellipsis the flex heading around them could not, so a long title ends in "…" rather than being clipped mid-word, with the whole title on hover. A renamable title is unchanged.

**`Combobox` takes `inline`**: the list is the surface's body rather than a popup, for a picker whose list is the point of the dialog it sits in (Move to…). It is always on screen, in the flow under the field and filtered by it (no popover, no portal), so losing focus closes nothing and the dialog never changes size under the pointer between a press on Cancel and its release. Its box keeps one height, `rows` one-line rows (six by default), whatever the filter leaves in it, and a filter that leaves nothing says `emptyMessage` in its own row, announced politely. The field is an ARIA combobox controlling the inline listbox through `aria-activedescendant`: the arrows step over a disabled row, the highlight lands on the first match as the filter changes, Enter and a press take a row (focus stays in the field), and Home and End reach the ends while the field is empty and are the caret's once it holds text. Escape is never its own, so it reaches the dialog. `chosen` marks the option picked so far as selected, with a tick, and starts the highlight on it. `ComboboxProps` is now a union of `ComboboxPopupProps` (as before, with `open` and `onOpenChange`) and `ComboboxInlineProps`; an `interface` that extended `ComboboxProps` extends `ComboboxPopupProps` instead.

**`Modal` takes `phoneSheet`**: under the phone breakpoint the dialog takes the whole window as a full-height sheet, with no inset and no corners, the head and the foot standing still while the body scrolls between them and the foot clear of the home indicator, for a dialog whose body is a long list a thumb works through (Move to…). It is opt-in, so every other dialog keeps its shape on a phone; a prompt stays a prompt, and a side sheet is already the full width there.

**`Checkbox` takes `hideLabel`**: the box alone on a target the pointer floor allows, its label said and not drawn, for a card or a row that already shows what the box picks.

**`LogoSlot` is new**: one of a brand's logos on the ground it is made for, the brand's own ground colour or the product's sheet for that mode, whatever mode the page is in, with a dashed clear-space guide inked in whichever palette's text reads on that ground. Editable, it takes one file through a `FilePickButton` or a drop on the slot (`FileDrop`), offers Replace and Remove, spins while `uploading`, and draws and announces the engine's refusal (`error`). A reader gets a `download` slot beside its name.

**`ColorField` is new**: a colour a person chooses, a hex field beside a swatch that is the platform's colour picker. It reports a colour only once it reads as `#` and six hex digits, lowercased, and refuses anything else when the reader leaves the field, with a sentence saying what right looks like.

**`ColorSwatch` is new**: one colour of a brand, a chip of it with its own edge, its role, its value and a copy control that says whether the value landed. A role with no colour is the hatch of none.

**`ContrastBadge` is new**: whether one colour reads on another, a sample of the pair, the ratio said as "4.49 to 1", and the level in words and a glyph (AAA, AA, AA large text, Fails). It measures with `@crewlethq/tokens`' `contrast()` and its `WCAG_CONTRAST` floors, compares the ratio unrounded and prints it cut down, so it never claims a floor a pair misses. `scale="large"` holds large text and marks to their own floors. `contrastRatio`, `contrastLevel` and `formatContrastRatio` are exported for a dialog that lists pairs.

**`TypeSpecimen` is new**: a face shown in itself, its label ("Heading") and name in the interface's type, then "Aa" and a line set in the face, always falling back to the package's sans.

**`BrandChip` is new**: the company's brand as a small link, its mark, its name and a chevron, with the brand glyph standing in before a brand exists ("Set up your brand").

**`BrandSample` is new**: a company's brand, drawn, for the preview beside Company › Brand, a brand kit's own view and its gallery cover. `kind="doc"` is a doc's opening (the logo on its ground, a heading in the heading face, an accent rule, a sentence with a drawn link and a quiet byline); `kind="slide"` is a title slide (the mark, an accent bar in the primary and the secondary, a two-line heading and a footer with the company's name). It is a `BrandScope` pinned to its own `mode`, so it draws with the artifact kit's own mapping rather than a second reading of it, and a light and a dark sample sit side by side whatever the page is in; a role it is not given, or given as anything but `#rrggbb`, takes the default theme's value for that mode. `headingFamily` and `bodyFamily` are handed on only when they read as family names. It keeps a 16:9 frame and sets every length against its own width, so the same drawing reads as a cover and as an aside; `--crewlet-brand-sample-radius` sets its corner. It is an image to assistive technology, named by what it shows.

**`BrandScope` is new**: a region of the page in a company's brand (a doc, a board, a preview) while the chrome around it keeps the product's look. It sets the brand mapping's `--brand-*` inputs (each colour only as `#rrggbb`, each family list only when it reads as family names) on an outer element that draws no box, and the public tokens inside its box (the accent and its hover, press, ink and soft fills, the label on it, the selected edge, the grounds, the body text and the two faces) take the brand's values, following the page's light or dark, or a pinned `mode`. The focus ring stays the theme's. The mapping is `@crewlethq/tokens/css/brand-scope`, built from the one source the artifact kit's brand layer is built from, and the component imports it itself; an application that loads this package through `styles.css` alone imports that stylesheet too. `brandScopeInputs` is the gate, exported.

**`@crewlethq/tokens` carries the brand mapping**, which used to live in the artifact kit: `stylesheets/brand.css` is the one source, published as `css/brand` (the kit's root layer, which `@crewlethq/artifact-kit` now bundles from there) and, with its selectors moved onto `.crewlet-brand-scope__layer`, as `css/brand-scope`. The build accepts the mapping under its three root selectors only, so a rule reaches both stylesheets or neither, and `brandSlots`, `brandThemeName` and `parseBrandLayer` read its contract for the kit's build and the suites. A body face alone now sets the headings explicitly (`--brand-font-body` before the theme's display face), and the dark mode names the brand's text step as `initial`, so every mode declares the same steps.

**`TypeSpecimen` refuses a `fontFamily` that is not a list of family names** and draws the face by its name instead, through the same family grammar `BrandSample` and `BrandScope` use. The grammar takes every list the engine writes for a brand's face (the kit faces, the system stacks, and an uploaded family quoted in front of the system sans stack): a bare name may be a vendor identifier such as `-apple-system`, and a list holds up to eleven names, the engine's longest stack with one family registered in front of it. A `var()` other than the package's family tokens, a `url()`, a CSS-wide keyword, a name opening on two hyphens or a digit, and any punctuation are still refused, and the list falls back to the package's face.

Every colour a person chose reaches a stylesheet through one custom property per part, and only after it has passed `#rrggbb`.

## Changes in 0.48.3

**The account row in a rail's foot is slimmer, its controls stand as tall as it, and the foot gives it room.** In `AppShell.Rail`'s foot, `AccountRow` stands at 42px, half a spacing step under the large control step (`calc(var(--size-control-lg) - var(--spacing-1) / 2)`, exposed as `--crewlet-account-row-height`), where it stood 44px, with half a step above and below its two lines where it had a whole one. The room around it grows instead: the row is held one step off the foot's edge above and below (`--crewlet-account-row-pad`, from none), so the block reads less cramped while the row itself is slimmer. It stops at 42px because the medium badge's ring (1.5px, 2px outside the 32px badge) takes 39px, and 42px keeps it 1.5px clear of the row's hover fill. The controls beside the link (Settings, Preferences, or any `IconButton` or `IconButtonLink` in `actions`) take the row's height and keep their own width and glyph, so their hover fill meets the row's top and bottom where a 26px square floated in its middle. Measured in a 236px rail with Settings and Preferences beside the link: the row is 42px (from 44px), each control 26px by 42px (from 26px by 26px) with its 12px glyph centred, the name and the detail keep 116px, there is 8px between the row and the foot's edge above and below (from 4px), the foot holding the account row alone is 59px (from 53px), and the ring stands 1.5px inside the row's edge (from 2.5px). Every target stays over 24px at every density. Outside a rail's foot the row and its controls are unchanged.

## Changes in 0.48.2

**A `TreeCanvas` card's actions strip with nothing drawn in it is not drawn.** A card may offer the pointer no control (a company's root, which nobody edits from the chart) and still hold the menu the ContextMenu key opens, marked `data-keyboard-only` and drawn nowhere. Revealed on hover, focus or selection, that strip painted the column's rule beside the name with nothing beside it (`appearance="node"`) or a patch of the strip's ground (`card`). A strip whose every child is keyboard-only, or that has none, now draws neither, in both appearances. It keeps its box, so the keyboard's menu still opens from it, and a node keeps the column's room, so the names on a rank still line up.

## Changes in 0.48.1

**The account row in a rail's foot gives its chevron's room to the name.** In `AppShell.Rail`'s foot, `AccountRow` no longer draws its trailing chevron (the link's arrow or the menu's up-and-down mark), and the words take the 16px it and the step before it held. The medium badge's column cost the words 10px in 0.48.0, so the name and the detail kept 99px; they now keep 116px, more than the 109px they had beside the smaller badge. The chevron was already hidden from assistive technology, so nothing a screen reader hears changes: the link's name and the menu button's `aria-haspopup` still say what a press does, and the hover fill and the current lift still say the row is pressable. Measured in a 236px rail with Settings and Preferences beside the link: the row is 44px, the badge 32px, and the badge's ring stands 2.5px inside the row's edge, as it did around the 26px badge. Outside a rail's foot the row keeps its chevron.

**A header's sentence takes the wide measure.** `PageHeader`'s description and `ObjectHeader`'s are held to `--size-measure-wide` (80ch) where they were held to prose's `--size-measure` (68ch). Each is one statement read once rather than prose, and at 68ch (586px at the compact size) a 100-character sentence such as Company › Integrations' wrapped onto a second line beside a header row over 800px wide. Narrow screens are unchanged, since the header's own width binds first, and `ObjectHeader` still clamps its description to two lines.

## Changes in 0.48.0

**A canvas shows the operating system's own pointers.** `Canvas` paints the native `grab` hand on its field (and `grabbing` while a pan is in progress), and `default`, `crosshair` and `text` for the other values of `cursor`, so a chart pans under the hand a reader knows from every map and design tool, and no drawn pointer stands beside native ones. `cursor` and its four values are unchanged, and so is `CanvasBoard`'s pointer per tool.

| What changed | What a consumer does |
| --- | --- |
| `CURSORS` and `CursorName` are gone from `@crewlethq/icons/glyphs`. | Use the CSS keywords (`grab`, `grabbing`, `default`, `crosshair`, `text`). Every glyph stays, `HandGlyph` and `HandGrabGlyph` included. |
| `Canvas` no longer writes `--crewlet-canvas-cursor-pointer`, `-hand`, `-grabbing`, `-crosshair` or `-text` on its root, and nothing reads them. | A rule that read one inside a canvas names the keyword instead. |

**The account row is the one tall row in a rail's foot.** In `AppShell.Rail`'s foot, `AccountRow` stands on the large control step (`--size-control-lg`, 44px) where it stood 36px, around a column a medium badge wide (32px), and its name takes the nav's word size (13px, from 12px) with both lines on the body's leading. Pass the badge `size="md"` there (a smaller badge is centred in the same column). The badge is inset by the 6px it has above and below it rather than centred on the nav's 14px glyph column, where its ring would cross the row's edge, so the name now starts a step after the badge rather than on the nav's word line. Measured in a 236px rail with Settings and Preferences beside the link: the row is 44px (from 36.2px), the foot of an engine row and the account row 81px (from 73.2px), and the name and the detail keep 99px (from 109px). The rows above it keep the compact 26px step, and the Settings and Preferences controls, the truncation and the targets meeting across the gap are unchanged.

## Changes in 0.47.0

**A hidden label takes no room.** `FormField` takes `hideLabel`, which hides the label or the legend as a whole element for everything but assistive technology, and `ListInput`'s `hideLabel` uses it: the legend had held hidden text and still stood a line tall, so a list under a card's title stood 21px lower than the fields beside it.

**A narrow `ListInput` gives its words the row.** Under 28rem of the list's own width a row wraps: its number and its field share the first line and its buttons stand at the end of a second, under the words. At a 390px phone the grip, the number and the three buttons had taken half of each row, so a policy wrapped at about twenty characters a line.

## Changes in 0.46.0

The pieces for editing a company's principles where they are read: a statement or a list of policies changed in place on its own card, with nothing to go and find in another screen.

**`InlineEditor` is new**: one record edited in place, as a form named by `label`. Its fields come first, then a bar with the `EditingStatus` at its start and Cancel and Save at its end. Mod+Enter saves from any field and Escape cancels, each only once nothing inside has claimed the key and never during an input method's composition. Enter in a one-line field does not submit the form, so saving is always the one gesture, and a `ListInput` inside it passes Mod+Enter through rather than adding an item. Escape and Cancel discard at once, so a caller holding a draft worth keeping asks first in `onCancel` while `dirty`. Save is never a dead button: while nothing has changed (`dirty`), while a field refuses its value (`invalid`) and while a save is in flight (`saving`) it stays reachable and says why it does nothing. `error` is said as an alert above the bar, and `notice` holds a `ConflictNote` once the record has moved on. The focus lands at the end of the first field as it opens (`focusOnMount`). It owns no state: the draft, the save, the conflict and the focus once it closes are the caller's.

**`CharacterCount` is new**: how much of a limit a text has used ("120 / 500"), in the warning ink from nine tenths of the way and the danger ink past it, read as one sentence and announced only as it crosses a step. Characters are code points, as Go's `utf8.RuneCountInString` counts them, so an emoji counts once; `countCharacters` counts them. **`FormField` takes `limit={{ length, max }}`**, which draws the count at the end of the help line, joins it into the field's description and marks a value past it invalid. It is a soft limit: nothing typed or pasted is cut.

**`Textarea` takes `singleLine`**: a one-line value that wraps so it can be read whole while it is edited (a one-line `Input` scrolled a 160-character mission sideways and showed only its tail). Enter and Shift+Enter write no line break, Ctrl or Command with Enter passes through to a form's save, and a line break pasted or dropped in (any of `\n`, `\r`, `\v`, `\f`, U+0085, U+2028 and U+2029, the set a server refusing a break in one line also counts) is folded into a space (`foldLineBreaks`) and said so through the `Announcer` (`foldedMessage`), never silently. It is announced as one line (`aria-multiline="false"`). **A `ListInput` without `multiline` now draws its items and its new-item box this way**, so a long policy wraps rather than being clipped to one line; Enter keeps its list rules. Under a hidden legend (`hideLabel`) the add control stands at the end of the box's row, rather than alone above it.

**`EditingStatus` is read with a pause between its words**: "Editing, Unsaved changes" rather than "EditingUnsaved changes", since the dot between them is drawn by the stylesheet and a live region does not read it.

**`ListInput`'s new-item text can be the owner's (`draft`, `onDraftChange`).** Held inside the list alone, a policy typed and not yet added was dropped by the form's Save without a word, and no unsaved-changes check could see it. A form that saves the list holds the draft and saves `withDraft(value, draft)`, which appends it trimmed. Left out, the list holds it as before.

**`ListInput` also takes these additions, each off unless asked for.** `reorderByDrag` gives each row a grip it is dragged by, through `useReorder`. The grip belongs to the pointer: it is hidden from a screen reader and out of the tab order, since Alt+Up, Alt+Down and the Move buttons already cover reordering from the keyboard. `undoRemove` leaves a row where a removed item was, with Undo (which puts it back there, focused) and Dismiss, both described by the row's sentence; the focus goes to Undo, the row says the removal in place of an announcement, and it goes with the list's next change. `maxItems` replaces the new-item box with a sentence once the list is full (`fullMessage`). `maxLength` holds each item and the new-item box to a soft limit with a `CharacterCount`, counted on the trimmed text. `itemError` says a refusal under the one item it is about and links it to that item. `hideLabel` keeps the legend for assistive technology only, for a list already titled by the card around it. A `ref` gives `focusItem(index)` and `focusNew()`. An item's control now sits in a `.crewlet-list-input__field` column with what is said under it.

**`Text` takes `variant="passage"`**: words somebody wrote to be read whole (a mission on its card, a policy, a comment), at the body's size with the relaxed leading, the author's line breaks kept and a long word broken rather than overflowing. **`List` takes `density="compact"`**: rows a small step apart, and on `numbered-divided` in the body's size at its normal leading, so a card holds eight two-line policies on one screen. **`List` takes `measure`**: `normal` (68ch) or `wide` (80ch, the new `--size-measure-wide` token, for a list of statements such as a company's policies) holds each row's words to a reading measure while the row and its rule still span the list. Unset, the words take the row's width as before. `comfortable`, the default, is unchanged.

**A compact `CatalogTile` never cuts its name**, and **a `TileGrid` holding one folds where a track would be narrower than its one-line header** (about 30rem): two tracks fold to one under 61rem, three under 92rem and four to two under 123rem. At a 1024px window two compact tiles stood on 415px tracks and cut the name to its first letter; a compact head short of room now wraps its state and its fact under the name instead.

**`@crewlethq/icons` adds `TelescopeGlyph` and `ScrollTextGlyph`**: the vision's card and the standing policies' card, beside `TargetGlyph` for the mission. `Card.Header` already draws a glyph before its title through `icon`.

## Changes in 0.45.0

The pieces of the engine's Company › Principles page: a company's mission, vision and policies beside the facts about it.

**`Statement` is new**: a label over the words a page exists to say (a mission, a vision, a goal), set a step over the body (`--font-size-lg`, the body's own step over it on a phone) at the reading measure, with the author's line breaks kept. A block such as a numbered list is drawn as given under the same label, so every statement on a page heads the same way. An unwritten one says so through `empty` (`title`, `description` and an optional `action`) as an inline empty state, never as grey text in the words' place. It is a region named by its label.

**`AsideLayout` is new**: a page's main column with an aside beside it from 56rem of the layout's own width (a container query, not the window's), the aside `--crewlet-aside-layout-aside` wide (18rem by default). Narrower, the aside follows the main column past one hairline. Each column is a stack one step apart, and the aside is a complementary landmark named by `asideLabel`.

**`EmptyState` takes `size="inline"`**: one left-aligned row on a dashed hairline, the sentence beside its one action and no glyph, for a part of a page that is empty while the rest of it is not.

## Changes in 0.44.0

The pieces of the engine's Company › Integrations home, a summary of what a company has in use beside the directory of everything it could.

**`DirectoryList` lines stand at the rail's row step**: each line is exactly `--size-nav-row` (30px) in the rail's compact type, its mark at the glyph step (16px, `md`), its `hint` inline after the label in the quiet ink, giving way before the label in a narrow column, and its state held inside the row, so no line stands taller than the rest. Groups stand one small step (`--spacing-3`) apart.

**`CatalogTile` takes `density="compact"`**, a summary's tile at about half the height: the mark, the name, its state, its fact (`meta`) and the one action on the header line, and the sentence on one line under it, cut to fit with the whole of it in its title. The default, `comfortable`, is unchanged.

**`Section` takes `spacing="tight"`**: one small step (`--spacing-2`) between a heading and what it introduces, titled or not. A heading may carry the kit's `Count` of what is under it (`title={<>In use <Count value={4} /></>}`).

## Changes in 0.43.0

The parts of the engine's Company › Integrations page, a directory of everything a company works in beside the detail of the one chosen.

**`DirectoryList` is a directory in named groups**: each line a link to the item's own page with its mark, its label, a quieter hint under it (`hint`, the app a product belongs to) and its state where it has one (`status`, a status dot or a pill), the chosen line `aria-current="page"` on the selected ground. It is a navigation landmark of lists under headings (`headingLevel`), and it fills the height it is given: the groups scroll on their own and the `foot` holds the bottom of the column, one small step under them with one hairline above it, for one fact about the whole list such as an address.

**`ListDetail` lays a list beside the detail of what is chosen in it**, each scrolling on its own in the height it is given (an application shell's `fill`), the list column `--crewlet-list-detail-list` wide (17rem by default) with a hairline between the two. Below 640px it is one pane, the one `showing` names (`list` or `detail`), on a page that scrolls as any other.

**`ObjectHeader` takes a `mark`**: the object's own mark, drawn on a plate the catalogue tile's well at one and a half rows, beside the column the rest of the header keeps (a row at `size="peek"` and on a phone). A header without one is unchanged.

**`@crewlethq/icons` adds `ProductMark`**, the marks of the services built into Crewlet (`worklet`, `doclet`, `chat`) beside `VendorMark`, with `soon` for a product that has not shipped, drawn hollow rather than grey. See the icons README.

## Changes in 0.42.0

**`IconButtonLink` is an icon-only link** drawn as an `IconButton`: a place reached by its glyph, such as Settings beside the reader's own row in a rail's foot. It is a real anchor (`href`), named and titled by its `label`, and `current` marks the page the reader is on with `aria-current="page"` and a nav row's selected treatment, the lifted ground inside the default hairline, drawn on the square's own transparent boundary so nothing moves; its ring then covers that edge.

**The rail's search field is a row's width.** Its edges are a nav row's highlight edges (the gutter in from each side), and its glyph and shortcut stay on the rows' content columns through its pad (`--crewlet-rail-field-pad` is the row's pad less the field's edge). It keeps the compact step and the one-step gap to the nav.

**The account row's words take the room in a rail's foot.** The avatar keeps the nav's glyph-to-word gap, so the name starts on the nav's word line, and every gap after the name is smaller: the menu's chevron stands one step off the words, the link ends half a step after it, and the controls beside the link are half a step apart and half a step off it. With two controls beside it (Settings and Preferences), the name and the detail keep 110px where the same row with the earlier gaps kept 98px.

## Changes in 0.41.1

**The rail's search field is compact and stands on the nav's content columns** (`SearchTrigger variant="rail"` in the `AppShell.Rail` search slot). It is 26px tall (the small control step, never under the 24px target) where it was 34px, with 6px inside each end where it had 10px. Its glyph stays on the nav's glyph column, and its shortcut now ends where a row's words end, so the field is 210px wide in a 236px rail where it ran 219px from gutter to gutter. The slot names the pad (`--crewlet-rail-field-pad`), so its inset and the field's pad are one measure; outside the slot the field keeps the trigger's own pad. The slot no longer adds its own 12px under the field, so the nav's top inset (8px) is the one gap between the field and the first row, where it was 20px. The rail's rows start 20px higher. A label longer than the field still truncates before the shortcut does.

## Changes in 0.41.0

**The rail's head carries a status** (`AppShell.Rail` `status`, drawn with `AppShell.RailStatus`). An application's own state, such as its engine's, stands compact at the end of the head's line, beside the name: a status dot and, when something stands against it, a count in the foot row's inks (the warning ink with its mark for alarms). The state's words are the status's name and title rather than a line of the rail ("Engine serving, 1 alarm"), so the count is read once, in words. A status that opens a panel is the panel's trigger, as a foot row is (`aria-haspopup`, `aria-expanded` and `aria-controls` reach its button, and a `Popover` anchors to it), and `label` names it where a press does something the state does not say ("Engine signed out. Sign in"). A status nothing presses is a statement with no place in the tab order. It reserves the width of a dot and a two-figure count, and a `BrandLockup` beside it gives up its end inset to the head's gap, so the name truncates at one place whatever the count says, it is a 24px target each way with its focus ring inside its box, and it ends on the nav's gutter, where every row's background ends. It stands in the drawer's head the same way. The foot's doc now names it the place for what a reader reaches for rarely.

## Changes in 0.40.1

**The rail's foot stands on the compact step.** What a reader reaches for rarely (a settings link, a status row, who they are) takes less of the rail's height: the foot's rows are 26px (`--size-control-sm`, through `--crewlet-rail-foot-row`) where they were the nav's 30px, the foot's gap is 2px and its inset 4px where they were 4px and 8px, and the account row spends 2px around its name and detail where it spent 8px. A foot of Settings, an engine row and the account row is 101px tall where it was 133px. Only heights change: every row keeps its order, its columns, its glyphs and its words, the rows above the foot keep their 30px step, and every target still clears 24px, with the targets of neighbouring rows meeting across the gap.

## Changes in 0.40.0

The engine dashboard's own lists, page parts and navigation pieces, moved into the kit so every application draws them from one place.

### Lists and pages

**`DataGrid` draws a list as columns.** One track list on the grid, which every row adopts (`subgrid`), so a value always sits under the head that names it. The sort (`sort`, `onSortChange`, as `key` or `-key`) and the column set (`cols`, `onColsChange`, `key,key`, empty for the default set) are controlled, so an application keeps them wherever it keeps state (the engine keeps them in the address). A column gives way rather than starving its neighbours: `shrink` sizes it to its content up to a share of the grid, `floor` keeps the column that is the point of the list readable, and a grid that cannot fit drops columns by their `drop` rank rather than cutting them off, saying which in its foot ("Hidden to fit"). An `optional` column is off until the column set names it. A row links (`rowHref`, an overlay over the row, so a cell's own link or button still takes its own click) or activates (`onRowActivate`); `handleRef` steps and opens rows from an application's own keymap. Bands (`bands`) draw a grouped answer with each group's count, a sticky head sticks at `--crewlet-data-grid-sticky-top`, an empty grid draws `empty` as an `EmptyState`, and a grid inside a `Card` gives up its own edge. Below 640px each row is a labelled card, or one compact line with `phoneRows="compact"`. It is announced as a table, with `aria-sort` on its sortable column heads.

**`ColumnChooser` and `ChooserList`** are the checklist a reader picks what a view shows with. `ColumnChooser` takes a grid's own columns (`columnChoicesOf`) and writes the column set in declaration order; `ChooserList` is the plain checklist under it, for any set of facts a view shows (a card's fields). Both are one group named by their heading.

**`PropertyList` draws an object's facts in sections on one column**: every section's terms in one column (`--crewlet-description-list-term`, which `DescriptionList` reads too, so a page lines a list up with its key-value cards), the four kinds of absent value, a section with nothing filled in said once (`whenAllAbsent`), and one "set by" line under the last of the rows one change set (`setBy`, `change`). `headings` is `eyebrow` or `sentence`.

**`Tabs` take `overflow="menu"`**: what does not fit folds into a More menu (`moreLabel`, `moreMenuLabel`) instead of being cut, a tab with work in flight carries a pulsing mark and says so (`live`), and `note` is a sentence after the tabs that steps aside before any tab folds. Folded tabs stay measured and the arrow keys skip them. Link tabs spread `foldProps` on their link.

**`Histogram` draws where in a window things happened** (in `Charts`): one bar per bucket with its failed part inside the fill, a floor so a bucket with one event is still drawn, a date axis (`formatTick`) and the total said once (`summary`). With `onSelect` each bar is a button that narrows the window.

**`PageNote` is a screen's one quiet sentence** under its title, at the reading measure, with no word alone on its last line and no margin of its own. **`RelatedRow` is the one related place a page points at**: a quiet linked card under the page's content, its glyph and words on the card heads' columns, the whole row the link, in a `nav` named "Related".

**`NamedGlyph` draws a glyph from its name** (`@crewlethq/icons/glyphs/registry`, with `glyphFor`), for a place whose glyph is data, such as a list's empty state or a navigation entry.

### Fixes

**Every catalogue tile's name stands on one line across a row** (`CatalogTile`). A tile without a status tag centred its name against its mark, 13px under its tagged neighbours; the name now starts at the top of the head whatever the tag.

### Navigation

**`LockedLabel` draws a place the reader may not open**: its words with the key after them, the reason (`reason`, "Needs Admin access") as the pointer's title and read after the name, and nothing but the words where nothing is missing. A place is locked, never hidden. `mark={false}` keeps the reason and drops the key, for a place under a heading that already carries it.

**`SidebarNav.Item` takes `locked`, `title` and `onPrefetch`.** `locked` draws the row's words as a `LockedLabel`, and the row stays a link. `title` is the row's hint. `onPrefetch` is called when the pointer reaches the row and when it takes focus, on the kit's anchor and on a router's (`renderLink` is handed `title`, `onPointerEnter` and `onFocus`), so an application needs no wrapper of its own to start fetching where a row leads.

**A wholly locked group draws its key once** (`SidebarNav.Group` `locked`). The key and the reason go on the group's label, and its rows stay links in the quiet ink with no key each, still saying their own reason. A reader holding none of a column's access met a key on every row of it. A mixed group, and a run with no label to carry the key, keep it on each locked row.

**`SectionFrame` draws a workspace's sections as a column beside the screen** (`SectionFrame.Nav`, `SectionFrame.Body`). The column sticks at the view's height while the section scrolls and keeps the wheel at its ends; with `folded` (the application's decision, from its own arithmetic of what a section beside the column needs) it becomes one row naming the section the reader is on ("Settings Section: People"), which unfolds the list, folds again on a pick, and opens on an arrival the caller asks it to (`openOnArrival`). The frame takes the content column's padding back and gives it to the body, which takes the phone's 16px under 640px.

### Application shell

**The rail has a field slot and a head that takes its width** (`AppShell.Rail`). `search` is drawn first in the rail's middle, on the nav's gutter with its glyph on the nav rows' glyph column; the head's first child takes the head's width, so a long name truncates. Both were an application's own wrapper and rule.

**The scroller is a size container** (`.crewlet-app-shell__main`, `container-type: size`), so a box inside a screen can be as tall as the view it scrolls in (`100cqb`), as `SectionFrame`'s column is.

**A fill screen keeps the reserved scrollbar gutter.** The top bar's end inset counts the gutter, so a fill screen that reserved none put the bar's controls a gutter further out than on its neighbour: with classic scrollbars they moved 11px between an org chart and its roster. An application that restated `scrollbar-gutter: auto` for a fill screen drops it.

## Changes in 0.39.0

These come from a production polish of the engine dashboard's Settings › Limits, Company › Integrations and Company › Policies, and the same patterns everywhere else it draws them.

### New

**`SettingsTable` draws a read-only table of settings** (with `SettingsTable.Row`). Each row is the setting's name with its key in the document it is written in under it (`settingKey`, in the monospace face, quiet), the value in force in tabular figures, and where the value comes from (`source`). A value that is the default says so as a quiet word; a row marked `changed` carries a mark before its source, the one row in a table a reader scanning it came to find. The tracks are fractions of the table's width (`--crewlet-settings-table-columns`), so a page that stacks a table per group in cards of one width puts every value and every source on one line down the page, which a term column sized to its own longest term never did. It is announced as a table with Setting, Value and Source column headers (drawn with `header`, renamed with `columns`) and each setting's name as its row's header. In a `Card` (with `padding="none"`) it gives up its own edge and corner, as `StatGroup` does; under 32rem of table the name takes the row's first line and the value and its source share the second.

**`TileGrid` lays tiles out on a fixed track count that folds by its own width.** Two sections of tiles each on a track count of its own put their edges in different places, and an `auto-fill` grid left a hole at the end of a short section. `columns` is the count at full width: `3` (the default) folds straight to one under 40rem of grid, never to two, so a set of three or six never strands a tile; `4` folds to two under 56rem; every count is one track under 28rem. `as="ul"` makes the track the list.

**`CatalogTile` is one entry in a catalogue**: the mark in a well of one size and ground for every tile, the name as a heading at the level its place gives it, a `status` only when the state carries meaning (On, Connected, Needs attention, Coming soon), one sentence, and a foot with a quiet `meta` fact and one `action`, drawn only when there is something to put in it. A tile in its resting state carries no pill, and its name stands centred beside its mark; `quiet` puts a tile that is available but not set up on the page's own ground rather than draining its mark, because a drained vendor mark (Datadog's white plate on grey) read as a placeholder image. The sentence reserves two lines in a row of tiles so their feet line up, and reserves nothing once the grid is one track.

**`List` takes `variant="numbered-divided"`**: an `ol` whose numbers stand in a column of their own, in tabular figures, with a hairline between rows at a card's inset and the body's leading. For statements a reader cites by number, such as a company's standing policies, each of which may run to several lines and wraps under its own first word. The drawn number is the list's counter and is not read a second time.

**`ListInput` takes `focusOnMount`**, as `TagsInput` does: the focus goes to the new-item box when the list mounts, once, so a form opened to change that one list (an "Edit policies" link) lands where the next item is written. It is taken during mount, so a dialog the list opens in keeps it rather than moving focus to its own first control.

### Fixes

**A card header's plain words are its title** (`Card.Header`). A header given a string or a number drew it as a bare text node at the regular weight with no heading element, beside cards whose `Card.Title` was a semibold heading: two title treatments on one page (Models, People, Nodes and a dozen more beside Limits and Sign-in policy), and the plain ones missing from the document outline. Plain words are now drawn as `Card.Title`. **A count of zero is not drawn**: the card's own empty state already says there is nothing, and "Models 0" said it twice.

**A card head can stack its subtitle at every width** (`Card.Header` `subtitlePlacement="below"`), for a row of cards of different widths whose heads must stand at one height: by default a wide card keeps its subtitle beside the title while a narrow one stacks it, so one row drew heads of 48 and 68px. **A code block that is a card's content is that card's surface** (`CodeBlock`): placed straight in a `Card` with `padding="none"` it gives up its own edge, corner and ground, so there is no box inside a box; in a padded body it stays a well.

**A dataset source can leave out its kind** (`DatasetSource` `kind` is optional): a list whose every entry reads from one place, grouped under list labels of its own, draws no kind tag on every row.

**A catalogue tile's fact-only foot stands as tall as one with a button** (`CatalogTile`), so the rules of a row's feet sit on one line.

**A dialog's title is its `h1`** (`Modal`). It was a paragraph while the body's headings started at level 2, so the outline a screen reader walks had no top; it keeps its register (the text face at the dialog's size), and still names the dialog.

**An object header's eyebrow and fact labels keep the words as written** (`ObjectHeader`, `FactLine`). They were the uppercase, tracked-open micro-caps of a table's column head, so a unit's page read "UNIT" over its name and TYPE, LEAD and SEATS under it, like a form. They are sentence case at the caption step now, as `StatCard`'s label already is.

**A row of stat tiles shares its lines** (`StatGroup`). Each tile in a row is a subgrid over the row's three lines (label, number, sub), so a label that wraps no longer pushes its own figure below the others; and a label stands on its number, one gap above it, where another label in the row takes two lines. **A stat tile's sub wraps** (`StatCard`), balanced, rather than ending in an ellipsis: its end is the half that says what the number means, and a grid of tiles gives every tile in a row one height anyway. These were the engine dashboard's own rules over the components; an application that restated them drops them.

**The artifact bar takes the shell top bar's inset** (`ArtifactBar`): 20px, 16px under the shell's breakpoint, plus the scroller's gutter at its end, since it stands in that bar's place. At a 12px inset of its own a create page's controls ended past the content under them.

## Changes in 0.38.0

### Icons

**`VendorMark` draws Crewlet's own mark** (`vendor="crewlet"`), for the services built into Crewlet (Worklet, Doclet) where a catalogue of integrations lists them beside the third-party apps they stand in for. It is drawn from the brand mark `@crewlethq/icons` already carries (`CrewletIcon`), not a second copy, and takes the same `size` and `muted` as every other vendor. `VENDORS` lists it, so the VendorMark story shows it with the others.

**Every vendor mark draws at one weight in its square.** GitLab's press-kit drawing framed its logo in twice its own width, so at 20px it drew 10px beside marks of 20; it is cropped to its logo. Crewlet's mark is framed in the square its own extent fits rather than in the wide brand file's artwork margins, so at 20px it draws 20 by 10 where it drew 17 by 9. The VendorMark story's One weight draws every mark at 20px in a 48px box.

### Layout

These come from a layout audit of the engine dashboard at 1440, 1024 and 390 in both themes; each names what was measured.

**A stat row folds by its own width** (`StatGroup`). It dropped to two columns under a 1024px window, but a row is as wide as its column leaves it: beside the rail and a settings column at 1024 a four-column row was 489px and cut its figures ("Not s…"), and on a phone three tiles stood two and a lone third at double width. The row is a size container on twelve tracks: four a row fold to two under 640px of row, three stack one a row under 480px, and the hairlines follow. The row carries `data-columns` beside `--crewlet-stat-group-cols`. An application that restated the old `width < 1024px` step for a stat row drops it.

**A stat row in a card is flush without being told.** A `StatGroup` that is a `Card`'s content, or a `Card.Body`'s, gives up its own surface, edge and corner, so a card no longer draws a box inside a box (or a third frame inside a padded body). `flush` stays for any other host.

**A disclosure's fact gives way before its title** (`Disclosure`, `Accordion`). The fact (`meta`) held its full width and the title shrank to nothing beside a long one: a log row stopped saying which log it was, and its fact ran under the status badge beside it. The fact now shrinks first, at a hundred to the title's one, ends in an ellipsis, and keeps a floor of one glyph. It is still the toggle's name in full.

**A narrow card's subtitle takes a line of its own** (`Card.Header`). Under 480px of card the head wraps: the title and the card's controls keep the first line, and the subtitle takes the whole of the next and wraps there rather than ending ("Resets today at midnight, the week…"). Only a card whose head has a subtitle becomes a size container. An application that wrapped a subtitle under the title for itself at narrow widths can drop that rule.

**Description lists on one page share a term column** (`DescriptionList`). The term track is `--crewlet-description-list-term`, inherited, so a page sets it once and every list under it starts its values on one line; `termWidth` sets it on one list. The default track, `fit` and the narrow step are unchanged.

**The make row lays out the kinds it is given** (`ArtifactMakeRow`). Five kinds stood in six fixed columns with an empty sixth at the end of the line, and three across on a phone left a hole after the fifth. The line takes a column per kind (`--crewlet-make-row-count`, with `data-count`, both set from `items`), and on a narrow tray a short last row is centred and two or four kinds stand two a row.

**The rail foot stands on the nav's columns** (`AppShell`). A foot row's transparent boundary spends a pixel of its row pad, as it spent one of its block inset, so its mark and words start where the nav's do rather than a pixel right. In the foot, `AccountRow` takes the nav row's pad and glyph-to-word gap and centres its badge over a glyph's width, so the avatar is centred on the glyph column and the name starts on the word line.

**The top bar lines up with the content** (`AppShell`). It stood 16px from each edge over content inset 20px, and the scroller's reserved gutter moved the content's end in further, so with classic scrollbars every page's actions ended 15px past the cards under them. The bar now takes the content's inset on both sides and, at its end, the scroller's gutter, which the shell measures and sets as `--crewlet-app-shell-gutter` on its root (0 with overlay scrollbars).

### Colour

**The neutral outline tag is drawn in the neutral pill's edge** (`Tag`). It took the plain hairline, which on a dark card measured 1.07:1, so "Off" beside a filled "Default" read as a loose word. It takes the strong step the neutral soft pill draws (1.49:1 dark, 1.52:1 light on the card) and keeps its tertiary ink and empty ground, so the two neutral pills differ by their fill alone.

**Every hairline inside a card is easier to see.** `@crewlethq/tokens` holds the plain hairline to dE 5 on the card and the sheet (it held dE 3), and the default dark hairline moves from 1.07:1 to 1.13:1 on the card. A stat row's dividers, a card head's rule, a tile's footer rule and a code block's edge all draw it. See the tokens README.

## Changes in 0.37.1

### Sheets

**`SheetGrid`'s Add column fits the header's end.** Its track was the 24px pointer-target floor, narrower than the small icon button it holds (26px at the normal density, more at comfortable), so the square filled the track edge to edge and pushed it wider. The track is now the button's square plus a 4px inset on each side, at every density, and the plus is drawn at the button's own glyph size.

**`SheetGrid` with Add column no longer scrolls sideways by a few pixels.** The grid was held to the scroller's width less an assumed width for the Add column control, so it overflowed by however much wider the control drew (2px at the default density), and the platform drew a horizontal scrollbar under a sheet with room to spare. The grid now grows into whatever room the control leaves.

**`fit="content"` makes room for a horizontal scrollbar.** Sized exactly to its rows, a sheet wider than its box lost the scrollbar's height to it wherever the platform draws scrollbars in the layout, and scrolled down by that much as well. The grid measures the bar and adds its height, so a wide, short sheet scrolls sideways only.

**A `LivePreview` still copy draws no scrollbar,** and nor does the live layer it is copied from. A copy of a box that scrolled (a sheet wider than its card) is a picture of its first view, and its scrollbar sat across the card as a stray band; with none in the live layer either, a sheet there leaves no room for one under its rows.

### Focus

**Focus handed back after a pointer press draws no ring.** A trigger focused again when its palette, menu, listbox or popover closes matched `:focus-visible`, because the field inside always did, so a palette opened with a click and closed with Escape left the sidebar's search box ringed. `returnFocus(el)` (exported with `FOCUS_RETURNED_ATTRIBUTE`) focuses the element and marks it until it blurs, and the base stylesheet in `@crewlethq/tokens` keeps the ring off a marked element while the modality is the pointer's. A key pressed afterwards brings it back. The modal stack, `Menu`, `Popover`, `Select`, `Switcher`, `Canvas`'s zoom field and `ArtifactBar`'s rename all hand focus back through it.

**A shortcut outside a field is the keyboard** (`trackFocusModality`). Cmd+K or Ctrl+K opens the palette, so closing it with Escape rings whatever focus returns to. Inside a field a shortcut is still neither, since it is copy, paste or undo.

**The palette's search field draws no ring under the pointer either.** Every field's pointer narrowing now matches the modality inside `:where()`, so it narrows a ring and never outranks a variant's own. Matched bare, it beat `Input`'s command variant and drew a square accent hairline round the palette's borderless field.

### Hit areas

**The rows of a list meet at their targets.** A list draws its rows a step apart, and the gap between two rows used to belong to no row: a pointer crossing a list slowly met the list itself there, so the hand turned into the arrow and the hover fill went out between every two rows and came back on the next, which reads as the cursor flickering. Measured on the sheet create page's "Start from" list, a slow pass down it switched the cursor 14 times and crossed six dead strips of 4px; it now switches twice, on entering and leaving. Each row reaches half the gap on each side with an empty `::after`, so the drawn spacing is unchanged and the targets meet in the middle of the gap. The reach is `HIT_AREA_CLASS` (`HitArea.css`), set on the row from the gap its list is laid out with as `--crewlet-hit-area-block` and `--crewlet-hit-area-inline`, measured from the row's padding edge. `ChoiceList` (with the answer after a dashed rule reaching up across it, and a row with its panel open reaching nothing downward), `SidebarNav`'s rows and nested rows, the rail foot's `AppShellRailRow` and `AccountRow`, `ArtifactMakeRow`'s tray, `Tabs` in every variant, `SegmentedControl`, `Select`'s and `Combobox`'s options, `DatasetSourceList`'s entries and the command palette's scopes take it. A list of an application's own takes it the same way (Foundations / Hit areas). No scroller grows: the reach stays inside each list's padding, and a scrolling row of tabs reaches nothing past its first and last tab.

## Changes in 0.37.0

### An artifact list with an identity

**`ArtifactNameCell` names an artifact in a list.** The kind's glyph on the kind's tint (the Make row's tile at a list's size, so a doc started from the tray is found in the list by the same mark in the same colour), the title, and under it the kind's word and the artifact's description (`detail`) on one quiet line, each cut on one line with the whole of it on hover. The kind is printed, so a list needs no Type column of its own. Under the pointer the row's ground moves and the mark's hairline takes the kind's hue; nothing lifts. `pinned` draws and says a pin, and `trashed` draws the mark without its tint. Every word is in `labels`.

**`ArtifactAccessLabel` says who can open an artifact** as its glyph and a word: Private, Shared or Company (`ARTIFACT_ACCESS_LABELS`), or the caller's own `label` and `title`. Access is a fact about reach, never a status, so it takes no colour: the word is a step stronger where others can open it. The glyphs are `ArtifactAccessGlyph`, which `ArtifactCard` now draws its access with too, and the `ArtifactAccess` type has moved to this module (the card's subpath still exports it).

### Previews

**`PreviewScale` fills a box with `fit="fill"`.** The content covers the box edge to edge, centred across and held at the top, wherever that leaves at most a fifth of it outside the box (`PREVIEW_FILL_MAX_CUT`), and is contained whole otherwise. A design's laptop board (16:10) in a gallery card (16:9) was contained, which left an empty strip down each side of the card; filled, it reaches both sides and loses a tenth of its foot. A phone's board is still shown whole. `PreviewFit` names the three fits.

### Wording

**The gallery's tray is "Start a new artifact"** in the stories, the tests and the notes on `ArtifactMakeRow` and `ArtifactKindTile`, where it was "Make something new".

## Changes in 0.36.0

### New on a create page and in the gallery

**`AgentHandoffPanel` hands the work to an agent beside what is being made.** A create page is the direct way to make something; asking an agent is a panel at its side rather than a mode that swaps the page for a form, so a person can lay out a slide, ask, and lay out another. It is an `ArtifactPanel` (titled "Ask an agent"), so inside an `ArtifactWorkspace` it is a column where there is room, a drawer over the page's end where there is not, and the screen on a phone. Top to bottom: an `intro` line, the brief (a `Composer` with its visible `briefLabel`, `briefPlaceholder`, `briefHelper` and `briefMaxLength`), `starters` offered as one-press chips while the brief is empty (`onStarter`), the kind's own fields (`children`), **Who builds it** (`agent`, the host's picker), **Goes with it** (`carried`: what the reader already made, each with an icon, a label and a detail) with the task exactly as it is filed behind a disclosure (`task`), and **What happens next** (`steps`, a `Timeline`). A `notice` (a refusal) sits above the commit. The commit is the panel's foot (`send`: its label, the chosen agent's picture as `media`, `busy` and `disabledReason`), always in reach however far the panel scrolls; a held send says why in words beside the button as well as in its tooltip, and the picture is hidden from the button's name. Command+Enter from any field in the panel sends, and the press is answered there, so a page-wide shortcut behind the panel never also fires. Every heading and label is in `labels` (`AGENT_HANDOFF_LABELS`).

**An artifact panel takes a `footer`** (`ArtifactPanel`): what stays under the body however far it scrolls, on a hairline at the panel's foot and outside the scrolling body, such as a hand-off's Send. A panel without one is unchanged.

**`ArtifactMakeRow` is the gallery's Make something new row, a quiet tray rather than a row of pictures.** Each kind is its glyph on the kind's own tint, its name and a few words on what it is for (`detail`), the whole item one link named by the kind with the words as its description; with `disabledReason` an item stays a focusable stop that says why it cannot start one. The tray is Crewlet's dotted field in a hairline ring, and an item lifts off it as a card under the pointer while nothing inside it moves. It lays itself out by its own width: under 560px three across in two lines, each mark over its name; from 560px the six in one line, still mark over name, so a long name is never cut; from 920px the mark beside the name with what the kind is for under it. At 1440 the row is 52px tall where the tiles were 166px. `ArtifactKindTile` stays, for a create page's starting points.

### Chosen options and focus

**A chosen option is calm, and the focus ring is the one accent line on a page.** Two tokens name what a chosen option draws: `--color-border-selected`, the accent at 0.6 (the full accent in a high-contrast theme), so a tint mixed toward its ground, and `--color-surface-selected`, the soft fill. Every component that marks a pick takes them, at one pixel, and pairs them with a mark of its own that clears 3:1, so the state never rests on the tint:

- `ThemeGallery`: the chosen card's edge is the selected edge over the selected fill, and a check stands beside its name. It was a full accent border.
- `SlideFilmstrip` and `SlideGrid`: the slide being edited keeps its one-pixel edge in the selected edge, with the selected fill as a 3px band outside it, and its number in the accent ink. It was a 2px ring in the full accent, the focus ring's weight and colour.
- `DatasetSource`: an open source is one card. The selected edge rings the whole entry, its preview included, over the selected fill on its summary, which is the card's head; the preview is a well under it on the inset ground, parted from the head by one line in the same edge, so the settings and figures it shows read as the entry's own rather than as loose items of the rail. It was the full accent around the summary alone. Selected without a preview it is the selected edge and fill around the summary; closed, it is unchanged.
- `ChoiceList` and `LayersList`: the picked row stands on the selected fill. A layer used to take the accent rail of a current row (the outline's heading, the page in the rail), which beside a canvas read as a second selection; the rail's room is kept, and forced colours draw it in `Highlight`.
- `SlideFilmstrip`'s focus ring grows outward from the thumbnail's edge. It sat on the inset offset, inside the thumbnail, where a dark slide swallowed it and tabbing through the strip showed nothing.
- `Card`: a chosen card (`selected`) takes the selected edge over the selected fill, laid over its own surface. It was the full accent border under `--shadow-selection`, a second 2px accent ring.
- `ArtifactKindTile`: a tile that is a button takes `selected` (announced as a pressed button): the selected edge on its frame over the selected fill, and a check beside its name. Its ground no longer draws a tinted inner line, which with the frame's edge and the focus ring read as three nested rings; the frame is the tile's one edge.
- `ArrangeFrame`: the block under the pointer, or holding focus in one of its fields, takes the selected edge; the block itself in keyboard focus takes a 2px focus ring (it was one pixel); a picked or resizing block keeps one crisp pixel of the accent.
- `FilterChip`: a pressed chip stands on the selected fill, keeping its lighter line and the accent ink.
- `ChoiceList`: the radio is drawn rather than the platform's, an empty ring on the control boundary until chosen and an accent dot when it is, because the platform's dark radio filled every unchosen answer with a grey disc that read as a second choice; forced colours hand it back to the platform. A tag ("Suggested") is set in the tertiary ink, no longer a second accent mark on the chosen row.
- `SlideFilmstrip`'s thumbnails take the strong line at rest and its hover step under the pointer: on the dark page the plain hairline left a strip of dark slides with no edges.
- `CanvasBoard`: hover is one screen pixel of the selected edge, and a pick one crisp pixel of the full accent with its four corners. It was two pixels, so a picked board and the live board ([data-active], which keeps the 2px focus ring) read alike.

**A field rings at 2px for the keyboard and at its own hairline for a pointer.** `trackFocusModality` (and `useFocusModality`, exported with `FOCUS_MODALITY_ATTRIBUTE`) writes `data-crewlet-focus="keyboard" | "pointer"` on the root: Tab, or any key pressed outside a text-entry control, is the keyboard, a pointer press is the pointer, and typing in a field is neither. Every field (`Input`, `Textarea`, `Select` and its search box, `TagsInput`, `DateTimePicker`, `TimeWindowPicker`, `Composer`, `DocumentTitleField`) starts it while mounted, and an application may call `trackFocusModality()` at boot so the first key a reader presses is seen before any field mounts. A boxed field's ring is now 2px in `--color-focus` over its boundary, the area WCAG 2.2's focus appearance asks of a keyboard indicator, and where a pointer put the caret it narrows to one pixel in `--color-border-selected`, so a page that focuses its first field on load no longer rings it in the focus colour before anybody has touched a key. A refused field keeps its danger colour under either. A document that tracks nothing keeps the 2px ring. `Input.test.tsx` holds every boxed ring to one narrowing rule. `SourceEditor` rings as a field does too, in place of its accent border and soft halo.

**`Composer` rings as a field does.** Its box takes the field ring above, keyed on the field so tabbing onto the send action shows that button's ring. It used to recolour its border to the accent and lay a 2px soft halo outside it: two highlights for one state.

**A composer's footer is drawn only with something in it** (`Composer`). With no send shortcut, counter or actions there is no strip under the field, and a footer holding only the shortcut's hint goes on a phone, where the hint is not drawn, instead of leaving an empty strip. A footer with actions or a counter stays on every width.

### Titles

**`DocumentTitleField` wraps.** It is a textarea of one row that grows with the title, so a long title, or a long example in its placeholder, wraps on a phone as the title it becomes does, where the input it replaced cut it mid-word. It is still one line of text: Enter inserts nothing (its keydown reaches the caller and the page as an input's does, and in a form with a submit button it submits, as an input's Enter does), a pasted, dropped or autofilled line break becomes a space before `onChange` reads the value, and it is named to assistive technology as a single-line field (`aria-multiline="false"`). It forwards a ref to the textarea. A caller that typed its handlers or ref for `HTMLInputElement` types them for `HTMLTextAreaElement`.

**`DocumentTitleField` underlines in a tint for a pointer and in two focus pixels for the keyboard.** The line along its foot is one pixel (the hairline under the pointer, the selected edge once a click has put the caret in it), and two pixels in the focus colour for the keyboard, drawn as the border and a shadow under it with a transparent outline that forced colours paint. The padding takes the pixel the border no longer reserves, so the title sits where it did. A page that focuses its title on load no longer draws a 2px accent bar under it before anybody has touched anything.

### Live previews

**A live preview is a snapshot: rendered once, then a still copy with nothing live behind it** (`LivePreview`). Scrolling a gallery up and down tore every card down as it left and drew it again from its stand-in as it came back, so the kind's drawing flickered over content the reader had just seen, and every redraw read its data again. Now the content renders once, out of sight behind the stand-in; when it calls `useLivePreview().ready()` and the page's fonts have loaded, what it drew is copied (its DOM, cloned: a canvas as an image of what it drew, and nothing that would load again, such as a frame, a video or an embedded object), the copy fades in over the stand-in, which is hidden only once the fade is done (fading both at once showed a double exposure), and the content is unmounted in the same commit. From then on the preview holds no React tree, query, subscription, observer of its own or timer, and it never reads, polls or redraws again; nothing inside a copy animates. A copy laid out at `width` is rescaled when its box changes size by one ResizeObserver the provider shares; one with no `width` is drawn again only if its box changes size. A render that has not drawn within `LIVE_PREVIEW_RENDER_MS` (15 seconds, past the ten a framed page is given to answer) gives up and keeps its stand-in.

**A snapshot is kept by key for the provider's life** (`snapshot`, new). Previews under one `LivePreviewBudgetProvider` with the same key share one copy, so a card mounted again (a filter, a change of shape, a page of results) shows it at once with nothing read or rendered, and no fade. A key names a version of the content: a new key is a new snapshot, and a provider mounted afresh (the page loaded again) takes new ones. The provider keeps up to `LIVE_PREVIEW_STILLS_KEPT` copies (200, four pages of a listing at fifty; `kept` changes it), the one used longest ago dropped first. A preview that failed is remembered under its key too. `createLivePreviewStills` is the store, exported for a host that measures.

**A frame is kept, not copied** (`frame`). A page in a frame lives in another document, which nothing can clone and a clone of the frame would load again, so a framed preview keeps its frame once drawn and fades it in. Kept frames are capped apart (`LIVE_PREVIEW_MAX_FRAMES`, twelve, the pages a design's canvas runs at once): one the reader has left is parked, and taken back only when a frame coming near needs its place, the one left longest ago first; one on screen is never taken back for another.

**The budget bounds renders at once, six by default** (`LIVE_PREVIEW_MAX`, from twelve). A slot is held only while content renders, and given to the next box the moment the content says it has drawn, so six is enough for any gallery: six is the number of connections a browser opens to one host over HTTP/1.1, which is how a preview's reads reach their server, so a seventh render would only queue behind them. `LivePreviewBudgetProvider` takes `maxFrames` and `kept` beside `max`.

**A preview starts a screen ahead** (`LIVE_PREVIEW_MARGIN`, `'100% 0px'`, from `'200px 0px'`). A snapshot costs nothing once taken, so drawing a screen ahead in each direction is paid once and lets a reader scrolling at any pace meet every card already drawn.

Measured on a gallery of 44 cards at 1440 by 900, scrolling down and back at reading pace, in flings, then to the foot and twice over again, against 0.36.0's earlier preview (a parked slot and a still copy only on reclaim): visible cards drawn again after they had drawn stayed at 0; cards seen before their first draw fell from 18 samples to 0 (from about 50 to 0 with the CPU slowed fourfold); teardowns of a drawn card fell from 93 to 0; requests and socket questions after every card had drawn fell from 7 and 2 to none, and over the whole visit from 106 and 27 to 57 and 12, every board, dataset and sheet read exactly once; long tasks at fourfold slowdown fell from about 40 (2.4 seconds in all) to 2 (150 milliseconds); the heap after the visit from 15.1 to 13.7 MB and the document's nodes from 6,356 to 5,994. The first screen draws within about 15 milliseconds of the time it took before (about 70 with the CPU slowed fourfold).

**A preview's margin is measured against its scroll container.** The observer was rooted at the window, and a page that scrolls inside a frame clips its content at the frame's edge, so `rootMargin` never applied and every card started drawing only once it was on screen. It now observes against the nearest ancestor that scrolls.

**`createLivePreviewBudget().request` answers a slot** (`LivePreviewSlot`: `release`, `drawn`, `park` and `resume`) in place of a give-back function, and takes the holder's `reclaim` and whether it is a `frame`. `drawn()` ends a render: it gives a page's slot back for good and keeps a frame among the frames. A host that called the answer to give a slot back calls `release()`.

### Artifact kit

**A kit sheet reads the page's capabilities again once the runtime's handshake lands** (`@crewlethq/artifact-kit`: `<crewlet-sheet>`, `mountSheet`). Before the handshake the runtime answers `capabilities.has` from what the origin told it as the page loaded, and from the handshake on the host's word is the authority. The sheet read the answer once, when it was first drawn, and kept it, so a sheet drawn on one answer and handed another by the handshake kept the first: a page whose host said `db` at the handshake could still show "This sheet cannot load" for good. The sheet now reads the declaration again when `ready` resolves, its subscriptions following what it reads, and says a page has no datastore only once the handshake has said so; before then it draws nothing. `mountSheet` and the element still wait for the handshake before they draw, so a page sees no change unless a host's handshake disagrees with what its page loaded with.

### Smaller fixes

**A framed slide keeps its edge on the dark theme** (`SlideStage` with `framed`). The slide's outline takes `--color-border-strong` rather than `--color-border-default`. On the dark theme the default border is a step off the page, so a dark slide (most themes are dark) on a dark page drew no edge and read as a hole in the page; the strong border is the third step of the ramp and clears the page in both themes. Hosts that recolour the outline for a marked stage are unchanged.

**An artifact bar's status is quiet by default** (`ArtifactBar`'s `status`). Plain words handed to it ("Creating…", "25 words", "4 slides · Nightshade") are drawn in the compact step and the secondary ink, with tabular figures, as `EditingStatus` draws itself, rather than at the bar title's size and ink. A host that styled its own status span for this can drop the span; one that wants a stronger status passes an element with its own colour.

**An option with a detail starts at its top** (`ChoiceButtons`). Laid out as tiles by a host's grid, the options in one row stretch to the tallest, and centred text set a label with a one-line detail lower than its neighbour with a two-line one. An option that has a detail now aligns its label, detail and mark to its top edge, so every label in a row starts on one line. An option without a detail, and a column of options, look as they did.

**A narrow board keeps a readable name** (`CanvasBoard`). A name with too little room above its board is shortened to at least three letters and an ellipsis; a board narrower than that is called by its number in the design ("3"), and only a board narrower than a digit goes unnamed. A shortened name or a number carries the whole name as a tooltip, and the board's region is still named in full. The name row counts the room the move handle and the open control take, so a touch screen's open control no longer cuts the name to nothing. `boardName(title, position, room)` is that rule, and `BOARD_NAME_MIN_CHARS` the letters it keeps. `boardRoom(width, height)` now answers the placeholder's `lines` alone, and `BOARD_TITLE_MIN_WIDTH` is gone: a host that read `boardRoom(...).title` asks `boardName` instead.

Beyond what is named above (a `DocumentTitleField` handler or ref typed for a textarea, a budget's `request` answering a slot, and `boardRoom(...).title` read through `boardName`), a host has nothing else to change. A host stylesheet that drew its own chosen state in `--color-brand-accent` can take the two selected tokens in its place, and one that drew a title underline of its own can follow `DocumentTitleField`.

## Changes in 0.35.1

**A column given another type keeps only what every type has** (`SheetColumnEditor`, and `retypeColumn` in the sheet model). Its field, name, width, freezing, read-only flag and Required stay, and so does its length cap between text and long text, which both read it. Every other setting belongs to the old type and is dropped: a number's bounds, decimals and format, a choice's options, a date's time of day. The column is built up from what is kept rather than pared down from the old one, so a setting a type adds later is dropped without the editor having to name it. Before, a date's time of day and a text's length cap rode along, unseen, into a type that ignores them, and came back if the old type was picked again. A host that relied on a setting surviving a type change sets it again on the column it is handed.

## Changes in 0.35.0

**The gallery card is a step smaller and calm under the pointer** (`ArtifactCard`, `size="card"`). Its title is the body size rather than a large one, its body inset is one spacing step tighter, and the kind's badge on the preview's foot is 32px (from 40px) with the small glyph, so a gallery fits four cards across a laptop's page in the same design. Hover no longer lifts the card or casts the wide card shadow: the hairline darkens and an extra-small shadow settles under it, over the fast duration, and the card never moves. The More menu still appears on hover and focus. A host that relied on the lift has nothing to change.

**An artifact's bar draws the kind's glyph in the kind's colour** (`ArtifactBar`), as the gallery's badge and the Make row do, on an open artifact and on a create page alike. The kinds' colour classes (`crewlet-kind--<kind>`, which set `--crewlet-kind-ink` and its siblings) moved to a sheet of their own that the bar, the card and the illustrations each import, so the bar is tinted on a page that draws no card. `ArtifactKindGlyph`'s module still carries no stylesheet.

**An artifact bar's primary action can take a short word on a narrow bar** (`ArtifactBar`, `shortLabel` on an `ArtifactBarTool`), so "Create and ask SRE Lead" reads "Create" on a phone and keeps its full word as its accessible name. **On a narrow bar the status gives way before the title**: it is cut to an ellipsis instead of drawn over the title, and its words stay whole for a screen reader.

**A menu's `label` names its trigger when the trigger shows text** (`Menu`). It was the accessible name of an icon trigger only, so a "New" button that opens a menu of kinds was announced as "New". Keep the visible words in the label ("New artifact"), so a person who speaks what they see still reaches it. A test that found a text trigger by its words alone finds it by its label now.

**A choice can carry a picture** (`ChoiceList`, `media` on an option): drawn between the radio and the words and hidden from the name, such as an agent's character in a "who builds it" list. A list without pictures is unchanged.

**A Make row's tile keeps its drawing still on hover** (`ArtifactKindTile`). The illustration used to rise and grow inside its frame; the frame's border now steps alone, over the fast duration. Reduced motion drops the transition.

**A list marker alone on its line is an empty list item**, as CommonMark reads it: `-`, `*`, `+`, `1.`, `1)` and a task's `- [ ]` or `- [x]` with nothing after them, with or without the trailing space an editor strips. The grammar read a bare `1.` as text, so an outline whose trailing spaces were lost drew "1. 2. 3." inside a paragraph, in `RichEditor` and in every renderer alike. An empty item does not interrupt a paragraph, again as in CommonMark, so a lone `-` under a line of text stays that text's next line. Bodies that already round-tripped still do byte for byte, and the editor's corpus holds the bare forms (`bare-markers.md`).

- `SlideFilmstrip` takes a slide's actions, as a presentation editor's
  filmstrip has them: `onDuplicate` (Command+D, Control+D elsewhere, on a
  thumbnail), `onDelete` (Delete or Backspace) and `actions` (further menu
  entries), named with their keys in a per-slide menu that the Menu key or
  Shift+F10 opens from the thumbnail. `footer` holds what follows the last
  slide inside the strip, such as a New slide control.
- `ThemeGallery` takes `renderPreview`, which draws a card's thumbnail in
  place of its swatch, for a theme of something other than the product's
  chrome (a slide deck's, drawn as its cover). A theme's `swatch` is optional
  when the gallery is given one.

**`SheetGrid` shapes its columns in place.** `renderColumnEditor` makes each column header open that column's settings in a popover anchored to it: a press, Enter or Space on a header opens it, Escape closes it and returns focus to the header, and the host draws what is inside. `settingsColumn` and `onSettingsColumnChange` let the host open a column itself (one it has just added). A header that opens settings does not sort on a press; a host that offers both puts its sort in the settings. `onAddColumn` draws Add column after the last header, outside the grid's roles (a grid's rows hold cells only), sticking to the top with the header row and reached as its own tab stop after the grid's. Keys, presses and pastes inside a portalled popover no longer reach the grid's own handlers. New labels: `columnSettings`, `columnSettingsHelp` and `addColumn`.

**`SheetColumnEditor`** is one column's settings as a compact panel: its name, its type (each with its `SheetColumnTypeGlyph` and a line on what it holds), the choices a select, multi-select or status column offers (each with its colour from a hue menu, or its category for a status; a new status column starts with Not started, In progress and Done), the stars of a rating, Required, Move left and Move right, Delete column (with `deleteDisabledReason`) and Done. Every change is handed to the host at once as the next `SheetColumn`, so the grid beside it redraws as the reader types; a name cleared to nothing is held and restored. `suggestedType` offers a type the host proposes (from a column's name or its values) as one press, and `typeLockedReason` says why a type cannot change. A choice's id is made once from its label (`optionId` for a store's own rule) and never changes after.

**`parseCsv`** reads CSV the way spreadsheets write it: quoted separators, doubled quotes and line breaks inside a field, CRLF, LF or CR line ends, a byte order mark dropped, and the separator found from the first record (a comma, a semicolon or a tab) unless given. It reads back what `toCsv` writes, defused formulas included, keeps every value as text, and refuses an unclosed quote or more than `maxRows` records with the line it happened on rather than cutting silently.

**`ChoiceList`'s panel is styled as part of its choice.** A selected choice's `panel` had no styles at all: it sat under the row against the box's edge, outside the selected fill. It now continues the row's fill and starts where the label does.

**`HueSwatch`** is the dot `HuePicker` draws for a hue (or the hairline ring of no hue), exported for a hue menu or a list of coloured choices.

**`CanvasBoard` can shape a canvas before it is drawn.** An editable board given `onBoardCreate` adds Frame (`F`) to its palette, between Hand and Text: a click on the field hands the caller the canvas point, the caller adds a board of whatever size and name it gives new ones and returns its id, and the canvas selects it and hands back Move. `onBoardRemove` lets Delete (or Backspace) remove a selected board, as it removes a selected note. Neither is offered on a view-only canvas, so a published design's viewer is unchanged. The `Shaping` story lays out a design's boards this way. `@crewlethq/icons` vendors `frame`, `laptop`, `tablet` and `smartphone` for it and for frame presets.

**`ArtifactKindTile` can start something in place.** Given `onSelect` and no `href`, the tile is a button drawn exactly as the link is, for a create page's starting points. `face` draws on the kind's ground in place of its drawing (a design layout's `CanvasSchematic`), and `detail` is one quiet line under the name, read as the tile's description. The `StartingPoints` story shows a row of them.

**`SourceEditor` writes source text in place**: a real, monospaced textarea with a line gutter, and the lines a checker named (`marks`, each a `line`, a `tone` of `danger` or `warning`, and an optional `message` shown as the gutter number's tooltip) drawn in the gutter and behind the text. Lines never wrap, so a number and a mark always sit on their line. Tab and Shift+Tab indent and outdent the lines under the selection, Escape then Tab leaves the field (the field's description says so to a screen reader, as `SOURCE_EDITOR_KEYS`), Enter keeps the line's indent and Command+Enter (Control+Enter) calls `onSubmit`. A refusal on any line sets `aria-invalid`. The handle's `revealLine(n)` focuses the field with the caret at line `n`, scrolled into view; `fill` makes it take its parent's height.

**`FindingList` lists what a checker found**: one row per `Finding` (a `tone` of `danger` or `warning`, an optional `location` such as `index.html, line 6`, and the `message`), refusals before advice, the tone's glyph in its ink and the tone said in words to a screen reader (`toneLabels` renames them). A finding with `onSelect` is a button that takes the reader there, so a keyboard walks the findings with Tab.

**`FileDrop` and `FilePickButton` bring files in.** `FileDrop` is a dashed target of its own (a `title`, a `hint` and `actions`) or, given children, a region that takes files dropped on it and shows a frosted overlay saying so only while files are held over it. Dropped folders are walked through the entries API, and every file is answered as a `PickedFile` (`path` with forward slashes, inside the folder it came from, and the `File`). A drag that carries no files (text moved inside an editor) passes through untouched. `FilePickButton` is the keyboard's and the screen reader's way in: a `Button` that opens the system picker, for files (`accept`, `multiple`) or a whole folder (`directory`). `droppedFiles` and `pickedFiles` are the readers, exported for a host with its own target.

## Changes in 0.34.1

**`ArtifactKindGlyph`, `ARTIFACT_KINDS` and `ArtifactKind` have a module of their own** (`@crewlethq/ui/ArtifactKindGlyph`), and it imports nothing but the glyphs. They were defined in `ArtifactCard`'s module, and a bundler places a module whole, so a host that drew one kind glyph in its frame (a sidebar's pins, a command palette's hits) took the whole card into its first screen, and with 0.34.0 the kind illustrations the card draws: about 11 KB of script for a gallery the reader had not opened. Nothing is renamed: the root export and `@crewlethq/ui/ArtifactCard` still answer for all three, and `ArtifactIcon`, `ArtifactBar`, `DashboardCover` and `ArtifactKindIllustration` now import them from the new module.

## Changes in 0.34.0

**`ArtifactCard` is redesigned as a gallery card.** The `card` size draws a large preview on top with a generous corner, the kind's glyph on a badge standing over the preview's foot in the kind's ink, the title at the large step on one line, and one quiet line under it: who can open it (`access`: `private` a lock, `shared` people, `company` a building, each said in words to assistive technology through `labels.access`), the owner when the reader is not the owner, and when it was last edited. The default change word is "Edited" ("Edited 20h ago by Maya"), in both sizes. `actions` (a More menu) is drawn beside the link rather than inside it, over the preview's top corner, shown on hover, while focus is inside the card and while its menu is open, and always on a screen with no hover; a keyboard reaches it after the link. `trashed` fades the preview. Hover lifts the card's edge and shadow (not under `prefers-reduced-motion`), and focus rings the whole card. The `compact` row is unchanged but for "Edited". **`ArtifactCardSkeleton`** is the card's own shape while a gallery loads. **`ArtifactPreviewGlyph`** now draws the kind's illustration on its tinted ground (`ArtifactKindGround`) rather than a lone glyph.

**`ArtifactKindIllustration`, `ArtifactKindGround` and `ArtifactKindTile` picture each kind of artifact.** The illustration is a simple geometric drawing per kind (a page of prose with a checklist, a slide with a picture, a phone screen, a board of bars, a window of code, a grid of cells), hidden from assistive technology and drawn entirely in the kind's tokens at four fixed weights, so it holds no colour of its own. The ground sets it on the kind's fill falling into the card, as a preview's stand-in. The tile is a "Make something new" entry: the ground framed in a hairline holder, the kind's name under it, one link named by the name (and an optional `badge`, read after it); with `disabledReason` it stays a focusable stop that says why it cannot start one.

**`LivePreview`, `LivePreviewBudgetProvider` and `PreviewScale` draw real content small.** `LivePreview` lays its content out at `width` CSS pixels and scales it to its box with a transform (`PreviewScale`, which also fits a board of its own size whole with `fit="contain"`), mounts it only while the box is within `rootMargin` of the viewport, has stayed there for `dwellMs` (120ms by default, so a fling mounts nothing) and holds a slot of the shared budget (`LIVE_PREVIEW_MAX`, twelve, granted one per animation frame so a row arriving at once never costs one long task), and draws `fallback` otherwise: off screen, waiting for a slot, until the content calls `useLivePreview().ready()`, after it calls `fail()` (which gives its slot back for good) and in a browser with no IntersectionObserver. The live layer is `inert`, takes no pointer and is hidden from assistive technology; the swap is a short fade, and none under `prefers-reduced-motion`. `createLivePreviewBudget` is the bookkeeping, exported for a host that measures.

**`Select` takes `appearance="quiet"`**: no boundary or fill until the pointer is over it, for a toolbar whose pickers arrange content that is the page's point. A quiet filter that is on takes the accent's soft fill under its accent ink, and a quiet picker sizes to its answer with no floor.

**Tokens: `--color-artifact-kind-<kind>` with its `-ink`, `-fill` and `-line` steps** for `doc`, `slides`, `design`, `dashboard`, `html` and `sheet`. Each is an alias of a node hue (doc blue, slides amber, design purple, dashboard cyan, HTML rose, sheet green), so every theme, light and dark, repaints them with no value of its own.

**`SheetGrid`'s row gutter puts the number and the row's actions in one place.** The number sits centred in the fixed-width gutter, in the tertiary ink and tabular figures, so row 9 and row 1000 stand in one column. Where the host takes row actions (`onDeleteRow`), the number gives way, in the same place and with no shift, to the actions button at the small `IconButton` step, centred, with a `Tooltip` and the name "Actions for row N" (`labels.rowActions`, which read "Row actions for row N"). It shows under the pointer, on the row holding focus and while its menu is open; the button is drawn in every row with actions, clear until then, so a tap on the number opens the menu on a touch screen, where there is no hover. It sat pinned to the gutter's trailing border, half over the number ("2 ⋯"), was drawn only on the active or hovered row, and carried only the native tooltip. The tip opens above the button from its leading edge, so it never hangs past the grid's own edge or is pushed off the button at a page's edge. The row header is named by its row alone (`aria-labelledby`), not by the button inside it, and keys pressed on the button stay the menu button's rather than also moving the active cell. A selection marks its rows' numbers as it marks its cells; in forced colours the number takes the selection's ink on the page's ground.

**`Tooltip` takes `align="start"`**, which lines the panel up with the trigger's leading edge (its right edge in a right-to-left page) rather than centring it, for a control at the leading edge of what it belongs to. `center` stays the default.

**A selected frozen cell stays opaque when the sheet scrolls sideways.** The selection's translucent tint replaced the cell's ground, so the values passing under a frozen column showed through a selected cell in it. The tint is now laid over the cell's own ground, as it is in the gutter.

## Changes in 0.33.0

**`ArtifactPanel` rests every panel of text at one width, and its `sm` size is removed.** Details at `sm` and History at `md` moved the artifact's edge by 80px between two panels of text. There are two sizes now: `md`, at 22.5rem, for every panel of text (facts, a list, a form), so moving between them never moves the artifact's edge, and `lg`, at 36rem, for a table. Where there is no room for two columns, a panel that slides over the artifact takes the drawer's lift, the one the shell's rail drawer wears, so its start edge reads as a sheet over the artifact rather than a cut through it. The body publishes its padding as `--crewlet-artifact-panel-inset`, which a sticky foot offsets itself by to sit on the panel's edge, and it is a flex column, so a child that sets `min-height: 0` can fit the panel rather than scroll it. A `Section` inside it heads at the panel's register: its title reads `--crewlet-section-title-size`, which the panel's body sets to the small step, and its sentence stacks under the title (the actions kept on the title's line) when the column it sits in is narrow.

**`ArtifactBar` stands at the shell top bar's height and inset.** It is `--size-shell-topbar` tall, hairline included, where it was 49px against the top bar's 52, so the line under it no longer jumps when a reader opens an artifact from the gallery, and on a phone its first control keeps the shell's inset. Below 900px of bar, "Editing · Unsaved changes" folds to its dot, which turns the accent once anything is unsaved and stays in the status for a screen reader, before the title is cut; "Editing" still folds below 640px. The rename hint is a hidden element the title's description is read from, no longer a stray "Rename" in the reading order, and `ArtifactVersionChip` takes a control's corner (`--radius-md`), as the bar's other controls of its height do.

**`Callout` centres a one-line message on its action, and moves a narrow callout's action under its text.** The content is padded by half of what the small control is taller than a line, so one line centres on the button and a longer message keeps its icon on its first line. A callout with an action measures its own width: under 28rem the action takes a row of its own at the start of the text's column, and wider it stays beside the text.

**`ShareDialog` lists a share that reaches nobody, and gives its sections room.** A stored share whose row carries `invalid` (the reason in words) is listed rather than hidden: it reads `labels.noAccess` in place of a role, says why in the warning ink, and offers Remove as its one action. Each section carries one step more above its heading, so "Who has access" no longer reads as the add field's label.

**A `Modal` head with a subtitle keeps its controls on the title's line.** The head carries `crewlet-modal__header--subtitled`, aligns to the top, and centres the mark, the actions and the back and close controls on the title's first line. A sheet's head is a bar and keeps its centring. A `CommandPalette`'s foot has no actions, so its legend spans the foot and a consumer can end it with what the search is doing at the far edge.

**A toast's countdown fades at its leading edge.** Cut square, the draining wash read as a strip painted in two tones whenever it stood still, in a still frame or paused under the pointer; it now reads as a tint running out, in both themes.

**`AccessDeniedCard` draws as an artifact's other blocked state**: on the page, in no box, at a reading width, with the default empty state's 24px glyph, as a trashed artifact does. It was a bordered card with a 32px glyph.

**`ArtifactCard` reads its facts as one run, and its change time first.** A line's facts are one run, each after the first opened by a quiet dot ("Sheet · OPS · v12"), and the change reads time first and changer after (`labels.by`, "Updated 4m ago by Maya"); leave `owner` out where the reader owns it, and `updatedBy` where it is the owner already named, whose change then reads "Updated 4m ago" beside their name. The title, cut to one line, is offered whole on hover, and a compact card is a row in every bundle, where `Card`'s column layout used to win. The `html` kind's default label is "HTML", not "Page", which is Doclet's word; the kind id is unchanged.

**`DashboardCover` draws its figures as rows**, so each label has the card's width; three side by side cut every label to its first word. **`ArtifactPreviewGlyph`** is the preview a card draws with no cover, for a host whose cover has nothing to draw yet or at all: a cover element that rendered nothing left an empty box, since the card cannot tell it from a picture.

**`AppShell` and `Container` keep the top bar's 16px gutter on a phone.** Under the shell step the content's side padding dropped to 12px, and `Container`'s did under 480px, so a page's first line stood 4px left of the title and the controls over it. Both are 16px now, the shell's phone gutter and the top bar's own inset.

**`DocumentTitleField` is new: the field a new page's title is written in**, set as `DocumentTitle` sets the title once the page exists: no box, the title's own type, and a line at its foot that answers the pointer, focus (in the ring's colour) and a refusal (`aria-invalid`). Its name is the caller's.

**A `Document`'s heading levels each take their own step, and quotes keep the body's rhythm.** A body is drawn from h2 down, so a page's fourth and fifth levels land on h5 and h6, which were both set at h4's 16px; h5 now takes the body's step and h6 the same step in the secondary ink. A quote and a callout body keep the body's gap between paragraphs, and a list item (task items included) the smaller step, so its paragraphs still read as one item.

**`DocTabsEditor` is a list with row menus and rename in place.** A tab is a row in the outline's register: its title opens it, the open row is filled, and the handle and an actions menu (Rename, Move up, Move down, Remove) show under the pointer, on focus and on the open row. Rename (or a double press) turns the title into its field in place, where Enter or leaving keeps it and Escape puts the old title back. Add, at the list's heading, opens a field under the open tab and reports the title on Enter, so a new tab is never named after a placeholder. Titles wrap rather than being cut. Six tabs used to read as thirty controls around truncated title fields.

**A link's label can hold a picture.** The Markdown grammar reads a whole picture before the label's own brackets, so a badge that links somewhere (`[![build](badge.svg)](ci)`) draws the picture inside the link, where it was a link labelled `![build` followed by the raw text `](ci)`, and `RichEditor` writes it back as written.

**A presentation's pieces are finished for the page, full screen and a phone.**

- **`SlideStage` takes `framed`**, the slide's own hairline edge on a small radius, so a slide whose ground is the page's colour still reads as a slide. Grid cards, the comparison's sides and the presenter's slides use it. In full screen a `contain` or `view` stage letterboxes on `--color-projection-letterbox`, black in every theme.
- **`SlideNav` is new**: Previous, the position and Next at the small control step, off at the ends with the reason on the control, and a slot for the show's own controls after a rule. `tone="projection"` floats it over a slide shown full screen, in the projection's fixed colours (`--color-projection-ground`, `-ink`, `-hover`, `-rule`, new in `@crewlethq/tokens`).
- **`useIdle(ref, enabled)` is new**: whether the pointer has rested over an element, for a full screen show to put its controls and cursor away. A move, a press or focus wakes it; a key (a clicker) does not.
- **`PresenterView` shows the room's slide whole on a phone**, where it used to collapse to nothing, and as large as fits beside the side column elsewhere, drawn as the slide rather than letterboxed in a well. Its controls are `SlideNav`; the room's slide, the next one and the notes carry visible captions; the end of the deck holds the next slide's shape so nothing moves on the last slide.
- **`SlideFilmstrip` keeps the slide on the stage in view**, scrolling only itself, and takes `orientation="horizontal"` for a row under the stage on a phone (Left and Right step it). Its reorder handle takes a control's corner (`--radius-md`). The strip is its own scroller now: a host bounds its height and no longer sets `overflow`.
- **`SlideGrid` lays a phone out two to a row.**
- **`SlideCompare` names its columns** by version over the first row (over each side once they stack), and the side a version lacks reads "Not in this version". Two identical versions draw no empty list.

**Every chart says when it has nothing to draw.** `TimeSeries`, `StackedColumns`, `StackedBar` and `ActivityStrip` take `emptyLabel`, as `BarList` did, and draw that one sentence in the chart's place (`.crewlet-chart-empty`) rather than an empty grid, a scale of 0 to 4, a bare track or a window starting at the epoch. The sentence stands in the middle of the plot, at the plot's height. `ChartEmpty` is exported for a host drawing a figure's empty state itself; it takes `height` and `align` (`start` for a list, which `BarList` uses).

**`BarList` draws every bar in the first data hue.** A ranked list is one series; a hue per rank gave five rows five identities and painted the tail as the residual. A row's `color` still overrides it.

**`TimeSeries` draws below zero, a single point, and its own legend.** The scale runs from zero to the peak, and below zero when a value is, with the baseline on zero, an area filled to it, and "low" beside "peak" under the plot. A series of one point draws its point, a window of one instant draws it at the middle, and the reading draws every series' point on the crosshair. Two series or more are lines with no wash; every series is keyed by a legend of line keys the chart draws itself (`legend`, `below` by default, or `none` for a card whose title names its one series). The grid is a solid hairline. Under 18rem the range leaves the line to the window's ends.

**`StackedColumns` stands on zero.** A negative part hangs from the zero line, zero is always one of the scale's lines, and the tooltip reads values with their sign. `formatScale` writes the scale's words apart from the tooltip's. The scale's words are the sans at the caption step, as the dates are; a column is at most 24px wide; the middle date leaves a chart narrower than 22rem.

**`ActivityStrip` takes `reading`,** which makes the strip one tab stop whose cells read their time and value by pointer or by ←/→. A cell is at most 24px wide, so a strip of one day is one mark.

**`Legend` items take `shape: 'line'`** for a series drawn as a line. A chart's tooltip ends a long series name in an ellipsis before its value, which is never cut; the name used to run under the number.

**`StatCard` takes `hideLabel` and `trendPlacement`, and moves a figure before it cuts the number.** `hideLabel`, as `Meter` does, is for a tile its container names. In a tile too narrow for both, the trend figure moves under the number rather than the number being cut, and a `unit` too long to share the number's line moves under it whole; only a number too long for the tile alone ends in an ellipsis. `trendPlacement="below"` stands the figure under the number at the tile's width instead, for a quota whose bar is the reading, so a row of them keeps one shape at every width. In a `WidgetFrame` a tile reserves no empty second line, and in a frame narrower than 11rem its number steps down to `--font-size-xl` rather than being cut.

**`WidgetFrame` takes `holdTitle`, and a flush frame insets only its table's outer cells.** `holdTitle` keeps the title's two lines so the numbers of a row of frames start on one line. A narrow frame's stacked citation takes a second line before it ends, and the source's whole title is its tooltip. In a flush frame the first and last columns of a table stand on the frame's 16px; between columns a cell keeps the compact table's own inset.

**`ArrangeGroup` takes `variant="section"`**: a quiet header on the page's ground (the name at a card title's step, its count, the chevron) over a hairline in the hue, and the blocks on the page's grid with no inset, for a page being read rather than arranged. `band`, the default, is unchanged.

**`Note` spaces its paragraphs** a step apart, whatever the host's base sheet resets.

**`SheetGrid` sizes a column to its header and values.** A column that declares no width is as wide as the widest of its header and a few of its values (every live choice for a choice column, the longest values otherwise), drawn by the real header and cells in a hidden, inert row and measured, within bounds its type sets; `fitSamples`, `fittedWidth`, `SHEET_FIT_SAMPLES` and `SHEET_COLUMN_BOUNDS` in `SheetModel` are that rule. Samples are taken when the columns change and when the first rows arrive, never on an edit, and measured again once the face loads. The frozen columns hold at most 60% of the visible width, so a long title column never fills a phone. On the compact step, values are 13px under 12px sentence-case headers.

**A `fit="content"` `SheetGrid` gives way in a bounded column.** Its scroller shrinks to the room its column leaves, down to the page's `--crewlet-sheet-min-height` and never below its own rows' height, which it publishes as `--crewlet-sheet-content-height`, so a page no longer subtracts a guess of everything above and below it to compute a `max-height`.

**`SheetGrid`'s headers sit on their column's edge, and a sheet that has just opened is quiet.** Number and rating names end where their values end (the sort mark on the inner side), checkbox names centre, and each header carries its whole name as its title. The active cell's history control is a 24px target at the control radius with room of its own, so a value ends in an ellipsis before it, and it sits on the leading edge of a number or rating, so neither moves when its cell turns active. That control, the active row's actions and a single selected cell's tint show while the reader is in the grid (or hovering), not on every sheet as it opens; a range of cells stays tinted. Once scrolled sideways, the frozen edge ends on the strong hairline.

**A compact `DataTable` takes `--crewlet-data-table-row-height`**, its row's height (`--size-row-md` by default; rebind `--crewlet-data-table-cell-pad-y` with it), so a host whose list keeps another rhythm sets it rather than reaching past the table into its cells.

**Pill `Tabs` stand at the 28px tab step.** Tabs sit between the 26px controls of a toolbar or panel and the 32px actions of a page, so a row of them reads as navigation rather than as one more button: the well's inset is 1px round a 24px chip (the row was 30px), and the chip takes `--radius-chip`.

**A router-mode `Tabs` row carries its own overflow.** `trailing` is drawn inside the `nav` after the last link, so the menu a row of sections folds into ("More") or a note about every section is part of the navigation landmark; a tab list holds tabs alone and ignores it. `ref` hands over the row's root, for a consumer that measures which links fit. A tab's `count` takes a formatted string ("1.2k") as well as a number, drawn as given, and an empty string draws no count.

**The compact `Checkbox` centres its line in a form row.** One line is exactly the row's height, on the line the small inputs and selects beside it hold, and a longer label grows downwards with the box still on its first line.

**`LayersList` is new: a canvas's list of items beside it, as a design tool's layers are.** The caller holds the selection and hands it to the list and the canvas both; the picked entry takes the accent edge every current row takes, held on every entry so nothing moves when the pick does. It is one tab stop, walked with the arrows, Home and End without picking; Space or a click picks (`onSelect`) and Enter or a double-click opens (`onOpen`), which an entry's name then says. Names are cut to one line with the whole name as the tip, the entries hang into the gutter so their letters stand on the list's edge, and the list scrolls on its own under an optional `heading` (its count) that stays. The engine dashboard's design view drew this list itself; it now uses this one.

**A caller can hold a board canvas's selection.** `selected` and `onSelectedChange` (with `CanvasBoardSelection`) let a list of boards beside the canvas mark the board picked on it, and pick one there.

**A design's canvas lays its grid on the boards' plane.** `Canvas` takes `ground="grid"`: the dotted ground's dots, panned with the content and pitched by the zoom (doubling or halving to stay between one and two spacing steps on screen), as a design tool's grid is. `gridOf(view)` is that rule on its own. `CanvasBoard` draws on it; `dotted` is unchanged and still stays put under a chart.

**A board says only what it has room for.** A board drawn narrower than `BOARD_TITLE_MIN_WIDTH` (40px) goes unnamed until it is zoomed into, and a placeholder drops its lines in turn (why it is not running, then its size) rather than clipping them at both ends over the boards beside it; `boardRoom(width, height)` is that rule. A placeholder no longer repeats the board's name, which the title above it already says. A board's title row is one line of type tall, so a row of boards zoomed out loses less to the names above it, and a hidden open control leaves the row, so a narrow board's name has the width it held.

**More boards run as thumbnails.** `CANVAS_BOARD_MIN_LIVE_WIDTH` is 96px (was 160), so a design fitted on a phone or zoomed out over a dozen boards draws its pages rather than a grey box each; `CANVAS_BOARD_MAX_LIVE` still caps how many run.

**The chrome is drawn over the content.** A board's name and open control, a note's tools and the resize corners sit above every board and note. Far out, a note laid out after a board covered the board's name and took its presses.

**The open control and a note's tools are the item's.** Where a pointer can hover they show on the board or note under it, the selected one and the one holding focus; a touch screen always shows them.

**A board name that is a move handle keeps the name's type and place.** In edit mode the title was set at the page's size (the handle's `font: inherit` won) and moved off the board's edge by the handle's padding. The handle takes the control radius.

**The palette is the zoom bar's height, and moves on a narrow canvas.** `CanvasToolbar`'s tools are the small control step (26px), the toolbar and panel step every canvas control takes, with the zoom bar's shadow, where they were 30px and stood taller than the zoom bar beside them. On a canvas narrower than 36rem the palette sits in the top left corner instead of over the zoom bar.

**A canvas's hint no longer moves its zoom bar.** In a bottom corner the status note ("Double-click to use this board") is drawn above the bar, so the bar stays under a pointer on its way to it.

**`SandboxedFramePlaceholder` and `SandboxedFrameNotice` are new: the frame's own states for a host with no frame to mount yet.** The placeholder draws while the frame's ticket is minted and the notice when the engine refused one, in the same box the frame takes, so the reader meets one loading state and one way of saying a page is not here; a host that drew its own placeholder showed a second, differently shaped one that jumped when the frame took over. The frame's loading and end states share one inset (the skeleton no longer opens with an empty band or runs past the frame's bottom edge), an end state's action sits under its message, and its title drops its closing full stop, as every other callout title does. `Skeleton`'s `borderRadius` takes any CSS length, such as a radius token.

**`SandboxedFrame` says a page that loaded without a hello failed within a beat.** The runtime says hello as the page's first script runs, long before the load event, so a load with no hello ends the frame `FRAME_LOAD_GRACE_MS` (1.5s) after it; a document that never loads keeps `FRAME_HELLO_TIMEOUT_MS`. An expired ticket, a missing page and a starting node, which the artifact origin answers with an empty refusal, used to hold the placeholder for the full ten seconds. When a page hands focus back, the frame's region draws its ring inside its edge, on a layer above the frame, so a frame filling a clipping card keeps it, and forced colours mode keeps it too.

**`@crewlethq/artifact-kit` draws a sheet once the runtime's handshake is done.** `whenRuntime` and `mountSheet` wait for `crewlet.ready`, so a sheet no longer reads a page that declared `db` as one that did not; on a phone every sheet of a page lost that race. A url cell's link opens through the runtime's new `openLink`, since a frame cannot open a window, a sheet the reader cannot edit draws no sync strip, and the refusals name the collection in quotes rather than telling a reader about a capability. The presence row keeps its hue ring clear of the sheet's edge by the reach `PresenceStack` now publishes (`--crewlet-presence-stack-reach`), so a page's clipping card no longer cuts it.

**A page's sheet shows who is in that sheet, not the whole room.** The dashboard's artifact bar draws the room once; a `<crewlet-sheet>` drew the room's stack again over every sheet of a page. It now rings the cells people are on and stacks only the members whose focus is in its collection (`membersIn`), named "1 other person is in this sheet" or "N other people are in this sheet", and draws no stack when nobody else is in it. Pages pinned to an older kit keep the stack they were published with.

**`@crewlethq/artifact-kit` ships `content.css`, an opt-in stylesheet for the plain HTML an artifact page writes itself.** Linked after `kit.css` (`/_crewlet/kit/<version>/content.css`), it gives headings, running text, lists, quotes, code, tables, rules, figures, disclosures and every form control Document's prose and the medium Button, Input, Textarea and Select, from the tokens, so it follows the reader's theme. Every rule weighs only its element, so a page's own class wins; nothing the kit draws (a `<crewlet-sheet>`, any `crewlet-` class) and nothing under `data-crewlet-content="off"` is touched; and a page that does not link it, every published page included, is unchanged. Storybook: Artifact kit, Content stylesheet.

**`useMediaMatch(query)` is exported**: whether a media query matches, read during render (`useSyncExternalStore`) so the first render already has the answer, and again on every change; `false` where there is no `matchMedia`. It is the package's own copy, the one the shell and the switcher read, so an application's "is this a phone" can no longer disagree with the kit's. Keep it for the decision a stylesheet cannot make (which element to draw); a width a media query in CSS can decide belongs there.

**An end-aligned `Popover`, `Menu` or `Select` opens near the left edge.** Each asked whether its anchor had left the layer using the aligned panel's start instead of the anchor, so a panel wider than its trigger's right edge (a toolbar's last control wrapped to the left of a phone) closed on the frame it opened. They now ask of the anchor itself (`anchorGone`, from the layer's placement helpers, which `Tooltip` uses too), and the placement clamps the panel inside the window.

**`getInitials` reads past punctuation and colons.** A colon splits a handle as the other separators do (`ci:release` gives CR, where it gave one initial for two words), and the punctuation around a word is not taken for its first letter ("review (API token)" gives RA, where it gave R().

What to change:

- `ArtifactPanel` no longer takes `size="sm"`: pass `md`, the one width for a panel of text. This is the release's breaking change.
- A page that bounded a `fit="content"` `SheetGrid` with a computed `max-height` drops it, and sets `--crewlet-sheet-min-height` for the least the grid may give way to.
- `DocTabsEditorLabels` takes `heading`, `actions(title)` and `rename`, and `moveUp`, `moveDown` and `remove` are strings now, not functions of the title; `editText`, `lastTab`, `atTop`, `atBottom` and `addNeedsTitle` are gone.
- `SlideCompareLabels.missing` is a string now, not a function of the version.
- A host that drew a show's Previous, count and Next itself uses `SlideNav`.
- A host that set `overflow` on the box round a `SlideFilmstrip` bounds its height instead and drops the `overflow`.
- A `TimeSeries` caller that drew its own `Legend` beside it passes `legend="none"` or drops its own.
- A host that reached into a compact `DataTable`'s cells for its row height sets `--crewlet-data-table-row-height` instead.
- A host that drew its own placeholder before a frame was minted, or its own refusal in the frame's place, uses `SandboxedFramePlaceholder` and `SandboxedFrameNotice`.
- A host that top-aligned a subtitled `Modal` head's controls, or spanned a `CommandPalette` legend across its foot, drops its override.
- A host that drew a list of a canvas's items beside it uses `LayersList`, holding the selection with `CanvasBoard`'s `selected` and `onSelectedChange`.
- An application that start-aligned its panels on a phone to dodge the close above can align them as it wants again.
- An application with its own media query hook can use `useMediaMatch` instead.

## Changes in 0.32.0

**A canvas title fits its box.** `CanvasBoard` sets a title note in a size fitted to its box both ways (three fifths of its height, smaller when its text would run past its width; `titleSize` is that rule on its own), and the text clips at the box where an unusually wide face still overruns it. A long heading used to run past its box over the boards beside it, at every zoom.

**`SlideStage` names what it holds.** `roleDescription` replaces the screen reader's "slide" for a stage that holds something else, such as a design's board shown at its own layout ("artboard").

**`CanvasBoard` works like a design tool.** A floating palette (`CanvasToolbar`) holds Move (`V`) and Hand (`H`, or Space held), and on an editable canvas with `onNoteCreate` also Text (`T`) and Sticky (`S`), which place a note where the field is clicked, open it for typing and hand back Move. Under Move a click selects a board or a note and a click on the field clears it; a double-click hands a live board's page the pointer (a single click used to), Escape gives it back and a second Escape clears the selection. What a press will do next ("Double-click to use this board", "Press Escape to return to the canvas") is said in the canvas's status note beside the zoom bar, no longer under the board. A board's edge is a one pixel hairline at every zoom, drawn outside the page so it no longer narrows it by two pixels; hover outlines a board in the accent (hovering its name does too) and selection outlines it thicker. A selected item shows four resize corners: the bottom right takes the arrow keys as the old corner did, and the other three are a pointer's extra reach. A note is dragged by its paper, retyped on a double-click and deleted with Delete while selected. The fit goes down to `CANVAS_BOARD_MIN_ZOOM` (0.02), so a design laid out across many full size boards is shown whole rather than clipped at a quarter. `toolbar={false}` leaves the palette out; its keys still work.

What to change:

- A caller that hands a board the pointer on a single click should expect a double-click now.
- A caller with its own "add a note" controls passes `onNoteCreate(kind, at)` instead, adds the note at that canvas point and returns its id.
- A sticky's paper and a title's box no longer clip, so their tools and corners show; their text clips instead.

**`CanvasToolbar` is a canvas's tool palette.** Toggle buttons in a `Toolbar`, one pressed, each with a tip naming its key; `toolForKey` matches a press to a tool, for the surface that owns the keys.

**`Canvas` takes a pointer, a fit floor and actual size.** `cursor` (`hand`, `pointer`, `crosshair` or `text`) picks the pointer the field shows, from drawn cursors (`CURSORS` in `@crewlethq/icons/glyphs`) with keyword fallbacks, and a pan always shows the closed hand. `minZoom` lowers the floor the fit stops at (`fitView` and `zoomLimits` take it as `floor`). Shift 0 shows actual size and Shift 1 fits, on every canvas; `controlsActualSize` adds a 1:1 control to the zoom bar. Each zoom control's tip names its key (`ShortcutTip`, for any control that has one). The handle adds `zoomTo(scale)` and `worldAt(clientPoint)`. With `refitOnResize` (on in `CanvasBoard`), a resize refits a view nobody has moved since its last fit, so a window made narrower no longer cuts the content off; a view the reader has panned or zoomed is kept, as before.

**`@crewlethq/icons` draws pointer cursors.** `CURSORS` holds the pointer, hand, grabbing, crosshair and text cursors as complete CSS `cursor` values, generated from the vendored Lucide glyphs (`hand`, `hand-grab` and `text-cursor` are new, with `type`) in black over a white halo, as every platform draws its own pointer.

## Changes in 0.31.1

**`EditingStatus` folds "Editing" on an artifact bar's narrow arrangement**, below 640px, and keeps its dot, so a phone's bar keeps the room for the title while Cancel and Save are there. The words stay in the status for a screen reader.

## Changes in 0.31.0

**`ArtifactBar` carries an editing state**: a `status` slot said before the kind's tools (an `EditingStatus` while a doc is edited), never folded away, and a tool's `emphasis: 'primary'`, drawn as the primary button with its word kept at every width, for the one action the state turns on, such as Save.

## Changes in 0.30.0

**`RichEditor` edits Markdown in place, as the document it reads as.** The editable element is set by `Document`, so a page looks the same while it is edited as when it is read, and there is no separate preview. It is built on ProseMirror and loaded lazily: the component is a shell that fetches the editor's code with `import()` the first time one is drawn, so a screen that only reads pays for none of it, and `preloadRichEditor()` starts that fetch from a press that is about to open an editor.

- **Blocks**: headings, bulleted, numbered and task lists, quotes, callouts, code blocks with their language, tables, links, pictures and dividers.
- **A slash menu**: type `/` at the start of a line or after a space, filter by name, move with the arrows and choose with Enter. An application adds entries of its own (`commands`), each opening a panel it draws ("Link to a page").
- **A selection toolbar**: heading levels, bold, italic, strikethrough, inline code and a link, reached from the keyboard with Alt+F10.
- **Markdown typed as Markdown** becomes the block or the format it spells (`# `, `- `, `1. `, `[ ] `, `> `, three backticks and a language, `---`, `**bold**`, `*em*`, `~~struck~~`, `` `code` ``, `[text](address)`), and Backspace right after gives back what was typed. The shortcuts are the ones every editor shares, and Command or Control with Enter is the caller's `onSubmit`.
- **A paste of Markdown or HTML converts cleanly, under Trusted Types.** ProseMirror reads pasted HTML by assigning it to `innerHTML` behind a pass-through policy of its own, which a page enforcing `trusted-types 'none'` refuses and a page allowing it should not want. The editor takes paste and drop itself and reads HTML with a tokenizer that builds elements one by one in an inert document, keeping only the elements and attributes it has a meaning for, and copy writes Markdown as the plain text.
- **A load and a save with no edit change no byte.** Every top-level block remembers the lines it was read from and is written back as them until it is edited; a changed block is written in the spelling it was read with (its bullet, its fence, `*` or `_`), checked by reading it back. `@crewlethq/ui/RichEditorMarkdown` exports the round trip (`roundTripMarkdown`, `canonicalMarkdown`) for an application to hold its own bodies to.

**The Markdown grammar is part of the package** (`parseMarkdown`, `parseMarkdownSpans`, `markdownInline`, `safeHref`, `markdownHeadingOf`, `markdownFenceOf`, `markdownClosesFence`), so an application's renderer and `RichEditor` read a body by one grammar and cannot disagree about it. It reads what the Crewlet engine's renderer read, plus three things that renderer did not: backslash escapes (`\*` is an asterisk), an escaped pipe inside a table cell, and a link label holding an escaped bracket. It also reads **callouts** in GitHub's alert syntax, `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` and `> [!CAUTION]`.

**`Document` sets a callout and a cell aligned by `data-align`.** A renderer emits an element with `data-callout="<tone>"`, the tone's name in an element with `data-callout-label` and the blocks in one with `data-callout-body`; each tone is drawn from the same three steps `Callout` paints with.

**`EditingStatus` says a page is being edited**: "Editing", and an accent dot with "Unsaved changes" once anything differs from what was opened (or "Saving" while a save is in flight), announced politely. It sits in a page bar beside the caller's own Cancel and Save, and on a phone the words fold away behind the dot.

**`@crewlethq/icons` carries the editor's glyphs**: `heading-1`, `type`, `strikethrough`, `text-quote`, `square-code`, `unlink`, and `text-align-start`, `text-align-center` and `text-align-end`.

What to change: nothing. An application that renders Markdown itself may read it through `parseMarkdown` and `markdownInline` instead, and draws a callout by the shape above.

## Changes in 0.29.0

0.29.0 adds the chrome an open artifact sits in: one slim bar over the artifact, and one panel at its side, so a host can give the artifact the screen and open everything else on demand.

**`ArtifactBar`** is the bar, the height of a large row. At its start, the way back (`back`, a link), the kind's glyph (the artifact's own `icon` word where it has one), the title as the heading (renamed in place where `onRename` is given: Enter takes it, Escape puts it back without reaching anything under the field, leaving the field takes it, and a sentence `onRename` answers keeps the field open and says it), and the `version` slot. In its middle, the kind's views (`modes`, one segmented choice, centred while both sides have room). At its end, `presence`, the kind's tools (`kindTools`), every artifact's tools (`tools`) and More (`menu`). A tool is data, not an element (a label, a glyph, its `keys`, `pressed`, a `badge`, `disabledReason`), because the bar draws each one twice: as an icon button with its name and keys in a tooltip and as `aria-keyshortcuts`, and as a row of More. It folds by its own width, a container query: under 860px the presence stack goes (a tool's `badge` comes back in its place), under 720px a `labelled` tool keeps only its glyph, and under 640px the views and every unlabelled tool fold into More as rows with their keys, and the kind's glyph gives the title its room. Both arrangements are drawn and the stylesheet shows one. `renaming` and `onRenamingChange` start a rename from elsewhere (a Rename row); `pending` stands a placeholder in for a title still being read; `as="div"` sits it inside a host's own banner.

**`ArtifactVersionChip`** is the version on show as a quiet chip beside the title that opens a menu of versions (`items`, so the host decides which and what else the menu offers). An older version than `latest` reads `v2 of 3` in the accent, so history never passes for the present.

**`ArtifactPanel`** is a panel at the artifact's side: a complementary region named by its heading, a head with its title, optional `actions`, an expand toggle where `onExpandedChange` is given, and Close, then a body that scrolls under the head. Opening moves focus to the heading unless `focusOnOpen` is false (a panel a link opened); closing with focus inside hands focus back to whatever held it before; Escape from anywhere inside closes it, unless something inside answered the press first. Its body starts headings at level 3, so a `Section` inside it nests under the panel's title. Sizes `sm`, `md` and `lg` rest at 20, 25 and 36rem.

**`ArtifactWorkspace`** lays the artifact's body and its one panel side by side: the panel is a column where the workspace holds two useful columns (960px), slides over the body's end edge under that, and is the whole screen under 640px. `expanded` gives the panel the whole workspace, with the body kept mounted behind it. The body scrolls itself; `bodyRef`, `bodyClassName` and `bodyLabel` are for the host's own listeners, styles and region name.

**`PeopleRail` takes `variant="plain"`**: its list alone, with no border, heading or close, for a host that already frames and names it, such as an `ArtifactPanel`.

**`AppShell` reserves no scrollbar gutter on a `fill` screen.** Its main never scrolls there, so the reserved gutter was a dead strip down the screen's end edge, which an artifact drawn edge to edge showed as a band beside it.

What to change:

- Nothing for an existing host. A `fill` screen's content column is the gutter's width wider than before.

## Changes in 0.28.0

**`ArrangeGrid`** is the page grid a board's blocks stand on: equal columns (twelve unless `columns` says otherwise), the board's own gap, each `ArrangeFrame` spanning the columns it names. A frame writes `grid-column: span N`, which only a grid parent reads, so frames placed straight in an `ArrangeBoard` stacked at full width; every board now lays its blocks on this one grid rather than on a grid of its own. `ArrangeGroup`'s body is the same grid inside the group, so a block is one width on the page and in a group, and while the page is arranged the grid opens its rows a step for each block's toolbar.

**`StackedColumns` keeps its top value inside the figure.** The axis's top tick is centred on the plot's top edge, so half of it stood above the plot; with no head row it fell outside the figure, and a container that clips its content cut the highest value in half. A chart with no head now keeps that half line above its plot, and the tick's line height is the tight step it is measured at.

**`WidgetFrame` stands on the card recipe.** It drew the elevated ground at a 12px inset, so a dashboard's figures were a different object from every card beside them. It now takes the card's ground (`--color-surface-subtle`), its hairline and corner, and the card's 16px inset on every part. The title takes a second line before it gives up a word (cut at one line, a frame three columns wide named "Tokens, last 14 days" as "Tokens, last 14 da"), and the controls stand on its first line. The citation is one line, the dataset's title ending before the time leaves it; in a frame narrower than 18rem it stacks, the title over the time. A stat tile drawn `flush` as the figure takes the frame's inset rather than doubling it. New `flush` lets a table reach the frame's sides: its row rules meet the border, and its cells take the frame's inset, so the first column starts under the title.

**`Note` takes a `heading`**, set at a card title's step in the note's ink, which names the note as a region. A note on a board then reads as one of its cards rather than as a label over loose prose.

**`DataTableColumn.minWidth`** is the narrowest the fit pass shrinks a `defaultWidth` column to. For the one column that gives up room to its box but has to stay readable while it does, a title beside short held columns: the fit took every pixel the box was short down to the table's floor, and a title read "READ…". Past it the table scrolls sideways.

**`DatasetSource` says how its rows are kept current on a line of its own**, under the facts, and sets its title at the medium weight. On the line of facts the refresh wrapped under them and began with the separator, and a rail of semibold titles outweighed the figures it cites.

What to change:

- Wrap a board's page of frames in `ArrangeGrid` (inside `ArrangeBoard`) in place of a grid of your own.
- Pass `flush` to a `WidgetFrame` whose figure is a table.
- A host that relied on the frame's elevated ground or its one-line title restyles nothing: both changed for every figure.

## Changes in 0.27.1

**`useSlideKeys` answers every key with the newest handlers.** It re-added its document listener after each render, so after every step there was a gap, between the new slide's commit and the effect that re-added the listener, in which a quick second press (a clicker held down, two taps) reached the previous slide's handlers and moved to the slide already shown: the press was lost. The hook now keeps one listener for as long as it is `enabled` and reads the handlers from a ref it brings up to date as each render commits, before the browser can dispatch another event. A show whose stage stays mounted across slides, as `SlideStage fit="view"` does, met the gap on almost every quick press.

Nothing to change: handlers that close over the current slide are right as they are.

## Changes in 0.27.0

**`SlideStage` presents in the page with `fit="view"`.** A slide presented inside a page sits below a title, a description and tabs, so a stage as tall as its column ran past the foot of the window and hid the bottom of the slide and the controls under it. A `view` stage letterboxes its slide as `contain` does, in a box whose height is measured: the room from the top of the stage's parent (the show: the stage and its controls) to the foot of its scrollport, less what else the parent holds and its `scroll-margin-bottom`, or the slide's height at the stage's width if that is less. The room is measured with the scrollport at its top, so it does not change as the reader scrolls, and again whenever the view, the show or the stage is resized. A show too low on the page to get half of what it asks takes the scrollport's whole height and is scrolled into view, clear of its `scroll-margin-top`. In full screen the stage fills its box, sharing a flex column with the show's controls.

What to change:

- A show presented in the page uses `fit="view"` in place of a box sized from the window's height, and lets the show's own height follow its content.
- The show sets `scroll-margin-top` to the height of anything sticky over the view, and `scroll-margin-bottom` to the gap it keeps from the foot of the view.
- `fit="contain"` is unchanged, for a box whose height the host already decides.

## Changes in 0.26.0

**`@crewlethq/artifact-kit` binds a page's sheet to the runtime the engine serves**, `window.crewlet` contract 1.0 (the engine's `docs/reference/artifact-runtime.md`). The kit was written against a runtime the engine never served: it asked for a `data` capability the runtime calls `db`, so every page's sheet said it could not load, and it called methods the runtime does not have. The sheet now:

- asks for the `db` capability, and reads its collection's title and columns from `data.schema()`, which answers every collection;
- reads its rows through `subscribe(callback, onError)`, and says a refused subscription (`forbidden`, `not_found`, `unavailable`, `capability_not_declared`) in place of the grid rather than drawing an empty sheet;
- writes an edit with `merge`, a paste or a cleared range as one `batch().merge(...).commit()`, all or nothing, and Add row with `set` under an id the kit mints;
- deletes a row with `delete`, from SheetGrid's row actions (`onDeleteRow`), once the reader confirms it in the kit's own `ConfirmModal` (an artifact frame refuses `window.confirm`); a refused delete keeps the row and is said on its first cell;
- says on the cell both a write the engine refused (its verdict: `conflict`, `invalid`, `forbidden`, `quota`, `gone`) and one the runtime rejected with nothing decided (`rate_limited`, `unavailable`), and holds either in the sync strip until the reader dismisses it, as 0.25.0's audit made the native sheet do;
- steps Mod+Z and Mod+Shift+Z through `data.undo()` and `data.redo()`, the page's own writes, and says a step somebody overtook;
- offers every seat from `identity.people()` to a person cell, and reads presence as the room's members from `presence.roster()` and its subscription, publishing the reader's own cell as an activity and a focus.

The kit's README documents each call it makes and the capability it needs.

What to change:

- A page whose version declared `data` for its sheet declares `db`.
- A page that passes its own runtime to `mountSheet` (`runtime` in `SheetOptions`) passes one of contract 1.0's shape, as `KitRuntime` now declares it: `identity.me()` answers a `seat` where it answered an `id`, `identity.lookup` is gone in favour of `identity.people()`, a collection answers `subscribe`, `set`, `merge` and `delete` (no `schema`, `create` or `update`), a batch answers `merge`, writes resolve with `{ verdict, seq?, reason? }`, and presence answers `roster()` and a subscription to the roster's `members` rather than peers. `KitPeer`, `KitSchema` and `KitViewer.id` are gone, in favour of `KitMember`, `KitCollectionSchema` and `KitViewer.seat`.
- A page that relies on the window's own `crewlet` changes nothing beyond the capability.

## Changes in 0.25.0

0.25.0 adds the pieces the slides, dashboard, doc and sheet artifact kinds are drawn with, and the fixes from the artifact audit. Every new piece draws content the host renders itself and takes its data and callbacks as props, so nothing in it parses an artifact or knows a route.

Slides:

**`SlideStage`** lays a slide out at its authored size, 1920 by 1080 (`SLIDE_WIDTH`, `SLIDE_HEIGHT`), and scales it as a whole to its box, measured whenever the box resizes, so a thumbnail, the editor and a projector show the same line breaks. `fit="width"` is as wide as its column at 16:9; `fit="contain"` is as large as fits both ways, letterboxed, for Present; a fixed `scale` is for print. It is a group announced as a slide, named by `label`.

**`useSlideKeys`** answers the keys every presentation and every clicker sends: forward on Right, Down, Page Down, Space and Enter, back on Left, Up, Page Up and Backspace, Home and End to the ends, Escape out. It listens at the document while `enabled`, and leaves alone a field the reader is typing in, a composition, a key a nearer surface handled, and modified keys.

**`SlideFilmstrip`** is the column of thumbnails beside a deck's stage: the slide on the stage marked `aria-current`, one tab stop whose arrow keys move to the next slide, and, with `onReorder`, a handle per slide that moves it by drag or by its arrow keys and announces where it landed. A hidden slide is dimmed and says so.

**`SlideGrid`** lays every slide out by the outline's sections, numbered across the deck, each a button that opens its slide.

**`SlideCompare`** compares two versions of a deck slide by slide: each slide's older and newer drawings side by side, paired by its id, a slide one version lacks drawn as an empty side naming that version, and every change said in words beside a glyph (Changed, Added, Removed, Moved from 6 to 7), the list opening with the count of each. Unchanged slides fold away behind one control.

**`VersionCompare`** takes `versions`, a comparison the host draws in the versions lens in place of the two panes, for content compared item by item (a deck's slides, which two independent panes could not line up).

**`PresenterView`** is the presenter's own screen: the slide the room sees, the next one, the speaker notes large and on their own scroll, a timer that pauses, resumes and resets (`formatStopwatch` reads it as m:ss), and controls that stop at the ends of the deck.

Dashboards:

**`WidgetFrame`** is one figure on a dashboard, drawn inside the host's `ArrangeFrame`: its title, the figure, and the citation line every figure carries, the dataset's title (`WidgetSource.label`) then "live" or "as of" a relative time, the exact instant on hover. With `onCite` the citation is a button that opens the host's Sources rail at that dataset; `actions` holds the host's menu. `source.status` (`DatasetStatus`: `loading`, `live`, `ready`, `stale`, `refused`, `failed`) decides the body: a placeholder while loading, a marked citation when stale, and for `refused` and `failed` a calm sentence (`detail`, else the default words) IN PLACE of the figure, which is never drawn, so a host that passed rows by mistake still shows none.

**`DatasetSource`** is one entry of a Sources rail: the dataset's title, its source kind as a chip (`DatasetSourceKind`: `store`, `engine`, `file`, `calc`, drawn Datastore, Engine, File, Calculated, renamed through `labels.kinds`), its `definition`, then where its rows stand, how many there are and its `refresh` promise. With `onSelect` the summary is a toggle (`aria-pressed`) and the host's rows preview (`children`) is drawn under it when `selected`, outside the button. **`DatasetSourceList`** is the rail itself, a named list of entries. `DATASET_SOURCE_KINDS` lists the kinds.

**`downloadBlob`** saves any bytes the page holds (a chart's PNG, an archive) and answers whether the browser took them, under the name it offered; `downloadText` now saves through it, so text and binary files share one path. **`toCsv`** writes a table as RFC 4180 CSV (CRLF line ends, quoted where needed, doubled quotes) and defuses a TEXT cell that a spreadsheet would run as a formula (one starting with `=`, `+`, `-`, `@`, a tab or a carriage return) with a leading apostrophe; a number is never prefixed, so `-3` stays a value. **`elementToPng`** rasterises a drawn chart in the browser: one `<svg>` is serialised with its computed styles inlined (CSS variables resolved), anything else is cloned into an SVG `foreignObject`, and a failure rejects with **`ElementToPngError`**, whose `reason` (`unsupported`, `tainted`, `empty`) a host maps to its own words. **`serializeElement`** is the serialisation half on its own.

Docs, sheets and every kind:

**`DocCover`, `SheetCover` and `DashboardCover`** are the native gallery covers for `ArtifactCard.preview`, one module (`@crewlethq/ui/ArtifactCover`) sharing one frame: a doc's opening, rendered by the host's own Markdown renderer, set as a small page that fades at the card's edge; and a sheet's first columns and rows (at most `SHEET_COVER_COLUMNS` and `SHEET_COVER_ROWS`) as a hairline grid; and a dashboard's headline figures: up to three `stats`, each the reader's own value when the gallery holds it and otherwise its label and the title of the dataset it cites (never a placeholder number), else a schematic of the board's first widgets on its twelve columns (`layout`), else the kind's glyph. All three are decorative, as the card's preview is.

**`MergeConflicts`** settles a three-way merge of one text: each passage both edits changed shows the other side's lines (`theirs`, "version 4") beside the draft's, and the person keeps theirs, yours or both. Nothing is pre-chosen, `onApply` reports one `MergeChoice` per clash in order once each has one, and focus moves to its heading when it opens. The merge itself stays the host's.

**`ArtifactIcon`** draws the one short word an artifact's author gave it ("chart", "calendar") as a glyph, from a closed, case-insensitive vocabulary (`ARTIFACT_ICON_WORDS`, looked up by `artifactIconGlyph`), and the kind's glyph for any other word. **`ObjectHeader`** takes a `description`, the author's sentence under the title, clamped to two lines.

**`CanvasBoard` draws a design.** Artboards sit on a dotted `Canvas` at their own size with their titles above them, and titles and stickies (on `Note`'s papers) sit beside them. A board renders what the caller draws inside it only while it is on screen and at least `minLiveWidth` pixels wide, and at most `maxLive` (twelve) at once, so a canvas of sixty boards runs a dozen pages; the rest draw a titled placeholder of their size. `liveBoards` is that budget on its own, with no React in it. A live board is covered by a shield that pans like the field around it until a click hands the board the pointer, and Escape gives it back. With `editable`, a board's title moves it and its corner resizes it, by pointer or arrow keys, and notes are moved, resized, retyped and deleted; each finished gesture is reported once, in whole canvas pixels.

**`CanvasSchematic` draws a design's cover** from its boards' frames alone: every board where the canvas places it, the cover board marked and titled, notes as faint blocks.

**`Canvas` reports its view.** `onViewChange` is called with the view and the viewport's size from the first fit on, with an easing's destination rather than each step of it.

**`DocTabsEditor`** is a document's tabs as an editor arranges them: each tab's title edited at its field and held to the host's `titleProblem` there, the open tab marked (`selected`, `onSelect`), tabs moved by their handle, the arrow keys or Move up and Move down, removed (never the last), and a new tab added by its title after the open one. The host owns the tabs; every change is reported.

Fixes from the artifact audit:

- **`SheetGrid`**: a row's number carries its actions (on the active row, on hover, and Shift+F10) with Delete row through `onDeleteRow`, which the host confirms. A refusal is announced as it arrives, and the sync strip holds it as "N changes not saved" (`SheetSyncState.refused`) until the reader dismisses it through `onDismissRefused`, which calls `SheetPendingEdits.dismissAll`, so a refused write is never followed by "Saved". Text and long text edit in an overlay at least the column's width that wraps and grows to six lines. `fit="content"` sizes the grid to its rows, capped by `height` or `--crewlet-sheet-max-height`. List editors show a filter only above eight choices, and multi-select cells keep their chips on one line with a "+N" count.
- **`TagGroup`** takes `overflow="fit"`: one line, with the tags that do not fit counted in a static "+N" chip.
- **`SegmentedControl`**: `capped` draws a count as a floor ("50+"); a disabled option with `describedBy` stays focusable and says why it cannot be chosen; a pill row wraps inside its container; and a value changed from outside the row puts the tab stop back on the choice.
- **`Checkbox`** takes `size="sm"`, the label at the compact step for a dense form row.
- **`Section`** keeps its title on one line and lets the hint give way beside it. **`Meter`** draws its track with an edge on any ground, a minimum fill above zero, and moves its figure to its own line rather than cutting the label.
- **`VersionTimeline`** reads a version's kind ("Published") on the meta line, marks the version on show by fill alone, and its label action reads "Label". **`ShareDialog`**'s default title names its object in curly quotes.
- Presence hands out **`PRESENCE_HUES`**, the node hues without purple, so a collaborator is never ringed in the accent's hue. An agent whose chosen hue is purple keeps it.
- **`@crewlethq/artifact-kit`**: a page's sheet is as tall as its rows, and its sync strip offers Dismiss for refused changes.

What to change:

- A complete `SheetLabels` object of your own (rather than overrides through `labels` or `sheetLabels()`) needs the new keys `dismiss`, `notSaved`, `rowActions`, `deleteRow` and `rowActionsHelp`.
- A host that draws `SheetGrid` with `SheetPendingEdits` passes `onDismissRefused={() => edits.dismissAll()}`; without it, a refusal holds the strip at "not saved" until its cell is edited again.
- A test that finds a version's label action by the name "Name" finds it by "Label".

## Changes in 0.24.0

**The `markdown` artifact kind is now `doc`**, as the engine names it (`artifacts.KindDoc`). `ArtifactKind`, `ARTIFACT_KINDS`, `ArtifactKindGlyph` and `ArtifactCard` take `doc`, and the card's default label for it is "Doc".

What to change: pass `kind="doc"` wherever you passed `kind="markdown"`, and rename the `markdown` key of a custom `labels.kinds` to `doc`.

**`ArtifactKind` names every kind the engine ships**: `html`, `doc`, `slides`, `design`, `dashboard` and `sheet`, in the engine's order (`artifacts.Kinds`), which `ARTIFACT_KINDS` lists. Each draws its own glyph where a card has no preview (`slides` a presentation, `design` a palette, `dashboard` a dashboard layout), and its own default label ("Slides", "Design", "Dashboard"). A custom `labels.kinds` passes only the kinds it renames. `@crewlethq/icons` adds `PresentationGlyph`.

What to change: a `Record<ArtifactKind, ...>` of your own needs the three new keys.

## Changes in 0.23.0

**A text field's edge is quieter.** `Input`, the textarea, `TagsInput`, `MarkdownEditor` and the typed boxes inside `DateTimePicker` and `TimeWindowPicker` draw `--color-border-field` (new in `@crewlethq/tokens` 0.23.0): the secondary button's edge lifted only as far as 3:1 on the surfaces a field stands on, rather than the control boundary that was the brightest edge on the page. Under the pointer the edge steps up to `--color-border-control`; it used to step down to the hover hairline and fade. Checkboxes, switches and editors inside a row keep `--color-border-control`.

**A chosen chip draws the accent's soft pair.** The chip that is on in a `Tabs` chip row, and the current row of a `Switcher`, take `--color-brand-accent-soft` with a `--color-brand-accent-soft-strong` hairline, as a chosen `FilterChip` does, instead of a full-strength accent ring. A switcher row the arrows or the pointer are on keeps the listbox's own fill.

**Inside a flush card the `TreeGrid` draws no frame of its own.** The card is the frame, so the grid's border, corner and ground step aside and its rows run to the card's edges, its footer included.

What to change: nothing.

## Changes in 0.22.0

**`Menu` takes `width`** (`'content'`, the default, or `'trigger'`). `'trigger'` keeps the panel no narrower than its trigger, so a trigger that spans a column opens a menu that covers it edge to edge, and still lets it grow past the trigger when a row needs the room.

**`Menu` takes `trailingIcon`**, a glyph after a text trigger's words, such as a picker's chevron. It is drawn as the button's trailing icon, a gap away from the words, where a glyph written into `trigger` sat flush against them.

**`Menu` reads more easily.** A header's name and value share one line (`Access … Admin`), and a row's description is one type step under its label rather than two.

**`AppShell.AccountRow`'s menu covers the row.** Pressing who you are opens a menu at least as wide as the row itself.

What to change: nothing.

## Changes in 0.21.0

**`AppShell.AccountRow` takes `menu`** (`AccountRowMenu`: `label`, `header`, `items`): pressing who you are opens the reader's own menu instead of linking anywhere, which is where a reader looks for their account and for signing out. The row becomes the menu button, ending in the up-and-down chevron a menu's trigger draws, keeps the account page's current-row lift (`data-current`), and the menu's header holds the facts the row does not already say, such as the reader's access. Given, `menu` takes the place of `href`.

**`Menu` takes `header` and `renderTrigger`.** `header` is a line of facts above the items: never an item, so the arrows never stop on it, and the menu's description, so a screen reader hears it when the menu opens. `renderTrigger` makes the caller's own element the trigger, given the props it spreads (`MenuTriggerProps`), keeping every rule of the menu's button, focus coming back to it included.

**`@crewlethq/icons` vendors `log-out` and `log-in`**, for signing out and in from that menu.

What to change: nothing. Everything is new.

## Changes in 0.20.0

0.20.0 adds the review surfaces the engine dashboard drew for itself: a line diff, two versions compared, a document's comment thread, the note a lost edit race leaves, the People rail beside a shared document, and the read-only cells its tables share. Each takes its data and its callbacks as props, so nothing in it fetches or knows a route.

**`DiffView`** draws a line diff as the document it is: monospace, numbered on both sides, a row that says how many unchanged lines a gap stands for, and on every changed line a tint, a mark and the word "Added" or "Removed" read in the mark's place. **`DiffSummary`** is the line above it, `+3 −1 against version 4`, read as a sentence. The diff itself is pure and exported with them: `diffLines` (the longest common subsequence over lines, a removal above its addition, a whole replacement past `MAX_DIFF_LINES`), `diffStat`, `collapseDiff` (context either side of each change, the gap counted), `firstChangedLines` (a preview with the count of what it left out) and `splitLines`.

**`VersionCompare`** is two versions of a document compared: the changes lens draws a `DiffView` of two texts with its summary, or a comparison the host draws in `changes` (a `DiffList` of files, say), and the versions lens draws the two side by side, older first, stacking where the panes are narrow. Two identical texts are said in words, a lens with nothing to draw is not offered, and `labels` renames the lenses ("Full text").

**`CommentThread`** is a document's remarks in order, each with its author (`Principal`), when it was written and edited, and whom it answers, then a `Composer` to add one. Reply moves focus to the field, which names whom it answers. The post is one at a time and the draft is cleared only once `onSubmit` says it landed; a standing `disabledReason` is said in the open. Without `onSubmit` the thread is read-only.

**`ConflictNote`** is the refusal of a lost race, an alert that names whoever changed the record (`changedBy`) once the host knows, the server's sentence until then, with Dismiss and any controls of the host's.

**`PeopleRail`** lists everybody present in words, one entry a seat, in the order `PresenceStack` draws them, each with what they are doing and where, Follow as a toggle that names whom it follows, and a slot for the host's own controls ("Open turn"). **`peopleRailKey`** is the key `following` is compared with.

**The read-only table cells** draw one kind of value the same in every table: `TableKeyCell` (an identifier on one line, its whole value on the title, optionally a link), `TableNumberCell` (tabular, the host's formatter, absent never drawn as zero), `TableDateCell` (relative, exact on hover), `TableEntityCell` (a badge and a name, optionally a link), `TableStatusCell` (the caller's mark with its word and tone), `TableTagsCell` (capped, the rest counted in words) and `TableTextCell` (a column's decorative icon or a row's own mark). They are prefixed `Table` because `SheetGrid`'s editable cells own the bare names.

What to change: nothing. Every addition is new.

## Changes in 0.19.0

0.19.0 adds what a page needs to be arranged by its reader: blocks they move, resize and group on a board, the layout pieces they add between them, and the tray those come from. The engine console's Home is built from it.

**`useReorder` and `useReorderLists`** put items in order within one list or across several (a page and the groups on it), by drag, by keyboard and by command. The handle is a named control the arrow keys move from. Another list shows where a dragged item will land (`data-reorder-target`, with `data-reorder-line` saying whether the mark runs beside the item or across it) and the move is made on the drop. Every move is announced and glides unless the reader asked for reduced motion. `accepts` refuses a drop (a group inside a group), `moveTo` moves an item to another list by command, and `moveKey` is exported.

**`ArrangeBoard`** is the ground an arranged page stands on: a fine hatch at rest, and the page's columns as lanes while a block is carried or resized. Its hatch is the new **`--color-border-hatch` token** in `@crewlethq/tokens`, measured in every theme, and a `Note` on the board shows it through its paper. **`ArrangeFrame`** is one block on it: layout only at rest; while editing, the block is its own move handle, one accent ring is drawn over its edge on hover or focus, and its toolbar (an `actions` slot and Remove) and resize grips sit on that ring. **`useGridResize`** snaps a resize to twelve columns and 16px rows, from the corner or, for width alone, the edge, by pointer and by keyboard. **`ArrangeGroup`** is a titled band that holds blocks and folds away, its title edited in place, and **`ArrangeList`** is a list a reader orders and switches on and off.

**`Note`** is words on coloured paper, in any node hue or plain. **`Divider`** is a rule between parts of a page, with an optional label. **`PinTile`** is something a reader pinned, with the one or two facts that make opening it unnecessary. **`IconTile`** is a glyph on a hue-tinted square, what a choice in a catalog is told apart by before its name is read.

**`Modal` takes `onBack` and `backLabel`**, a step back that leads the head for a surface reached from another, and **`backdrop="clear"`**, for a sheet that edits the page beside it. **`StatGroup` takes `flush`**, for a row of figures inside another card. **`HuePicker` takes `none`**, which offers no hue first under the name you give it ("Plain") and then reports `"none"`.

**A `Card` with `asChild` holds its child's own content.** With no header slots it used to draw the child again inside its own clone: a link inside a link, a button inside a button.

What to change: nothing, unless code extends `HuePickerProps` as an interface; it is a type now, so intersect it instead. Everything else is new.

## Changes in 0.18.0

0.18.0 adds the pieces the engine dashboard's Artifacts workspace is built from: the frame an artifact runs in, its versions, who it is shared with, and the card and refusal that stand for it elsewhere; the editable sheet; and the marks that show who else is in an artifact.

**`SandboxedFrame`** embeds an artifact's document with the engine's `sandbox` and `allow` attributes set verbatim, after a second check that refuses any token the host never sets: there is no `allow-popups` at all, and `allow-same-origin` only when the artifact has an origin of its own. A hello is accepted only from the iframe's own window, carrying the nonce minted with its ticket, and per artifact from the artifact's origin; only then is one `MessagePort` transferred, in the same task, to the window that was checked. The reader's appearance travels in the URL fragment for the first paint and on the port afterwards. A document that does not announce itself is torn down (`failed`, or `navigated` when it replaced one that did), a runtime with no common bridge version is `outdated`, and each refusal reaches `onRefusal`. The frame never opens a window: an external link reaches `onOpenLink`. A port message asking for focus back moves focus to the frame's region, or to `onFocusExit`.

**`FrameProtocol`** is that wire, written once for both ends and free of React, so the engine's runtime and `@crewlethq/artifact-kit`'s `theme.js` import it: `FRAME_MESSAGE`, `frameFragment` and `parseFrameFragment`, `readFrameHello`, `negotiateBridge`, `checkFrameSandbox`, `readFrameTheme` and `applyFrameTheme`, and `externalUrl`, which admits absolute https, http and mailto links only and never one carrying a user name or password.

**`LinkInterstitial`** is the stop between an artifact's link and the open web: the host in large type (the parser's ASCII form, so a look-alike name shows as the `xn--` name it is), the whole address, a warning on plain http, and **`openExternal`**, which opens with `noopener` and `noreferrer`.

**`VersionTimeline`** lists versions newest first on the `Timeline` ledger with the one on show current, Compare as a toggle, Restore (never on the newest) and Name, glyphs and words for schema, capability and restore versions, and a line for versions past retention. **`Timeline.Item` takes `label={false}`** for an item whose content already says what it is.

**`ShareDialog`** is who can open an artifact on the engine's five-role ladder (viewer, commenter, contributor, editor, owner): a grantee search slot handed the role chosen beside it, direct shares with a role control and a remove, effective access with what it is through and no control, company access in words, and Copy link. Changes are confirmed rather than optimistic, a refusal is said on its row, no control offers owner, and a reader who cannot share sees the same audience in words with the reason. **`PrincipalPicker`** is the search the slot usually holds, grouped people, agents and teams. **`Principal`** and **`PrincipalAvatar`** draw a person, an agent or a team one way everywhere.

**`ArtifactCard`** is one real link named by the artifact's title and described by its facts, with a natively drawn preview or the kind's glyph (**`ArtifactKindGlyph`**), and a compact row. **`AccessDeniedCard`** is the refusal an artifact's place shows; "not found" says both things the engine means by it and never names an owner.

**The appearance attributes have a module of their own.** `applyTheme` and `applyDensity` take an optional root element, **`applyPalette`** is new (the default theme removes the attribute, as `system` and `normal` do), and `THEME_PREFERENCES`, `DENSITY_PREFERENCES`, `PALETTE_ID` and their guards are exported.

**`SheetGrid`** is the editable, virtualised grid of a sheet artifact, and the grid `@crewlethq/artifact-kit` draws for a page's `<crewlet-sheet>`. It is an ARIA grid with one tab stop and a spreadsheet's keys: the arrows, Enter or F2 to edit, Escape to cancel, Tab across (leaving the grid at a row's edge), Space on a checkbox, typing to start an edit with that character, Mod+C, Mod+X and Mod+V for ranges as tab-separated values, Delete to clear, Mod+Z and Mod+Shift+Z handed to the host's `onUndo` and `onRedo`, and Mod+Alt+H for a cell's history (`onShowHistory`, also a control on the active cell). Every one of the eleven column types is drawn and edited (text, long text, number, checkbox, select, multi-select, status, person, date, URL, rating); frozen columns lead and stay in view; headers sort; only the rows in view are in the document, so ten thousand rows cost what forty do. Edits reach the host as one batch through `onEdit`: the host draws the value at once and lists the field in the row's `pending` until the engine confirms it, which the grid draws as Saving (the honest instant edit, D23), and a refusal arrives in the row's `refused` and is said on the cell. A value that does not fit its column is refused on the cell before it is sent, with the reason. A remote change landing under the editor keeps it open and names the writer, with Keep yours and Use theirs. Collaborators on cells (`presence`) wear a ring in their presence hue and a name flag, cells changed since the reader looked (`changed`) wear a **`ChangeMark`**, and the focused cell's description says all of it in words. `onActiveCellChange` and `onEditingChange` hand the host the reader's own cell for its presence frames, and `sync` drives the strip that says Saved, Saving, Offline or Could not save with Retry.

**The cells stand on their own.** `CheckboxCell`, `TextCell`, `LongTextCell`, `NumberCell`, `SelectCell`, `MultiSelectCell`, `PersonCell`, `StatusCell`, `DateCell`, `UrlCell` and `RatingCell` (and `SheetCell` with a `type`) draw the same display and editors as a field in a form: a checkbox is a real checkbox, every other type a button that says its column and value and opens its editor in place.

**`SheetModel`** holds every rule the sheet is drawn from, with no React and no stylesheet, so the artifact kit and any host share it: the column, row and edit shapes, mirroring the engine's datastore schema; `normalizeValue`, `displayText`, `editText` and `parseText` for each type, with the reason a value is refused; `optionHue` and `statusTone`; the keyboard model (`moveFrom`, `rangeOf`) and the row window (`visibleRows`); `toTSV`, `parseTSV`, `planPaste` and `planClear`; **`SheetPendingEdits`**, the bookkeeping of which cells wait on the engine and which were refused, with `refusalText`; and `cellDescription`, the words a focused cell is described by.

**Presence** is drawn in the narrow presence colour exception (D22): a collaborator's node hue, on a cursor, a selection ring, a cell outline and a name flag only, always beside the name. **`PresenceStack`** is who is here, people editing first, each present badge ringed in its hue and an idle one faded, one image named "You and 3 others are here", or a button per badge with `onSelect`. **`PresenceRing`** is the inset ring in a hue, dashed when idle; **`presenceHueClass`** sets the one hue variable every presence mark reads. **`CursorFlag`** is the name on its hue, in the new `--color-presence-flag-text`. **`LiveCursor`** is a pointer and its flag at a point, fading after five seconds still and hidden after thirty, jumping rather than gliding under a reduced-motion preference. **`FollowBanner`** is the follow mode strip, which Escape ends from anywhere. Every mark is decorative to assistive technology, because the same facts are said in words. **`PresenceModel`** holds the roster order (`presenceOrder`), one entry per person (`collapseSessions`), the session hues (`assignPresenceHues`: an agent keeps its chosen hue, a person takes the first hue nobody present wears) and the words.

**`Tag` takes `hue`**, a node hue an author chose for a value (a select option's colour), drawn in the node steps; a hue is never a state, so with one the variant colours nothing.

`@crewlethq/icons` adds `share-2`, `rotate-ccw-clock` (Lucide's canonical name for the drawing it once called `history`), `upload`, `file-code`, `image`, and `mouse-pointer-2` (fillable, for the live cursor). `@crewlethq/tokens` adds `--color-presence-flag-text`, `--color-change-mark`, `--shadow-cursor`, `--z-index-presence` and `--size-sheet-row`.

What to change: nothing. Every addition is new, and `applyTheme` and `applyDensity` keep their one-argument form.

## Changes in 0.17.0

**`Avatar` takes `mark`**, a glyph on the lower-right corner that says how a principal is present rather than what it is doing: a seat's badge acting through an API token keeps its own initials and wears a key there. It sits in the notch a status uses, drawn quiet in the neutral badge's raised fill, strong hairline and secondary ink, and a `status` wins over it. **`markLabel`** is said after the name by a badge that names itself (`Miles avatar, signed in with an API token`); a decorative one says nothing. A marked badge, like one with a status, is drawn inside a `.crewlet-avatar-frame` and draws no ring. What to change: nothing.

## Changes in 0.16.0

0.16.0 adds the pieces the engine console's sign-in, Account and People & access screens were drawing on their own, so every one of them is the package's now.

**`QrCode`** draws a value as inline SVG from the `uqr` encoder: one path of run rectangles on one plate, four modules of quiet zone, error-correction level M, named by `label`, and nothing for a value too long to encode. Nothing is fetched and no markup is injected, so it works under a strict Content-Security-Policy. Its inks are the new **`color.qr.dark` and `color.qr.light` tokens** in `@crewlethq/tokens`, black and white in every palette, because a code inverted for a dark theme is one some authenticator apps cannot read. `@crewlethq/ui` now depends on `uqr` 0.1.3.

**`DownloadButton`** hands text to the reader as a file and says whether the browser took it, under the name it offered: "Downloading", and "download started: {name}" to a screen reader. **`useDownload`** is its hook, and **`downloadText`** is the same save for a control that cannot speak for itself, such as a menu item. **`safeFilename`** decides the name once: separators and invisibles become a hyphen in any script, the extension survives, and the stem is cut to 120 bytes on whole code points. `CopyButton` and `DownloadButton` share **`useOutcome`**, one state machine whose status message is keyed on the attempt, so a second identical outcome is still announced.

**`AuthLayout`** is the page a sign-in screen is drawn on, outside the application shell: a main landmark, the product's `BrandLockup` with the Crewlet mark inline, and one card named by the page's only `h1`, with its description and a body that stacks a form one field step apart.

**`ObjectHeader`, `FactLine` and `SetByLine`** are the header of an object on its page, in a peek and in a hover card: the eyebrow with its kind, glyph and key, a two-line level-two title beside the object's state and actions, and the facts as label-over-value cells on a 7.5rem track. A value gets two lines before it is cut, a `token` keeps one line across two tracks, a `set` of chips is never clamped, and a fact's note and by-line follow its own value. `SetByLine` says provenance in one wording, "set by ada · 2h ago · turn", with the turn as a link.

**`CheckboxGroup`** is several checkboxes under one legend, in the field label's register, with the group's help and error on the fieldset and an `emptyMessage` for a group with nothing to offer.

**`ConfirmField`** is the field a gesture that cannot be undone asks the reader to type a value back into: a `FormField` labelled "Type {phrase} to confirm", with spelling checks off, and **`confirmMatches`** to decide when the gesture may go ahead. Inline code inside a field label now keeps its case, so the phrase reads as the value the field accepts.

**`AppShell.AccountRow`** is the signed-in reader at the foot of the rail: their badge, name and detail as the link to their account, ending in a chevron at rest, marked current on the account page, with the row's controls beside it.

**`Avatar` takes `icon`**, a glyph drawn in place of the initials for a principal whose initials mean nothing, such as an API token or a service account. **An agent's initials skip a leading "agent" word**, which its squircle already says: Agent CEO and Agent CTO draw CE and CT rather than AC twice. The accessible name keeps the whole name. `avatarInitialsName` is exported.

**`InlineCode` takes `whole`**, for a short token that must not break across lines. **`Text` takes `variant="inherit"`**, which keeps the register of the words around it, for a mono literal inside a caption or a chip.

**A `Callout`'s title is a line of its own** above the message, rather than a bold lead-in that read as one run-on sentence with it.

What to change: a `CopyButton` refusal now holds until the next press by default, as `ClipboardOptions.failedResetMs` recommends; pass `failedResetMs` a number to give it a clock again. A callout written with a `title` that read as the start of its sentence may want its body reworded. An `AvatarStack` member or an `Avatar` handed a pre-shortened agent name can be handed the whole name. Everything else is new.

## Changes in 0.15.1

`@crewlethq/icons`: every Crewlet character is centred on its optical centre rather than its bounding box, and its face and holes are cut into its own paths rather than masked, so a slit shows the badge's plate in every hue and theme, and inside `OrgLabel` or `AddPill` no longer fills with ink. The page's fold is drawn at full detail only, as the keyline is. What to change: nothing.

## Changes in 0.15.0

0.15.0 gives the rail's foot a row that opens a panel, which is what the engine console's engine panel is built from. It also keeps an unread failure on screen, lets the column chart fill a stretched card, and wraps its legend on a narrow one.

**`AppShell.RailRow` opens a panel.** It hands its element to `ref`, and a row with `onClick` passes `aria-expanded`, `aria-haspopup` and `aria-controls` through to its button, so it is the trigger of a `Popover` or a `Menu` as it is. A row that opens something ends in an upward chevron, and keeps the hover's lift while its panel is open, drawn from `aria-expanded`. A row nothing presses refuses all three in its type, as it refuses `label`.

**`AppShell.RailRow` takes a `count`**: `{ value, label, mark?, tone? }` (`RailRowCount`), drawn after the words as a count in the nav is, and read as the end of the row's name ("Engine serving, 5 alarms"). `tone: 'warning'` draws the figure and its mark in the warning ink, which `@crewlethq/tokens` now holds to 4.5:1 on the rail and under the hover overlay in every theme.

**A control in the rail's foot is a row of the rail's own grammar.** A `RailRow` with `onClick` and no `detail`, and a control dropped into the foot, stand on the nav row's 30px step with its glyph gap, its compact medium words and its secondary ink, and the row's mark takes a nav glyph's 14px width, so its words start where the nav's words start. A row the rail only states keeps the status line's caption, and a row with a `detail` keeps the status block.

**`DescriptionList` takes `fit`**: the term column is as wide as its longest term, and the pairs stay side by side at every width, for a panel of its own width such as a popover.

**A `Stack` or an `Inline` drawn as a list** (`as="ul"` or `as="ol"`) takes back the browser's list margins, indent and markers, and stays a list to a screen reader.

**A `Popover` its own content closes hands focus back to its trigger**, as Escape does, when focus was inside the panel: the control that closed it goes with the panel, and focus used to fall to the page's body. A close while focus is elsewhere leaves it there.

**A panel opened from the open drawer is drawn above it.** A `LayerHost`'s target takes no z-index of its own any more, so every surface in it stacks by its own step in the layer band. It used to be a stacking context at the bottom of the band, which held everything inside it under the shell's open drawer: a popover or a dialog opened from the drawer, below the shell breakpoint, was drawn under the drawer.

**A sticky toast is never evicted.** `ToastProvider` kept its newest `max` toasts whatever they were, so the next one took away a failure nobody had read. Over `max`, the oldest toast that would have gone by itself goes now. A failure, a warning, a variant of your own that names no duration and any toast given `duration: 0` stay until they are dismissed, and when every toast held is sticky none goes: the stack holds more than `max` until the reader dismisses some, and the new toast is drawn too. A failure that can be raised again and again takes an `id`, so each repeat replaces its own strip.

**`StackedColumns` takes `height="fill"`.** In a card that a taller neighbour stretches, the chart grows into the spare height and spends all of it on the plot, so nothing opens between the dates and what stands under them. The figure flexes, its rows are `auto` / `minmax(minHeight, 1fr)` / `auto`, and the axis and the plot stand at the whole of the plot's row. `minHeight` is the plot's least height, 11.5rem by default, and its height wherever nothing stretches it. `StackedColumnsHeight` and `StackedColumnsLegend` are exported.

**A `StackedColumns` legend in the head wraps.** On a card too narrow for the heading and the legend side by side, the legend takes a row of its own under the heading, still flushed to the end, rather than standing beside the title as a column of one series a line. Where both fit, nothing moves.

What to change: a screen that leaned on `max` to clear old failures now keeps them until they are dismissed; give a repeated failure an `id`, and take one back with `useToast().dismiss(id)` once its condition clears. A test that reads a foot control's caption ink, its regular weight or its 34px height reads the nav row's. Everything else is new.

## Changes in 0.14.0

0.14.0 draws toasts as the first release did and quiets the pickers.

**Toasts are the first release's strip again**: a dark strip on `--color-surface-background` with the large shadow and the rim light, a 12px corner, a 20px mark, a slide in from the right, and the countdown as a wash behind the words that drains from the right. A variant spends its hue on its mark (the feedback ink step) and its wash (the feedback soft step) only, so a failure is a rose mark on a faint rose wash with a rose action, never red words on a red edge. Reduced motion keeps the strip still and draws no wash.

**A picker's boundary is a button's.** `Select`, `DateTimePicker` and `TimeWindowPicker` draw their trigger on `--color-border-strong`, as the secondary button does, and step to `--color-border-strong-hover` under the pointer. Text boxes and the typed boxes inside the pickers' panels draw `--color-border-field` (see 0.23.0); checkboxes and switches keep `--color-border-control` at 3:1.

**A `Select` list that leads with marks ends its rows with the tick**, so a swatch, an avatar or a glyph starts at the panel's edge. A list of words keeps the tick's column first.

**`--crewlet-select-menu-max-height` is the list's height.** The shared listbox cap of min(360px, 60vh) no longer overrides a taller panel; the panel keeps the 60vh cap on the window.

`@crewlethq/tokens`: Origin's dark `--color-border-default` is #2e2e30, and the comfortable density is 1.16 (it was 1.14), a shade larger at every gap, pad, row and control.

What to change: a test that reads a failure toast's red edge or red words, or a picker's control boundary, reads the new ones. Everything else is unchanged.

## Changes in 0.13.0

0.13.0 adds the parts the engine console's themes, project switcher, inbox and knowledge base are built with, and calls the light and dark choice Mode.

**`ThemeSwatch`** draws a theme from its registry entry in `@crewlethq/tokens` (its `swatch`): `size="chip"` is a mark beside a name, `"card"` a picker's thumbnail and `"pane"` a preview large enough to read as a screen. Both palettes are drawn by default, dark beside light, and `mode` draws one. It is decoration unless given a `label`.

**`ThemeGallery`** is the choice of a theme: every theme as a card under its group, in one radio group whose arrows choose as they move. The chosen card is its own border in the accent. `onPreview` is told the card the pointer comes to rest on, and `null` when it leaves, for a pane beside the gallery. It reads `themeRegistry` and `themeGroups` by default; `themes`, `groups` and `columns` adapt it.

**`Select` options take `leading` and `hint`.** `leading` is drawn before the label, in the list and on the trigger while the option is chosen; `hint` is a quieter word at the end of the label's line. `onHighlight` is told where the highlight comes to rest: at once for a key, once the pointer has rested on a row for `HIGHLIGHT_REST_MS` (120 ms), and `null` when the list closes or the pointer leaves it.

**`CommandPalette` takes a `step`.** `{ label, onBack, startAt? }` draws a chip naming the step at the field's start, and the chip, Escape and Backspace in an empty field go back rather than closing. The step opens on the row `startAt` names (the choice in effect), or on its first row, and going back puts the highlight on the row that led in. A row whose `onSelect` returns `false` keeps the surface open, which is how a row leads into a step. `onHighlight` reports the resting highlight with the same timing as `Select`'s.

**`SegmentedControl` takes `fill`**: the row fills the width it is given and every option takes an equal share, so rows stacked in one panel draw one box. `ThemeSwitcher` and `DensitySwitcher` pass it through.

**`useHighlightRest`** is the timing `Select` and `CommandPalette` share, for a list of your own that previews its highlight.

**The light and dark choice is called Mode.** `ThemeSwitcher`'s row is named "Mode", and `ThemeToggle` says "Switch to light mode" and "Switch to dark mode": "Theme" now names the palette. Code keeps `data-theme`.

**Labels on the danger fill and the scrim read their own tokens.** `ImageUpload`'s remove button and a danger toast's action read `--color-text-on-danger`, and the upload scrim, its spinner and a seeded `Avatar` read `--color-text-on-scrim`, so they stay white on a theme whose accent carries a dark label.

**`Switcher`** is a page's subject drawn as a button, and the panel that switches it: a search band, a list that scrolls, and a footer that does not. It opens under its button, centred when it has none (a panel opened by a key), and as a sheet from the bottom edge below 640px. Focus stays in the field while the arrows walk `pinned`, a `message`'s actions, `groups` and `footer` as one listbox. A row with an `href` is a link, so a middle click, a Command click and Command+Enter open it in a new tab; a `held` row keeps its reason and is passed over, and a `keepsOpen` row (Try again) is taken without closing the panel. `loading`, `note` and `announcement` cover the rest, and the caller searches and ranks.

**`Breadcrumb`** moves into the kit from the engine dashboard: ancestors that lead back out, the page's own `h1` last, a floor measured from what the trail holds, and a tab stop only while it overflows. `current` draws a control, such as a `Switcher`, as the heading's words. Below 640px an ancestor with a glyph is drawn as its glyph alone, its word kept for a screen reader.

**`KeyChip`** draws a project's key as the small mono chip, with a search's letters in bold (`highlight`). `SidebarNav` now draws an item's `lead` with it.

**`Tabs` take `variant="chip"`**: compact chips whose selected one is outlined by its own accent hairline, with no fill and no underline, for an object's lenses beside its name.

**`Popover`** takes `alignOffset` (a shift along the anchor, or a function that measures one), `sideOffset` (its distance from the anchor) and `initialFocus`.

**`Modal` takes `placement="bottom"`**: a dialog pinned to the bottom edge at the window's width, rounded on its top corners, rising from that edge.

**`InboxList`** is an inbox's column: `InboxGroup` labels a run of rows, and each `InboxRow` is one control (a button, or a link with `href`) naming who it is from, a `qualifier` and a `meta` time, with its words in up to three lines and an `excerpt` in the quiet ink. `aside` sits under the control as a control of its own, for the task the row is about. `selected` takes the neutral pressed fill and `aria-current`; `unread`, `actionable` and `done` set the ink, and `unread` and `done` are read out. `InboxMore` and `InboxToggle` are the quiet toggles at the end of the list.

**`ChoiceButtons`** sends one answer with one press: a group of buttons as tall as a touch target, the `recommended` option first, filled and marked. `pending` and `disabledReason` hold every option still without taking its focus.

**`ReadingPane`** reads one item in a single column named by its title: `ReadingPaneByline`, `ReadingPaneTitle`, `ReadingPaneLead`, `ReadingPaneQuote` (`verbatim` for a machine's words), `ReadingPaneReasoning`, `ReadingPaneOutcome` (a status line) and `ReadingPaneSection`.

**`Link`** adds `variant="quiet"`, a reference among other words in `--color-text-link-quiet` that never underlines and steps up to the accent ink on hover, and `size="inherit"`.

**`Document`** sets rendered markdown as a document: headings, paragraphs, lists and task lists, quotes, code, tables, rules, links and images, every size a step on the type ramp. It styles the plain elements a renderer emits rather than parsing anything itself, so the application keeps its own parser and its own rules about what a body may contain. A task item is recognised by the checkbox it starts with and a wide table by the element it scrolls in; that element takes `tabIndex={0}`, a `region` role and a name. `size="sm"` sets it for a comment or a side pane, and `DocumentTitle` is the page's title above it.

**`Outline`** is "On this page": the headings of the document beside it, as buttons rather than anchors, because a hash router keeps its own route in the fragment. The entry for the section in view takes the accent edge and `aria-current="location"`. `useActiveHeading(ids, { root, offset })` says which heading that is, measured on a frame, and the last one once the scroller can go no further; `scrollToHeading(id)` brings a heading into view and moves focus to it.

**`MarkdownEditor`** writes markdown: a formatting bar that writes it at the caret (headings, bold, italic, code, the three lists and a table), the source in a monospace field, and Write and Preview as a tab list whose panel is the field or the preview. Every control is a toggle, Command or Control with B and I are bold and italic, and with Enter the caller's `onSubmit`. `renderPreview` draws the preview with the application's renderer, `actions` adds the caller's own controls to the bar (they are handed the editor, so a "Link a page" picker inserts at the caret) and `footer` holds a count. The rules are pure functions a caller can use alone: `formatMarkdown`, `insertMarkdown` and `markdownWords`.

**`Highlight`** marks the words a search matched in a line of text, in `mark` elements on a ground behind the text's own ink. `highlightTerms(query)` turns a query into its terms and `highlightRanges(text, terms)` says where they start a word, never inside one.

**`TreeGrid` reads a hierarchy one level at a time.** `defaultExpanded="none"` opens no row until somebody opens it, so a level that has just been read arrives closed and asks for nothing on its own; `expanded` and `onExpandedChange` let the caller hold the open rows, to keep them across a visit or to read a level the moment it opens. `useTreeState` takes the same options (`TreeStateOptions`, `TreeDefaultExpanded`). `headless` keeps the column names for a screen reader and draws no header band, for an outline whose cells say what they are. A text field in a cell keeps the keys that move its caret (Left, Right, Home and End, and Up and Down in a field of several lines), so a name typed in place can be corrected; from a single line, Up and Down still walk the rows.

`@crewlethq/icons` adds `Heading2Glyph`, `Heading3Glyph`, `BoldGlyph`, `ItalicGlyph`, `ListOrderedGlyph` and `ListChecksGlyph`, which `MarkdownEditor` draws, and `PaletteGlyph` (Lucide's `palette`).

What to change: a test or a query that finds the theme row by the name "Theme", or the toggle by "Switch to the light theme" or "Switch to the dark theme", uses the new names. A `CommandPalette` row whose `onSelect` returns `false` by accident now keeps the surface open; return nothing to close it. A `TreeGrid` given none of the new props opens every row as it did. Everything else is new.

## Changes in 0.12.0

0.12.0 adds the parts a question is answered in place with.

**`ChoiceList`** draws one answer from a short list in one bordered box: each choice a native radio with its label, a line of `detail` under it and an optional `tag` at its end ("Recommended"). The whole row selects, the arrow keys move between choices, and the selected row takes the accent's soft fill. A choice marked `separated` is set apart by a dashed rule, and its `panel` is drawn under it only while it is selected, which is how a list ends in "Something else" with a field of its own. `footer` holds the list's Cancel and Submit.

**`Composer`** is a message written in place: a borderless field that grows with its text and a footer strip with the send shortcut, a counter and `actions`, in one box that takes the focus ring as a whole. `onSubmit` runs on Command+Enter (Control+Enter elsewhere) and adds the shortcut's hint; the counter appears from four fifths of `maxLength` (`COMPOSER_COUNTER_AT`).

What to change: nothing. Every addition is new.

## Changes in 0.11.0

0.11.0 adds the parts a dense editing form is built from.

**`FactList`** draws facts a form shows and does not edit as 32px rows in one bordered box: the label on the left, the value on the right. A row with a `reason` carries a lock and says why in a tooltip on hover and to a screen reader after its value, in place of a caption under every value.

**`AvatarPicker`** is an agent's badge that opens its own picker. Pressing it opens the characters and the hues in a popover, and each choice applies as it is made; a `disabled` one is the badge alone. It replaces a `CharacterPicker` and a `HuePicker` drawn open in a form.

**`Tabs` take a `marker`** per item: `{ tone: 'danger', count, label }` for problems, or `{ tone: 'warning' | 'changed', label }` for a 6px dot. One per tab, the most urgent, and it stands in for the item's `count` while set; `label` is what a screen reader hears. `TabsMarker` is its type.

**`FormField` takes `helperOnFocus`**: the helper is still in `aria-describedby`, and is drawn only while the field has focus, so a form whose every field carries a sentence reads as labels and values at rest. `ListInput` passes the same prop to its field.

`@crewlethq/icons` adds `LockGlyph` (Lucide's `lock`), which `FactList` draws.

What to change: nothing. Every addition is new.

## Breaking changes in 0.10.0

0.10.0 moves an agent's state off the ring round its badge and onto a small badge on its corner.

**A state is a status, never a ring.** `Avatar` takes `status`: `working`, `needs` (waiting on a person) or `stopped`, and none for idle. It draws a round badge on the lower-right corner, the state's fill carrying a glyph whose shape says it (play, a question mark, a square) in `--color-text-inverse`, which the tokens' palette suite now holds at 3:1 on each fill (`MARK_ON_FILL`). The badge sits in a notch cut out of the face with a mask, so it reads on any ground without knowing its colour. A badge with a status is drawn inside a `.crewlet-avatar-frame` of the face's own size, which takes your `className` and `style`; a badge that names itself appends the state to its accessible name (`Software Engineer avatar, stopped`), and a decorative one says nothing, so say the state in words beside it. `AVATAR_STATUSES` and `AVATAR_STATUS_LABELS` list the statuses and their words. A ring of a state's hue round a plate in the agent's own hue put two colours on one small mark, and framed what the agent was doing louder than who it is.

| Was | Is |
|---|---|
| `<Avatar ring="info">`, `ring="warning"`, `ring="danger"` for what a seat is doing | `status="working"`, `status="needs"`, `status="stopped"` |
| `<Avatar ring="success">` | no status; say a finished state in words beside the badge |
| `AvatarRing` naming `info`, `warning`, `danger` or `success` | `AvatarRing` is `'brand'` alone, the selected ring; a state is an `AvatarStatus` |
| an `AvatarStack` member's `ring` | nothing: each member overlaps the one before it, so a corner badge would be hidden; say what the members are doing beside the stack |
| a stylesheet of your own reading `.crewlet-avatar--ring-info`, `-warning`, `-danger` or `-success` | `.crewlet-avatar__status--working`, `--needs` or `--stopped` |
| a `ring="brand"` and a `status` on one badge | the status alone; the notch is cut from the outline the ring would follow, so a badge with a status draws no ring |

## Changes in 0.9.0

0.9.0 gives an agent a face of its own: one of the thirty Crewlet characters in `@crewlethq/icons/characters`, drawn in one of the six node hues an operator chooses for it.

**An agent's badge can be its character.** `Avatar` takes `character` and `hue`. An agent badge with a `character` draws that character, centred, on a plate of its hue (the hue's `-fill`, its `-line` round the badge and the hue itself as the ink), in place of its initials and of any image. A badge of `AVATAR_CHARACTER_FULL_DETAIL` (56px) and up draws the character's keyline and visor gap; a smaller one draws it compact, where a hairline would be a blur. A `human` badge ignores both and keeps its circle and initials, and what any badge says to a screen reader is unchanged. An `AvatarStack` member takes the same two fields, for a stack of agents drawn as themselves. What to change: nothing; a badge with neither prop draws as it did.

**The node hues are one exported set.** `NODE_HUES`, `NODE_HUE_NAMES`, `isNodeHue` and the `NodeHue` type name the six hues an entity is told apart by, where somebody chose one. `TreeCardTone` (and so `OrgTableTone`) is now `NodeHue`, so an agent's card, row and badge are drawn from one list. What to change: nothing; the six names are the same.

**Two pickers choose them.** `CharacterPicker` is a radio group of every character, laid out in rows of six (`CHARACTER_PICKER_COLUMNS`), each drawn as the badge it would make in the agent's hue; Left and Right walk the characters, Up and Down move a whole row, and the chosen badge carries the kit's selected ring. `HuePicker` is a `SegmentedControl` radio row of the six hues, each a swatch and the hue's name. Both take `disabled`, which keeps the choice shown and lets nothing in the group take focus or a press. Wrap either in `FormField as="fieldset"` for a labelled field.

## Changes in 0.7.0

0.7.0 draws the org surfaces (`TreeCanvas`'s `node` appearance, `OrgTable`,
`OrgLabel`, `OrgNode` and `AddPill`) at the console org chart's own
proportions, and holds every box in the kit to ONE line: no card, field, chip
or control draws a second border or a second ring beside its own. A paragraph
whose change needs an edit ends in a **What to change** table, `Was` on the
left and `Is` on the right.

**A focused control shows ONE ring, and it lies on the control's own edge.**
Every bordered control drew its focus ring 2px outside its border, which is
two edges with a gap between them. That was the secondary, danger and outline
buttons and a pressed toggle; the secondary, soft brand and ghost brand icon
buttons; a filter chip, a search trigger, an interactive or pricing card, a
focused popover, the new items pill and a page size chip; the skip link, an
image's remove badge, a tag, a pill chip and a card option; and the date and
time window triggers, which recoloured their border as well, with the time
window's typed boxes drawing `--shadow-focus` on top of that. Each now rings
OVER its boundary, the rule the field register already kept. A box takes
`--size-focus-ring-inset-offset`, which covers a 1px border and one pixel
inside it. A boxed FIELD (`Input`, `Textarea`, `Select` and its search box,
`TagsInput`, and the date and time window boxes) goes further and rings at
one pixel, laid exactly on its own hairline with `outline-offset: -1px`: the
boundary drawn in the focus colour, which is how the console's fields say
focus, where two pixels was a heavy band round every box a caret landed in. A tag and its remove control take `-1px`, so a pressed tag's ink
line stays visible inside the ring. A checkbox, a switch, a pill chip and a
split tag's press half ring flush at `0`, because each is too small to ring
inside itself or stops where the edge it rings on begins. A control that draws
no edge (a filled or ghost button, a ghost icon button, a link, a borderless
tab, a filled toast action) keeps the outset ring, because there the ring is
the only line and an inset one on the accent fill would be drawn in nearly the
fill's own colour. No stylesheet in the package draws `--shadow-focus` any
more, and `apps/ui-tests` lists every ring that still stands off its element,
with the reason it may. What to change: nothing in a call site. A stylesheet of
your own that set one of these rings' `outline-offset`, or recoloured the
border under it, now competes with the new rule; set the offset on the same
selector, or leave the ring to the component.

**No card draws two lines.** A toned `TreeCanvas` card drew a halo ring 3px
outside its boundary, the ghost of a node being composed breathed a second ring
in the same place, and a selected node drew an accent ring inside its card's
boundary: each was two parallel lines round one box. A toned card is now its
fill and its boundary in the hue, and the ghost's own dashed boundary is what
breathes. Where a card's own node (its direct child treeitem) is selected, the
card's boundary takes the accent; where it has focus, the ring is drawn on the
card, over that boundary, so it also holds whatever the card carries under the
node (a unit's lead), which a ring on the treeitem stopped short of. A row
deeper inside a card keeps its ring inside it.

| Was | Is |
|---|---|
| `--crewlet-tree-canvas-card-halo` in a stylesheet of your own | removed: nothing draws a halo |
| a rule on `.crewlet-tree-canvas__card [role='treeitem'][aria-selected='true']` for a card's own node | the same rule on `.crewlet-tree-canvas__card:has(> [role='treeitem'][aria-selected='true'])` |

**A unit's lead is a ground, not a frame.** `OrgNodeLead` drew its pill with a
hairline 4px inside the node's own frame and ruled a line across the top of
its strip, so a unit's node was a box drawn twice. A set lead is raised on
`--color-surface-elevated` with no boundary, and the strip draws no rule. An
empty one stays an empty slot, with no ground, a dashed edge in the hover step
and the word in the tertiary ink, because the dash is what says a place is
waiting rather than a frame round a value. The control inside the pill now
fills it through whatever wraps it (a `Menu`'s anchor), and the whole pill
takes the hover step while it is pointed at or its menu is open, where the
control's own hover was a patch the size of its word.

**A chart can lay its field with dots.** `Canvas` and `TreeCanvas` take
`ground="dotted"`: a grid of dots in the strong hairline's ink, one spacing
step apart, drawn on the frame so they stay put while the content moves over
them. It says the field pans before anybody drags it. `plain`, the default, is
unchanged.

| Was | Is |
|---|---|
| a stylesheet of your own laying a `radial-gradient` on `.crewlet-canvas` | `ground="dotted"` |

**A row of choices can be separate chips.** `SegmentedControl` takes
`layout="chips"`: a row of separate chips that wraps, each on the raised
ground a chip with no edge of its own takes, the chosen one filled with the
accent, for a setting with more choices than a well holds on one line (the
console's row of unit types). `trailing` draws what completes the last choice
in the row after the options and outside the arrow keys, such as the box a
Custom chip asks for. `pill`, the default, is unchanged.

**A person's seat can be drawn the way the console chart draws it.**
`OrgLabel` (and `OrgNodeLabel`) take `iconRing` beside `icon`: a dashed ring
the size of the large zone round the glyph, on a chart node. A table row draws
the glyph alone. The `avatar` form is unchanged and never takes the ring, so a
badge keeps its outline as its one cue.

**The add control is the console's size.** `AddPill`'s mark is the console's
add-circle, with no second ring round the disc under it. A row's pill is 18px
tall (it was the row's whole control step, a second row of buttons inside the
row), its mark 18px and its choices' glyphs 10px, and each choice is hit at
the control step by an overhang whose tint is clipped to the pill, as the
branch's choices already were.

**An org table's trunk is one line.** `OrgTable` stretches each row's first
cell to the row's full height, so the trunk's segments meet across rows (they
stopped short of both edges of every row and read as one dash per row), covers
the rule between rows, and ends at the last row's branch instead of running on
to the table's edge. The trunk and the wire arriving at a neutral row are both
the strong hairline step.

**A key inside a chord takes no box of its own.** `Kbd` with `keys` draws a
chord as one cap, and each key inside it now states its whole box (no padding,
ground, border or radius). An application rule drawing every bare `kbd` as a
cap used to reach each key inside the chord and frame it inside the chord's
own frame.

## Breaking changes in 0.5.0

0.5.0 draws the kit in the approved visual system: Geist, a violet accent that
is the primary action, the four state hues and four chart series fitted to the
palette suite's floors, Lucide stroke glyphs, and the application shell floated
on a sheet. `@crewlethq/tokens` and `@crewlethq/icons` move with it, and each
of their READMEs carries its own "Breaking changes in 0.5.0" for the tokens and
the glyphs; upgrade the three packages together, as always. Below, every change
a consumer can see is explained where it happens, and each paragraph whose
change needs an edit ends in a **What to change** table, `Was` on the left and
`Is` on the right. A paragraph with no table needs no edit.

**The primary action is the violet accent, and it darkens as it is used.**
`@crewlethq/tokens` makes the accent a per-palette violet (`#7c56ff` in dark,
`#6b45f0` in light) and removes the monochrome `--color-brand-primary` family
and `--color-text-on-brand`. `Button`'s `primary` and `accent` variants already
painted the accent, so they change colour and nothing else: the fill is the
new violet, the label is white in both palettes, and hover and press each step
DARKER rather than brighter, because a brighter fill is a step toward a white
label (the approved design's brightening hover measured 4.18:1). The focus
ring every component draws follows the accent too.

**The rail's current row is raised, and the attention count is the accent.**
`SidebarNav` drew the row the reader is on in the accent's soft tint with the
accent ink. With the accent spent on the primary action that would read as a
second primary on every screen, so the current row now stands on
`--color-surface-elevated` with a `--color-border-default` hairline drawn
round it inside the row, in the primary ink. The hairline is an
OUTLINE rather than an inset shadow, so it survives forced-colors mode, which
drops shadows and backgrounds; a focused current row draws the focus ring in
its place. A `NavItem`'s `badge` (it was `badgeTone="attention"`, see the
rail's rows below) is the one hue in the chrome, and it is now the accent's
fill with the on-accent label rather than the warning tint and ink: a count of what is waiting on the reader asks them
to act, which is what the accent means, and warning is kept for state. The
indent guide beside a nested run steps up to `--color-border-strong` on the
reader's path rather than taking the accent.

**A resting rail row is the secondary ink again.** 0.4 drew every row at
`--color-text-primary` and its glyph on the decoration step. A row at rest now
takes `--color-text-secondary`, as the approved design draws it, and a hovered
row and the current one lift to `--color-text-primary`, so the step between
them says which row is which before the fill does. The glyph has no colour of
its own any more: it is drawn in the row's ink on every row, where it used to
be `--color-text-muted` until the row was hovered or current. Nothing in the
API changes; a stylesheet of your own that set `.crewlet-nav-item__icon svg`'s
colour to match the old ramp can drop the rule.

| Was | Is |
|---|---|
| `--color-brand-primary`, `-hover`, `-active` in a stylesheet of your own | `--color-brand-accent`, `-hover`, `-active` |
| `--color-text-on-brand` | `--color-text-on-accent` |
| an accent override declared on `:root` or `body` alone | the same values under the three theme selectors, as above |
| a stylesheet tinting `.crewlet-nav-item__row[aria-current='page']` with the accent | drop it: the row is raised with a hairline, and the hairline is its `outline` |
| a stylesheet relying on `.crewlet-nav-item__badge--attention` being the warning tint | `.crewlet-nav-item__badge`, which is `--color-brand-accent` with `--color-text-on-accent` |

**The chart ramp is four series, and a meter's ordinary reading is the first of
them.** `@crewlethq/tokens` fits the state and chart hues to the approved design
(info is working, warning needs a person, danger is stopped, success is done)
and removes `--color-data-5`. `DATA_COLORS` has four entries and `dataColor(4)`
is `DATA_COLOR_OTHER`, the residual, so every chart that colours by index
(`BarList`, `Legend`, `StackedBar`, `TimeSeries`) draws its fifth series and
beyond as "the rest". A series hue is legal only inside a figure that names it:
a legend for two series or more, the label for one. That is what a `Meter` is,
so its ordinary reading, the tone that is not a state, is `quantity`, painted in
`--color-data-1`: the accent it used to take means "act here", and a bar is not
something to act on. The three state tones and `neutral` are unchanged. The
track is the raised rung, `--color-surface-elevated`, rather than the inset
well: the palette suite measures a fill as a mark on the opaque rungs, and on
the well the light warning and success fills measured 2.84:1 and 2.86:1. So a
meter is drawn on a card, which is where the design puts every one: the palette
holds raised a visible step above the card, and on the raised rung itself an
opaque track has no edge, so the unfilled remainder, and with it the extent of
the bar, would disappear. Do not draw a meter on a raised surface.

**A chart can be read mark by mark, by pointer and by keyboard, and
`StackedColumns` is new.** `TimeSeries` stands a crosshair on the nearest
instant under the pointer and reads every series there in a tooltip;
`StackedColumns` reads a column's every part and its total; `StackedBar` reads
the part under the pointer with its value, its share and the whole, and gains
an optional `format` for those values and its default sentence, which is now
also the bar's accessible name. `BarList` takes no reading, because every row
already prints its value beside its bar. Each plot is one
tab stop, `←`/`→` walk its marks (`Home` and `End` jump to the ends, and the
first `←` opens on the newest), and `Escape` closes the reading, stopping there
only when it closed one, so a chart inside a `Modal` does not close the modal.
The tooltip is the live region, so a screen reader hears each reading, and its
words are text tokens only: a series' hue is its swatch, never the colour of a
word. Its ground is `--color-surface-glass` frosted by `--blur-sm`, not the
card: it stands over the marks beside the one it reads, and the card, a 5%
wash in the marketing palette, let every data hue through it, where the glass
keeps every word over 4.5:1 on each of them. It is placed by a React style
property (`left`) and never by a style element, so it works under a strict
Content-Security-Policy. `ChartTooltip` and
`useChartHover` are exported for a figure of your own.

`StackedColumns` takes `series` (`{ id, name, color? }`, stacked first at the
baseline) and `buckets` (`{ t, values }`, `values` keyed by series id). A
series' colour is its place in `series`, and a filter is `hidden` (ids), never
a shorter list, so hiding one series never repaints the others. It draws its
OWN legend, from `series` in the same colours with the hidden ones left out,
because a stacked figure is never drawn without one and a `Legend` written
beside it by hand was a second copy of the series to keep in step. `legend`
says where: `below` (the default) under the dates, `head` at the end of the
chart's head row, top right, as the design's Spend card draws it, beside the
title and sentence passed as `head`; or `none`, for a screen that names the
series itself. The
scale is round (`niceScale`: about four steps of 1, 2, 2.5 or 5), the parts of a
column stand 2px apart with the gap taken out of the parts, and only the value
end is rounded, at `--radius-xs`.

Marks change shape with no API change. A `BarList` bar and its track, and a
`StackedBar`'s track, are rounded at the VALUE END only (the inline end, at
`--radius-xs`) and square on the baseline, where they were pills. A
`StackedBar`'s parts stand 2px apart and grow by their value rather than
taking a percentage width. A `TimeSeries` line is 2px (it was 1.75, which a
`Sparkline` keeps). A stylesheet of your own that set a part's `width` or
relied on the pill ends should drop it.

`BarList` takes a `layout`. `stacked`, the default, is the list as it was: the
label and its value on a line, a thin bar across the row under them. `beside`
is the design's ranked figure, the Home screen's "Tokens by team" and Spend's
"By model": the label over its `sub` (at `--font-size-2xs`) in a column of their own
(`--crewlet-bar-list-label-width`, 128px, so every bar starts on one
baseline), then a 12px bar rounded at its value end, then the value at the
BAR's end in the primary ink, in a 30px row (`--size-control-md`). It has no
track. A bar is its share of the SCALE, the plot less the room kept for the
longest bar's value (`--crewlet-bar-list-value-room`, `6ch` and the gap), so
the longest value still fits and every bar is measured against one length.
The parts of a row are now separated by real spaces, in both layouts, so a
row that is a link or a button is named "planner 180" rather than
"planner180".

**A failed row in a `List` marks itself with the danger ink.** The rail and the
glyph of a `tone="danger"` item were the danger fill, which is measured to 3:1
on the opaque surfaces alone, and a failed row can also be the selected one, on
the accent tint. Both take `--color-feedback-danger-ink` now, the step the
palette suite holds on every row ground, as `DataTable`'s rails already did.

| Was | Is |
|---|---|
| `var(--color-data-5)`, or `dataColor(4)` read as a fifth hue | `DATA_COLOR_OTHER`: fold a fifth series into the rest, or split the figure |
| `<Meter tone="brand">`, the `MeterTone` `'brand'`, `meterTone()` or `progressTone()` answering `'brand'` | `'quantity'` |
| a stylesheet targeting `.crewlet-meter__fill[data-tone='brand']` | `.crewlet-meter__fill[data-tone='quantity']` |
| a stylesheet relying on `.crewlet-meter__track` being `--color-surface-inset` | it is `--color-surface-elevated` |
| a stylesheet overriding the `List` danger rail or glyph with `--color-feedback-danger` | `--color-feedback-danger-ink`, or nothing |

**A phase is a category, and a category has no colour.** `@crewlethq/tokens`
removes the phase family (`--color-phase-onboarding`, `-execute`, `-review`
and their `-ink` and `-soft` steps), so `Tag` and `StatusDot` lose the three
phase tones they painted with it, and the `PhaseTone` type is gone. A phase is
drawn as the neutral tag, or the neutral dot, with its word: beside a state
badge the state is the one coloured thing on the row, and the phase is the
word that says where the work is. The phase tag's uppercase, tracked-open
register goes with its hue, so every tag is set as the word it says. Inside a
figure a phase is a series: map each phase to an index of `DATA_COLORS` once,
in your own code, and pass `dataColor(index)` as its colour in every figure
and in the `Legend` that names it.

| Was | Is |
|---|---|
| `<Tag variant="phase-onboarding">`, `"phase-execute"` or `"phase-review"` | `<Tag>` (neutral) with the phase's word |
| `<StatusDot tone="phase-onboarding">`, `"phase-execute"` or `"phase-review"` | `<StatusDot>` (neutral) beside the phase's word |
| the `PhaseTone` type, or `TagVariant` read as including it | `Tone`; `TagVariant` is `Tone` |
| a stylesheet targeting `.crewlet-tag--phase-*` or `.crewlet-status-dot--phase-*` | `.crewlet-tag--neutral` or the bare `.crewlet-status-dot`; neither class is drawn any more |
| `var(--color-phase-*)` in a stylesheet of your own | the neutral text steps for a word, or the series you map the phase to inside a figure |

**The shell is tighter, and the drawer takes over at 1024px.** `@crewlethq/tokens`
moves the shell to the approved design's geometry: the rail is 236px rather
than 280px and the top bar 52px rather than 64px, and `--breakpoint-shell` is
1024px rather than 900px, derived as the rail, the 8px inset between the frame
and the sheet, and the 780px sheet the two-pane Inbox needs. `AppShell` switches
to its drawer STRICTLY UNDER the step, `(width < 1024px)` in its stylesheet and in
its `matchMedia`, because at exactly 1024px the wide layout fits; it used to
switch at `(max-width: 900px)`, a pixel before the arithmetic said it had to.
Everything that changes shape with the shell moves with it and asks the same
question: `Modal`'s side sheet goes full width, `Toolbar` folds into its
overflow, a `SearchTrigger` in a bar drops its label and its hint, and `StatGroup` goes to
two columns. `AppShell`'s suite holds every one of them to that query and
asserts the sum.

The pieces that stand at the bar's height follow it down. `Modal`'s side-sheet
head is 52px with 4px over 24px insets rather than 64px with 16px over 24px:
the head centres what it holds, so the bar's height is the room round its
buttons, and the 16px padding would have stood it 12px past the bar behind it.
`BrandLockup`'s block padding is 4px rather than 8px, so the mark and the
company's line still come in under the rail's head, 47.95px at the normal
density and 49.07px at comfortable against 52px.

**The document's line is 13px on 1.45.** The baseline sets the body at the
compact step on the new body leading, and the three components drawn inside a
line of the document read that leading rather than one of their own: `Kbd`, the
initials in `Avatar`, and both lines of `BrandLockup`. `StatusDot` is 7px, the
design's mark, rather than 6px.

| Was | Is |
|---|---|
| a stylesheet of your own switching with the shell at `(max-width: 900px)` | `(width < 1024px)`, which is what `AppShell` asks |
| a literal `280px` or `64px` lined up with the rail or the bar | `var(--size-shell-rail)` or `var(--size-shell-topbar)` |
| a stylesheet overriding `.crewlet-modal__header--sheet` padding | the head is 52px with 4px over 24px insets; override `--size-shell-topbar` or the rule itself |
| a stylesheet overriding `.crewlet-brand` padding | its block padding is `--spacing-1` |
| a layout that reserved 6px for a `StatusDot` | 7px |

**The screen floats on a sheet, and the rail's rows are the design's.**
`AppShell` paints the window on the frame and draws everything the reader
reads (the bar, a banner, the one scroller, a footer) on ONE sheet beside the
rail: `--color-surface-background` inside the `--color-border-default`
hairline, rounded at `--radius-sheet` (14px) and held `--size-shell-inset`
(8px) off the frame on its top, right and bottom, the rail being the gap on its
left. It is one element because the corner has to clip the bar and the scroller
alike and the hairline has to run round both. The rail draws no right border
any more: the sheet's own hairline is the edge between them. The rail's head
stands the inset plus the bar's height tall, with the inset above it, so the
lockup is centred on the line the bar's title is on. Under the shell step the
sheet is the whole window, its inset, corner and hairline collapsed to nothing,
and the drawer draws the right border the wide rail does not. A shell with no
rail is one column (`crewlet-app-shell--no-rail`), its sheet inset on the left
as well; it used to be dropped into the empty rail's 236px cell.

`SidebarNav` draws the approved rail. A row is 30px, the new
`--size-nav-row` (it was `--size-row-md`, 36px), with 10px between its glyph and
its word, and the rows of a group stand 2px apart rather than flush. A group's
name is a sentence-case word at the caption step in the tertiary ink rather
than an uppercase micro-label, on a heading that stands at the 24px target
floor, and `NavGroup` takes an `action` (`{ label, icon, onClick }`): a control
at the heading's end, the add beside "Projects", named by its label and
reached from the keyboard between the row above and the group's first row. A
figure at the end of a row is one of two props now, where it was a `badge` of
any element with a `badgeTone`: `count` is how many of something the
destination holds, a quiet tabular figure in the tertiary ink with an optional
`mark` before it, and `badge` is how many things are waiting on the reader, the
one filled pill in the chrome, in the accent. Both are values (`{ value, label }`),
the rail paints them, and both are read as the end of the row's name with their
words: "Inbox, 5 unread", "Triage, 12 open, 2 unread". `lead` is a short key
drawn as a chip in the glyph's place, a project's `ENG` on the raised rung in
mono, and read as the start of the name: "ENG Core platform".

The rail's foot never cuts what a row says. An `AppShell.RailRow`'s words took
whatever its mark and its `trailing` value left them and ended in an ellipsis,
so a pill beside the engine's status left "engine conn…". The words and the
value now share one wrapping line: the value stands at the end of the words'
line while both fit, and drops to the start of a line under them when they do
not, and words wider than the rail wrap. A `Button` dropped into the foot wraps
its label the same way. `detail` is new: a second line under the words, which
makes the row the design's status block ("Engine healthy" over "3 nodes ·
config epoch 42"), on `--color-surface-subtle` inside the
`--color-border-default` hairline at `--radius-lg`, the words in the primary
ink at the medium weight and the detail at `--font-size-2xs` in the tertiary
ink. The row keeps its inline pad, so its mark stays on the nav glyphs' line.
A row with no `detail` is drawn as before. The row's content is now wrapped in
`.crewlet-app-shell__rail-row-body`, holding `.crewlet-app-shell__rail-row-text`
(the label and the detail) and the trailing value.

| Was | Is |
|---|---|
| a stylesheet relying on `.crewlet-app-shell__rail-row-label` truncating, or on `.crewlet-app-shell__rail-row-trailing` being a direct child of the row pushed to its end by `margin-left: auto` | the label wraps; the trailing value is inside `.crewlet-app-shell__rail-row-body` and moves under the words when both do not fit |
| a stylesheet targeting `.crewlet-app-shell__column` | `.crewlet-app-shell__sheet` |
| a stylesheet relying on `.crewlet-app-shell` being `--color-surface-background` | it is `--color-surface-frame`; the sheet is `--color-surface-background` |
| a stylesheet relying on the rail's `border-right` | the sheet's hairline is the edge; the rail draws one only as the narrow drawer |
| a stylesheet relying on `.crewlet-app-shell__rail-head` standing at `--crewlet-app-shell-topbar` | it stands `--size-shell-inset` plus that, with the inset as its top padding, and at the bar's height under the step |
| `<NavItem badge={<Count value={3} label="need a person" />} badgeTone="attention">` | `<NavItem badge={{ value: 3, label: 'need a person' }}>` |
| `<NavItem badge={<Count value="4 live" />}>`, a badge with no tone | `<NavItem count={{ value: 4, label: 'live' }}>` |
| the `NavBadgeTone` type, or `badgeTone` | gone: `badge` is the accent pill and `count` the quiet figure |
| a stylesheet targeting `.crewlet-nav-item__badge--attention` | `.crewlet-nav-item__badge`, which is always the accent pill; the quiet figure is `.crewlet-nav-item__count` |
| a stylesheet styling what was passed into `.crewlet-nav-item__badge` | nothing is passed in: the figure is drawn by the rail, `aria-hidden`, and its words are read at the end of `.crewlet-nav-item__label` |
| a layout that counted on a rail row standing 36px | `--size-nav-row`, 30px |
| a stylesheet relying on `.crewlet-nav-group__label` carrying the heading's padding, uppercase and tracked | the padding is on `.crewlet-nav-group__head`; the label is sentence case at `--font-size-xs` |

**A working dot breathes rather than fades, and every stop is one that wins.**
A pulsing `StatusDot` keeps its fill and breathes a halo out round it, in its
tone's own soft step: out to 5px and back, once every `--motion-duration-breath`
(2.2s), the approved design's working pulse. It used to fade the dot itself to
0.35 and back every 1.8s, and at the bottom of that fade every fill measured
1.35:1 to 2.17:1 against its ground, under the 3:1 a mark clears. The design
casts the halo from the dot itself, where it would touch the dot for the whole
round and become its ground: on their own soft step the light info, success and
warning fills measure 2.65:1 to 2.95:1, the same fault at a smaller size. So the
halo is a `box-shadow` cast by the dot's `::after`, a ring box 2px outside it
(the offset the `Avatar` state ring stands at), and a shadow is never painted
inside the box that casts it: 2px of the real ground always stands between the
dot and its halo, and the halo spreads 3px beyond that, to the design's 5px. It
takes no room and moves nothing beside the dot. The pulsing dot is the ring's
containing block through a `:where()` rule, which weighs nothing, so a
`position` of your own on it still wins. The neutral dot, whose family has no
soft step, breathes in `--color-surface-pressed`. Every halo stands at least
dE 3 off every surface, the floor the palette suite holds every "can a reader
notice it" difference to. Under `prefers-reduced-motion: reduce` the pulse is
held: the dot rests at its fill with no halo, and the word beside it still says
the work is under way.

Because the halo takes no room, a word set beside a pulsing dot at an ordinary
mark's 4px was struck by it at every peak. `StatusDot` takes that word now, as
its `children`: `<StatusDot tone="info" pulse>Reviewing !231</StatusDot>` is one
line, `.crewlet-status` (which then takes `className`), the hidden dot and the
read word 7px apart, which is the halo's 5px reach and the 2px of ground that
stands between the dot and its halo again on the far side. The gap is fixed at
every density, like the dot and its halo, and the same for every tone, pulsing
or not, so a column of statuses starts its words on one line. The word is one
line and ends in an ellipsis rather than the dot giving way. A dot with no
children is drawn exactly as before.

The literal check behind `crewlet-css-check` used to accept any stylesheet that
MENTIONED `prefers-reduced-motion`, and three components here passed it while
still moving for a reader who had asked them not to. `DataTable` stopped its
motion with one catch-all, `.crewlet-data-table.crewlet-data-table *`, and its
row's own hover transition outranked it, so the row still eased; `TreeCanvas`
stopped the ghost card of a node being added by its own class, one class short
of the rule that starts its arrival; and its `node` appearance stopped its quiet
controls in a rule above the ones that fade them in, so source order handed
every tie back to the fade. Each is now stopped by name, after the rule it
stops, and the check refuses anything else (see "Theming hooks" above).
`DataTable` stops exactly what its own stylesheet starts, so motion of your own
inside a table is stopped by your own stylesheet rather than by the table's.
The check also reads a top-level media query now: it read only rule selectors,
so a query outside every block was never checked against the breakpoint scale.
In nested CSS it reads declarations written after a nested block where a
browser places them, after that block, so a motion written below a nested stop
is refused rather than read as coming first.

| Was | Is |
|---|---|
| a stylesheet relying on a pulsing `StatusDot` fading, or setting its `opacity` | the dot never fades; the pulse is a `box-shadow` halo on its `::after` |
| a `::after` of your own on a pulsing `StatusDot` | the pulse draws its ring there; decorate a wrapper instead |
| a pulsing `StatusDot` left `position: static` | it is `position: relative` at no specificity, as the ring's containing block; a `position` of your own still wins, and any but `static` keeps the ring on the dot |
| motion of your own inside a `DataTable`, left to the table's reduced-motion catch-all | a stop in your own stylesheet: the table no longer stops what it did not start |
| a stylesheet `crewlet-css-check` passed because it mentioned `prefers-reduced-motion` | name each selector that starts a motion again, in a later `@media (prefers-reduced-motion: reduce)` rule, set to `none` |
| a top-level `@media` query of your own at a length off the breakpoint scale | one of the `--breakpoint-*` steps; the check reads the query now |

**Every glyph is a Lucide stroke.** `@crewlethq/icons` replaces the Material
Symbols set with Lucide drawings, stroked at the approved design's 1.75 on the
24 grid with round caps and joins, so every glyph a component draws changes
drawing, and the names a component imported change with them; the package's
README has the full table. Nothing here takes a glyph by name, so a component's
own glyphs need no edit from you. Two kinds of stylesheet do.

A rule that sets `fill` on an SVG it does not own now paints the INSIDE of a
stroke drawing, which turns a closed shape solid and an open one into a smear.
`AddPill` and `OrgLabel` both had one, to take a brand mark's own fill away,
and both now leave a `.crewlet-glyph` alone and give it their ink through its
`color`, which the stroke follows. A glyph's weight is
`--crewlet-glyph-stroke` on an ancestor, which is the one way to move it.

The `Toaster`'s status glyphs were Material's FILLED drawings, a solid disc or
triangle with the mark knocked out. A stroke set has no such drawing, so a toast
draws the outline, in the same tone, beside the same title word.

| Was | Is |
|---|---|
| a glyph passed to a component under its Material name (`icon={<CloseGlyph />}`) | its Lucide successor from `@crewlethq/icons`' table (`icon={<XGlyph />}`) |
| a stylesheet of your own setting `fill` on the SVGs inside a component, or on `.crewlet-glyph` | `color` on the element; the glyph's stroke is `currentColor` |
| a stylesheet setting `stroke-width` on `.crewlet-glyph` | `--crewlet-glyph-stroke` on an ancestor |
| a toast relying on the filled status glyph | the outline, in the same `--crewlet-toast-mark` tone |

**An agent is a squircle and a person a circle, and a state is a ring.**
`Avatar` takes a `kind` in place of its `shape` and its `variant`: `agent`, the
default, is a squircle with its initials in the mono face, and `human` is a
circle with them in the sans face. That outline is the one cue telling the two
apart. There were two, a square or a circle and a solid or a dashed edge, and
nothing stopped them disagreeing; the dashed edge is gone, from the badge and
from everything that drew it (`EntityChip`, the dashed ring `OrgLabel` drew
round a glyph and the dashed card `TreeCanvas` drew for a person's seat). An
agent's corner is 0.29 of its box, the approved design's 7px at 24 and 9px at 30
as one proportion, and a numeric size now goes through the same rule as a step
by setting the same `--crewlet-avatar-size`; where the browser draws
`corner-shape: squircle` it is a whole squircle, at the circle token, which
stands as deep at the diagonal as that corner does. The neutral badge is the
design's: the raised rung, the strong hairline and the secondary ink.

A name of ONE word now gives two initials too, as the design's org chart draws
its seats (`getInitials`, which the badge uses). Words split on whitespace,
hyphens, underscores and dots as before and give the first letter of each of
the first two; a single word gives the first letters of its first two case
humps where its case says it is two words run together (`DevRel` is DR,
`McCall` MC), and its first two characters otherwise (`CEO` is CE, `SWE` SW,
`PM` PM, `Acme` AC). One letter each made the CEO and the CTO the same `C`.

| Was | Is |
|---|---|
| a test or a layout that counted on a one-word name giving one initial (`Acme` as `A`) | two: `AC`, and `DR` for `DevRel` |

The `brand` tone is gone, because the accent means where the reader is, the
primary action and focus, and a badge filled with it was identity drawn in that
colour. A new `ring` draws a state instead: a 1.5px outline 2px outside the
badge in `info`, `warning`, `danger` or `success`'s own fill, or the accent for
`brand`, which means selected. The gap is transparent, so the ring reads on any
ground, and it is an outline, so forced-colors mode keeps it; in that mode every
ring is one system colour, so say the state in words beside the badge. An image
keeps its kind's outline and its ring.

`AvatarStack` is new: badges that overlap by 6px, each cut out of the one before
by a 2px ring of `--crewlet-avatar-stack-ground` (the sheet by default, where
the design draws every stack; a stack on a card sets it to the card's rung),
with the members past `max` (four by default) counted in a pill. Its badges are
the `sm` step by default rather than the design's 22px: the design sets their
initials at 9px, under this kit's 11px floor, and `sm` is the smallest step at
which the overlap hides no more of two initials than the design's own stack
does. It is one image to a screen reader, named for how many of each kind and
every name, "2 agents and 1 person: Jane Founder, CTO, SWE", or by a `label` of
your own, or silent with `decorative` where the words beside it already say it.

`OrgLabel`, and so `OrgNodeLabel` and `OrgTableName`, lead a seat with its
badge: `avatar={{ name, kind }}` in place of `icon`, read by nobody, since the
name is beside it. It is the approved org chart's 26px badge (the `sm` step) in
a node and the smallest step, 20px, in a row, larger than a container's glyph in
either, so a seat never reads as a unit. `ImageUpload` takes the picture's
`kind` in place of its `shape`; `agent` is the squircle and is what a company's
mark takes too, since the circle is a person's.

`TreeCanvas`'s `cardOutline` is removed, with the
`.crewlet-tree-canvas__card--outline` class it set. It drew a dashed edge round
the card of a seat a person holds, which was the same second cue drawn in a
card's frame, and the approved org chart draws a person's seat on the same solid
card as an agent's, with the badge's circle saying who holds it. For the same
reason a `Card` of the `dashed` variant no longer stands for a person's seat. A
dashed edge stands for a person nowhere in the kit now: it marks a place nothing
fills yet, which is what that `Card` variant, a unit's missing lead and the
ghost of a node being added all draw.

| Was | Is |
|---|---|
| `<Avatar shape="square">`, or no `shape` | `<Avatar>`, or `kind="agent"` |
| `<Avatar shape="circle">` | `<Avatar kind="human">` |
| `<Avatar variant="dashed">` | `<Avatar kind="human">` |
| `<Avatar variant="solid">` | drop it |
| `<Avatar tone="brand">` for the reader's own badge or a selected one | `<Avatar ring="brand">`, on the neutral badge |
| the `AvatarShape` and `AvatarVariant` types | `AvatarKind`; `AvatarTone` is `'neutral' \| 'seeded'` |
| `avatarSquareCorner(px)`, which answered a radius token | `avatarCorner(px)`, which answers the corner in px (`px * AVATAR_CORNER_RATIO`) |
| a stylesheet targeting `.crewlet-avatar--square` or `.crewlet-avatar--circle` | `.crewlet-avatar--agent` or `.crewlet-avatar--human` |
| a stylesheet targeting `.crewlet-avatar--dashed` or `.crewlet-avatar--brand` | nothing is drawn with either any more |
| a stylesheet relying on the neutral badge's `--color-border-default` hairline | it is `--color-border-strong` |
| a stylesheet reading a numeric badge's inline `width` and `height` | its inline `--crewlet-avatar-size` |
| `<EntityChip variant="human">`, and the `EntityChipVariant` type | `<EntityChip kind="human">`, typed `AvatarKind` |
| `<OrgNodeLabel iconRing="dashed" icon={…}>`, or the same on `OrgLabel` or `OrgTableName` | `avatar={{ name, kind: 'human' }}` in place of `icon` |
| `iconRing="none"` | drop it |
| a stylesheet targeting `.crewlet-org-label__icon--dashed` | the badge inside the zone, `.crewlet-org-label__icon .crewlet-avatar--human` |
| `interface … extends OrgLabelContent`, `OrgLabelNodeProps`, `OrgLabelRowProps` or `OrgTableNameProps` | an intersection: each is a type now, over `OrgLabelMark` (a glyph or a badge, never both) |
| `<TreeCanvas cardOutline={…}>` | drop it: a person's seat is the same solid card as an agent's, and its badge's circle says who holds it |
| a stylesheet targeting `.crewlet-tree-canvas__card--outline` | nothing is drawn with it any more |
| `<Card variant="dashed">` round a seat a person holds | the card it would take for an agent's seat; the badge's circle says who holds it |
| `<ImageUpload shape="square">`, or no `shape` | `<ImageUpload>`, or `kind="agent"` |
| `<ImageUpload shape="circle">` | `<ImageUpload kind="human">` |
| a stylesheet targeting `.crewlet-image-upload--square` or `.crewlet-image-upload--circle` | `.crewlet-image-upload--agent` or `.crewlet-image-upload--human` |

**The kit's primitives are the approved design's.** A control stands at the
design's control rhythm: `@crewlethq/tokens` moves `--size-control-md` to 30px
and `--size-control-sm` to 26px, so a medium `Button` is 30px and a small one
26px, and so is every icon button, field, select and tab on the same line,
which read the same steps. `secondary` is the card's own ground inside the
STRONG hairline, the design's button: a button stands on the very card it is
filled with, so its boundary is the whole of it, and the default hairline is
the panel's own divider. It steps up to the raised rung and
`--color-border-strong-hover` under the pointer. `danger` holds the same weight
until it is pointed at, and `IconButton`'s `secondary` square follows. The
borderless button is `ghost`, the word `IconButton`'s borderless square already
used, so a toolbar holding both is written in one vocabulary; `tertiary` is
gone. `Menu`'s `triggerVariant`, `ConfirmModal`'s `cancelVariant` and
`CopyButton`'s `variant` default to it.

**The card is flat.** A `Card` is the card rung inside the default hairline at
the 12px corner, and nothing else, in both palettes: the `default` variant no
longer casts `--shadow-xs` or draws a rim of light on its `::after`, and an
interactive card answers the pointer with its hairline rather than lifting.
What finds a card on the sheet is the pair the palette suite holds, the rung's
step and the hairline's. `elevated`, which genuinely stands over the page, is
the one that lifts. Every copy of the card recipe follows (`StatCard`,
`StatGroup`, `ErrorBoundary` and `PricingCard`), and in following it drops a
defect: each carried `box-shadow: var(--shadow-xs), var(--shadow-hairline)`,
and `--shadow-hairline` is `none` in the light palette, which makes the whole
list invalid there, so every one of them drew no shadow at all in light and two
in dark. A selected `PricingCard` draws `--shadow-selection` alone, and the
glow beside it where it has a discount. The scan that caught this in `Card`
alone now reads every stylesheet in the package.

**A `Tag` is the design's pill.** The default is 22px with fully round ends,
the 12px caption step at the medium weight, 9px inside each end and 6px between
a dot or a glyph and its word. `xs` is the design's 18px count pill at the 11px
step and `md` a small control's 26px. The neutral tag is the raised rung under
the secondary ink, the design's quiet pill, rather than the inset overlay, and
it is drawn inside the strong hairline: its fill IS a surface, so on a raised
ground (a palette's lead block, a raised card, the rail's current row) a
borderless one vanished into loose words. Under the pointer an acting neutral
tag takes the strong step once more. Every state keeps its soft tint under its
ink and no resting boundary. A tag that acts still clears 24px.

**A `Kbd` is the design's keycap, and a chord is one cap.** The cap is the
raised rung inside the strong hairline, flat on every side, in the mono face at
the 11px step and the tertiary ink; the heavier bottom edge said "raised" a
second time and stood the cap a pixel taller than its line. `subtle` gives up
the fill and takes the default hairline. `keys` draws the whole shortcut on ONE
cap, as the design draws every shortcut it shows: `⌘K` on an Apple platform,
where the menus run a chord's symbols together, and `Ctrl+K` everywhere else,
where they join the names with a plus. Each key is a `kbd` inside the cap, and
the one sentence a screen reader is given is unchanged.

**A segmented row is a raised well with a card chip in it.** `Tabs` with
`variant="pill"` and `SegmentedControl` draw their well on the raised rung inside
the default hairline, where the inset overlay stood almost nowhere off a card
and the chips floated. The chip that is on is the card's own ground in the
primary ink, lifted by the default hairline and `--shadow-xs`; the others are
the secondary ink on nothing. A chip is 24px with 10px inside each end and the
`--radius-sm` corner, so the well with its 1px boundary and 2px inset stands at
exactly the 30px of the button beside it.

**`SearchTrigger` is the rail's field by default.** The approved design puts
search in the sidebar: the full width of the rail, 34px tall (the medium
control and one scale step), on the sheet's ground one rung above the frame,
with its label and its `⌘K` cap at every width, because under the shell
breakpoint the rail is a drawer as wide as it ever was. The field a screen
draws in its own bar is `variant="toolbar"`: the card's ground at the control
height, 200px at rest, and still the form that folds to its glyph under the
shell breakpoint.

**A `StatCard` is the design's tile.** Its label is set in sentence case at the
12px caption step, as the caller wrote it, where it was uppercased and tracked
open in the column-head register. The value is `--font-size-display`, the
screen's one display number, in tabular figures. Two slots are new. `trend`
stands a small figure at the END of the value's line, such as a `Sparkline`,
a `Meter` or a `SegmentedMeter`, or a small control that acts on the number,
in a slot `--crewlet-statcard-trend-width` wide (96px); a figure fills it and a control
keeps its own width at its end. `delta` heads the second line with a change
against an earlier reading, `{ value, polarity }`, drawn in the ink of whether
it was WANTED (`good` the success ink, `bad` the danger ink, `neutral` the
secondary ink) rather than of its direction, which its sign already says:
"+12% vs previous 7 days". Neither is drawn while the tile is loading. The
second line reserves exactly one line of its own leading, where a reserve in
`em` was a line shorter than the one a sub draws, and a value too long for its
tile now ends in an ellipsis rather than being cut mid-digit. `subTone` is new:
the second line in a state's ink (`success`, `warning`, `danger` or `info`, the
`-ink` step), for a line that reports a state rather than a fact, as the
design's "Oldest waiting 2h 10m" is a person kept waiting and takes the warning
ink. It paints the line and never the value, a `delta` in the line keeps its
own polarity's ink, and the default, `neutral`, is the quiet ink as before.

**A `Sparkline` is the neutral, and `current` marks now in the accent.** The
line's default colour is `DATA_COLOR_OTHER`, the residual neutral, at the
design's 1.75 stroke: a shape beside a number is named by that number and not by
a legend, so a series hue has nothing to be named by. `current` marks the last
value with one accent point, cut out of its ground by a 2px ring of
`--crewlet-spark-ground`. The point is its own element over the plot, since the
plot is stretched to its box and a circle drawn inside it would be an ellipse,
so the figure's root is a `div.crewlet-spark` holding the plot's
`svg.crewlet-spark__plot`.

**A `Meter`'s track is 6px** with round ends at both sizes, the design's meter.

| Was | Is |
|---|---|
| `<Button variant="tertiary">` or `<ButtonLink variant="tertiary">`, the `ButtonVariant` `'tertiary'` | `variant="ghost"`, `'ghost'` |
| `<Menu triggerVariant="tertiary">`, `<ConfirmModal cancelVariant="tertiary">`, `<CopyButton variant="tertiary">` | `"ghost"`, which is the default of all three, as `tertiary` was |
| a stylesheet targeting `.crewlet-btn--tertiary` | `.crewlet-btn--ghost` |
| a stylesheet relying on the `--color-border-default` boundary of a `secondary` or `danger` `Button`, or a `secondary` `IconButton` | it is `--color-border-strong`, and `--color-border-strong-hover` under the pointer |
| a layout lined up with a 32px or 28px control | 30px and 26px; read `--size-control-md` and `--size-control-sm` rather than a number |
| a stylesheet relying on a `default` `Card`'s shadow or its `::after` rim, or on an interactive card lifting on hover | the card is flat; `variant="elevated"` is the one that lifts |
| a stylesheet relying on the shadow of a `StatCard`, a `StatGroup`, an `ErrorBoundary` or a `PricingCard`, or the rim on a selected `PricingCard` | each is flat; a selected `PricingCard` draws `--shadow-selection` (and `--shadow-glow` with a discount) |
| a `Tag` measured at 20px with a 4px corner and an 11px label | 22px, `--radius-pill` and `--font-size-xs`; `size="xs"` is 18px at `--font-size-2xs`, `size="md"` is 26px |
| a stylesheet relying on the neutral `Tag`'s `--color-surface-inset` fill, or on its transparent boundary | it is `--color-surface-elevated` inside a 1px `--color-border-strong` boundary, and `--color-border-strong-hover` under the pointer |
| a stylesheet relying on `<Kbd keys>` drawing one `.crewlet-kbd` per key inside `.crewlet-kbd-keys` | one `.crewlet-kbd` cap holds a `kbd.crewlet-kbd__key` per key; `.crewlet-kbd-keys` is gone |
| a stylesheet relying on a `Kbd`'s 2px bottom edge, its `--color-border-default` boundary or its inset fill | a 1px `--color-border-strong` boundary on `--color-surface-elevated`; `subtle` is `--color-border-default` and no fill |
| a stylesheet relying on a pill `Tabs` or `SegmentedControl` well on `--color-surface-inset` with no boundary | it is `--color-surface-elevated` inside a 1px `--color-border-default` boundary |
| a pill chip measured at 26px with 12px side pads and the `--radius-chip` corner, or in the tertiary ink | 24px, 10px and `--radius-sm`, in `--color-text-secondary` |
| `<SearchTrigger>` in a top bar or a toolbar | `<SearchTrigger variant="toolbar">`; without it, it is the rail's full-width field |
| `--crewlet-search-trigger-width` set on a `SearchTrigger` | the same property on the `toolbar` form, which is the only one it sizes; its default is 200px rather than 220px |
| a stylesheet selecting `.crewlet-statcard > .crewlet-statcard__value` | the value is inside `.crewlet-statcard__reading`, beside `.crewlet-statcard__trend` |
| a `StatCard` label written for the uppercase register | write it in sentence case; it is drawn as written |
| a `StatCard` value measured at `--font-size-2xl` | `--font-size-display` |
| a `Sparkline` relying on the accent as its default colour | `DATA_COLOR_OTHER`; pass `color` for another |
| a stylesheet selecting the `Sparkline` root as an `svg` | the root is `div.crewlet-spark`; the plot is `svg.crewlet-spark__plot` inside it |
| a `Meter` track measured at 4px | 6px |

**`SegmentedMeter` is new: the design's state bar.** A whole divided into the
states its parts are in, `segments: { id, value, tone, label }[]` against a
`total`: how many seats are working (`info`), waiting on a person (`warning`),
stopped (`danger`) and done (`success`), or how much of a project is done,
active and still to do. Each part is its share of the whole, 2px from the
next, in its tone's fill step; what the parts leave of `total` is the
remainder, drawn last in `--color-border-strong`, which stands at least dE
7.99 off every rung, so the whole bar is seen on any ground. There is no
neutral part, because the quiet part of a whole IS the remainder. The bar is
8px, the figure at the end of a stat tile's value line (the `trend` slot takes
it), and `size="compact"` is the design's 6px progress bar under a project's
name. A part of 0 is not drawn at all, so it leaves no gap behind it, and no
part is ever narrower than the kit's 7px status dot, or than an equal share of
the bar where so many parts would not fit at 7px. It is one image to a screen
reader, named for every part it draws and the whole, "4 working, 1 waiting,
1 stopped, 1 idle of 7", with `remainderLabel` naming the remainder;
`segmentedMeterLabel()` answers the same words, `label` replaces them for a
figure with a unit, and `decorative` silences a bar whose figures are written
beside it. A total under its parts draws the parts against their own sum and
keeps the figures it was given in the name, as a `Meter` past its maximum
does; a negative or non-finite count, and two parts with one id, are refused
with a `RangeError` that names them.

**`Stepper` is new: where a sequence has got to.** The design's step row, an
ordered list of `steps: { id, label }[]` with `current` naming the step under
way: the steps before it are done, in the secondary ink behind a check and
said as "Done" before their words (`doneLabel` for another language); the
current one is a pill of its tone's soft tint under its ink with the tone's
dot, `info` by default (`warning`, `danger`, `success` and `brand` for a step
parked, stopped, finished or where the reader is), and carries
`aria-current="step"`; the steps after it are the tertiary ink. A 10px rule in
`--color-border-strong` joins two steps. `current={null}` is a finished
sequence, every step done and none current, which is how a turn's history is
drawn. `pulse` breathes the current dot with `StatusDot`'s own pulse, held
still under a reduced-motion preference. The tone is drawn and never spoken,
so a step whose state is not ordinary work says so in its own words ("Review ·
sent back"). A `current` that names none of the steps, and two steps with one
id, are refused with a `RangeError` that names them.

**A `Meter`, and both new figures, are drawn in forced-colors mode.** The mode
repaints every author background to `Canvas`, and a meter's track and fill are
nothing but backgrounds, so the whole bar used to disappear for the reader who
asked for more contrast. A system colour an author writes is kept, so in that
mode a `Meter`'s fill and a `SegmentedMeter`'s parts are `CanvasText`, the
track and the remainder `GrayText`, and a `Stepper`'s current step is
`HighlightText` on `Highlight`, the system's own drawing of a selection, with
the rule between two steps in `GrayText`. The hues go, as every hue does in
that mode; the lengths and the current step stay.

**`CommandPalette` takes scopes, a lead and a row's meta.** The design's ⌘K.
`scopes: { id, label, count? }[]` with a controlled `scope` / `onScopeChange`
draws a row of tabs under the field (the chosen one in the primary ink over a
2px bar, a `count` as a `Count`), and they come as a SET: the types refuse
one without the others, and without `groupsScope`, which names the scope
`groups` was computed for. Until it is the chosen scope the rows are withheld,
the list is `aria-busy` and says `pendingMessage` ("Searching…"), so a
search still answering the scope the reader left never offers its rows, or
lets Enter open one, under the new one. Focus never leaves the field: Tab and
Shift+Tab step the scopes, and so do ← and → while the field is empty; a
press on a tab picks it without taking focus; the results are the chosen
tab's `tabpanel`, the field is described by that tab, and a change is said in
a hidden status line. `lead` is what the surface says before its rows, an
answer drawn on the raised rung: a polite live region OUTSIDE the listbox,
mounted empty so its first words are read, never an option (Enter still
takes the highlighted row), and scrolled with the rows in the one scroller.
Anything a reader should act on belongs in a row. A row's `hint` now runs on
its label's line in the tertiary ink rather than at the row's end, which is
kept for the new `meta`: a short fact or a `Kbd` naming an accelerator the
application binds on the palette's `onKeyDown`. `footer` is the key legend,
at the `xs` step on the sheet rung. The surface is the design's 720px wide
and at most `min(74dvh, 680px)` tall, the artboard's 664 of 900 with a lead
over five rows; it was 620 by `min(60dvh, 520px)`, sized for a list alone.
The field row is the design's too: a search glyph always leads the query, in
the field's own leading slot, and `escapeHint` draws an `Esc` keycap at its
end (off by default, since it names a key and only the application knows
whether every reader of its palette has one). Both take no pointer, so a press
anywhere on the row lands in the text, and both are hidden from assistive
technology: the glyph restates the field's name and the keycap what a
dialog's Escape does. Nothing here is renamed: a palette without scopes
behaves as before, Tab included.

| Was | Is |
|---|---|
| a stylesheet targeting a palette row's hint as `.crewlet-listbox__hint` | `.crewlet-palette__hint`, on the label's line; the row's end is `.crewlet-palette__meta` |
| a layout or a test that counted on the palette being 620px wide and at most `min(60dvh, 520px)` tall | 720px and `min(74dvh, 680px)`; `--crewlet-modal-width` on the palette still sets the width |

**The row under the arrows is raised, not violet.** Every listbox row (a
`Select`, a `Combobox`, a `TagsInput` and a `CommandPalette` alike) drew its
highlighted and hovered row in the accent's soft tint with the accent ink.
The accent is the primary action's fill and the focus ring now, so that row
read as a second primary on every surface that offers a list. It now stands
on `--color-surface-elevated`, the raised rung @crewlethq/tokens holds dE 3 off
the card every list opens on, and its label lifts from the register's
secondary step to `--color-text-primary`, as the approved palette draws it.
A palette row's `hint` stays in the tertiary ink on the highlighted row
rather than taking the row's colour. What the accent still marks in a list is
a choice made, a multi-select's tick. Nothing is renamed.

| Was | Is |
|---|---|
| a test or a stylesheet reading `--color-brand-accent-soft` / `-ink` off a highlighted `.crewlet-listbox__option` | `--color-surface-elevated` and `--color-text-primary` |

**A highlighted listbox row is outlined in forced-colors mode, and a chord is
not Enter.** The mode repaints backgrounds to `Canvas`, which took the
highlight of every `Select`, `Combobox` and `CommandPalette` with it; the
highlighted row now carries a 2px `Highlight` outline inside its box. Enter
held with Command, Control or Option no longer takes the highlighted option:
it is left to whoever owns the chord, so a palette's ⌘Enter does not also
open the row. And a modal's focus trap no longer moves a Tab a control has
already taken (`preventDefault`): a `Combobox` with `tabCommits` that was the
last stop in a dialog took the completion and then lost focus to the first
stop. `useListbox` brings the HIGHLIGHTED row into view by its id rather than
the first `[aria-selected="true"]` in its scroller, which in a multi-select is
the first chosen row and in a palette could be a tab in the lead; `TagsInput`
drops the second reveal it kept to undo that.

| Was | Is |
|---|---|
| ⌘Enter, Ctrl+Enter or ⌥Enter relied on to take the highlighted option of a `Select`, a `Combobox`, a `CommandPalette` or a `useListbox` of your own | bind the chord yourself, on the surface's `onKeyDown`; plain Enter takes the option as before |
| a forced-colors stylesheet of your own outlining a highlighted listbox row | drop it: the row draws a 2px `Highlight` outline itself |

**`ThemeToggle` is new, and the preference controls can be controlled.** The
design's rail foot carries one button beside the reader's identity row rather
than the three-way row. `ThemeToggle` resolves the preference against the
platform, through the same `(prefers-color-scheme: light)` query the theme
layer answers (so a browser reporting no preference is dark, as it is
painted), and a press writes the EXPLICIT opposite: on a dark system a reader
following it gets `light`, and a second press `dark`, never `system`, which
repaints nothing. It is named for what a press does ("Switch to the light
theme", `toLightLabel` / `toDarkLabel`) and draws the palette it goes to, a
sun on a dark page and a moon on a light one; it carries no `aria-pressed`,
because neither palette is the other's "on". `ThemeSwitcher`,
`DensitySwitcher` and `ThemeToggle` take `value` / `onChange`: given a
`value`, a control draws it, reports a pick and writes NOTHING, neither the
root attribute nor storage, and the types refuse a `storageKey` beside it.
Without one a control is stored as before, and `onChange` is told after the
pick is applied and kept. Stored controls on one key now read ONE value: each
held its own copy, so a press on a toggle left a settings row showing the
choice it had replaced, and a choice another tab writes now reaches every
control and the root. A choice storage refuses (a private window, blocked site
data) is held for the visit, so the control shows the pick it just made rather
than re-reading an empty store. `useSystemTheme` and `resolveTheme` are
exported for an application that draws its own. Nothing is renamed.

**`TreeCanvas` boxes a unit round its seats, and its connectors are elbows.**
The design's org chart. `groups: { id, label, lead?, memberIds }[]` draws a
DASHED `--color-border-strong` box on `--color-surface-subtle` round a run of
sibling cards (the seats that report to one lead), with `label` along its top
in the tertiary ink at 12px and `lead` (the project key chip) AHEAD of it, as
the design reads a unit: "ENG Engineering · Core", which is also the
description each member card is given. The edge is dashed because a box round
cards drawn with a solid edge read as one more, larger card, and it takes the
strong step because a dash spends half its length on gaps. The box is room the LAYOUT keeps rather than a frame over it:
`layoutForest` takes `groups` (`{ id, members, inset }`, each member's outline
widened by the box's padding and header), so a card outside a unit is held a
gap clear of the unit's box, two boxes never overlap, a short member's
children start below the box, and `ForestLayout.groups` is each box's
rectangle, exactly its members' extent plus the padding (`--spacing-3`, the
label's own inset) and the header's measured height. Members must be
consecutive children of one card (or consecutive roots), since a rectangle
round anything else encloses what lies between; anything else is refused by
name. A member not drawn right now is left out and a group with none drawn is
not drawn. The box and its label are hidden drawing, like the connectors; each
member card's node is described by the label (`aria-describedby`), and the
label rides over the branches on the box's own fill. `connector` gains
`elbow`, now the default, and `straight`: an elbow is orthogonal, down, a 6px
corner (`--radius-sm`) drawn as a true arc, across, another corner and down,
and the run across a parent's children is drawn halfway through the clear
space between the parent (or its box) and the box its children are in, so it
never passes through a label. On shared ranks that run is between the RANKS:
it used to be halfway below a short parent centred in a tall band, inside its
rank, and a children's row reaching under a taller neighbour ran through that
neighbour's card. `step` and `curve` are unchanged; a chart that relied on the
old default asks for `connector="step"`. Connectors are 1.5px, the design's
weight (the `node` appearance keeps its 3). The design draws them in
`--color-border-strong`, which measures 1.45:1 on the canvas in dark and 1.43:1
in light against the 3:1 a connector is held to, so they stay on
`--color-border-control` (4.40:1 and 4.04:1). A child a fraction of a pixel off
its parent's centre now gets its two corners rather than a vertical that ended
beside the child. Nothing is renamed.

| Was | Is |
|---|---|
| a `TreeCanvas` with no `connector`, relied on for the stepped connector | `connector="step"`; the default is `elbow` |
| a stylesheet or a test reading a connector's 1px width | 1.5px, still `--color-border-control`; the `node` appearance keeps its 3px |

**A `Meter` takes its thresholds, or its verdict.** The `spent` ramp turned at
three quarters of the maximum for every caller, so an application whose own
rule warns elsewhere had to compute the tone itself and pass `tone`, which
names a paint rather than a state. Two props replace that. `thresholds={{ near:
0.9 }}` moves the middle step to the given FRACTION of the limit and keeps the
rest of the ramp: at or past the maximum the bar is `danger`, at or past `near`
it is `warning`, below that it is the ordinary `quantity`. The fraction is
compared with `value / max` as given, so `near: 0.9` flips at exactly 90 of
100, and one outside (0, 1] is refused with a `RangeError` that names it (at 1
there is no middle step). `state` is the VERDICT of a consumer that owns the
rule, such as the engine that enforces a budget: `'ok'`, `'near'` or
`'refusing'`, painted `quantity`, `warning` and `danger`. Given a state the
meter derives nothing, whatever the fill; the bar is still drawn at the value
against the maximum, and an unknown state is refused rather than drawn as the
ordinary reading. The types refuse a second opinion beside either one: a
`state` with a `tone`, a `polarity` or `thresholds`, and `thresholds` with a
`tone` or with `polarity="progress"`, whose ramp has no middle step. The tone is
drawn and never spoken, so a refusing budget says so in its `valueText`.
`meterState(fraction, thresholds?)` and `meterStateTone(state)` are the same
rule for an application drawing its own figure; `meterTone(percent)` is
`meterState` at `DEFAULT_METER_THRESHOLDS` (`{ near: 0.75 }`), unchanged.
`MeterProps` is now a union of `MeterVerdictProps`, `MeterRampProps` and
`MeterThresholdProps` over the shared props, and an interface cannot extend a
union, so a props type of your own built on it is an intersection. A meter
given neither prop is drawn exactly as before.

| Was | Is |
|---|---|
| `interface BudgetMeterProps extends MeterProps { … }` | `type BudgetMeterProps = MeterProps & { … }` |
| a `tone` computed from your own rule and passed to `Meter` | `state` with your verdict (`'ok'`, `'near'`, `'refusing'`), or `thresholds={{ near }}` for the fraction; `tone` stays for a paint that is not a state |

## Breaking changes in 0.3.0

Every one of these is a change a consumer can see. None of them needs an edit
unless it is listed under "What to change".

**The overlays.** Modal, Popover, Select and DateTimePicker each used to add
their own Escape listener to the document, so one press closed all of them, and
a backdrop press closed two layers at once. They are on one stack now: Escape
reaches the TOPMOST surface and a backdrop press dismisses the surface it
belongs to. An application that relied on one press closing a dialog and the
menu inside it together now needs two. A panel portals into the nearest
`LayerHost` rather than always into `document.body`.

**The controls wear the product's own register.** Every form control, button
and tab in the package is drawn the way the engine dashboard draws it, which
is the look the product ships. What follows is that change, component by
component. None of it needs an edit; all of it renders differently.

**`Button`'s hierarchy is redrawn.** `primary` is the ACCENT FILL rather than
the monochrome `--color-brand-primary`, because the one action on a screen has
to read as the answer the screen is asking for, and a white primary beside a
light-grey secondary was one pair of greys on the dark palette. `accent` is
the same recipe under the name a call site may already spell, so the two are
one rule and cannot drift into two blues. `danger` is no longer a red slab: it
is a secondary that has gone red, stating itself in the critical INK and
taking the hue as a tint and a boundary on hover, because it sits beside
Cancel and it is the button nobody should press by reflex. Labels are medium
rather than semibold and carry no negative tracking, and the padding ramp is
one scale step per size (small 8px, medium 12px, large 16px). What to change:
a call site that reached for `variant="danger"` to draw a filled red
confirmation now gets the quiet one; nothing else.

**`IconButton` has a `secondary` variant**, which is the bordered square a
secondary Button with no room for a label would be: a month's back and
forward, a step in a toolbar. Its corner is `--radius-md` like every other
button, rather than `--radius-sm`, and its glyph follows the label size a
Button of that step would draw (12px at `sm`, 14px at `md`) instead of running
one step heavier.

**The form row is one line, and its label is a micro-label.** `Label`,
`FormField`'s legend and `ReadOnlyField`'s label are 11px, medium, opened up
and uppercased on the tertiary step: a form is read by its values, and a label
set in the value's own size competes with it. A field carries its inset as
side padding only, so a medium one is exactly `--size-control-md` tall and
lines up with the button and the select beside it; it used to draw 39px
against a 32px button. Values are 13px rather than 14px, a `FormField`'s own
parts sit one scale step apart rather than two, and the affix a url field
wears (`InputAffix`) is the page's face rather than the code face and is
joined to the value it prefixes: it takes the inset a value takes and the
control after it takes none, so `https://` and the host read as one string
rather than as two fields. What to change: a screen that wrote its labels in
Title Case now reads them in caps; write them as sentences.

**A focused field shows ONE ring, and it is an outline.** `Input`, `Textarea`,
`Select` and `TagsInput` each drew two: the boundary took `--color-focus` and
`--shadow-focus` laid a second focus-coloured band outside it with a
background-coloured gap between the two, so a focused field read as an accent
hairline, a gap and an accent band. What is left is one 2px outline in
`--color-focus`, drawn INSIDE the box on `--size-focus-ring-inset-offset`, so
it covers the boundary rather than standing off it: a scroller cannot clip it,
and the field no longer grows a 4px halo when a caret lands in it. The
boundary keeps its own `--color-border-control` under it, a refused field
rings in `--color-feedback-danger` so a focus ring cannot paint out the one
mark saying the value cannot be saved, and the field's ring is keyed on the
field's own control rather than on `:focus-within`, so tabbing to a search
box's clear control rings the button and not the whole field around it.
`Combobox` and `ListInput` follow, being built from these. What to change:
nothing in a call site; a stylesheet of your own that keyed on
`.crewlet-input:focus-within` or on the focus shadow needs rewriting.

**Every dropdown is one panel.** `Select`'s list, `Combobox`'s completions and
`TagsInput`'s offers take the product's panel surface, hairline, corner and
medium shadow rather than the elevated surface and the large one, and each
caps at `12rem` rather than 240 or 320px. In `Select` and `TagsInput`, WHAT IS
CHOSEN and WHERE THE READER IS are drawn apart: the chosen row keeps its tick
in the accent ink and the row under the arrows or the pointer takes the hover
tint, which used to be the same accent tint on both. A row a caller draws
itself with `renderOption` carries the choice in its weight.

**`Select` takes a `width`.** `full` is the default and is what every call
site has today. `auto` is the toolbar picker: it sizes to its answer between
132px and 220px, which is what a filter bar is, rather than one question per
line. Its trigger is the field's own chrome at 13px, and its chevron is the
decoration step, as every glyph that repeats what the control already says.

**`Tabs` and `SegmentedControl` are redrawn.** The underline row scrolls
sideways rather than pushing the screen it is on, with its scrollbar hidden
and its focus ring drawn INSIDE the tab, because an outset one is clipped by
the scroller the row has become. The row brings its current section into its
own visible range when it mounts and when the section changes, moving nothing
but itself, and the accent bar is placed from a content offset so it stays
under its tab however far the row is scrolled. Its labels are 13px on the
tertiary step,
carry only the side pad that ring needs, and stand one scale step apart. The
pill row is a WELL WITH CHIPS IN IT: the inset surface, no boundary of its
own, a 2px inset, `--radius-md` on the container and `--radius-chip` on a chip,
12px labels, and the chip that is on lifted off the well with the panel
surface. A chip clears the 24px target floor in BOTH directions, where its
width used to be a pad around whatever it held and a one-letter mark drew a
target 19px wide, and a chip wider than its content by that floor centres what
it draws. The `sm` chip is the quiet step a rail's foot wears: 4px of side
padding and a glyph one type step under its label's, so a theme row and a
density row beside each other draw one cell each and read as one row of
controls. A hover brightens the label in both chromes rather than filling the
box behind it. `SegmentedControl`'s card rows take the framed-choice boundary
(no surface of their own, `--radius-lg`), which is the frame a `Checkbox`
draws. `ThemeSwitcher` follows, being a `SegmentedControl`.

**A focused `Switch` is ringed where a reader can see it.** The ring used to be
drawn on the native checkbox the track carries, which is the element that takes
focus and is also the element drawn at `opacity: 0` so the pointer hits a real
input. Opacity applies to the whole of an element's rendering, its outline
included, so a switch a keyboard reader tabbed onto showed no indicator at all.
It is drawn on the track now, keyed on the control's own `:focus-visible`, in
the same 2px outline every other control in the package wears. What to change:
nothing, unless a stylesheet of your own keyed on
`.crewlet-switch__control:focus-visible`.

**A framed `Checkbox` or `Switch` is a boundary, not a panel.** Neither draws
a surface of its own any more, both take `--radius-lg`, and a `tone="danger"`
framed row is no longer tinted red: what it deletes is said in the words and
in the colour of the tick, and a red panel puts the alarm on the frame. Their
descriptions are 12px, and both rows state the label's own 14px on the root
rather than inheriting an application's body size, because the box and the
track are centred on the label's first line in `em`. A screen that set a font
size on a `Checkbox` or `Switch` from outside now has to set it on the label
it means.

**The pickers take the control chrome.** `DateTimePicker` and
`TimeWindowPicker` are one line tall with a side inset, their glyphs are the
decoration step, their small boxes take `--radius-md` like every other field,
and a `TimeWindowPicker` preset is drawn as the small button it is.
`CalendarGrid`'s day cells take `--radius-xs`, the corner every small row in
the package wears.

**`TimeWindowPicker` is a rail of NAMED windows beside the calendar.** The two
tabs are gone. The relative pane used to be a grid of bare numbers under unit
headings, so "Last 7 days" was a 7 in a row called Days and reaching it meant
switching tab first; the windows a reader actually asks for (Last 15 minutes,
Last hour, Last 4 hours, Today, Yesterday, Last 24 hours, Last 7 days, Last 30
days) are now a radio group down the side of the panel, with the absolute range
beside them rather than behind them. The two sides SAY THE SAME THING: take a
named window and the calendar shades it and the boxes fill with the moments it
resolves to (a rolling window's end is drawn as the now it reaches); edit a box
or take a day and the window becomes that range and the rail lets go. The panel
is sized by its content rather than pinned to 560px, so a calendar is not
squeezed at comfortable density, and it scrolls only where one column will not
fit. What to change: `presets` is a flat `TimeWindowPreset[]` of
`{ label, duration | span }` rather than groups of `{ label, unit, values }`;
every individual label prop (`absoluteLabel`, `cancelLabel`, `presetLabel`, and
the rest) moves into one `labels` bag (`Partial<TimeWindowLabels>`), as
`DataView` already takes its own; and a screen with a default window should pass
`defaultValue`, which is what the new Reset goes back to and without which no
Reset is drawn.

**A time window can be a CALENDAR SPAN, not only a duration.** `TimeWindowValue`
grows `span` (`today`, `yesterday`), which starts at midnight in the value's own
time zone rather than a fixed number of hours ago, and it is its own field
because a field called `duration` holding `today` is a field that lies. A value
carrying both keeps the span. `resolveTimeWindow` takes an optional `now`, so a
caller can resolve two windows against one moment, and `describeTimeWindow` is
new: it answers what a window is CALLED, what it resolves to, and both as one
sentence, which is the one place the trigger's text, the trigger's name and the
panel's live line all read from.

**A picker trigger is named by the value it holds.** `DateTimePicker` and
`TimeWindowPicker` each carried `aria-label={ariaLabel}` over their own text,
and an `aria-label` REPLACES the content of the element it is on: a button
drawn as "Last 7 days" announced itself as "Time window", so the one thing the
control exists to say was the one thing a screen reader could not hear from it.
The name is the label and the value now ("Time window: Last 7 days", "Starts
at: Mar 10, 2026, 09:30"), which is also what Label in Name asks for, and how it
is composed is a prop. `DateTimePicker` grows a Now (or Today, where there is no
time to set), clamped to the bounds rather than refused, and moves its own label
props into one `labels` bag; `placeholder` and `ariaLabel` stay where they are,
so `DataView`'s moment editor needs no edit. What to change: a test asserting
the old bare name, and a screen that drew a Now button of its own beside the
picker.

**`CalendarGrid` draws a range as one band.** Its ends carry `is-range-start`
and `is-range-end`, asked of `inRange` about each chosen day's neighbours
rather than passed in as two more props, and the band closes the 1px gap
between cells with an outline in its own colour. An outline rather than a
box-shadow because today's ring is a box-shadow, and a day that was both today
and inside the range used to lose the ring saying which day it was.

**`ListInput`'s rows are tighter.** A value and its Move and Remove controls
sit one scale step apart rather than two, the controls carry no gap of their
own because an icon button's square already separates them, and they sit
level with the top of the control rather than nudged down.

**The overlays wear the engine dashboard's look.** Every surface that floats
over a page repaints. `Modal`, `ConfirmModal` and anything built on them sit on
`--color-surface-veil`, the page's own background at 0.72 rather than a black
scrim, so the page behind fades to context instead of being darkened out of the
way; the panel is `--color-surface-subtle`; a dialog is TOP placed by default,
`--spacing-10` down from the top of the window; the head is centred and its
title is the body size at semibold; a sheet's head is tighter than a dialog's;
and the body's prose is the page's own ink. `Menu` and `Popover` take the same
panel step, the menu at `--radius-md` and sized by its own longest row rather
than floored at 200px, the popover floored at 260px, both entering with a short
rise from under the trigger. A menu row is one line at `--size-row-sm` with
`--spacing-2` of inline padding and `--radius-xs`; a disabled row is the
tertiary ink rather than half-strength; a row that carries a description is the
only one drawn taller. `Listbox`, and with it `Select`, `Combobox`,
`MultiPicker` and `CommandPalette`, moves to a taller row (`--spacing-2` by
`--spacing-3` at `--radius-md`) whose resting ink is the secondary step.
`Tooltip` takes the panel step and `--radius-md`. What to change: a dialog that
relied on being vertically centred passes `placement="center"`; a caller that
sized a `Menu` or `Popover` through a wrapper of its own should drop it; a
caller measuring a fixed number of visible listbox rows should re-measure. To
get the palette's keyboard band, pass `CommandPalette`'s `footer` a line of
`Kbd` hints; it is drawn at the micro register rather than a modal footer's.

**What the overlay restyle settles on top of that.** A dialog CLIPS to its own
corners, so a body with `flush` no longer paints a square edge over a round
one; a sheet has no corners and no clip. A `Menu` panel is as wide as its
longest row up to 320px and the label that does not fit truncates, where the
pair of widths it shipped with let the panel leave the window instead. A
`Popover` row wraps: it is a panel of a declared width, and a line that cannot
break has nowhere to go in one. The row a menu or a panel hands focus to is
TINTED, not only ringed, so a menu opened with the pointer shows where the keys
will land; the ring is still `:focus-visible` only. A row that is both
destructive and disabled is drawn in the tertiary ink, because the danger ink
on a row nobody can press is the loudest invitation in the palette. And
`--color-surface-veil` is each root's OWN `--color-surface-background` at 0.72,
the marketing root included, which is a rule the palette suite now measures.

**`Popover`.** Its default `role` is `dialog` rather than `menu`, because a
filter form announced as a menu of commands told a screen reader that every
field in it was a menu item. `onOpenChange` takes a second argument saying why,
and is never called on mount; the effect it replaced reported one on mount and
on every render after it.

**`Button` and `IconButton`.** Sizes follow `--size-control-*`, so a small
button is 28px and a large one 44px. `IconButton`'s `sm` step is 24px rather
than 22px, which is the smallest target WCAG 2.2 accepts.

**Glyphs are nodes, not names.** `TabsItem.icon`, `DataTable`'s `icon` and
`actionIcon`, `DataTableRowAction.icon` and the Toaster's `icon` each take a
glyph component now, and the `material-symbols-outlined` class has left
component markup.

**Every dropdown is the design system's own.** `Select` draws its listbox in
every mode it is used in, which is what 0.2.0 did and what the product's own
look asks for: the list takes the theme, the density, the tokens and the layer
stack, rather than the operating system's palette in the middle of a dark
dialog. What a reader used to get free from the platform it now earns back for
itself, and those rules are shared with every other list in the package
(`useOptionKeys`): type-ahead, Home and End, disabled answers stepped over, the
highlight announced through `aria-activedescendant`, Tab closing the list and
carrying on to the next control, Escape stopping at the list, and a stored
value the options no longer offer kept rather than swapped. A real `<select>`
is available as `mode="native"` for a surface that wants the phone's own
full-screen picker, and a call site that asks for it should say why. The two
inside `TimeWindowPicker`, its timezone and its custom unit, had no such reason
and are drawn here now.

**An empty answer the options offer is a choice.** A `Select` reads the empty
string as "nothing chosen" and shows its placeholder, unless the list itself
offers an option whose value is empty, which every filter row does ("Any
role"). On those lists the placeholder was drawn OVER the answer already
selected. What to change: a caller that offered `{ value: '', label: 'Any' }`
AND a `placeholder` now sees the option's own label, which is what it meant.

**A search field's clear control is a real button.** `<Input type="search">`
used to leave it to `::-webkit-search-cancel-button`, which one browser family
draws, nobody else does, and no keyboard anywhere can reach. Pass `onClear` and
the field draws the package's own: named, in the tab order, and it hands focus
back to the box it emptied. Without `onClear` a search field now has no clear
control at all, which is the honest version of what most readers already had.

**A table that does not page is not offered a page size, and draws no
chevrons.** `DataTable`'s settings frame always drew an items-per-page row and
its toolbar always drew Previous, a page number and Next; with
`paginated={false}` the caller slices its own rows, so nothing read that number
and neither chevron could ever be pressed. Both are drawn for a table that
reads them: `paginated`, or a caller that says it reads them itself
(`onItemsPerPageChange` for the size, `onPageChange` with `pageCount` for the
chevrons). A table that passes none of those keeps the rest of the frame, the
column order and visibility and the wrap-lines toggle, unchanged.

**The page, its size and the column order are controlled pairs.** `page` /
`onPageChange`, `itemsPerPage` / `onItemsPerPageChange` and `columnOrder` /
`onColumnOrderChange`, each the shape `visibleColumns` / `onVisibleColumnsChange`
already had: the table owns the choice when the pair is absent, and the caller
owns it when it is present. Which is the split the table now states outright.
What is on screen, the page, the size, the columns shown, their order and the
sort, is what a reader would send somebody, so every one of them can be lifted
into a screen's own history (a URL). What is a fact about this browser, the
wrapping and the column widths, stays in `localStorage` under `storageKey`. A
controlled choice is neither read from storage nor written to it, so the two
can never disagree on a reload.

**`All` means every row, not the row count when it was pressed.** The chip
wrote `data.length`, so a reader who chose All at twelve rows was on "twelve
per page" and the table began paging silently at the thirteenth; on an empty
table it wrote 0, and a page of no rows hid every row that arrived afterwards,
for the life of that `storageKey`. It is the sentinel `ALL_ITEMS` (`'all'`)
now, in the prop, in the callback and in storage, and the chip's accessible
name carries the count ("All 1,284 rows") because drawing every row of a long
list is a decision with a size on it.

**A column can be one a reader may not hide.** `DataTableColumn.hideable:
false` marks the column that says which row this is, and the last visible
column cannot be unticked either, in the settings frame or in the Columns
panel. Both drew a tick that unticked, and a table with no columns is a spacer
with a footer.

**The column list reorders from a control with a name.** The drag handle was an
`aria-hidden` glyph on a row draggable along its whole width. It is a button
now: named "Reorder <column>", in the tab order, and the drag starts from IT
rather than from anywhere in the row. Its arrow keys move the column, as the
Move up and Move down buttons beside it do; those two are `aria-disabled` with
a reason at the ends of the list rather than `disabled`, because disabling the
button a press is on drops focus to the document body. Each move is announced.

**A resize handle is a separator, not a button.** `role="separator"` with
`aria-orientation`, `aria-valuenow` and `aria-valuemin`, which is the shape a
reader's software already knows how to step. A column header is named by its
label alone now (`aria-labelledby`), because a cell named from its contents
reads every control that has drifted into it: with the handle a real control,
each header announced itself as "Seat Resize Seat".

**Reset to Default restores the order a table opens in.** It cleared the sort
outright, while the header's own reset put `defaultSort` back: one button, one
name, two meanings of "default". A table that opens ordered by spend, or by
when a turn started, answered Reset to Default with the order its rows happened
to arrive in. A caller holding the sort is told `defaultSort` now rather than
`null`, so a screen keeping the sort in a URL stops carrying a non-default
after a reset. `DataView` passes its own `defaultSort` down for the same
reason. What to change: a table whose default really is no order at all passes
no `defaultSort`, which is still what it gets.

**The settings cog no longer depends on a row-actions column.** In
`variant="default"` the cog lived inside the actions header, so a table with no
`rowActions` and no `onRowAction` had no way into its own settings at all. The
trailing chrome column is drawn for the cog on its own, which is one more
column in the row of a default-variant table that has none today.

**The Columns panel is gone from the table's chrome.** `DataTable`'s toolbar
carried a Columns popover, drawn for a caller that passed the
`visibleColumns` / `onVisibleColumnsChange` pair, and the settings frame owns
that job: a reader looking for which columns are shown goes to the gear, and
two controls for one answer is two places for the rules about it to disagree
(they already had, over the column a table may not hide). The frame is the way
in for every table now, the toolbar gets the width back, and a table with no
chevrons and no gear draws no toolbar row at all rather than one holding the
panel alone. `labels.columnsMenu` and `labels.columnsMenuTitle` go with it,
as do `.crewlet-data-table__columns-panel`, `__columns-fieldset` and
`__columns-legend`. The controlled pair is untouched and still drives the
table: what it changes is where the answer is KEPT, never how it is reached.
What to change: a caller that passed the pair alongside `showSettings={false}`
has taken the reader's only way in with it, so it draws a control of its own
or drops `showSettings={false}`.

**Every table opens the same settings frame.** `settingsVariant` is gone, and
so is the `compact` shape it chose: a table with a title, a description or an
icon used to get a frame holding the page size and the wrapping and nothing
else, so the only way to its columns was the Columns panel in the toolbar. One
frame now, at the wide step, holding the items-per-page chips, Wrap lines, and
the column list with its handles, its ticks and its Move up and Move down. The
two shapes differed in nothing a caller could have wanted besides that list: a
dialog carrying a drag-reorder list wants the width whatever the table above it
looks like. `labels.pageSize` goes with it, since the section is named
`labels.itemsPerPage` on every table. What to change: drop `settingsVariant`,
and where a card-style table was chosen for the shorter frame, expect the full
one.

**The count line under a table is gone, and so is `TableFooter`.** Every list
closed on a row saying "Showing 12 of 300", or "12 rows" where nothing was
hidden. What it said is said better where a reader already looks: how many of
a thing there are is a fact about the LIST rather than about the table drawing
it, so it belongs in the screen's own header beside the name of the thing
counted (`PageHeader`'s `badges`, or `Card.Header`'s `count` over a panel
table); which filters narrowed it is on the chips a step above the rows; and
which rows of how many are on this page is what the pager announces, the
control that moved the reader there. A second number under the table was a row
of chrome on every panel and a figure free to disagree with the one above it.
The component is deleted rather than left undrawn: nothing in the package
renders it, and the only shape a caller had left was hand-drawing it beside a
`DataTable`, which is the thing being removed. `DataView`'s `totalCount`,
`pagination` and `labels.footer` go with it, each having had the footer as its
only reader. What to change: put the count in the screen's header, and reach
for `DataTable`'s own `hasMore` / `onLoadMore` for a Load more control, which
draws under the rows inside the table.

**A table that pages can be paged, whichever variant it is.** The pager was
the compact variant's alone and `paginated` defaults to true in both, so a
`variant="default"` table sliced its rows into pages of ten and drew nothing to
turn them with: on twenty-five rows, fifteen of them were reachable only by
opening the settings frame and choosing All. Which control a reader is offered
is a question about whether the table pages, not about how it looks, so the
chrome row is drawn on either variant wherever there are pages to turn. The
variant still decides where the COG goes, which is the trailing chrome column's
header on a default table and that row on a compact one, so neither draws it
twice. `--crewlet-data-table-chrome-pad-x` moves onto the root both variants
carry: unset on the default one, every padding written through it was an
invalid declaration a browser drops whole, and the bar would have arrived with
no inset at all. What to change: a default-variant table that should not page
passes `paginated={false}`, which is what it always meant.

**A table inside a card draws its controls on the card's header.** A panel
whose header says what the rows are and how many there are, with a bar under it
holding a pager and a cog and nothing else, is two rows of chrome over one
table. Where a compact `DataTable` fills a `Card` that has a `Card.Header`, the
pager and the settings cog are now drawn at the end of that header row and no
toolbar is drawn for them; the header keeps its icon, its title and its count
on the left, and the card's own `actions` keep the end of the row with the
table's controls closing onto them. Nothing is passed between the two: the card
publishes the row and the table draws into it, so a screen writes a card, a
header and a table exactly as before. The row is taken by ONE table, so a card
holding two of them puts the first on the header and leaves the second with its
own bar; a table that titles itself keeps its controls in its own header; and a
table outside a card, or in a card with no header, is unchanged. The seam is
`useCardHeaderSlot`, exported for any component that draws controls of its own.
`.crewlet-data-table__toolbar-end` is renamed `.crewlet-data-table__chrome`,
since the row is no longer always in a toolbar, and every rule dressing the
pager and the cog is now written through it rather than through the table's
root, which is no longer an ancestor once a card's header holds them. What to
change: nothing, unless a stylesheet targeted the old class name.

**A table keeps itself inside the container it is drawn in.** Its columns are
fitted to that container by a pass that measures the scroller, and three things
were stopping it. The widths the pass computed were saved under the same entry
as the widths an operator drags to, and the existence of that entry turned the
pass off for the life of the table, so it found its own arithmetic in the store
on the next mount and stood down: a window narrowed after the first paint left
every column at the width a wider one had justified. Which columns are on was
watched by nothing, so turning a hidden one back on added its width to a row
already exactly as wide as its box. And what asked for a fit was a flag the
pass could only clear once it had something to measure, so a table mounted in a
panel that is not on screen never fitted at all once it opened. Measured on the
engine dashboard before the change: twelve of twelve tables scrolling sideways
by 300 to 500px, seven of them with no rows in them. Only the columns a reader
resized are persisted now, under `<storageKey>_resizedColumns`, and the fit
treats those exactly as it treats a `width` a caller locked;
`<storageKey>_columnWidths` is retired and deleted on mount, because nothing in
it could be told from the pass's own arithmetic. The shrink also takes its room
from every column still above the floor rather than from whichever is last in
the row, and a row a single pixel over its container is corrected rather than
tolerated. What to change: nothing, unless a screen relied on a table holding
widths measured against some other container. A reader who had dragged a column
wide sees it back at the table's own width once.

**A table with no rows is laid out by its content.** A column width is a claim
about content: this column needs this much room for what is in it. A table
drawing one full-width message instead of rows, because it has nothing to show
or an error to show in its place, has no such content, and under the fixed
layout that claim is an instruction the browser carries out whatever it costs,
so the row came out wider than the box it sits in with a reader scrolling
sideways past columns holding nothing. The widths stay stated, so the header
keeps the shape its rows will land in; the table carries
`crewlet-data-table__table--rowless` until they arrive, and that class puts it
on the automatic layout, which reads a stated width as a preference and shrinks
the row to its container rather than past it. The loading skeleton keeps the
fixed layout, because its bars stand in for the rows about to replace them.
What to change: nothing.

**A frozen table scrolls rather than clip.** A rail carrying a `sticky: 'right'`
column locked its scroller to `overflow-x: hidden`, on the reasoning that the
fit pass always redistributes the regular columns to fit. The fit has a floor,
`minColumnWidth`, so a container narrower than those floors plus the pinned pane
is one the columns cannot be fitted to, and what the lock did there was clip
them: measured in a 460px box, 164px of the row was cut off, reachable by no
wheel, trackpad or bar a reader has. The row scrolls in that state and the pane
stays pinned to the scroller's right edge at its own width. The gutter the fit
pass reserves beside that pane is read off the cell that draws it rather than
assumed, so it is right at every density: it was a flat 24px, and the
comfortable density draws 27, which put the row three pixels past its container
and is a scrollbar now that the rail is not locked shut. What to change:
nothing.

**`TagsInput` has its own folder**, so `@crewlethq/ui/TagsInput` carries its
stylesheet. Importing `styles.css` whole, or the root barrel, changes nothing.

**The focus ring is an OUTLINE.** Nineteen component rules drew it as `outline:
none` plus a box-shadow, and forced-colors mode drops every box-shadow and
keeps outlines, so that ring disappeared entirely for the readers who most need
one. An application stylesheet that restyled a uilet component's focus ring by
overriding its `box-shadow` no longer reaches it and overrides `outline`
instead.

**`Tabs` renders a `div role="tablist"`, not a `nav`.** A tab strip is not a
navigation landmark, and a screen reader listing a page's landmarks was offered
every strip on it. A stylesheet or a query that selected the `nav` element
selects `.crewlet-tabs` instead; a class selector is unaffected.

**`Tabs` is one tab stop, and selection does not follow focus.** Every tab
used to be a tab stop and no arrow key did anything. The arrows, Home and End
move along the row now and Enter or Space selects, because a tab is a section
that pushes a history entry. Tabs carry `aria-selected` and no longer carry
`aria-current`: on a tab that told a screen reader the tab was the page the
reader was on. In `renderItem` (router) mode the root is a `nav` and nothing
carries a tab role, which is what a row of links has always been.

**`Checkbox`'s accessible name is now the label alone.** The label element
wrapped the description too, so the name was the whole paragraph and the
consequence of ticking the box was buried inside the name of the box. The
description is pointed at with `aria-describedby`, merged with any the caller
passes. The root is the `label` element rather than a div beside one, so the
whole row is one target.

**`FormField` renders the help line BESIDE an error, not instead of it**, and
joins both into `aria-describedby` in reading order. A form that relied on the
help line disappearing when a value was refused now shows both.

**`Select`'s keyboard changed.** Its list is a popup on the layer stack, so
Escape closes the list and stops there, and a press on a dialog's veil closes
the list and leaves the dialog. The arrows, Home and End step over disabled
options, type-ahead reaches a row, and `aria-selected` marks the CHOSEN option
rather than the highlighted one, which `aria-activedescendant` points at. The
document `mousedown` listener and the swallowed presses inside the panel are
gone with it.

**`TimeWindowPicker` validates by round trip.** 31 February, 31 April and
24:60:60 were accepted and rolled forward by `Date`; they are refused. The
year is no longer capped at 2030. Its masked boxes hold only what was typed,
with the mask letters drawn as an aria-hidden overlay rather than being the
input's own value, and every key that is not a printable non-digit reaches the
browser again.

**`DateTimePicker`'s month is a real grid.** It was 42 buttons in a row under
a `grid` role with no rows in it, each its own tab stop. It is one tab stop
with the arrow, Home, End and Page keys, and each day is named by its full
date. A stylesheet that targeted the old `.crewlet-datetime__cell` or
`.crewlet-datetime__grid` classes targets `.crewlet-calendar__day` and
`.crewlet-calendar` instead.

**`TagsInput` draws its chips above the field**, not inline in the box, and
its markup is `.crewlet-tags-input__chips` over `.crewlet-tags-input__field`.
A value shared a box with the text somebody was typing, so a long one pushed
the caret off the end and the Move controls an ordered chain needs had nowhere
to go.

**`Modal` closes on the backdrop's CLICK**, not its `mousedown`. The overlay
used to be gone before a tap's compatibility mouse events were hit-tested, so
the click a finger ended with landed on whatever the dialog had been covering.
A test that fired `mouseDown` on the overlay to close a dialog fires `click`.

**Headings follow where a component sits.** `Accordion.Item`'s trigger and
`Card.Title` used to render `h3` whatever was above them. Both now take the
level the surrounding surface declares, which is `h2` at the top of a page and
one deeper inside a `Card` or a titled `Section`. A hard-coded `h3` in an
outline is a level missing, which is what a screen reader navigating by
heading meets. Pass `headingLevel` on an Accordion, or `as` on a Card title, to
pin one.

**`Copyable` is ONE tab stop.** Its value was a `role="button"` span with its
own `tabindex` beside the button that did the same thing, so every identifier
in a table was two stops on the way to the next row. The value is plain text
now, and the icon button is the only control; a click on the value no longer
copies. It also REPORTS A REFUSAL rather than showing the tick over an empty
clipboard, which is what it did on any origin the Clipboard API is not
available at.

**`Card`'s section padding is applied.** `padding` on `Card.Header`,
`Card.Body` and `Card.Footer` was declared and never read, so it reached the
DOM as a `padding="md"` attribute and styled nothing. It is a class now, and
`Card.Body` and `Card.Footer` take the SAME five steps as the card itself, so
one word names one inset wherever it is said. `Card.Header` takes none at all:
its rhythm is the header row's, and `divided` is the control over it. A
selector matching `[padding]` matches nothing. An interactive card also lifts
by its shadow rather than by a one pixel `translateY`, so a grid of them no
longer shifts under the pointer.

**`CodeBlock`'s lines carry a real newline**, so `textContent` and a selection
keep the structure they used to lose, and with line numbers off the code is one
text node. Its header control is `CopyButton`, which is a labelled button
("Copy") rather than the icon-only one named "Copy code to clipboard".

**`Accordion`'s trigger hover is neutral**, not the accent, and the trigger
carries `crewlet-disclosure__trigger` alongside `crewlet-accordion__trigger`,
because `Accordion.Item` and `Disclosure` are now one implementation.

**`Container`'s narrow gutter switches at 480px**, the small breakpoint token,
rather than at 640px, which was a step nothing else in the system uses.

**`Kbd` is set in the mono face, and `subtle` no longer fades it.** A keycap is
a literal, and a proportional face draws `l`, `I` and `1` as three widths of
one mark. `subtle` used to be `opacity: 0.7`, which quiets the printed key as
well as the frame and measured 3.43:1 on the panel; it gives up its raised edge
and its fill instead and takes the tertiary ink, which is measured at 4.5:1 on
every surface. A hint that names the key a reader is told to press is the last
thing on a row that may be unreadable.

**One spelling for a status.** `Tag`'s `warn` variant is `warning`, and the
Toaster's `warn` and `error` are `warning` and `danger`. The package shipped
`warn` in two components and `warning` in two others, and `danger` beside
`error`, so the same state had two names depending on which component drew it.
A tag's tones are also the phase vocabulary now (`phase-onboarding`,
`phase-execute`, `phase-review`), and every tone takes its fill, ink and line
from the token layer rather than from the five dark-theme literals it used to
spell, which measured between 1.14:1 and 1.58:1 on a light page.

**Nothing animates on arrival.** A `Tag` no longer fades in on mount: tags
arrive in their hundreds on a data push, and a list that animates every arrival
is one nobody can read while it is arriving. `animateIn` opts back in, guarded
by reduced motion.

**`Toaster`.** Its live regions are mounted from the start rather than arriving
with the first toast, split into a polite one and an assertive one, and no
toast carries a region of its own. Dismissal is a timer that pauses on hover
and on focus and keeps what is left of it, where it used to be the drain's
`animationend`: under reduced motion, and under any application rule that
collapses animations, a toast never went away at all. A toast with no
`duration` now takes its variant's default (4s for `success` and `info`, sticky
for `warning` and `danger`) rather than being sticky, and the stack portals
into the nearest `LayerHost`. `ToastProvider` and `useToast` are new.

**`Callout` sets no role.** Every callout was a `role="status"`, so a screen
reader arriving at a screen read out each static banner in turn and one that
had been up for an hour was announced as news. Announcing is opt-in through
`live` or an explicit `role`. It also always draws a glyph, which cannot be
turned off: under deuteranopia the warning and danger hues move towards one
another and a callout has no label of its own to fall back on.

**`Avatar` is neutral.** The initials fallback no longer takes the brand fill,
and the seeded tints need `tone="seeded"` beside `colorSeed`. A hash of a name
carries no information: rename the seat and its colour changes. Its default
size is the `md` step (32px) rather than 64px, and its initials split on
hyphen, underscore and dot as well as whitespace, so `backend-engineer` is BE.

**`StatCard` drops the `brand` tone**, and the tone it is given now paints the
VALUE rather than the icon, which is what its props always said. A `loading`
tile draws a placeholder line and carries `aria-busy` instead of a literal
`--`, which a screen reader reads as "dash dash".

**`Skeleton` drops `glowColor` and `animationDuration`**, and the
`SkeletonGlow` type with them. Each of the five glows was a raw `rgba` outside
the palette, and a blue placeholder and a red one say nothing different about
content that has not arrived.

**`Modal` names itself.** `labelledBy` is gone: the title is linked by an id the
component mints, so a dialog is named whether or not the caller remembered to
name it, and a surface that draws no title takes `ariaLabel` instead. None of
conlet's sixteen dialogs passed `labelledBy`, and every one of them was
announced as "dialog" and nothing more. `describedBy` still overrides, and
defaults to the subtitle.

**`Modal`'s title is not a heading element.** It was an `h2`; it is drawn at the
heading register on a `p` now, and a surface PROVIDES heading level 2 to
everything inside it, so a section in a dialog is an `h2` however deeply the
component that opened the dialog was nested. The dialog role already announces
the title, and a reader moving by heading met it twice. A stylesheet on
`.crewlet-modal__title` is unaffected; a query for an `h2` inside a dialog is
not.

**`Modal`'s footer holds two slots.** `footerStart` is drawn at the inline start
and `footer` at the inline end, each in a wrapper of its own, so a stylesheet
selecting `.crewlet-modal__footer > button` selects nothing now and wants
`.crewlet-modal__footer-end > button`.

**`ConfirmModal` mid-request refuses every way out.** `submitting` used to stop
the veil alone, so Escape and the close control still abandoned a request whose
outcome nobody had seen; it maps to `dismissable` now, which is all three. The
confirm button reports `aria-busy` instead of having its label swapped for
"Working", the prompt is a form whose confirm is the submit button (so Enter
from a field answers it), a `destructive` prompt is an `alertdialog`, and a
rejected `onConfirm` leaves the prompt open rather than becoming an unhandled
rejection. `confirmDisabled` and `submitting` no longer set the native
`disabled` attribute on the prompt's buttons either: each is soft-disabled with
`aria-disabled` and a reason, so the button keeps its focus and its pointer
events and can say why it refuses, which a natively disabled control cannot.

**`DataTable` sorts and marks rows differently.** The first press on a header
sorts ascending unless the column says otherwise with `firstDirection`, the
comparator is index-stable, and an absent value (null, undefined or NaN) sorts
last in BOTH directions, because a seat with no meter has not spent the least,
it has not been measured. A row's expanded state moved from the `tr` to a
button inside it, so `aria-expanded` is on the control rather than on the row;
a press that starts on a link, button or field inside a row no longer also
fires `onRowClick`; and the page resets on a filter or a sort rather than on
the row count. The props are generic in the row type (`DataTableProps<TRow>`),
which only a TypeScript consumer sees.

**A DataTable row action says `danger`, not `variant`.** `DataTableRowAction`
takes `danger: true` in place of `variant: 'danger'`, and `variant: 'primary'`
is gone: the kebab is the package `Menu` now rather than a second menu built
inside a Popover, and a menu has one destructive step and no headline one. Its
markup and its `crewlet-data-table__row-actions-*` classes went with it.

**A DataTable's archived row is neutral, and names its own property.** The
row used to be tinted and railed in a red the stylesheet mixed itself, which
says "this failed" about a row whose only fact is that nobody is using it any
more; a state that is not a problem takes no status hue. The rail is
`--crewlet-data-table-archived-rail`, one colour rather than the RGB triple
`--crewlet-data-table-archived-tint-rgb` carried, and that property is gone,
so an application that set it now has a neutral rail and no error to say so.

**`Table` renders a table.** It was a grid of `div`s and `span`s, which a
screen reader reads as a pile of text with no columns and no header
association. It emits `table`, `thead`, `th scope="col"`, `tbody` and `td`
now, with the same look and the same class names, so a stylesheet that
selected `.crewlet-table__row` as a `div` finds a `tr`.

**`AppShell` owns the layout.** It used to be passive: the slots positioned
themselves with `position: fixed` and the shell only reserved a matching margin
and padding on the content column, so every consumer repeated the rail's width
and the bar's height as literals in its own stylesheet. It is a grid now, sized
from `--size-shell-rail` and `--size-shell-topbar`, at `100dvh` with `overflow:
hidden` on the root, with real landmarks (an `aside` rail, a `header` outside
`main`, a focusable `main`), a skip link, and a narrow layout in which the rail
becomes a modal drawer on the layer stack. `sidebarWidth` and `topbarHeight` are
gone with the margins they set. The slot NAMES do not change: `sidebar` is still
`sidebar` and `topbar` is still `topbar`, and `AppShell.Rail` and
`AppShell.Topbar` are new sub-components to render into them.

**The rail's rows are chrome, and the row the reader is on takes the accent.**
`SidebarNav` drew the current row as a neutral lift with a one-pixel accent bar
outside its left edge, and its rows at the body step in the regular weight on a
12px corner. A rail is read at a glance rather than read through: a row is the
compact step in the medium weight on the chrome's own 8px corner now, and the
row the reader is on takes the accent's soft tint AND the accent ink, for its
label and for its glyph together. Position and hue, so it is found by a reader
who sees the hue and by one who does not. The glyph keeps no ramp of its own
either: it is the decoration step at rest and the row's own colour on a hovered
row and on the current one. Every pair is measured on the rail's own composites
by @crewlethq/tokens' palette suite. What does not change is where the state
comes from: `aria-current="page"` and nothing beside it.

**A rail row reads at full ink, and the rows in a group are flush.** A row at
rest takes `--color-text-primary` rather than the secondary step: a destination
is not quiet text, and fifteen rows in the quiet step are a column of grey a
reader has to hunt through. Contrast goes up on every ground a row can have,
and what carries hover is now the tint and the glyph alone, because there is no
ink step above the resting one. `NavGroup` also stopped putting a step between
the rows it holds: the group's label has its own bottom inset and the rail's
own gap separates one run from the next, so a step per row was 4px fifteen
times over, which stood the engine's rail 823px in a 755px scroller and left
its last two destinations reachable only by scrolling. A group whose label is
empty (`""`, `null` or `false`) draws no heading box at all and adds no level
for a screen reader to walk, where an empty `<div>` used to carry the label's
own padding and put sixteen blank pixels at the top of the rail.

**A nav badge has a tone, and the slot is what paints it.** `NavItem` takes
`badgeTone="attention"` for the one badge in the chrome allowed a status hue: a
count of what is waiting on a person, drawn as the warning ink on the warning
tint in a pill. The slot draws every badge now, so whatever is passed in
contributes its text and the name a screen reader reads after the row's own,
and a `<Count>` in a rail row is a figure rather than a second pill inside the
first. A caller that relied on a `<Count>` keeping its own inset pill in a nav
row sees a bare figure instead, which is what a rail badge was always meant to
be.

**The rail's head draws no divider, and its foot has a row shape.** `AppShell`
put a bottom border under `AppShell.Rail`'s header, at the same height as the
top bar's own, so the two read as one rule running the width of the window with
the brand and the screen title above it like a second bar. The rail is one
column: the bar's line belongs to the bar and the rail's right edge separates
the two. `AppShell.RailRow` is new, for the foot: a row on the rail's own two
insets (the gutter and the row pad), so a status line's mark lands on the line
every nav glyph above it sits on, with the 24px target floor that
`--size-row-sm` carries. It is a control only when it takes an `onClick`, and
`label` is refused by the type without one, because `aria-label` on an element
with no role is a name nobody is ever told.

**And the foot claims whatever else lands in it.** An application with a status
control of its own reaches for that one whatever this package offers, so a
`Button` that is a direct child of `AppShell.Rail`'s `footer` is drawn as a row
in the rail: the gutter and the row pad, the quiet ink, the regular weight,
left aligned, filling the rail, its label truncating, and its focus ring inside
its own box because the shell clips at exactly the viewport's height. A button
dropped there used to be centred in a 263px rail on a toolbar's inset, in a
toolbar's ink. Only a DIRECT child is claimed, so the theme and density
switchers a foot also holds, which sit in a row of their own, keep their own
register. The row itself is a spacing step above and below its line (34px at
the normal density) rather than a control height, with `--size-row-sm` under it
as the 24px target floor, and its transparent boundary spends one pixel of that
step rather than adding one, so a bordered row and a borderless one in one foot
stand the same height.

**The brand lockup is one block in the rail's own register.** `BrandLockup`
put a 4px gap between the product name and the context line under it, which
read as a name with a caption rather than as one lockup; the leading is the
space between them now, and it is the document's own rather than a tight step,
because the eight pixels it spends are eight the rail's head already has and
the two lines otherwise sat closer together than any other pair of lines in the
product. The context line drops from the wider uppercase step to the wide one,
which is the step the rail's group labels take: the two uppercase runs in the
rail sit twenty pixels apart, and at the wider step the company's name was
visibly broader than the sections under it. It also drops to the regular
weight, which is the one thing left separating it from those group labels: at
the same size, tracking, case and weight the company's name read as a third
section heading. The mark stays 24px, because that box is also the link's
target height and 22px would take the one control that always means "go home"
under the 24px floor.

**A keycap and a monogram are set on the document's own line.** `Kbd` took a
tighter step than the text it is drawn inside, so a cap stood a pixel under its
line and every row holding one sat a pixel off the rows that did not; a cap is
21.5px tall now rather than 20.4px. `Avatar`'s initials took a leading of 1 and
take the document's too, which draws identically (a fixed square centres
whatever line it holds) and is one number fewer in a component that sets four.

**`Input`'s widest step is 520px**, up from 480px. The steps are named for what
they hold and the widest one is the field a reader types a SENTENCE into rather
than a name, which is what the engine's knowledge search asks for: its own
placeholder runs past sixty characters and was cut mid-word at the step below.
Nothing spells `width="lg"` in the console today, so nothing there moves.

**The engine's look: the marks, the status surfaces and the feedback.** Every
one of these draws what the engine dashboard draws, which is the look the
product is standardising on. Nothing about any component's API, keyboard model,
ARIA or focus ring changes.

- **`Tag`** is the engine's badge: an 11px label in the medium weight, a 4px
  corner, one pixel of padding above and below and eight on each side, on the
  tone's soft tint under its ink. An unsized tag renders at `size="sm"`, which
  is that 20px badge, where it used to render at 28px; `size="md"` keeps 28px
  and moves to a 12px label. A tag that ACTS is 24px, because the engine's own
  20px press is a target under the WCAG 2.2 floor and that is the one place its
  look and the rule disagree. A phase variant renders UPPERCASE in the
  micro-label register. A neutral `outline` tag takes the tertiary ink. A
  `dot` inside a pill is drawn in the PILL'S OWN INK rather than in the
  tone's fill step: the fill is measured as a mark against a page surface,
  and on the tone's own soft tint the accent fell to 2.65:1 and the danger
  red to 2.96:1 in the dark palette.
- **`FilterChip`** is neutral until it is on: the tertiary ink at the regular
  weight, 8px of side padding rather than 12px. Its count inherits the chip's
  ink rather than drawing a step quieter.
- **`Avatar`** is a ROUNDED SQUARE unless `shape="circle"` is passed, and the
  square's corner moves with the box (4px at 20, 8px at 26 and 32, 12px at 40).
  A NUMERIC size follows the same ladder rather than taking one fixed step,
  so `size={24}` draws an 8px corner where it used to draw 12px, and any box
  of 36px or more keeps the 12px it had. A dashed human badge takes the
  default hairline. `ImageUpload` follows both: its trigger and its overlay
  round with the badge inside them rather than at a step of their own.
- **`EntityChip`** takes the accent ink on hover as well as underlining.
- **`Callout`** draws no coloured boundary: the tint IS the boundary. Its
  padding is 8px and 12px rather than 12px and 16px, and its corner 8px.
- **`Toaster`** lands on the panel surface with an 8px corner and the md
  shadow, 16px from the viewport edge, 420px wide. A danger toast paints its
  title, message and close control in the danger ink.
- **`Skeleton`**'s line, avatar, circle and button sweep a gradient rather than
  fading a flat fill, at 1.5s; its card, list-item and info-item frames no
  longer pulse.
- **`EmptyState`** sets its title in the secondary ink and its description in
  the tertiary.
- **`Meter`**'s track is 4px at both sizes, and its legend label is tertiary.
- **`StatCard`** renders its LABEL ABOVE ITS VALUE, which is the order a board
  is read and heard in, with its sub line in the tertiary ink. A standalone
  tile and a `StatGroup` both cast the panel's xs shadow, and a `StatGroup`
  reflows to two columns at 900px rather than 768px.
- **`PricingCard.Tag` and `PricingCard.PriceNote` render a `Tag`**, so they are
  no longer uppercase, their corner is 4px rather than a pill, and the top tag
  takes the accent's soft tint under its ink rather than the solid accent fill
  under white. The card casts the panel's xs shadow.
- **`Count`, `StatusDot`, `TagGroup` and `NewItemsNotice`** keep their APIs and
  their shapes. `StatusDot`'s pulse completes in 1.8s rather than 3.6s, and
  `NewItemsNotice` drops to the regular weight with the accent FILL on its
  hover boundary.

Three engine values are deliberately not adopted, each because it puts a colour
under the floor it has to clear: the neutral `StatusDot` and the neutral
`Meter` fill keep `--color-text-tertiary` rather than the decoration step,
which measures 2.33:1 on a light page and 2.25:1 on a dark one as a mark; a
`FilterChip`'s count keeps a measured text step for the same reason; and a
pressed `Tag` keeps its boundary rather than repainting its ground, which the
engine draws as its own ink on its own ink, at 1:1.

**Every table is drawn in one register.** The two `DataTable` variants,
`Table` and `TreeGrid` each spelled their own version of a column head; they
take one now, which is the micro-label step the rest of the system uses: 11px,
medium, uppercase, on the wide tracking, in the tertiary ink, with one rule
under it and a hairline between one column and the next. A cell is the compact
step on the table's own inset pair, in a row at least as tall as
`--size-row-md`, so a table tightens with the density setting. What this costs
a consumer: a header that was body-sized words is now a micro-label row.

**The header row is a band only where the rows are bounded.**
`maxBodyHeight` is new on `DataTable`, passed through by `DataView`, and unset
by default. A number of pixels or any CSS length caps the rows, so they scroll,
and that is also what pins the column names and paints the ground they need to
be read over the rows passing behind them. ONE prop, because either half alone
does nothing: the rows already sit in a scroller of their own (a table has to
be able to overflow sideways, and a box that scrolls in one axis scrolls in
both), so a pinned header pins against THAT box, and unbounded it is as tall as
its rows and never moves. Unset, the header row stands on whatever the table
stands on, which is what a table the PAGE scrolls wants. The comfortable
density still paints its header either way: at that density an unfilled header
row reads as one more row.

**Every row lights up under the pointer, and a row that acts points.** On a
table twelve columns wide the tint is how a reader holds their eye on one row
while they cross it, so every row takes it; what says a row can be PRESSED is
the cursor, and only a row that is `--clickable` or carries a row link takes
one. `--crewlet-data-table-row-hover-bg` is the OVERLAY step rather than an
opaque surface, because a table sits on the page, on a card and inside a dialog
and only an overlay composites onto all three; the rows themselves paint no
background at all. A hovered row carries that tint all the way to its pinned
right pane, whether or not the row is a control: the table the pane was drawn
for holds its action as a link inside the pane and has no clickable row at all.

**A chevron column is drawn at the chevron's size, and pressed at the target
floor.** The expand-all control in the header and the expand control on each
row are the drawing and a step of halo, not a 28px control box, because those
two cells are what set the height of the column-name row and of every row in
the table: painted at the control step they cost six pixels of the first and
ten of each of the rest. The pressable area is a centred pseudo element at
`--size-control-sm`, which floors at 24px however the density is set and
reaches into the cell's own padding rather than making the cell taller. Their
focus ring is the one ring in this component drawn OUTSIDE its control, since
an inset one would be a square on the glyph.

**A selected row is the tint, and a row's state rail is an ink step.** The
selection ring came off: it is the mark a selected CARD takes, and on a run of
hairline rows it boxed one row out of the list. The tone rails
(`--tone-danger`, `--tone-warning`, `--tone-info`) move from the fill step to
the matching `-ink` step, because a fill is measured to 3:1 against the OPAQUE
surfaces and a rail is drawn on the row: on the accent tint of a selected row
the danger fill measured 2.86:1 in dark on a card, so the one row that was both
the reader's and broken had a mark nobody could see. The other two tones cleared
the floor there and move with it anyway, because which tone a row carries is not
a reason for its rail to be drawn to a different floor. @crewlethq/tokens'
palette suite measures all three on every ground a row can have now; the
tightest is 5.05:1.

**The table says what it only drew.** The pagination cluster is a named
`group`, so the name it has always carried is attached to a role and read: on
a plain div `aria-label` names nothing. A group and not a landmark, because a
landmark named "Pagination" has to be unique on the page and a table cannot
know how many tables it is on screen with. The page number announces which rows the page is as
well as which page it is (`labels.pageRange`), because a page number says where
a reader is in the chrome and nothing about what they are paging through. One
live region sits beside the table, mounted with it and empty until it has
something to say, and reports both the loading state (`labels.loading`, beside
the table's own `aria-busy`) and the empty row's own rendered text, so a filter
that empties a list is heard and not merely seen. The TEXT rather than the node:
`emptyMessage` is usually a whole `EmptyState` and sometimes holds a control, and
a second copy of that inside the region would be a tab stop nobody can see. It is beside the table rather than around
the sentence because a region that arrives together with its first content
announces nothing: a reader's software registers the region, then reports what
changes inside it, and the empty row appears at exactly the moment it would
have had to speak.

**A pinned column keeps an opaque base.** A sticky-right cell mirrors the row's
tint as a background LAYER over its own opaque colour rather than as the
background itself, so the rows scrolling behind it still do not show through.
Its default ground is the elevated step: the pane is the one part of a row that
is not the row, and it reads as the pane it is by standing one step off the
ground the rows are on. A table on another ground rebinds
`--crewlet-data-table-sticky-bg`.

**`Table` frames itself and can be bounded.** The boundary and the radius move
from the scroller to the table, so the frame clips a header band that runs to
the edge and an action row that is fenced from the rows above it rather than
floating under the frame. The plain `Table` draws no hover tint, for the reason
above: none of its rows is a control. `maxHeight` is new, and it is what makes
the sticky header mean something: a bounded table becomes its own vertical
scroller and keeps its column names on screen.

**`PageHeader` is the operator's head, not the marketing one.** The title drops
from the 32px display step to 20px and the description from 16px body to the
13px compact step in the tertiary ink, with one spacing step between them
instead of two. On a screen whose job is to show a table, the old head took a
third of the first fold before a reader reached a row.

**`DataView` pages when a screen asks it to.** The composite passed
`paginated={false}` as a literal, so no list screen could page whatever it
passed, and the settings frame's page-size row was gated off with it. It is a
prop that still DEFAULTS to false (a list screen scrolls unless it asks not
to), and `page`, `itemsPerPage`, `pageCount`, their callbacks,
`defaultItemsPerPage`, `itemsPerPageOptions`, `columnOrder`,
`onColumnOrderChange` and `resizable` reach the table too.

**A list screen is one object.** `DataView`'s toolbar renders in the table's
own toolbar row, through the table's `renderToolbar` slot, so the screen's
search, Filter and Sort share a row with the table's pagination and settings
cog rather than drawing a second bar above it. The chips go in
`renderFilterBar`, a new `DataTable` slot for the band between the toolbar and
the rows, drawn only when something is in it: a screen with no filters on has
no empty strip. The chip row keeps its own fences when it is used on its own,
which is what the exported `FilterAxisBar` is for. A framed list clips with
`overflow: clip` rather than `overflow: hidden`, because `hidden` makes the
panel the nearest scrollport and a sticky child of a box that never scrolls
never moves, which is what `stickyToolbar` needs; it now pins the whole band,
the table's half of the row included.

**`DataView`'s panel holds the table and nothing else.** The count that used
to close it is gone from every list, so `.crewlet-data-view__table` has one
child and the rows are the last thing inside the frame. The last row keeps its
hairline cancelled, because what closes the list now is the frame's own bottom
edge one pixel below it. The chip fence is a solid hairline rather than a
dashed one, because a dashed edge means something else in this system: it is
the mark a card wears when it stands for somebody outside it. The axis name on
a chip and the chevron beside it drop their opacity, which had taken the chip's
own measured ink down to 3.97:1 and 3.00:1 respectively.

**The canvas stands on the page's ground, and `TreeCanvas` draws the card.**
`Canvas` paints `--color-surface-background` rather than the panel surface, so
the cards on it read as objects on a field rather than as one sheet; a card
that painted the panel colour is now visible against it, and one that painted
`--color-surface-elevated` should move to the panel step.
`.crewlet-tree-canvas__card` carries the frame (surface, boundary, 12px radius,
`--shadow-xs`), the inset and radius of every `role="treeitem"` inside it, the
focus ring those items never had, and the accent ring on the selected one, so a
consumer that drew all of that itself now draws it twice. `cardOutline` is the
new prop for the dashed edge of a card that stands for somebody outside the
system. The connectors take `--color-border-control` rather than
`--color-border-hover`: they are the only thing on the chart that says who
reports to whom, and at 1.48:1 in light they were a line a reader had to hunt
for.

**`TreeGrid` stands on the panel surface** rather than the elevated step, which
is the colour a hovered row takes elsewhere, so an outline beside a table read
as a table with every row hovered at once.

**`Charts` gains `TimeSeries` and `Sparkline`,** the two shapes the kit had no
way to draw: a quantity over time whose x domain is the WINDOW rather than the
data, and a shape beside a number that is hidden from assistive technology
because the number already says everything it could. The legend swatch is a
rounded square rather than a circle (at the smallest radius step an 8px swatch
is a `StatusDot`), and a bar list's sub-label, tail and empty line move from
the 11px micro-label step to the 12px caption step, which is what they are.

**`ErrorBoundary` is a panel.** It takes the panel's body inset and its rim
light, its title drops from the 18px heading step to the panel-title step, and
its description to the compact step.

**The rule under a table's last row belongs to whatever ends the rows.** A
table standing on the page draws it, because nothing else closes the list and
without it the rows stop in mid-air. Inside a `DataView` panel the frame takes
it away, since the count row's own border sits one hairline lower and the two
met as a doubled rule; the suppression is written where the frame is, which is
`DataView`'s sheet, so a consumer framing a table itself keeps the same
freedom. Both horizontal scrollers also contain their overscroll now, so a
trackpad swipe that runs out of table no longer carries on into the browser's
back navigation.

**A `TreeCanvas` node is a stack the component draws.** The card's frame moved
into the component and the rhythm inside a node did not, so `role="treeitem"`
now carries the flex column, the one-step gap and the default cursor along
with the inset and the radius it already had. A consumer drawing those round
its own name and meta line should drop them.

**A `TreeCanvas` card is one column, and the pointer's controls are drawn over
its end.** The card was two columns and the second held the buttons, so every
name in a chart was measured against the width three controls left over and the
longer half were truncated at rest, for controls nobody was pointing at. The
strip is quiet until the card is reached (by hover, by focus, on the selected
node, and while a menu opened from it is up), so a name has the whole card.
`ctx.actions(id)` is the whole of that strip now and replaces spreading
`ctx.press(id)` on one: it carries the class the reveal is keyed on, the
removal from the accessibility tree and the same press. It has to sit
immediately after the node's own treeitem. `ctx.press` stays, for a
pointer-only region that is NOT that strip. `renderUnder` is new: what hangs on
the branch below a card, normally the control that adds a child, in a band the
card's measured height already includes.

**`TreeCanvas` connectors turn near the child rather than running flat across
the gap.** They were a square step, whose corners sit on the horizontal run a
parent's children all share; they are a rounded step, so the corner belongs to
the child it reaches. A consumer that measured the path data will see `V`, `Q`
and `H` where it saw `V` and `H`.

**`TreeCanvas` draws an org chart node as well as a card, and `layoutConnectors`
returns objects.** `appearance="node"` is the console org chart's own drawing: a
node one rank tall and as wide as its own name between a fixed icon zone and a
fixed actions column, the actions as a column down its right edge, and the
control that adds a child as a disc on the branch below. `connector="curve"` is
that chart's branch, one cubic from a parent's bottom into a child's top.
`cardTone` tints a node with one of six hues, which reaches its fill, its edge,
a halo outside it, its name's ink and the branch arriving at it, from one
answer. `OrgNodeLabel` and `OrgNodeLead` are what such a node normally holds, the
first of them `OrgLabel` in its node layout, which is the same component a
table row's name cell is.
Nothing changes for a chart that asks for none of it, except that
`layoutConnectors` now returns `{ id, parent, d }` rather than a bare path
string, so a connector can be asked about the node it reaches.

**An org chart is drawn on RANKS, and the space around it is part of the
layout.** `appearance="node"` lays every card of a depth on one band, as tall
as the tallest card in it and each card centred in it, with the next band a gap
below: a rank of an organization is a row a reader scans across, and two units
of one company sit on one line whether or not one of them carries a lead along
its bottom edge. It is what the console chart does, and the spacing is that
chart's own, as the nearest steps on this scale: `--spacing-9` between
neighbours on a rank, `--spacing-11` between ranks, and `--spacing-8` around
the whole chart, measured from probes so density scales them. A chart of panels
is unchanged, and either answer can be asked for outright with the new `ranks`
prop. `layoutForest` takes `ranks` and `margin` alongside its gaps, and its
refusal now names the three rather than "gaps".

**A chart arrives rank by rank, and a relayout moves the cards rather than
replacing them.** Cards are revealed 60ms apart, down the chart and then across
each row, and each branch waits for the card it arrives at; a relayout tweens
every card and every connector from where it was to where it is, over 350ms. A
card waiting its turn carries `data-enter="waiting"` and is drawn at nothing,
still measured and still in the layout. Neither runs under
`prefers-reduced-motion: reduce`, where the chart is drawn whole and every
relayout is a jump. A consumer that read a card's `transform` immediately after
a change will now read where the card WAS, and should read it a frame later or
ask the layout.

**The control that adds a child is a pill that splits, and it is drawn on a
resting chart.** `AddPill` is the console chart's own gesture: one quiet mark on
the branch, a spacing step across against the 24px pointer target around it,
which opens into a section per kind when it is pointed at, with a spring out of
a fraction of its width and a recoil back. In `appearance="node"` the strip
under a card is no longer hidden until the card is reached; what is in it and is
not the pill still is. A chart that hung a `Menu` under its cards keeps working
and keeps its old resting state; one that wants the console's gesture returns an
`AddPill` from `renderUnder`.

**`OrgTable` draws an organization as an indented table of rows,** which is the
console's org table and the other half of the pair `TreeCanvas` opens: the
chart shows the shape and the table answers questions about it, in an order a
sort would destroy. It composes `TreeGrid`, so the rows, the keys, the cells,
the add row and the layer its menus open in are unchanged; what it adds is the
drawing that table already had and no consumer could reach. The tree's wires
run down one gutter, and the element that draws a row's branch IS its indent,
so the two can never disagree. `OrgTableName` is the two-line name group, and it
is the SAME COMPONENT a chart node carries (`OrgLabel`) in its row layout,
ranged left rather than centred, because a column of names is read down its
leading edge. `OrgTableActions` is the strip
of row controls, quiet until the row is reached by the pointer, by focus or by
being the selected row, and simply drawn where a pointer cannot hover.
`OrgTableAdd` is the SLOT the add pill opens in, and the pill in it is
`AddPill` itself, so a row's plus and a branch's are one gesture. `tone` marks a row with one of the six
node hues, reaching the branch arriving at it and the mark and name in it, and
never the caption: the accent clears 4.2:1 on the table's own ground, which is
over the floor for a drawing and under it for a word. Expand all and Collapse
all are a tab on the table's own top edge, since they act on that table rather
than on the screen around it.

**The org table's add is the chart's own pill, and a row stands at the
console's own step.** `OrgTableAdd` held a second implementation of the split
pill, which had no split, no divider between its kinds and a boundary of its
own; it holds `AddPill` now and passes that component's props straight through,
so one keyframe pair, one divider and one colour reach both surfaces. The plus
is a sibling of `OrgTableActions` rather than a control inside it, so it is
drawn on every row that can take a child instead of waiting for the pointer,
and the row reserves the width the pill takes OPEN (`--crewlet-org-table-add`,
one pointer target per kind), so the split no longer grows back over the cell
beside it. The indent is `--spacing-8` a level where it was `--spacing-5`, a
row in the tree stands at `--size-row-lg` where it stood at the grid's own step,
the name group fills its cell so a trailing slot lines up down the column, and
the Expand all and Collapse all pair no longer wears the same plus as the add
on the rows beneath it. In `TreeGrid`, opening a row TURNS its chevron rather
than swapping one drawing for another.

**`Canvas` says its zoom, between the two steppers.** Pressing the percentage
puts a field in its place; Enter applies, Escape and blur abandon. Two labels
join `CanvasLabels` for it, `zoom` and `zoomLevel`, so a canvas in another
language sets them. Nothing needs an edit: a canvas drawing its own zoom
readout beside the controls now draws two.

**`AddPill` is GREEN, and it is one control for two surfaces.** The mark, the
pill's edge, the dividers and a hovered choice read the node ramp's green
(`--color-node-green` and its derived steps) rather than the brand accent: the
org chart this is drawn from paints this control, and nothing else on the
chart, in one hue, which is what lets "the green plus" name a control. The
quiet at rest is on the PLUS rather than on the whole button, because the disc
behind it is a mask for the branch and a mask at half opacity is not one; the
resting plus measures 4.01:1 and 3.79:1 on the dark grounds and 3.50:1 and
3.31:1 on the light, where it measured 2.96 and 2.47 before. It also takes
`size` (`sm`, the branch's disc; `md`, a row's control step) and `layout`
(`split` over the mark; `inline` beside it), so a table row draws the same
gesture as the chart, and a section may carry a `disabledReason`. Nothing
needs an edit: the defaults are what the chart drew before.

**`AddPill` wears the console chart's own chrome.** The disc and the pill carry
the NODE's ground (the page's own, with the card's step painted over it, so the
pair is opaque wherever the chart is panned to) rather than the page's alone,
which read as a hole punched in the chart; the disc's hairline is drawn at rest
and fades over 150ms, as that chart's does; the two dividers are inset to the
pill's own sixth, take no press, and are ELEMENTS rather than a border on a
section, because a border cannot be shorter than its box and the box here is a
pointer target half as tall again as the pill. A resting choice is at the
plus's own step, which measures 3.80:1 and 3.99 on the dark grounds and 3.31
and 3.51 on the light; that chart draws its choices at 0.6, which measures 2.51
on the light node ground. What to change: nothing, unless a stylesheet reached
the disc as `.crewlet-add-pill__mark::before` or the divider as a section's
`border-left` (see the table below).

**`OrgNodeDisclosure` is new, and a chart that collapses draws its expander in
it.** The branch under a node is the ADD's, and only the add's, which is what
that chart draws: a second control beside it is a pair fighting over one place,
and a pill splitting open covers whatever was next to it. In the `node`
appearance this straddles the card's leading boundary and is out of the flow,
so a node that can be expanded is the same width, the same height and in the
same place as one that cannot, and it is quiet until the node is reached, by
focus as well as by a pointer. **Render it as a SIBLING of the element you
spread `ctx.item` on**, exactly where `ctx.actions` goes: a tree's items hold
nothing focusable, so it cannot be a slot on `OrgNodeLabel`, which renders
inside that element. It hides itself, as the actions strip does, and costs a
reader nothing, because expansion is on the treeitem as `aria-expanded` and the
Right and Left arrows. Spread `ctx.press(id)` on it, exactly as the strip under
a card takes it: a press has to leave focus on the NODE, and the component owns
what cannot be forgotten while the caller passes the one thing only the chart
knows. What to change: a chart drawing an expander in
`renderUnder`, or as a third cell of the actions column (16px on one rank,
under the target floor), draws it here instead.

**`OrgNodeLead` draws the pill and the clear the way that chart does.** The
pill is bounded at the hover step rather than the separator's, since it is a
boundary around a value and every other line inside a node is a separator, and
its words carry medium weight; the clear is a small disc with a ground a step
past the card's and a boundary of its own, with a glyph a third of it, inside
the pointer target that is pressed. Both the disc and the pill's own ends are
ELEMENTS, because what a node is painted with is measured and no cascade
reports a pseudo element's paint. What to change: nothing, unless a stylesheet
reached inside the clear.

**A `TreeCanvas` node is painted over the page's ground, toned or not.** The
branches are drawn under the cards and the neutral surface step is translucent
where no theme is loaded, so a node with no tone had the rank above running
through its own face and its name; a toned card already went down this way.
What to change: nothing.

**`OrgNodeLabel`'s caption is the neutral tertiary ink on every node.** It used
to take the node's own hue on a toned card, where it measures 4.2:1: over the
floor for a drawing and under it for a WORD, and the same word was drawn in two
colours across a chart and the table beside it. What to change: a chart that
wants its caption tinted draws its own; the hue still reaches the card, its
edge, its halo, its branch and its name.

**`OrgNodeLabel`'s trailing slot is a fixed width, and only drawn when asked
for.** It was a 4px floor, so a live badge arriving made the node 35px wider
and relaid the chart, which is what both this component and the chart above it
promise never happens. It holds one control step of room whatever it is
given, with its own separation either side, and a node that passes no
`trailing` is drawn with no slot at all. What to change: a
chart whose marks are wider than that step either shortens them or draws them
on the caption line, where the wiring marks already ride.

**`OrgNodeLabel` and `OrgTableName` are one component now, `OrgLabel`.** They
said the same four things about the same organization, in two components under
two class prefixes: measured declaration by declaration the two stylesheets
agreed on 38 of the 62 they set across the six elements they both draw, and
seventeen of the 24 that differed are one difference restated, that a chart
node is a box as wide as its own name and a table row is a line in a column.
That is `layout="node" | "row"` now, and every other rule is written once. The
other seven were the same rule written two ways, which is where the two defects
below lived. Both names stay, as the layout filled in, so no
call site changes.

Two defects go with the split. The chart repainted a mark that publishes its
own ink and the TABLE did not, so a brand mark on a toned row was the one thing
on it still drawn in somebody else's colour; the table held every child of its
caption to a fixed size and the CHART held only a bare glyph, so a mark that
arrived inside a span naming it shrank with the strip around it. Each surface
had one of the two; both now hold for both.

What to change: a stylesheet reaching either component's parts by class. The
shared elements are `.crewlet-org-label__icon`, `__text`, `__name`,
`__caption`, `__kind` and `__trailing` for both surfaces, and a row's wrapper,
which was `.crewlet-org-table__node`, is `.crewlet-org-label--row` and still
carries `data-tone`. Nothing a caller passes moved, and `OrgNodeDisclosure`,
`OrgNodeLead` and the rest of the table are untouched.

**`OrgNodeLabel` takes `iconSize`.** `lg` fills three quarters of the icon
zone, which is the proportion the console chart gives the mark that stands for
the thing a chart is ABOUT; `md`, the default, is unchanged.

**`OrgNodeLead` wraps its `clear` control**, so the chart can reveal it with
the node's other controls and grow its target past the pill's own edge. What to
change: nothing, unless a stylesheet targeted the control as a direct child of
the pill.

**`TreeCanvas`'s add hangs BELOW the node it belongs to.** In its `node`
appearance the strip under a card is out of the flow and drawn on the branch
the children come off, centred on the node's own axis in a three-track grid,
which is where the console chart puts it; it was inside the card, 13px above
the branch's own start, and 14px right of the axis whenever an expander shared
the strip. The room it needs moved into the rank gap with it, so the distance a
reader sees between two ranks is the same number it was. The hairlines inside a
node are inset at both ends, as that chart's are. What to change: nothing; a
caller that positioned something in that strip itself should check it.

**`TreeCanvas` puts the canvas controls in the chart's own corner.** The
`node` appearance defaults them to the top right, which is where that chart's
toolbar is. `controlsExtra`, `controlsBelow` and `controlsPlacement` pass
through to `Canvas`; `dimmed` pushes the chart back behind a surface opened
about one of its nodes, and the ref is a `TreeCanvasHandle`, which adds
`focusRegion` and `restoreView` to what a tree view answers.

**`TreeCanvas` adds a node IN the chart, not in a dialog over it.**
`composing` names a GHOST: `{ id, parent, label, render, onCancel }`, a card
the layout knows about and the data does not. The chart grafts it into the CARD
forest after `parent`'s own children, opens `parent` if it is closed, makes
room for it in the rank the new node will land in, draws the branch into it
dashed, eases onto it with the room a form needs
(`CANVAS_COMPOSE_CONTEXT`, two thirds of the pane, where a node opened about
gets a third) and puts focus on the first control inside it; Escape calls
`onCancel`, and when it goes the view the reader left is given back and focus
returns to `parent`. Escape cancels from anywhere in the chart, not only from inside the form: a
node being composed is a MODE, and a reader leaves a mode wherever they are
standing. Its id must NOT be an id of `nodes`: that is what keeps
every real node's level, position in set, set size and key the same while a
node is being composed, and keeps the arrows, type ahead and the selection off
something that is not there yet. It is drawn OUTSIDE the tree element, because
a form is not a `treeitem`, and it is the one card in the chart that holds a
tab stop. Width is `--crewlet-tree-canvas-compose-width` (20rem). What to
change: nothing; a chart that asked for a child's name in a modal over itself
can hand that form to `composing` instead.

**`CanvasHandle.focusRegion` takes a second argument, and `rememberView` is
new beside it.** `focusRegion(target, context)`, where `context` is how many
times the region's own width the visible width comes to: `CANVAS_FOCUS_CONTEXT`
(3) when it is left out, which is what every existing caller gets.
**The canvas has TWO eases, and `data-animate` names which is running.** A
fit, a zoom step and a reveal are CORRECTIONS to the view the reader already
has, and keep the default step; easing onto a region and giving the view back
are the chart GOING somewhere, and take two `moderate` steps with the in-out
curve, which is the console chart's own 400ms viewBox ease. At the correction's
step that movement read as a jump, 2.7 times faster than the chart it is drawn
to match, and what it is for is saying WHERE the place is. Reduced motion
cancels both. What to change: a stylesheet selecting
`.crewlet-canvas[data-animate='true']` now wants `'near'`, or `'travel'`.

A third argument, `ceiling`, caps how far in the ease may zoom, for a region
with a size of its own to respect: a chart with few nodes has room to zoom far
past a form's designed size and took it. `rememberView()` marks the view
`restoreView` gives back without moving anything, for a region that does not
exist yet: a card being added changes the content before there is a rectangle
to ease onto, and the canvas answers content that changed shape by keeping what
it holds reachable, so by the time `focusRegion` can be called the view is no
longer the reader's. What to change: nothing.

**`Canvas`'s zoom keys answer anywhere inside it, and its limits are the
content's.** `+`, `-` and `0` used to reach only the viewport ELEMENT, which is
never what holds focus in a chart whose tab stop is an item: a reader who had
navigated the chart pressed `+` and nothing happened. The arrows are still the
viewport's own, and a text field inside keeps every key. The floor is now the
FIT rather than a quarter, because there is nothing past the whole chart to
see, and the ceiling is the largest item filling the viewport
(`largestItemWidth`) rather than double size. `zoomAt`, `pinchView` and
`clampZoom` take the limits as a last argument, defaulting to the fixed pair.
What to change: a canvas that relied on zooming out past its own fit.

**`Canvas`'s controls are a GROUP, and the bar inside it is
`.crewlet-canvas__bar`.** The group is a column in one corner holding the zoom
bar, anything the caller adds to the end of it (`controlsExtra`) and any bars
it stacks under it (`controlsBelow`). The zoom field is one control step wide
rather than one step at least, so pressing the readout no longer moves the bar
111px. What to change: a stylesheet that targeted `.crewlet-canvas__controls`
for the bar's own ground or padding now wants `.crewlet-canvas__bar`.

**`Modal`'s side sheet is committed from its head.** The sheet variant takes a
`headerActions` slot beside its title, its head stands at the shell's own
top-bar height (`--size-shell-topbar`) with 16px over 24px insets rather than
12 over 16, its title is drawn at `--font-size-md`, and its body is inset 24px
with an 8px stack gap. It also arrives properly: the frame travels its own
width in from off screen with no opacity ramp, where it used to move 16px and
fade, and its separation is cast on the INLINE axis through a new
`--shadow-sheet` token rather than borrowing `--shadow-xl`, whose two vertical
offsets both fall off the screen on a frame that runs the full height of the
window. The veil under a sheet now fades over the same 300ms the sheet travels
rather than 150ms. A dialog is unchanged in every one of those. What to
change: nothing, unless a sheet was relying on its head being 49px tall.

**`ConfirmModal` is drawn as a prompt.** A confirmation is one question and one
answer, and it used to carry a head band with a glyph and a close control that
did exactly what the Cancel two inches below it did. It is 420px, centred, with
no head band, no glyph and no close control: the title is the body's own first
line and the actions hang off its bottom edge. It still names the frame, and a
destructive one is still an `alertdialog`. `Modal` takes the same
`shape="prompt"` directly, and `shape="framed"` is the way back for a
confirmation that grew a form inside it. What to change: a confirmation that
passed `size` to widen itself needs `shape="framed"` as well, since the prompt
has a width of its own.

**The veil's blur is drawn again.** `Modal.css` declared `backdrop-filter` and
then `-webkit-backdrop-filter` by hand, and a minifier answers a rule holding
both by keeping the prefixed declaration and dropping the standard one: the
shipped rule carried the prefixed spelling alone, which Chrome does not
support, so the 3px softening behind every dialog and every sheet in the
product computed to `none`. The hand-written prefix is gone; bundlers emit
their own. Nothing needs an edit.

**`ListInput` is one card, and the box is above it.** The list was a stack of
separate boxes, each a two-row textarea with Move up, Move down and Remove
beside it: three items measured 256px where the console's own list draws 111,
and the second row of every textarea was empty. It is a bordered card whose
rows are divided by a rule, each row one growing line with its position drawn
in the accent, and the new-item box sits above the list rather than below it,
which is the order the two read in. The add control is an accent square beside
the legend, where the console puts it and where the eye is when the list is
empty. Move up and Move down are still there and still named, revealed by the
pointer and by the focus rather than drawn on every row, and still on Alt+Up
and Alt+Down from the item itself. What to change: `rows` is gone, since an
item is one line that grows; `addLabel` is a function of the item's name
(`addLabel={(name) => "Add " + name}`) rather than a fixed word, because
the control is now an icon and its name is all a screen reader has.

**A tag's remove control reaches the pill's own outer edge.** It is a flex
child stretched to the container's CONTENT box, which is the pill's 1px
boundary shorter on each side, so it drew 22px inside the 24px a
`--crewlet-tag-acts` pill is floored at: under the target floor the class
beside it exists to hold. Nothing needs an edit, unless a stylesheet gave the
control its own block margins.

**A `Modal` that submits is no longer a `<form>` with a dialog role on it.**
A `<form>` accepts only `search`, `none` and `presentation` as an explicit
role, so the frame this package drew for every surface that submits (the node
editor, every confirmation) was a conformance failure axe reports on each one.
The form is INSIDE the frame now, drawing no box of its own, so Enter from any
control still submits and the head, the body and the footer are still the
frame's own children. What to change: a stylesheet or a query that reached the
frame as a `form` element; the frame is the element carrying `role="dialog"`,
whichever way it submits.

**A row's control strip keeps its room whether or not it draws it.** The
actions cell is end-aligned and the add pill sits before the strip, so a row
drawing fewer controls dragged the plus along with it: measured on the engine's
builder, the company's row draws no trash and no menu, its strip stood 28px
against every other row's 92, and the plus a reader scans down the table for
was 64px to the right of the one on the row beneath it. The strip is floored at
`--crewlet-org-table-strip` (three control steps and their two gaps) and
end-aligned inside it. Nothing needs an edit, unless a table draws more than
three controls in a row's strip, which sets that variable.

### What to change

| Was | Is |
|---|---|
| `<IconButton aria-label="Add" />` | `<IconButton label="Add" />` (required) |
| `icon="cached"` on a Tabs item, a DataTable column or a row action | `icon={<CachedGlyph />}` |
| `<Popover>` holding a form or a panel | the same, plus `label`, which the type now requires for a dialog |
| `<Popover>` whose children carry `menuitem` or `option` roles | `role="menu"` or `role="listbox"`, where `label` stays optional |
| a stylesheet targeting `.material-symbols-outlined` inside a uilet component | `.crewlet-glyph` |
| a stylesheet overriding a component's focus `box-shadow` | override `outline` |
| a click handler relying on `Copyable`'s value span | press the copy control, which is the only one |
| `<Card.Body padding="tight">` for the vertical-only step | `padding="sm"`; `tight` is the tile's 12px on every edge, as on the card |
| a `<Card.Footer>` relied on for 8px over 16px from `padding="md"` | it is the default, and the default is `sm`; `md` is 16px on every edge |
| `<ListInput rows={3}>` | nothing: an item is one line that grows with its text |
| `<ListInput addLabel="Add a goal">` | `addLabel={(name) => "Add a " + name}` |
| `<ConfirmModal size="md">` widened by hand | `<ConfirmModal size="md" shape="framed">`; the prompt shape has its own 420px |
| a stylesheet overriding `.crewlet-modal__header--sheet` padding | the sheet's head is 64px with 16px over 24px insets; override `--size-shell-topbar` or the rule itself |
| a `<Card.Footer padding="tight">` relied on for 4px over 16px | `padding="sm"`, or `none` and a rhythm of its own |
| `padding` on a `Card.Header` | drop it, and reach for `divided` |
| an `Accordion.Item` heading assumed to be `h3` | `headingLevel={3}`, or the level where it sits |
| a stylesheet styling `.crewlet-canvas__controls` as the bar | `.crewlet-canvas__bar` |
| a stylesheet or a test reading `.crewlet-canvas[data-animate='true']` | `'near'` for a fit, a zoom or a reveal; `'travel'` for a region ease |
| `<OrgNodeLabel>` relied on for a trailing slot with no `trailing` passed | pass `trailing`, even empty, where a push can arrive |
| a stylesheet reaching a chart node's name group as `.crewlet-org-node__icon`, `__text`, `__name`, `__caption`, `__kind` or `__trailing` | the same part under `.crewlet-org-label__`, which both surfaces now draw |
| a stylesheet reaching a table row's name group as `.crewlet-org-table__icon`, `__text`, `__name`, `__caption`, `__kind` or `__trailing` | the same part under `.crewlet-org-label__` |
| a stylesheet or a query reaching a row's name cell as `.crewlet-org-table__node` | `.crewlet-org-label--row`, which still carries `data-tone` |
| a stylesheet reaching the add pill's disc as `.crewlet-add-pill__mark::before` | `.crewlet-add-pill__disc`, which is an element |
| a stylesheet reaching a pill divider as `.crewlet-add-pill__section` `border-left` | `.crewlet-add-pill__divider`, which is an element between two sections |
| a chart drawing its expander in `renderUnder` or in the actions column | `<OrgNodeDisclosure>`, beside the treeitem, on the card's leading edge |
| `ref={...}` on `TreeCanvas` typed as `TreeViewHandle` | `TreeCanvasHandle` |
| a query or a stylesheet reaching a submitting `Modal`'s frame as a `form` | the frame is the element with `role="dialog"`; the form is inside it |

| `<Tag variant="warn">` | `<Tag variant="warning">` |
| `{ variant: 'warn' }` or `{ variant: 'error' }` on a toast | `'warning'` or `'danger'` |
| a success toast with no `duration`, kept until dismissed | `duration={0}` |
| a `<Callout>` that had to be announced | add `live="polite"`, or `role="alert"` |
| `<Avatar colorSeed={id} />` | `<Avatar tone="seeded" colorSeed={id} />` |
| `<Avatar />` at the old default size | `<Avatar size={64} />` |
| `<Avatar />` where a round badge is wanted | `<Avatar shape="circle" />` |
| `<ImageUpload />` where a round badge is wanted | `<ImageUpload shape="circle" />` |
| `<Tag />` where the 28px pill is wanted | `<Tag size="md" />` |
| a stylesheet that restyled `.crewlet-pricing-card__tag` | restyle `.crewlet-tag`, or pass a `variant` |
| a layout that assumed a StatCard's value came first | the label comes first; read `.crewlet-statcard__value` by class |
| `<StatCard tone="brand" />` | drop the tone, or pick the outcome it reports |
| `<Skeleton variant="box" glowColor="green" />` | `<Skeleton variant="box" />` |

| `<Tabs>` whose sections have a panel | the same, plus `panelId`, with `<TabPanel id value>` around the section |
| a `<Segmented>`-style row hand-built from buttons | `<SegmentedControl label semantics="radio" \| "tabs">` |
| `<Checkbox onChange={(event) => …}>` | the same, or `onCheckedChange={(checked) => …}` |
| a binary setting drawn as an On and Off `<Select>` | `<Switch label checked onCheckedChange>` |
| an application that boots its theme from an inline script | `applyStoredPreferences({ themeKey, densityKey })` from the module bundle |
| a component that announces its own changes in a live region of its own | mount one `<Announcer>` in the shell; `TagsInput` and `ListInput` speak through it |

| `<Modal labelledBy="heading-id">` | drop it, or `ariaLabel` for a surface with no title |
| a stylesheet or query for `.crewlet-modal__footer > button` | `.crewlet-modal__footer-end > button` |
| a query for the `h2` inside a dialog | `.crewlet-modal__title`, or the dialog's accessible name |
| `<ConfirmModal submitting>` relied on for a closeable dialog | it is `dismissable={false}` now: close it from the caller |
| `aria-label`, `aria-labelledby` or `aria-describedby` on a `Modal` | `ariaLabel` and `describedBy`, which the component actually reads |
| a check that a `ConfirmModal` button is `disabled` | it is `aria-disabled` with a reason, and it keeps focus |

| `{ label: 'Delete', variant: 'danger' }` in `rowActions` | `{ label: 'Delete', danger: true }` |
| `{ label: 'Publish', variant: 'primary' }` in `rowActions` | `{ label: 'Publish' }` (a menu has no headline step) |
| a stylesheet targeting `.crewlet-data-table__row-actions-item` | `.crewlet-menu__item` |
| `Record<string, DataTableColumn>` in TypeScript | `Record<string, DataTableColumn<MyRow>>` |
| a `div` selector under `.crewlet-table` | the `tr` or `td` it is now |
| `--crewlet-data-table-archived-tint-rgb: 196, 96, 96` | `--crewlet-data-table-archived-rail: <a colour>`, or nothing for the neutral rail |
| a `paginated={false}` table relied on for its Previous / Next chevrons | `paginated`, or `onPageChange` with `pageCount` |
| a `paginated={false}` table relied on for the page-size chips | `onItemsPerPageChange`, which is what says the number is read |
| `itemsPerPage` read back as `data.length` after pressing All | `ALL_ITEMS` (`'all'`), in the prop, the callback and storage |
| a settings frame dragged from anywhere in a column row | drag from the handle, which is a named button now |
| a query for the drag handle as `.crewlet-data-table__column-drag-handle` glyph | it is an `IconButton` carrying that class |
| a check that Move up is `disabled` at the top of the list | it is `aria-disabled` with a reason, and it keeps focus |
| a query for the resize handle as a `button` | `role="separator"`, named the same |
| a `variant="default"` table with no row actions, assumed to have no trailing column | it has one, holding the settings cog |
| a settings frame expected to open onto a 350px column list | the list is as tall as its rows, capped at 40vh and scrolled |
| `settingsVariant="compact"` or `"rich"`, on `DataTable` or `DataView` | drop it: every table opens one frame, and it holds the column list |
| a `labels.pageSize` override | `labels.itemsPerPage`, which names the section on every table |
| a titled table's settings frame expected at the `sm` dialog step | it is `lg`, because it carries the column list |
| the toolbar's Columns button, reached by name or by click | open the settings frame and use its column list |
| a `labels.columnsMenu` or `labels.columnsMenuTitle` override | drop it: the frame's section is `labels.columnsSection` |
| a stylesheet for `.crewlet-data-table__columns-panel` or `__columns-fieldset` | drop it: neither is emitted |
| a stylesheet targeting `.crewlet-data-table__toolbar-end` | `.crewlet-data-table__chrome`, which a card's header may hold |
| the controlled pair passed with `showSettings={false}` | keep the cog, or draw your own control: the frame was the way in |
| a `sticky: 'right'` table relied on never showing a scrollbar | it scrolls where the container is narrower than its column floors |
| an empty table relied on for the fixed layout its rows are drawn under | it carries `crewlet-data-table__table--rowless` and is laid out by content |
| a table relied on for widths measured against another container | it fits the container it is in, and a drag is what is remembered |
| a query for `<storageKey>_columnWidths` in storage | `<storageKey>_resizedColumns`, holding only what a reader dragged |
| `import { TableFooter }` or `TABLE_FOOTER_LABELS` | drop it: no table draws a count line |
| `<DataView totalCount={n}>` | drop it, and say the number in the screen's header |
| `<DataView pagination={<LoadOlder />}>` | `hasMore` with `onLoadMore`, which the table draws under its rows |
| a `labels.footer` override on `DataView` | drop it: there is no sentence left to translate |

| `<Count>` in a `NavItem` badge, relied on for its own pill | it draws as a figure; pass `badgeTone="attention"` for a pill |
| a stylesheet overriding `.crewlet-nav-item__row` to tint the current row | drop it: the row takes `--color-brand-accent-soft` and `--color-brand-accent-ink` |
| a stylesheet reading `.crewlet-nav-item__row[aria-current='page']::before` | the bar is gone; the row's own tint is the mark |

| a `<Button block>` dropped into `AppShell.Rail`'s `footer` | nothing: the foot draws a direct-child button as a row on the rail's own insets. `<AppShell.RailRow>` is still the one to reach for, because it also decides whether the row is a control |
| a stylesheet putting a dropped-in foot button back on a toolbar's inset | drop it: the foot's own rule is what the rail draws |
| a stylesheet putting the rail's head divider back | nothing: the bar's line is the only one at that height |

| a stylesheet restyling a table's `th` | it is a sticky micro-label band on `--color-surface-subtle` with no column dividers |
| a table row relied on for a hover tint | it lights up only with `onRowClick` or a row link |
| `--crewlet-data-table-row-hover-bg` set to an opaque surface | an overlay step, or accept `--color-surface-hover` |
| `--crewlet-data-table-sticky-bg` left unset on a table not on the panel surface | set it: the default is `--color-surface-subtle` now |
| a selected row expected to carry `--shadow-selection` | the accent tint is the whole mark |
| `.crewlet-table__container` styled as the table's frame | the frame is `.crewlet-table`; the container is the scroller |
| a `Table` with many rows and a wrapper that scrolled it | `<Table maxHeight="24rem">`, which also makes the header stick |
| a page relying on `PageHeader`'s 32px title | it is 20px over a 13px sentence; use `Text` for a display heading |
| a query, a stylesheet or a test for `.crewlet-table-footer` | nothing emits it: no table draws a count line |
| a `TreeCanvas` card drawing its own surface, border, radius or shadow | drop all four: `.crewlet-tree-canvas__card` draws them |
| a `TreeCanvas` card drawing its own dashed edge for a human seat | `cardOutline={(id) => …}` |
| a `TreeCanvas` treeitem drawing its own padding, focus ring or selection ring | drop all three |
| a card placed on a `Canvas` painted `--color-surface-elevated` | `--color-surface-subtle`: the canvas is the page's ground now |
| a stylesheet expecting the expanded detail row on `--color-surface-subtle` | it is `--color-surface-inset` |
| a pagination or settings button hover expecting `--color-surface-elevated` | it is the `--color-surface-hover` overlay |
| a stylesheet cancelling the last row's `border-bottom` | the table does it |
| a `TreeCanvas` treeitem drawing its own column layout, gap or cursor | drop all three |
| a `TreeCanvas` actions strip spreading `ctx.press(id)` with its own class and `aria-hidden` | `{...ctx.actions(id)}`, immediately after the node's treeitem |
| a `TreeCanvas` card drawing its own two-column grid for that strip | drop it: the card is one column and the strip is drawn over its end |
| a `TreeCanvas` consumer drawing an add control beside a card's name | `renderUnder`, which hangs it on the branch below the card |
| a `TreeCanvas` consumer hanging a `Menu` under a card to add a child | `AddPill`, whose sections are the same list |
| a `TreeCanvas` consumer opening a modal to name a child | `composing`, which draws that form in the chart where the child will go |
| a chart of org chart nodes expecting each card under its own parent | `ranks="per-parent"`, or read a rank as a row |
| `layoutForest` called with `{ gapX, gapY }` and expected to start at the origin | the same, plus `margin` where the frame clips |
| a test reading a card's `transform` in the same tick as the change | read it after a frame, or from `layoutForest` |
| `layoutConnectors(layout)` read as `string[]` | `{ id, parent, d }[]`; map to `.d` for the path, and `.id` is the node it arrives at |
| a chart drawing its own compact org-chart node, its lead strip or its hue | `appearance="node"`, `cardTone`, `OrgNodeLabel` and `OrgNodeLead` |

| `<AppShell sidebarWidth={64}>` | `style={{ '--crewlet-app-shell-rail': '64px' }}` on the shell, or set `--size-shell-rail` |
| `<AppShell topbarHeight={72}>` | `style={{ '--crewlet-app-shell-topbar': '72px' }}` on the shell |
| a sidebar or header stylesheet with `position: fixed`, a width and a top offset | drop all three: the shell's grid places both slots |
| a page that scrolled as a whole | it scrolls in `main`; pass `mainId` or `mainRef` to reach that scroller |
| a `<Section>` relying on the 80px marketing band it defaulted to | `spacing="md"`; the default is `compact`, the console band |
| a `<BarList emptyLabel>` relied on to carry an inset of its own | it starts where the bars start; the panel holding it carries the inset |
| a `<Card>` with a header whose other children were relied on to sit flush | pass `padding="none"`; a card draws its own content in a body now |
| a `<Card.Title>` relied on to wrap onto a second line | it is one line; the subtitle beside it gives up its tail first |
| a `<Card padding="lg">` built from slots, relied on to pad the card itself | it pads what the card holds beside its slots; the slots still reach its edges |
| an `<AutoGrid>` relied on to stretch a row that is short of cards | the tracks are kept; a lone card is drawn at a full card's width |
| a `<Card variant="subtle">` relied on for the 16px inset | pass `padding="md"` |
| a `<Card variant="subtle">` expected flush with the page | it is the panel's ground with no lift, at a 12px inset; `variant="outlined"` is the transparent one |
| a `<Section>` description measured at 13px | it is `--font-size-xs` |
| a `<PageHeader>`, `<Card.Title>`, `<Section>` or `<EmptyState>` title measured at 1.2 leading | it is `--font-line-height-normal` |
| a `<Section>` description measured at 13px | it is `--font-size-xs` |
| a `<PageHeader>`, `<Card.Title>`, `<Section>` or `<EmptyState>` title measured at 1.2 leading | it is `--font-line-height-normal` |
| a stylesheet matching the pill chip's 6px corner | it is `--radius-chip`, one hairline inside the well |
| a pill `<Tabs>` or `<SegmentedControl>` chip measured at a control step | it is 26px, and 24px at `size="sm"` |
| a pill or underline tab narrower than 24px, which a one-letter label or a bare glyph drew | every tab carries `min-width: var(--size-target-min)` |
| a pill chip's content aligned to the start | it is centred; the segmented CARD row is the one that starts at its own inset |
| a `size="sm"` pill chip measured at 8px of side padding with a 14px glyph | 4px and 12px, so a rail's foot reads quieter |

**Card is the engine dashboard's panel (C1).** A card built from
`Card.Header`, `Card.Body` or `Card.Footer` is FLUSH: it carries no padding of
its own, the slots carry theirs at the panel's inset, and the card clips them
to its radius so the header's rule and a table's first row reach the edges. A
card given raw children is still padded, at `--spacing-4` rather than the
`--spacing-5`/`--spacing-6` block it was. `Card.Header` draws its rule unless
`divided={false}`, renders its subtitle beside the title rather than under it,
and no longer wraps the title in `.crewlet-card__header-text`. Its row is ONE
LINE: the title never wraps, and the subtitle absorbs the shrinking, so a head
one pixel too narrow gives up the subtitle's tail rather than the title's. Two grounds are
new, `variant="inset"` and `variant="quiet"`.

A card's OWN content, where it holds any beside those slots, is drawn in a body
of its own at the inset `padding` names, so a sentence written straight under a
`Card.Header` starts on the same line as the title rather than against the
border. `padding` on a flush card never goes back onto the card itself: the
slots have to reach its edges, and `padding="none"` leaves that content exactly
as it was written, for a table.

Every padding step moved with it, so a card that names one renders differently
too: `sm` is 8px over 16px (was 12 over 16), `md` is 16px (was 20 over 24) and
`lg` is 20px over 24px (was 24 over 32). The section steps are those same five
now, rather than a scale of three on which `tight` meant a vertical-only step
and `md` meant one inset on a body and another on a footer. And a `default` card that is NOT built
from slots now LIFTS, at `--shadow-xs` with the dark theme's hairline along its
top edge, which is what the dashboard's own panel carries; a flush one stays
flat, because its rule and its slots are what give it depth. Slots reached
through a fragment count as slots, so the flush recipe survives the ordinary
`{ready ? <><Card.Header /><Card.Body /></> : <Skeleton />}`.

**The type registers move onto the dashboard's values (C1).** `Eyebrow` is THE
micro-label now, the same register `Text variant="label"` and a table's column
head take: 11px, medium, the wide track, uppercase, tertiary, in the document's
own face. It was monospace, one size up, semibold and on the wider track, and
`variant="accent"` spent the accent FILL on a word, which clears 3:1 as a mark
and not the 4.5:1 a word owes; it paints `--color-brand-accent-ink` now.
`Text variant="heading"` and a `Section` title track tighter, a `Section`
description is 13px with a measure rather than 12px truncated, and `Container`'s
gutter is 20px, 12px under 480px.

**Rows, expanders and records (C1).** `List` renders `variant="divided"` unless
told otherwise: it is the list every screen draws, and `plain` is one word away.
A `Disclosure` head is 12px with a 4px gap, its `size="compact"` no longer
restates that register, and `variant="aside"` rules its panel in
`--color-border-hover`. An `Accordion` trigger is semibold on the tight track
and its compact trigger lands on the disclosure head's own register. A
`Timeline` step takes `--radius-md`. `DescriptionList` was already the
dashboard's own key/value grid and is unchanged.

**Code, chips and keycaps (C1).** `CodeBlock` WRAPS unless `wrap={false}`, and
its block is 12px on `--radius-md` in `--color-text-secondary` at `--spacing-3`,
with a header that is a rule rather than a second ground. `InlineCode`
`tone="inherit"` keeps the inset chip and takes only the message's ink (the
composite is measured by `@crewlethq/tokens`, tightest pair 4.61:1), and
`variant="reference"` is `--color-text-secondary`. `Kbd` is
`--color-text-tertiary` on `--color-surface-inset` at regular weight.
`Copyable`'s value is `--color-text-secondary`, its chip takes the chip's own
padding and its block the `--color-surface-subtle` surface.

| was | is now |
| --- | ------ |
| `<Card padding="none">` with slots, plus inline padding on each slot | drop both: a card built from slots is flush and its slots are inset |
| `<Card padding="sm">` or `padding="lg"` laid out against the old numbers | `sm` is 8px over 16px and `lg` is 20px over 24px |
| a `default` card a stylesheet assumed was flat | it carries `--shadow-xs` and the hairline unless it is built from slots |
| a `Card.Title` holding a phrase with inline markup in it | the title is a flex row at `--spacing-2`, so give it one run of text and put a mark beside it |
| `<Card.Header divided>` | drop it, the rule is the default; `divided={false}` for a card whose body is one paragraph |
| a stylesheet or query for `.crewlet-card__header-text` | the title and the subtitle are siblings in `.crewlet-card__header` |
| a stylesheet for `.crewlet-card__header--divided` | `.crewlet-card__header--plain`, on the opposite condition |
| a plain `<List>` relied on for an undivided stack | `<List variant="plain">` |
| `<CodeBlock wrap>` | drop it, wrapping is the default |
| `<CodeBlock>` relied on for a sideways scroll | `<CodeBlock wrap={false}>` |
| a stylesheet for `.crewlet-codeblock--wrap` | `.crewlet-codeblock--nowrap`, on the opposite condition |
| an `Eyebrow` relied on for a monospace kicker | `<Text variant="label" mono>` |
| a stylesheet keyed on `.crewlet-input:focus-within` or on a field's focus `box-shadow` | `.crewlet-input:has(.crewlet-input__control:focus-visible)`, and the ring is an `outline` |
| a stylesheet keyed on `.crewlet-select__trigger:focus-visible` for the select's ring | `.crewlet-select:focus-within`, which is the frame a reader reads as the field |
| a stylesheet keyed on `.crewlet-switch__control:focus-visible` | `.crewlet-switch__track:has(.crewlet-switch__control:focus-visible)` |

| `<OrgTableAdd options={[{ label, icon, disabledReason, onSelect }]} />` | `<OrgTableAdd sections={[{ label, icon, disabled, onSelect }]} />`, which is `AddPill`'s own list |
| an `<OrgTableAdd>` rendered inside `<OrgTableActions>` | a sibling before it, so the plus is drawn at rest |
| a stylesheet targeting `.crewlet-org-table__pill` or `.crewlet-org-table__pill-btn` | `.crewlet-add-pill__sections` and `.crewlet-add-pill__section` |
| a table whose add offers a number of kinds other than three | set `--crewlet-org-table-add-kinds` on `.crewlet-org-table` |
| a layout measured against the org table's 20px indent or 36px row | 40px a level and 48px a row |

## Why CSS, not CSS-in-JS

The tokens package emits plain CSS variables. Plain CSS keeps every consumer (any bundler, server-rendered or not) compatible with no runtime overhead and no theme provider, and AI tools can read and modify the styles without a build step.

## License

MIT. The license text is in [`LICENSE`](./LICENSE), which ships in the package. The Crewlet name, logo and character are trademarks and are not covered by that license.
