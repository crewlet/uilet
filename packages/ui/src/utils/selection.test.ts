import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

/*
 * ── A chosen option is calm, and the focus ring is the one accent line ────
 *
 * WHY ONE SUITE OVER SEVEN SHEETS. This is one rule, and it was broken the
 * same way in each of them: a chosen theme, the slide being edited, a picked
 * board, an open data source and a picked layer were each drawn in the FULL
 * accent, most at 2px, which is the focus ring's colour and weight. On a page
 * of options (the create pages put five such components on one screen) the
 * selection was the loudest edge there and could not be told from the ring.
 *
 * So a chosen option takes `--color-border-selected` (the accent mixed toward
 * its ground) and `--color-surface-selected` (the soft fill), each sheet says
 * why in its own words, and this suite reads them together so the next
 * component that draws a selection in the accent fails here rather than in a
 * screenshot.
 */

const here = dirname(fileURLToPath(import.meta.url));

function rulesOf(sheet: string): Map<string, string> {
  const text = readFileSync(resolve(here, '..', sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const rules = new Map<string, string>();
  for (const [, selector = '', body = ''] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // The first rule for a selector, which is the one outside any media
    // query: a forced-colors block repeats it with the system's own colours.
    const key = selector.trim().replace(/\s+/g, ' ');
    if (!rules.has(key)) rules.set(key, body.replace(/\s+/g, ' ').trim());
  }
  return rules;
}

const CHOSEN: ReadonlyArray<
  readonly [sheet: string, selector: string, edge: 'border' | 'outline' | 'ink' | null, fill: 'background' | 'image' | 'halo' | null]
> = [
  ['ThemeGallery/ThemeGallery.css', '.crewlet-theme-gallery__card.is-chosen', 'border', 'background'],
  ['SlideFilmstrip/SlideFilmstrip.css', ".crewlet-slide-filmstrip__item[data-selected='true'] .crewlet-slide-filmstrip__thumb", 'outline', 'halo'],
  ['SlideGrid/SlideGrid.css', ".crewlet-slide-grid__card[aria-current='true'] .crewlet-slide-stage", 'outline', 'halo'],
  // The edge rings the whole entry, its open preview included; the fill is the summary's.
  ['DatasetSource/DatasetSource.css', '.crewlet-dataset-source--selected', 'border', null],
  ['DatasetSource/DatasetSource.css', '.crewlet-dataset-source--selected .crewlet-dataset-source__summary', null, 'background'],
  ['ChoiceList/ChoiceList.css', '.crewlet-choice-list__row.is-checked', null, 'background'],
  // A chosen card: its tint over its own raised surface, edged in the accent's
  // ink, which holds the 3:1 the edge alone must clear.
  ['ChoiceCards/ChoiceCards.css', '.crewlet-choice-cards__card.is-checked', 'ink', 'image'],
  // A suggestion applied stays on screen, chosen; held under the pointer and
  // the press. Its edge is the accent's ink: it is a toggle's pressed state,
  // which WCAG 1.4.11 holds to 3:1, and the tint does not clear that.
  ['ChoiceButtons/ChoiceButtons.css', '.crewlet-choice-buttons__option.is-chosen, .crewlet-choice-buttons__option.is-chosen:hover, .crewlet-choice-buttons__option.is-chosen:active', 'ink', 'background'],
  ['LayersList/LayersList.css', ".crewlet-layers-list__item[aria-current='true']", null, 'background'],
  // Laid over the card's own surface, so the fill is an image.
  ['Card/Card.css', '.crewlet-card.is-selected', 'border', 'image'],
  // A gallery card picked for a bulk action, over its own ground in the same way.
  ['ArtifactCard/ArtifactCard.css', '.crewlet-artifact-card--card.is-selected', 'border', 'image'],
  // The option an inline combobox has chosen: the fill, with a tick beside it.
  ['Combobox/Combobox.css', ".crewlet-combobox__options .crewlet-listbox__option[aria-selected='true']", null, 'background'],
  // A list row picked for a bulk action: the fill alone, and no hover stacked on it.
  ['DataGrid/DataGrid.css', '.crewlet-data-grid__row--picked, .crewlet-data-grid__row--picked:hover', null, 'background'],
];

test('every chosen option is drawn on the selected fill, edged in the selected tint or the accent ink, never the accent', () => {
  for (const [sheet, selector, edge, fill] of CHOSEN) {
    const body = rulesOf(sheet).get(selector);
    expect(body, `${sheet}: ${selector}`).toBeDefined();
    expect(body, `${sheet}: ${selector}`).not.toMatch(/--color-brand-accent\)/);
    expect(body, `${sheet}: ${selector}`).not.toMatch(/--color-focus\)/);
    expect(body, `${sheet}: ${selector}`).not.toMatch(/--shadow-selection/);
    expect(body, `${sheet}: ${selector}`).not.toMatch(/(outline|border)(-width)?:\s*2px/);
    if (edge === 'border') expect(body, `${sheet}: ${selector}`).toMatch(/border-color:\s*var\(--color-border-selected\)/);
    if (edge === 'outline') expect(body, `${sheet}: ${selector}`).toMatch(/outline-color:\s*var\(--color-border-selected\)/);
    if (edge === 'ink') expect(body, `${sheet}: ${selector}`).toMatch(/border-color:\s*var\(--color-brand-accent-ink\)/);
    if (fill === 'background') expect(body, `${sheet}: ${selector}`).toMatch(/background:\s*var\(--color-surface-selected\)/);
    if (fill === 'image') expect(body, `${sheet}: ${selector}`).toMatch(/background-image: linear-gradient\(var\(--color-surface-selected\), var\(--color-surface-selected\)\)/);
    if (fill === 'halo') expect(body, `${sheet}: ${selector}`).toMatch(/box-shadow:\s*0 0 0 3px var\(--color-surface-selected\)/);
  }
});

