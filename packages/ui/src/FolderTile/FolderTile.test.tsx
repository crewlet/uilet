/**
 * A folder as a tile: one real link named by its name, described by what it
 * is, who can see it and what the reader can open inside, with its More menu
 * beside the link rather than inside it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ArtifactAccessLabel } from '../ArtifactAccess/index.js';
import { ArtifactNameCell } from '../ArtifactNameCell/index.js';
import { FolderTile, describeFolderContents, folderContentsParts } from './index.js';

afterEach(cleanup);

function factsOf(link: HTMLElement): string {
  return document.getElementById(link.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

test('is one link, named by the folder alone and described by its facts', () => {
  render(
    <FolderTile
      name="Q3 launch"
      href="#/artifacts/folders/f1"
      visibility={<ArtifactAccessLabel access="company" label="Everyone" />}
      contents={{ artifacts: 12, folders: 2 }}
    />,
  );
  const link = screen.getByRole('link', { name: 'Q3 launch' });
  expect(link.getAttribute('href')).toBe('#/artifacts/folders/f1');
  expect(factsOf(link)).toMatch(/^Folder, Everyone, 12 artifacts · 2 folders$/);
});

test('says what the reader can open inside, and never calls a folder empty', () => {
  expect(describeFolderContents({ artifacts: 12, folders: 2 })).toBe('12 artifacts · 2 folders');
  expect(describeFolderContents({ artifacts: 1, folders: 0 })).toBe('1 artifact');
  expect(describeFolderContents({ artifacts: 0, folders: 1 })).toBe('1 folder');
  expect(describeFolderContents({ artifacts: 0, folders: 0 })).toBe('Nothing you can open yet');
  render(<FolderTile name="Board" href="#/f" contents={{ artifacts: 0, folders: 0 }} />);
  expect(factsOf(screen.getByRole('link', { name: 'Board' }))).toContain('Nothing you can open yet');
  expect(document.body.textContent).not.toMatch(/Empty/);
});

test('draws no contents line while the count is unknown', () => {
  const { container } = render(<FolderTile name="Board" href="#/f" />);
  expect(container.querySelector('.crewlet-folder-tile__contents')).toBeNull();
  expect(factsOf(screen.getByRole('link', { name: 'Board' }))).toBe('Folder');
});

test('draws its actions beside its link, where a keyboard reaches them after it', () => {
  render(<FolderTile name="Q3 launch" href="#/f" actions={<button type="button">More for Q3 launch</button>} />);
  const link = screen.getByRole('link', { name: 'Q3 launch' });
  const more = screen.getByRole('button', { name: 'More for Q3 launch' });
  expect(link.contains(more)).toBe(false);
  expect(link.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('sets its facts as one run that wraps between facts, never cutting one short or opening a line on a dot', () => {
  // A stylesheet rule, read as the browser reads it: jsdom lays nothing out,
  // and the regressions this holds were an ellipsis at four tiles across and
  // a separator a broken line opened on.
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'FolderTile.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) => new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  expect(rule('.crewlet-folder-tile__run')).toMatch(/flex-wrap:\s*wrap/);
  for (const selector of ['.crewlet-folder-tile__facts', '.crewlet-folder-tile__run', '.crewlet-folder-tile__fact']) {
    expect(rule(selector), selector).not.toMatch(/text-overflow|white-space:\s*nowrap|overflow:\s*hidden/);
  }
  // Each fact opens with its dot in the separator's width, the run starts
  // that width before the facts' edge, and the facts clip only sideways.
  const separator = 'var(--crewlet-folder-tile-separator)';
  expect(rule('.crewlet-folder-tile__fact')).toContain(`padding-inline-start: ${separator}`);
  expect(rule('.crewlet-folder-tile__run')).toContain(`margin-inline-start: calc(-1 * ${separator})`);
  expect(rule('.crewlet-folder-tile__facts')).toMatch(/overflow-x:\s*clip/);
  // The dot is drawn, not read: its alternative text is empty.
  expect(css).toMatch(/\.crewlet-folder-tile__fact::before,\s*\.crewlet-folder-tile__count-dot::before\s*\{[^}]*content:\s*'·'\s*\/\s*''/);
});

test('draws who can see the folder and the count as two facts, the count holding together', () => {
  const { container } = render(
    <FolderTile
      name="Marketing"
      href="#/f"
      visibility={<ArtifactAccessLabel access="company" label="Everyone" />}
      contents={{ artifacts: 3, folders: 2 }}
    />,
  );
  const facts = [...container.querySelectorAll('.crewlet-folder-tile__fact')];
  expect(facts.map((fact) => fact.className.replace('crewlet-folder-tile__fact ', ''))).toEqual([
    'crewlet-folder-tile__visibility',
    'crewlet-folder-tile__contents',
  ]);
  // Inside the count each part is one piece carrying the dot after it, so the
  // only break is after a dot, never before one.
  const parts = [...facts[1]!.querySelectorAll('.crewlet-folder-tile__count-part')];
  expect(parts.map((part) => part.firstChild?.textContent)).toEqual(['3 artifacts', '2 folders']);
  expect(parts[0]?.lastElementChild?.className).toBe('crewlet-folder-tile__count-dot');
  expect(parts[1]?.querySelector('.crewlet-folder-tile__count-dot')).toBeNull();
  expect(factsOf(screen.getByRole('link', { name: 'Marketing' }))).toBe('Folder, Everyone, 3 artifacts · 2 folders');
});

test('a subfolder, which says nothing of who sees it, opens its run on the count', () => {
  const { container } = render(<FolderTile name="Press" href="#/f" contents={{ artifacts: 0, folders: 0 }} />);
  expect([...container.querySelectorAll('.crewlet-folder-tile__fact')].map((fact) => fact.textContent)).toEqual(['Nothing you can open yet']);
  expect(factsOf(screen.getByRole('link', { name: 'Press' }))).toBe('Folder, Nothing you can open yet');
});

test('the count is one phrasing in parts and as a line', () => {
  expect(folderContentsParts({ artifacts: 12, folders: 2 })).toEqual(['12 artifacts', '2 folders']);
  expect(folderContentsParts({ artifacts: 0, folders: 0 })).toEqual(['Nothing you can open yet']);
  expect(folderContentsParts({ artifacts: 1, folders: 0 }, { artifacts: (n) => `${n} item` })).toEqual(['1 item']);
  expect(describeFolderContents({ artifacts: 12, folders: 2 })).toBe(folderContentsParts({ artifacts: 12, folders: 2 }).join(' · '));
});

test('offers the whole name to a pointer, since the tile cuts it to one line', () => {
  const long = 'Customer research interviews for the payments platform migration, second quarter';
  render(<FolderTile name={long} href="#/f" />);
  expect(screen.getByRole('link', { name: long }).querySelector('[title]')?.getAttribute('title')).toBe(long);
});

test('a chosen tile takes the selected look and says so; a drop target takes its own', () => {
  const { container, rerender } = render(<FolderTile name="Press" href="#/f" selected />);
  expect(container.querySelector('.crewlet-folder-tile.is-selected')).not.toBeNull();
  expect(factsOf(screen.getByRole('link', { name: 'Press' }))).toContain('Selected');
  rerender(<FolderTile name="Press" href="#/f" dropTarget />);
  expect(container.querySelector('.crewlet-folder-tile.is-selected')).toBeNull();
  expect(container.querySelector('.crewlet-folder-tile.is-drop-target')).not.toBeNull();
});

test('the row is the same link in the row shape', () => {
  const { container } = render(<FolderTile name="Press" href="#/f" size="row" contents={{ artifacts: 3, folders: 0 }} />);
  expect(container.querySelector('.crewlet-folder-tile--row')).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Press' })).toBeDefined();
});

test("a list's name cell names a folder by the folder glyph on a neutral tint and the word", () => {
  const { container } = render(<ArtifactNameCell kind="folder" title="Q3 launch" detail={describeFolderContents({ artifacts: 4, folders: 1 })} />);
  const mark = container.querySelector('.crewlet-artifact-name__mark');
  expect(mark?.classList.contains('crewlet-artifact-name__mark--folder')).toBe(true);
  expect(mark?.className).not.toMatch(/crewlet-kind--/);
  expect(mark?.querySelector('svg')).not.toBeNull();
  expect(container.querySelector('.crewlet-artifact-name__detail')?.textContent).toBe('Folder·, 4 artifacts · 1 folder');
});

test('carries no axe violation, as a tile and a row', async () => {
  const { container } = render(
    <main>
      <h1>Folders</h1>
      <FolderTile
        name="Q3 launch"
        href="#/a"
        visibility={<ArtifactAccessLabel access="private" label="Only you" />}
        contents={{ artifacts: 2, folders: 0 }}
        actions={<button type="button">More for Q3 launch</button>}
        selected
      />
      <FolderTile name="Press" href="#/b" size="row" contents={{ artifacts: 0, folders: 0 }} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

/*
 * THE TYPE IS READ FROM THE STYLESHEETS, not the cascade: the tile's sizes
 * are custom properties each shape restates, which jsdom does not resolve, so
 * the declarations themselves are compared, shape by shape, with the card's
 * and the name cell's.
 */
