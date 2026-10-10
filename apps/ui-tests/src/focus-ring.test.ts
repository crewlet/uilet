/**
 * One focus, one ring: no focus ring in the package stands off an edge its
 * element draws.
 *
 * A focus ring is an outline, and an outline has an offset. Set outward, the
 * ring stands 2px off its element with the ground showing between them, which
 * is the right drawing for a control that draws no edge of its own (a filled
 * button, a link, a ghost square): the ring is the only line out there. Round
 * a control that DOES draw one (a secondary button, a chip, a card, a field)
 * the same offset is two edges with a gap between them, which reads as a
 * second outline rather than as focus. So a bordered control rings over its
 * own border, on --size-focus-ring-inset-offset, the rule every field already
 * kept. The field register's own guard is in Input.test.tsx and is stricter:
 * it also refuses a recoloured border and a shadow under the ring.
 *
 * WHY A TABLE AND NOT A SCAN FOR BORDERS. Whether an element draws an edge is
 * decided by a cascade of variants, states and themes that no reading of a
 * stylesheet answers reliably, and a guess that a rule was borderless is how
 * the buttons, chips and cards here came to ring twice. So every ring that
 * stands off its element is LISTED with the reason it may, and a new one is a
 * failure until somebody writes that reason down: whether the element draws an
 * edge is asked of a person, once, in a reviewed diff.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

/*
 * The repository root by arithmetic on this file's own path, rather than
 * `new URL('../..', import.meta.url)`, which Vite rewrites into an asset URL.
 */
const REPOSITORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE = join(REPOSITORY, 'packages/ui/src');

function stylesheets(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...stylesheets(path));
    else if (entry.name.endsWith('.css')) found.push(path);
  }
  return found.sort();
}

/** A selector list split on its own commas, never on one inside `:has()` or `:not()`. */
function members(list: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      found.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim() !== '') found.push(current.trim());
  return found;
}

interface Sheet {
  where: string;
  /** The stylesheet with every comment blanked, so prose about a rule is never read as the rule. */
  text: string;
}

const SHEETS: Sheet[] = stylesheets(SOURCE).map((path) => ({
  where: relative(SOURCE, path),
  text: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' ')),
}));

/**
 * Every member of every focus rule that SETS an offset, keyed by sheet and
 * member, with the offset that wins: the last one in its stylesheet, which is
 * what the cascade decides between two rules of one weight. A member of a rule
 * whose list names a focus state counts even when it is not one itself, so the
 * open state a picker rings for alongside its focus is held to the same rule.
 */
function offsets(): Map<string, string> {
  const found = new Map<string, string>();
  for (const sheet of SHEETS) {
    for (const [, selector = '', body = ''] of sheet.text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const list = members(selector.trim().replace(/\s+/g, ' '));
      if (!list.some((member) => member.includes(':focus'))) continue;
      const offset = /(?:^|;)\s*outline-offset\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
      if (offset === undefined) continue;
      for (const member of list) found.set(`${sheet.where} | ${member}`, offset);
    }
  }
  return found;
}

/** A positive length: the ring stands that far off its element. */
const outward = (offset: string): boolean => /^\d*\.?\d+px$/.test(offset) && Number.parseFloat(offset) > 0;

test('the scan reads the focus rules the package draws', () => {
  // A scan that found nothing would pass both tables below for any tree.
  expect(SHEETS.length).toBeGreaterThan(60);
  expect(offsets().size).toBeGreaterThan(60);
});

test('a ring stands off its element only where the element draws no edge', () => {
  const standing = [...offsets()]
    .filter(([, offset]) => outward(offset))
    .map(([key]) => key)
    .sort();
  expect(standing).toEqual(
    [
      // The base rule, for the variants that draw no edge: a primary or accent
      // fill, whose border is transparent, and a ghost. An inset ring on the
      // accent fill would be drawn in nearly the fill's own colour. The
      // bordered variants override it (see the table below).
      'Button/Button.css | .crewlet-btn:focus-visible',
      // Likewise the ghost and ghost-danger squares, which never draw an edge.
      'IconButton/IconButton.css | .crewlet-icon-btn:focus-visible',
      // Filled with the accent, its border the fill itself.
      'DataTable/DataTable.css | .crewlet-data-table__items-per-page-btn.is-active:focus-visible',
      // Filled toast actions, whose borders are their fills, and a borderless dismiss.
      'Toaster/Toaster.css | .crewlet-toast__action-btn:focus-visible',
      'Toaster/Toaster.css | .crewlet-toast__action-link:focus-visible',
      'Toaster/Toaster.css | .crewlet-toast__dismiss:focus-visible',
      // Text and marks with no boundary: a link, the brand mark, a chip that is
      // only a link, a plain text button, and an image that is the target.
      'Link/Link.css | .crewlet-link:focus-visible',
      'BrandLockup/BrandLockup.css | .crewlet-brand__home:focus-visible',
      'EntityChip/EntityChip.css | .crewlet-entity-chip--link:focus-visible',
      'DataTable/DataTable.css | .crewlet-data-table__clear-filters:focus-visible',
      'ImageUpload/ImageUpload.css | .crewlet-image-upload__trigger:focus-visible',
      // A row and a frame that draw no border of their own.
      'Charts/Charts.css | .crewlet-bar-list__row--pressable:focus-visible',
      'Charts/Charts.css | .crewlet-chart-frame:focus-visible',
      // A tab is borderless; the pill variant's chips override it (see below).
      'Tabs/Tabs.css | .crewlet-tabs__tab:focus-visible',
      // A list that takes focus when it expands, with no edge of its own.
      'TagGroup/TagGroup.css | .crewlet-tag-group:focus-visible',
      // A character tile, which draws no edge: the badge inside it carries the
      // chosen option's ring, so the focus ring stands off the tile round both.
      'CharacterPicker/CharacterPicker.css | .crewlet-character-picker__option:focus-visible',
    ].sort(),
  );
});