test('a slide marked current says so in its number too, at the ink a mark clears', () => {
  // The edge is a tint, so the state never rests on it: the number is the
  // mark, in the accent ink, which the palette suite holds to 4.5:1 as text.
  expect(rulesOf('SlideFilmstrip/SlideFilmstrip.css').get(".crewlet-slide-filmstrip__item[data-selected='true'] .crewlet-slide-filmstrip__number")).toMatch(
    /color:\s*var\(--color-brand-accent-ink\)/,
  );
  expect(rulesOf('SlideGrid/SlideGrid.css').get(".crewlet-slide-grid__card[aria-current='true'] .crewlet-slide-grid__number")).toMatch(
    /color:\s*var\(--color-brand-accent-ink\)/,
  );
  expect(rulesOf('ThemeGallery/ThemeGallery.css').get('.crewlet-theme-gallery__check')).toMatch(/color:\s*var\(--color-brand-accent-ink\)/);
});

test('a canvas hovers in the selected edge and selects in one crisp pixel of the accent', () => {
  /*
   * A canvas is the one place a pick keeps the full accent: a board's own
   * content can be any colour, and the four corners drawn round a pick are
   * the mark. But at one screen pixel, so the 2px ring stays the live
   * board's, which takes the pointer as a focused frame takes the keyboard.
   */
  const canvas = rulesOf('CanvasBoard/CanvasBoard.css');
  const hover = canvas.get('.crewlet-canvas-board__board:hover .crewlet-canvas-board__body, .crewlet-canvas-board__note:hover');
  const picked = canvas.get('.crewlet-canvas-board__board[data-selected] .crewlet-canvas-board__body, .crewlet-canvas-board__note[data-selected]');
  expect(hover).toMatch(/outline: calc\(1px \* var\(--crewlet-canvas-board-unzoom\)\) solid var\(--color-border-selected\)/);
  expect(picked).toMatch(/outline: calc\(1px \* var\(--crewlet-canvas-board-unzoom\)\) solid var\(--color-brand-accent\)/);
  expect(canvas.get(".crewlet-canvas-board__board[data-active] .crewlet-canvas-board__body")).toMatch(/outline: calc\(2px \* var\(--crewlet-canvas-board-unzoom\)\) solid var\(--color-focus\)/);
});

test('every component that draws a chosen option keeps a 2px focus ring for the keyboard', () => {
  const ring = /outline:\s*2px solid var\(--color-focus\)/;
  expect(rulesOf('ThemeGallery/ThemeGallery.css').get('.crewlet-theme-gallery__card:focus-visible')).toMatch(ring);
  // Outward from the thumbnail's edge, onto the strip's ground: on the inset
  // offset a dark slide swallowed it.
  expect(rulesOf('SlideFilmstrip/SlideFilmstrip.css').get('.crewlet-slide-filmstrip__thumb:focus-visible')).toMatch(/outline: 2px solid var\(--color-focus\); outline-offset: 0;/);
  expect(rulesOf('SlideGrid/SlideGrid.css').get('.crewlet-slide-grid__card:focus-visible')).toMatch(ring);
  expect(rulesOf('DatasetSource/DatasetSource.css').get('button.crewlet-dataset-source__summary:focus-visible')).toMatch(ring);
  expect(rulesOf('ChoiceList/ChoiceList.css').get('.crewlet-choice-list__radio:focus-visible')).toMatch(ring);
  // The card rings, over its own edge, for the radio inside it.
  expect(rulesOf('ChoiceCards/ChoiceCards.css').get('.crewlet-choice-cards__card:has(.crewlet-choice-cards__radio:focus-visible)')).toMatch(ring);
  expect(rulesOf('LayersList/LayersList.css').get('.crewlet-layers-list__item:focus-visible')).toMatch(ring);
  expect(rulesOf('ArtifactKindIllustration/ArtifactKindIllustration.css').get('.crewlet-kind-tile:focus-visible .crewlet-kind-tile__frame')).toMatch(ring);
});

