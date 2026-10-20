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

const CHOSEN: ReadonlyArray<readonly [sheet: string, selector: string, edge: 'border' | 'outline' | null, fill: 'background' | 'halo' | null]> = [
  ['ThemeGallery/ThemeGallery.css', '.crewlet-theme-gallery__card.is-chosen', 'border', 'background'],
  ['SlideFilmstrip/SlideFilmstrip.css', ".crewlet-slide-filmstrip__item[data-selected='true'] .crewlet-slide-filmstrip__thumb", 'outline', 'halo'],
  ['SlideGrid/SlideGrid.css', ".crewlet-slide-grid__card[aria-current='true'] .crewlet-slide-stage", 'outline', 'halo'],
  ['DatasetSource/DatasetSource.css', '.crewlet-dataset-source--selected .crewlet-dataset-source__summary', 'border', 'background'],
  ['ChoiceList/ChoiceList.css', '.crewlet-choice-list__row.is-checked', null, 'background'],
  ['LayersList/LayersList.css', ".crewlet-layers-list__item[aria-current='true']", null, 'background'],
];

test('every chosen option is drawn in the selected edge and fill, never the accent', () => {
  for (const [sheet, selector, edge, fill] of CHOSEN) {
    const body = rulesOf(sheet).get(selector);
    expect(body, `${sheet}: ${selector}`).toBeDefined();
    expect(body, `${sheet}: ${selector}`).not.toMatch(/--color-brand-accent\)/);
    expect(body, `${sheet}: ${selector}`).not.toMatch(/--color-focus\)/);
    expect(body, `${sheet}: ${selector}`).not.toMatch(/(outline|border)(-width)?:\s*2px/);
    if (edge === 'border') expect(body, `${sheet}: ${selector}`).toMatch(/border-color:\s*var\(--color-border-selected\)/);
    if (edge === 'outline') expect(body, `${sheet}: ${selector}`).toMatch(/outline-color:\s*var\(--color-border-selected\)/);
    if (fill === 'background') expect(body, `${sheet}: ${selector}`).toMatch(/background:\s*var\(--color-surface-selected\)/);
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
  expect(rulesOf('LayersList/LayersList.css').get('.crewlet-layers-list__item:focus-visible')).toMatch(ring);
  expect(rulesOf('ArtifactKindIllustration/ArtifactKindIllustration.css').get('.crewlet-kind-tile:focus-visible .crewlet-kind-tile__frame')).toMatch(ring);
});

test('a title being written underlines in a tint for a pointer and in two focus pixels for the keyboard', () => {
  const doc = rulesOf('Document/Document.css');
  expect(doc.get('.crewlet-document-title-field:focus-visible')).toMatch(/border-block-end-color:\s*var\(--color-focus\); box-shadow: 0 1px 0 var\(--color-focus\)/);
  expect(doc.get(":root[data-crewlet-focus='pointer'] .crewlet-document-title-field:focus-visible")).toMatch(
    /border-block-end-color:\s*var\(--color-border-selected\); box-shadow: none/,
  );
  // The composer's box rings as a field does, and draws no halo any more.
  const composer = rulesOf('Composer/Composer.css');
  expect(composer.get('.crewlet-composer:has(.crewlet-composer__field:focus-visible)')).toBe('outline: 2px solid var(--color-focus); outline-offset: -1px;');
  expect(composer.get(":root[data-crewlet-focus='pointer'] .crewlet-composer:has(.crewlet-composer__field:focus-visible)")).toBe('outline-width: 1px;');
  expect([...composer.values()].join(' ')).not.toMatch(/--color-brand-accent-soft/);
});