const sheet = (path: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const block = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no rule for ${selector}`);
  return css.slice(at, css.indexOf('}', at));
};
const declared = (body: string, property: string) => new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`).exec(body)?.[1]?.trim();

test('a tile’s words are set as a gallery card’s beside it: title, facts, one line height and the step between', () => {
  const folder = sheet('FolderTile/FolderTile.css');
  const card = sheet('ArtifactCard/ArtifactCard.css');
  const tile = block(folder, '.crewlet-card.crewlet-folder-tile');
  const name = block(folder, '.crewlet-folder-tile__name');
  const facts = block(folder, '.crewlet-folder-tile__facts');
  const title = block(card, '.crewlet-artifact-card--card .crewlet-artifact-card__title');
  const cardFacts = block(card, '.crewlet-artifact-card--card .crewlet-artifact-card__facts');
  const cardBody = block(card, '.crewlet-artifact-card--card .crewlet-artifact-card__body');
  // The values themselves, so a rule both sides lost cannot pass as equal.
  expect([declared(title, 'font-size'), declared(cardFacts, 'font-size'), declared(title, 'line-height'), declared(cardBody, 'gap')]).toEqual([
    'var(--font-size-md)',
    'var(--font-size-sm)',
    '1.35',
    'var(--spacing-1)',
  ]);
  expect(declared(tile, '--crewlet-folder-tile-name')).toBe(declared(title, 'font-size'));
  expect(declared(name, 'font-weight')).toBe(declared(title, 'font-weight'));
  expect(declared(name, 'line-height')).toBe(declared(title, 'line-height'));
  expect(declared(tile, '--crewlet-folder-tile-facts')).toBe(declared(cardFacts, 'font-size'));
  // One line height for the words, the card's facts included.
  expect(declared(facts, 'line-height')).toBe(declared(name, 'line-height'));
  expect(declared(cardFacts, 'line-height')).toBe(declared(title, 'line-height'));
  expect(declared(tile, '--crewlet-folder-tile-words-gap')).toBe(declared(cardBody, 'gap'));
});