test('a control that draws an edge rings over it, never off it', () => {
  /*
   * The overrides the table above leans on, stated so that deleting one fails
   * here rather than quietly handing a bordered variant back to the base rule's
   * outset ring. Each offset puts the ring over the element's own edge:
   *
   * - the inset offset covers a 1px border and one pixel inside it;
   * - -1px covers the border and one pixel outside it, for a tag, whose
   *   pressed state is an ink line just inside the border that a ring two
   *   pixels deep would hide (the remove reaches over the pill's border, so
   *   -1px puts its ring on the same pixels);
   * - 0 is flush, for a box too small to ring inside itself (a checkbox, a
   *   switch) and for the press half of a split tag and a pill chip, whose
   *   boxes stop where the edge they ring on begins.
   */
  const inset = 'var(--size-focus-ring-inset-offset)';
  const all = offsets();
  const expected: [string, string][] = [
    ['Button/Button.css | .crewlet-btn--secondary:focus-visible', inset],
    ['Button/Button.css | .crewlet-btn--outline:focus-visible', inset],
    ['Button/Button.css | .crewlet-btn--danger:focus-visible', inset],
    ["Button/Button.css | .crewlet-btn[aria-pressed='true']:focus-visible", inset],
    ['IconButton/IconButton.css | .crewlet-icon-btn--secondary:focus-visible', inset],
    ['IconButton/IconButton.css | .crewlet-icon-btn--soft-brand:focus-visible', inset],
    ['IconButton/IconButton.css | .crewlet-icon-btn--ghost-brand:focus-visible', inset],
    ['SearchTrigger/SearchTrigger.css | .crewlet-search-trigger:focus-visible', inset],
    ['FilterChip/FilterChip.css | .crewlet-filter-chip:focus-visible', inset],
    ['NewItemsNotice/NewItemsNotice.css | .crewlet-new-items:focus-visible', inset],
    ['Card/Card.css | .crewlet-card.is-interactive:focus-visible', inset],
    ['PricingCard/PricingCard.css | .crewlet-pricing-card:focus-visible', inset],
    ['Popover/Popover.css | .crewlet-popover:focus-visible', inset],
    ['TagGroup/TagGroup.css | .crewlet-tag-group__more:focus-visible', inset],
    ['AppShell/AppShell.css | .crewlet-app-shell__skip:focus-visible', inset],
    ['DataTable/DataTable.css | .crewlet-data-table__items-per-page-btn:focus-visible', inset],
    ['ImageUpload/ImageUpload.css | .crewlet-image-upload__remove:focus-visible', inset],
    ['SegmentedControl/SegmentedControl.css | .crewlet-segmented--cards .crewlet-segmented__option:focus-visible', inset],
    ['Tag/Tag.css | .crewlet-tag--actionable:focus-visible', '-1px'],
    ['Tag/Tag.css | .crewlet-tag__remove:focus-visible', '-1px'],
    ['Tag/Tag.css | .crewlet-tag__press:focus-visible', '0'],
    ['Tabs/Tabs.css | .crewlet-tabs--pill .crewlet-tabs__tab:focus-visible', '0'],
    ['Checkbox/Checkbox.css | .crewlet-checkbox__control:focus-visible', '0'],
    ['Switch/Switch.css | .crewlet-switch__track:has(.crewlet-switch__control:focus-visible)', '0'],
  ];
  expect(expected.map(([key]) => `${key} = ${all.get(key)}`)).toEqual(
    expected.map(([key, offset]) => `${key} = ${offset}`),
  );
});

test('no stylesheet draws --shadow-focus, which is two rings by construction', () => {
  /*
   * `0 0 0 2px background, 0 0 0 4px focus` is a background-coloured gap and
   * then a band. Under a border it is an edge, a gap and a band; it is also a
   * shadow, which forced-colors mode drops. The token stays in
   * @crewlethq/tokens for an application that wants it; nothing here does.
   */
  const drawn = SHEETS.filter((sheet) => sheet.text.includes('--shadow-focus')).map((sheet) => sheet.where);
  expect(drawn).toEqual([]);
});