test('a title being written underlines in a tint for a pointer and in two focus pixels for the keyboard', () => {
  const doc = rulesOf('Document/Document.css');
  expect(doc.get('.crewlet-document-title-field:focus-visible')).toMatch(/border-block-end-color:\s*var\(--color-focus\); box-shadow: 0 1px 0 var\(--color-focus\)/);
  expect(doc.get(":where(:root[data-crewlet-focus='pointer']) .crewlet-document-title-field:focus-visible")).toMatch(
    /border-block-end-color:\s*var\(--color-border-selected\); box-shadow: none/,
  );
  // The composer's box rings as a field does, and draws no halo any more.
  const composer = rulesOf('Composer/Composer.css');
  expect(composer.get('.crewlet-composer:has(.crewlet-composer__field:focus-visible)')).toBe('outline: 2px solid var(--color-focus); outline-offset: -1px;');
  expect(composer.get(":where(:root[data-crewlet-focus='pointer']) .crewlet-composer:has(.crewlet-composer__field:focus-visible)")).toBe(
    'outline-width: 1px; outline-color: var(--color-border-selected);',
  );
  expect([...composer.values()].join(' ')).not.toMatch(/--color-brand-accent-soft/);
});

test("a slide's thumbnail has an edge on a dark page at rest, and a distinct one under the pointer", () => {
  const strip = rulesOf('SlideFilmstrip/SlideFilmstrip.css');
  expect(strip.get('.crewlet-slide-filmstrip__thumb')).toMatch(/outline: 1px solid var\(--color-border-strong\)/);
  expect(strip.get('.crewlet-slide-filmstrip__thumb:hover')).toMatch(/outline-color: var\(--color-border-strong-hover\)/);
});

test("a list's radio is drawn, an empty ring until it is chosen, and the platform's under forced colours", () => {
  const list = rulesOf('ChoiceList/ChoiceList.css');
  const radio = list.get('.crewlet-choice-list__radio') ?? '';
  expect(radio).toMatch(/appearance: none/);
  expect(radio).toMatch(/border: 1px solid var\(--color-border-control\)/);
  expect(radio).toMatch(/background: transparent/);
  expect(list.get('.crewlet-choice-list__radio:checked')).toMatch(/var\(--color-brand-accent\)/);
  const text = readFileSync(resolve(here, '..', 'ChoiceList/ChoiceList.css'), 'utf8');
  expect(text).toMatch(/@media \(forced-colors: active\) \{\s*\.crewlet-choice-list__radio \{\s*appearance: auto;/);
  // The tag is about an answer, not the pick, so it is not a second accent mark.
  expect(list.get('.crewlet-choice-list__tag')).toMatch(/color: var\(--color-text-tertiary\)/);
});

test("a card's radio is the platform's under forced colours, its pick in the system's selection colour, an unavailable card in its disabled ink", () => {
  /*
   * Forced colours repaint the drawn radio's dot and the chosen tint away
   * together, so a chosen card showed no mark and an unavailable card looked
   * like any other. The platform's radio marks itself.
   */
  const text = readFileSync(resolve(here, '..', 'ChoiceCards/ChoiceCards.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const forced = /@media \(forced-colors: active\) \{([\s\S]*?)\n\}/.exec(text)?.[1] ?? '';
  expect(forced).toMatch(/\.crewlet-choice-cards__radio \{\s*appearance: auto;/);
  expect(forced).toMatch(/\.crewlet-choice-cards__card\.is-checked \{[^}]*border-color: Highlight;/);
  expect(forced).toMatch(/\.crewlet-choice-cards__card\.is-disabled \{[^}]*border-color: GrayText;[^}]*color: GrayText;/);
});

test('the source editor rings as a field does, and draws no halo', () => {
  const editor = rulesOf('SourceEditor/SourceEditor.css');
  expect(editor.get('.crewlet-source-editor:has(.crewlet-source-editor__field:focus-visible)')).toBe('outline: 2px solid var(--color-focus); outline-offset: -1px;');
  expect(editor.get(":where(:root[data-crewlet-focus='pointer']) .crewlet-source-editor:has(.crewlet-source-editor__field:focus-visible)")).toBe(
    'outline-width: 1px; outline-color: var(--color-border-selected);',
  );
  expect([...editor.values()].join(' ')).not.toMatch(/--color-brand-accent-soft/);
});

test('an arranged block tints under the pointer, rings 2px for the keyboard, and picks in one pixel of the accent', () => {
  const frame = rulesOf('ArrangeFrame/ArrangeFrame.css');
  const hover = [...frame.entries()].find(([selector]) => selector.startsWith('.crewlet-arrange-frame.is-editing:is(:hover, :has(:focus-visible))'));
  expect(hover?.[0]).toContain(':not(:focus-visible, .is-selected, .is-resizing)');
  expect(hover?.[1]).toBe('border-color: var(--color-border-selected);');
  expect(frame.get('.crewlet-arrange-frame.is-editing:focus-visible::after')).toBe('border-width: 2px; border-color: var(--color-focus);');
  expect(frame.get('.crewlet-arrange-frame.is-selected::after, .crewlet-arrange-frame.is-resizing::after')).toBe('border-color: var(--color-brand-accent);');
});