test('a row, and a tile on a phone, keep the card’s two steps, closer together', () => {
  const folder = sheet('FolderTile/FolderTile.css');
  const phone = folder.slice(folder.indexOf('@media (width < 640px)'));
  for (const [shape, body] of [
    ['row', block(folder, '.crewlet-card.crewlet-folder-tile--row')],
    ['phone', block(phone, '.crewlet-card.crewlet-folder-tile--tile')],
  ] as const) {
    // The sizes are the tile's own, never restated smaller.
    expect(declared(body, '--crewlet-folder-tile-name'), shape).toBeUndefined();
    expect(declared(body, '--crewlet-folder-tile-facts'), shape).toBeUndefined();
    expect(declared(body, '--crewlet-folder-tile-words-gap'), shape).toBe('2px');
  }
});

test('draws one glyph, sized by the shape, so a tile on a phone draws the row’s glyph', () => {
  const folder = sheet('FolderTile/FolderTile.css');
  const phone = folder.slice(folder.indexOf('@media (width < 640px)'));
  const tile = block(folder, '.crewlet-card.crewlet-folder-tile');
  const glyph = block(folder, '.crewlet-folder-tile__glyph > svg');
  expect(declared(glyph, 'width')).toBe('var(--crewlet-folder-tile-glyph-icon)');
  expect(declared(glyph, 'height')).toBe('var(--crewlet-folder-tile-glyph-icon)');
  // The glyph is half its tint in every shape.
  const half = (body: string) => [declared(body, '--crewlet-folder-tile-glyph'), declared(body, '--crewlet-folder-tile-glyph-icon')];
  expect(half(tile)).toEqual(['40px', '20px']);
  for (const body of [block(folder, '.crewlet-card.crewlet-folder-tile--row'), block(phone, '.crewlet-card.crewlet-folder-tile--tile')]) {
    expect(half(body)).toEqual(['32px', '16px']);
  }
  const { container } = render(<FolderTile name="Press" href="#/f" />);
  expect(container.querySelectorAll('.crewlet-folder-tile__glyph svg')).toHaveLength(1);
});

