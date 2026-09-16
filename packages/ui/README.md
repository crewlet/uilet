# @crewlethq/ui

Crewlet shared React components. Built on top of `@crewlethq/tokens` (CSS variables) and `@crewlethq/icons`.

## Use it

```tsx
import '@crewlethq/tokens/css';          // the variables, once at the application entry
import '@crewlethq/tokens/css/themes';   // light, dark and follow-the-system
import '@crewlethq/tokens/css/density';  // compact and comfortable, optional
import '@crewlethq/tokens/css/fonts';    // self-hosted Inter and JetBrains Mono
import '@crewlethq/ui/styles.css';       // every component stylesheet, in one file
import { Button, Card } from '@crewlethq/ui';
import { Book2Glyph } from '@crewlethq/icons/glyphs';

<Card>
  <Card.Body>
    <Button variant="primary" leadingIcon={<Book2Glyph />}>
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
| Actions | `Button` and `ButtonLink` (variants `primary`, `secondary`, `outline`, `tertiary`, `accent`, `danger`; sizes `small`, `medium`, `large`; shapes `square`, `pill`), `IconButton`, `Menu`, `Link`, `Copyable`, `CopyButton`, `Kbd` |
| Content and text | `Text` (the eight registers), `Prose`, `InlineCode`, `List` and `ListItem`, `DescriptionList`, `Timeline`, `RelativeTime` |
| Forms | `Input`, `Textarea`, `Label`, `FormField`, `FormRow`, `Checkbox`, `Select`, `Tag`, `TagsInput`, `DateTimePicker`, `TimeWindowPicker`, `ImageUpload` |
| Data display | `DataTable`, `CopyableCell`, `Table`, `StatCard`, `PricingCard`, `Avatar`, `CodeBlock`, `Skeleton`, `Eyebrow` |
| List screens | `DataView`, and its parts on their own: `DataViewToolbar`, `FilterAxisBar`, `FilterAxisChip`, plus the filter model (`filterDefsFromColumns`, `applyColumnFilters`, `filterPredicate`, `blankFilterValue`) |
| Feedback and overlays | `Callout`, `Toaster`, `Modal` (with `variant="sheet"`), `ConfirmModal`, `CommandPalette`, `Tooltip`, `Popover`, `Announcer` |
| Marks | `Count`, `StatusDot`, `EmptyValue`, `VisuallyHidden` |
| Hooks and seams | `useModalLayer`, `usePopupLayer`, `LayerHost`, `useListbox`, `useOptionKeys`, `useClipboard`, `useAnnouncer`, `useNow`, `formatRelative`, `HeadingLevelProvider`, `cx` |
| Layout | `Container`, `Section`, `Card`, `Tabs`, `Accordion`, `Disclosure` |
| Application shell | `AppShell` with `AppShell.Rail`, `AppShell.Topbar` and `useAppShell`, `SidebarNav` and `NavItem`, `BrandLockup`, `SearchTrigger`, `PageHeader`, `Toolbar`, `Stack`, `Inline`, `Spacer`, `AutoGrid`, `ErrorBoundary`, `useShortcut`, `useFullscreen` |

Storybook stories live under `apps/storybook/src/stories`.

Add new components under `src/<Name>/` with a `Component.tsx`, an optional
`Component.css`, an `index.ts` and a colocated `Component.test.tsx`. The root
barrel is GENERATED from the folder list by `scripts/write-barrel.mjs`, so
there is no shared index to edit and no conflict in it when several components
land at once.

## Theming hooks

- **Light and dark palettes.** Import `@crewlethq/tokens/css/themes` and set
  `data-theme="light"` or `data-theme="dark"` on `<html>`. With the attribute
  absent the document follows the system. Every component reads the canonical
  `--color-*` variables, so no provider is needed.
- **Density.** Import `@crewlethq/tokens/css/density` and set
  `data-density="compact"` or `"comfortable"` on `<html>`. Every spacing and
  size token scales with it, and the small control and row steps floor at 24px
  so no density takes a pointer target under the size a finger can hit.
- **Accent colour.** The selected, active and focus states read `--color-brand-accent` and its companions from `@crewlethq/tokens`: `--color-brand-accent-rgb` (the same colour as a comma-separated `r, g, b` triple, for translucent tints), `--color-brand-accent-hover`, `--color-brand-accent-active`, `--color-brand-accent-soft` and `--color-brand-accent-soft-strong`. Rebind them together to retint the components. Every overlay portals into the nearest `LayerHost`, or into `<body>` when
there is none, so declare the override on `<html>` for those panels to follow
it.

```css
/* Retint every accent state to the brand slate. */
body {
  --color-brand-accent: var(--color-brand-slate);
  --color-brand-accent-hover: var(--color-brand-slate);
  --color-brand-accent-active: var(--color-brand-slate);
  --color-brand-accent-rgb: 60, 64, 82;
  --color-brand-accent-soft: rgba(60, 64, 82, 0.10);
  --color-brand-accent-soft-strong: rgba(60, 64, 82, 0.32);
}
```

- **Component variables.** A few components expose their own `--crewlet-*` variables for values that are not tokens, for example `--crewlet-data-table-active-sort-color`, `--crewlet-data-table-row-hover-bg` and `--crewlet-data-table-archived-tint-rgb` on the compact `DataTable`, and `--crewlet-avatar-tint-fg` for the initials on a tinted `Avatar`. Override them from a rule that targets the component's root.

The component stylesheets read only variables that `@crewlethq/tokens` emits or
that the components declare themselves, and the same check refuses a glyph
drawn as a ligature, anything loaded from a host, a theme painted on a body
class, the decoration step used as text, and a focus rule that turns the
outline off without putting one back. `npm run lint` in this package runs it,
and `npx crewlet-css-check <folder>` runs it and the literal check over an
application's own stylesheets.

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
