# @crewlethq/artifact-kit

The Crewlet design system as a framework-free browser bundle, for the pages people and agents publish as artifacts. An artifact page links it and paints with the same tokens, themes and fonts as the dashboard around it, follows the reader's appearance as it changes, and can draw an editable sheet over its datastore with one element.

The engine serves this package's `dist/` directory, unchanged, from the artifact's own origin at `/_crewlet/kit/<version>/`, so a page never fetches it from a third-party host and works on a closed network.

## What a page links

```html
<link rel="stylesheet" href="/_crewlet/kit/<version>/kit.css">
<script src="/_crewlet/kit/<version>/theme.js"></script>
<script type="module" src="/_crewlet/kit/<version>/kit.js"></script>
```

`<version>` is the exact kit version the page was written against (the engine's authoring guide names the newest it serves); the engine serves every kit version it has shipped, so a published page keeps its own. Link the first two in the `<head>`, `theme.js` as a classic blocking script, before anything paints. `kit.js` is only needed by a page that draws a sheet. Then write colours, spacing and type with the tokens rather than literal values:

```css
.summary {
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  color: var(--color-text-primary);
}
```

## The sheet

A page draws an editable sheet over one of its datastore collections with `<crewlet-sheet>`, its columns declared with `<crewlet-column>`:

```html
<crewlet-sheet collection="vendors" sort="-score" frozen="1" label="Vendor scorecard">
  <crewlet-column field="vendor"   type="text"     label="Vendor"></crewlet-column>
  <crewlet-column field="score"    type="number"   label="Score" format="0.0" min="0" max="10"></crewlet-column>
  <crewlet-column field="approved" type="checkbox" label="Approved"></crewlet-column>
  <crewlet-column field="tier"     type="select"   label="Tier" options="Gold:amber,Silver:neutral,Bronze:rose"></crewlet-column>
  <crewlet-column field="owner"    type="person"   label="Owner"></crewlet-column>
  <crewlet-column field="status"   type="status"   label="Status" options="Review:info,Blocked:warning,Done:success"></crewlet-column>
</crewlet-sheet>
```

or from a script:

```js
import { mountSheet } from '/_crewlet/kit/<version>/kit.js';

const sheet = mountSheet(document.querySelector('#grid'), { collection: 'vendors' });
// sheet.update({ ... }) draws it again with changed options; sheet.unmount() takes it down.
```

A sheet with no columns of its own draws the collection's schema: its hidden columns are left out, its primary column is frozen, and a column type this kit does not know is drawn as read-only text.

It is the design system's own `SheetGrid`, the component the dashboard draws a native sheet with, so a page's sheet looks and behaves exactly like it: the keyboard of a spreadsheet (arrows, Enter or F2 to edit, Escape, Tab, Space on a checkbox, typing to replace, Mod+C and Mod+V for ranges, Delete, Mod+Z and Mod+Shift+Z), an edit drawn at once as Saving until the engine confirms it, a refusal said on the cell and held in the sync strip as not saved until the reader dismisses it, a conflict note naming whoever changed a cell under the editor, collaborators' rings and name flags, and the light and dark themes and every palette.

### `<crewlet-sheet>` attributes

| Attribute | Meaning |
| --------- | ------- |
| `collection` | The datastore collection the sheet edits. Required. |
| `label` | The sheet's accessible name. The schema's title, then the collection's name, when absent. |
| `sort` | The initial order: `score` ascending, `-score` descending. |
| `frozen` | How many leading columns stay in view while the sheet scrolls sideways. |
| `readonly` | Draws the sheet read only, whatever the reader may do. |
| `height` | The most the sheet grows to, in px; its rows scroll past it. The sheet is as tall as its rows below that, so no empty space sits under Add row. Without it the sheet stops at `--crewlet-sheet-max-height` (70% of the viewport by default). |

### `<crewlet-column>` attributes

| Attribute | Meaning |
| --------- | ------- |
| `field` | The document field. Required. |
| `type` | `text`, `longtext`, `number`, `checkbox`, `select`, `multiselect`, `status`, `person`, `date`, `url` or `rating`. `text` when absent; an unknown type is drawn as read-only text. |
| `label` | The header. The field when absent. |
| `options` | Select, multi-select and status choices: `Label:color` pairs, comma separated. A select's colour is one of the six node hues (`purple`, `cyan`, `green`, `amber`, `rose`, `blue`) or `neutral`; a status's is a tone (`neutral`, `info`, `success`, `warning`, `danger`). |
| `format` | A number's form: `plain`, `0.0` (the decimals kept), `percent` or `0.0%`, `currency:EUR`. |
| `min`, `max` | A number's bounds; a rating's number of stars (`max`, 5 by default). |
| `max-length`, `max-items` | A text's longest value; a multi-select's most options. |
| `width` | The column's width in px. |
| `frozen`, `readonly`, `required`, `time` | Stays in view; takes no edit; refuses an empty value; a date with a time of day. |

### What the sheet binds to

The sheet talks only to the page's runtime, `window.crewlet` (runtime contract 1.0, documented in the engine's `docs/reference/artifact-runtime.md`), so it has exactly the page's capabilities and no more:

| Runtime call | What the sheet uses it for | Capability |
| ------------ | -------------------------- | ---------- |
| `data.schema()` | The collection's title, and its columns when the page declared none | `db` |
| `data.collection(name).subscribe(callback, onError)` | The rows, live; a refused subscription is said in place of the grid | `db` |
| `data.collection(name).merge(id, fields)`, `data.batch().merge(…).commit()` | One edit, and a paste or a cleared range as one all-or-nothing write | `db` |
| `data.collection(name).set(id, {})` | Add row, under an id the kit mints | `db` |
| `data.collection(name).delete(id)` | Delete row, from a row's actions, once the reader confirms it | `db` |
| `data.undo()`, `data.redo()` | Mod+Z and Mod+Shift+Z over the page's own writes; a step somebody overtook is skipped and said | `db` |
| `presence.roster()`, `presence.subscribe(…)`, `presence.set({ activity, focus })` | Collaborators' rings and flags, a small stack of who is in this sheet, and the reader's own cell | `presence` |
| `identity.me()`, `identity.people()` | A viewer's read-only sheet, and the people a person cell offers and names | `identity` |
| `connection.subscribe(…)` | Offline in the sync strip | none |
| `openLink(url)` | A url cell's link, which the host names before it opens it (a frame cannot open a window) | none |

A write resolves with the engine's verdict (`applied`, `pending`, `conflict`, `invalid`, `forbidden`, `quota` or `gone`) and rejects only where nothing was decided (`rate_limited`, `unavailable`, `capability_not_declared`); the sheet says either on the cell it wrote, and a paste is refused whole, never in part. An Add row that fails is said under the sheet with Retry. Delete row (on a row's number, or Shift+F10) asks in the kit's own confirmation, never a browser dialog, which an artifact frame refuses; a delete the engine refuses or the runtime rejects keeps the row and is said on its first cell, held as a write's refusal is. A viewer and a `readonly` sheet are offered neither. A subscription the runtime refuses (`forbidden`, `not_found`, `unavailable`, `capability_not_declared`) is said in place of the grid, never drawn as an empty collection. A page that did not declare `db` gets a sheet that says so rather than an empty grid; without `presence` or `identity` the sheet draws without collaborators or without names. A sheet shows only who is in it: the members whose focus is in its collection wear their rings on the cells they are on, and a small stack above the grid names them. It never draws the page's whole room, which the dashboard's artifact bar draws once for the page, so a page with two sheets does not repeat it twice. A sheet is drawn once the runtime's handshake with the host has completed (`crewlet.ready`): the runtime is installed before it but learns the version's capabilities only then, so a sheet drawn earlier would read a page that declared `db` as one that did not. When the kit loads before the runtime, it waits for the runtime's `crewlet:ready` event on `window` (exported as `RUNTIME_READY_EVENT`), which the runtime dispatches at the same moment. A viewer's sheet, and a `readonly` one, has no sync strip: there is nothing of the reader's to save.

## What is in it

| File | Content |
| ---- | ------- |
| `kit.css` | The canonical variables, the dark and light palettes of the default theme, every named theme under `data-palette`, the density steps under `data-density`, the self-hosted Geist and Geist Mono faces and the document baseline, then the stylesheet of the sheet, its cells and the presence marks, in one file. |
| `fonts/` | The four Geist faces `kit.css` references, with `OFL.txt`. |
| `theme.js` | The theme bootstrap, under 2 KB gzipped. |
| `kit.js` | The `crewlet-sheet` and `crewlet-column` elements and `mountSheet`, an ES module. It carries the design system's React components and React itself, so a page needs no framework of its own. |
| `THIRD_PARTY_NOTICES.txt` | The licenses of the third-party code `kit.js` carries: React, React DOM and the scheduler under MIT, and the Lucide drawings of the glyphs under ISC. |

`theme.js` reads the reader's appearance from the frame URL's fragment, where the dashboard puts it (`#nonce=...&theme=dark&palette=dusk&density=compact`), and writes `data-theme`, `data-palette` and `data-density` on `<html>` before the first paint, exactly as the dashboard writes its own. When the dashboard transfers the bridge port it follows the reader's appearance on it, so changing the theme in the dashboard repaints the page without a reload. Every value is checked against the allowed ones before it is written. The wire it speaks is `FrameProtocol` in `@crewlethq/ui`, bundled rather than restated.

The elements render in the LIGHT DOM, not a shadow root, so the tokens cascade into the sheet and a page's own stylesheet can sit beside it with `var(--color-*)`.

## Budgets

The build refuses a kit over any budget, and the suite holds the built files to the same numbers (`scripts/budgets.mjs`):

| File | Gzipped budget |
| ---- | -------------- |
| `theme.js` | 2 KB |
| `kit.css` | 40 KB |
| `kit.js` | 160 KB |

## Building

```sh
npm run build --workspace @crewlethq/artifact-kit   # dist/
npm test --workspace @crewlethq/artifact-kit        # the suite over dist/
```

It builds from `@crewlethq/tokens` and `@crewlethq/ui` as a consumer installs them, so the kit carries exactly what the published packages carry. How the sheet behaves on a page (binding, edits, refusals, presence, pastes, undo) is tested in jsdom by `apps/ui-tests/src/artifact-kit.test.tsx`, the private workspace that holds the test tooling.

## License

The code is licensed under the [MIT License](LICENSE). The Geist and Geist Mono font files in `dist/fonts/` are licensed under the SIL Open Font License 1.1 (`dist/fonts/OFL.txt`). The third-party code `kit.js` carries is under the licenses in `dist/THIRD_PARTY_NOTICES.txt`. The Crewlet name, logo and characters are not covered by these licenses; see [TRADEMARKS.md](TRADEMARKS.md).
