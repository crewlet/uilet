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
import { FolderTile, describeFolderContents } from './index.js';

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

test('wraps who can see the folder and what is inside rather than cutting either short', () => {
  // A stylesheet rule, read as the browser reads it: jsdom lays nothing out,
  // and the regression this holds was an ellipsis at four tiles across.
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'FolderTile.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) => new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  expect(rule('.crewlet-folder-tile__facts')).toMatch(/flex-wrap:\s*wrap/);
  for (const selector of ['.crewlet-folder-tile__facts', '.crewlet-folder-tile__contents', '.crewlet-folder-tile__visibility']) {
    expect(rule(selector), selector).not.toMatch(/text-overflow|white-space:\s*nowrap|overflow:\s*hidden/);
  }
  // No separator that a broken line would open on.
  expect(css).not.toMatch(/__contents::before/);
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