test('answers the pointer as a gallery card does, and its states outlast the pointer', () => {
  const folder = sheet('FolderTile/FolderTile.css');
  const card = sheet('ArtifactCard/ArtifactCard.css');
  const cardHover = block(card, '.crewlet-artifact-card--card:hover');
  const tileHover = block(folder, '.crewlet-card.crewlet-folder-tile:hover');
  expect(declared(tileHover, 'box-shadow')).toBe(declared(cardHover, 'box-shadow'));
  // The card's quick step, not Card's slower one.
  const step = block(folder, '.crewlet-card.crewlet-folder-tile.is-interactive');
  expect(declared(step, 'transition')).toBe(declared(block(card, '.crewlet-artifact-card--card'), 'transition'));
  // Card's hover darkens the hairline after this sheet, so each state names
  // its edge under the pointer too.
  expect(folder).toMatch(/\.crewlet-card\.crewlet-folder-tile\.is-selected:hover\s*\{\s*border-color:\s*var\(--color-border-selected\)/);
  expect(folder).toMatch(/\.crewlet-card\.crewlet-folder-tile\.is-drop-target:hover\s*\{\s*border-color:\s*var\(--color-brand-accent\)/);
});

test('a row draws who can see the folder as its glyph, and still says the word', () => {
  const folder = sheet('FolderTile/FolderTile.css');
  const phone = folder.slice(folder.indexOf('@media (width < 640px)'));
  const hidden = ['absolute', '1px', 'inset(50%)'];
  const word = (body: string) =>
    ['position', 'size', 'clip'].map((part) => declared(body, `--crewlet-folder-tile-word-${part}`));
  expect(word(block(folder, '.crewlet-card.crewlet-folder-tile'))).toEqual(['static', 'auto', 'none']);
  expect(word(block(folder, '.crewlet-card.crewlet-folder-tile--row'))).toEqual(hidden);
  expect(word(block(phone, '.crewlet-card.crewlet-folder-tile--tile'))).toEqual(hidden);
  render(<FolderTile name="Press" href="#/f" size="row" visibility={<ArtifactAccessLabel access="company" label="Everyone" />} contents={{ artifacts: 2, folders: 0 }} />);
  expect(factsOf(screen.getByRole('link', { name: 'Press' }))).toBe('Folder, Everyone, 2 artifacts');
});
