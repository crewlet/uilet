/**
 * Files handed to the reader: a named list, each file's name, type and size,
 * its action, and a preview only ever drawn as an image element.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { FileList } from './index.js';

afterEach(cleanup);

test('each file is an item with its name, its type and its size', () => {
  render(
    <FileList
      label="Files"
      files={[
        { id: 'a', name: 'report.csv', type: 'CSV file', size: '2 KB', action: <button type="button">Download</button> },
        { id: 'b', name: 'chart.png', type: 'PNG image', size: '40 KB', preview: '/files/b' },
      ]}
    />,
  );
  const items = screen.getByRole('list', { name: 'Files' }).querySelectorAll('li');
  expect(items).toHaveLength(2);
  expect(items[0]!.textContent).toContain('report.csv');
  expect(items[0]!.textContent).toContain('CSV file, · 2 KB');
  expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
});

test('a preview is an img and nothing else, and a broken one falls back to the mark', () => {
  const { container } = render(
    <FileList label="Files" files={[{ id: 'svg', name: 'logo.svg', type: 'SVG image', size: '1 KB', preview: '/files/svg' }]} />,
  );
  const img = container.querySelector('img');
  expect(img?.getAttribute('src')).toBe('/files/svg');
  expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(container.querySelector('iframe, object, embed, li > svg:not([aria-hidden])')).toBeNull();
  fireEvent.error(img!);
  expect(container.querySelector('img')).toBeNull();
});

test('a file with no preview draws no image', () => {
  const { container } = render(<FileList label="Files" files={[{ id: 'a', name: 'notes.md', type: 'Markdown file', size: '1 KB' }]} />);
  expect(container.querySelector('img')).toBeNull();
});

test('two files with one id are refused', () => {
  const file = { id: 'a', name: 'a', type: 't', size: '1 B' };
  expect(() => render(<FileList label="Files" files={[file, file]} />)).toThrow(RangeError);
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <FileList label="Files" files={[{ id: 'b', name: 'chart.png', type: 'PNG image', size: '40 KB', preview: '/files/b' }]} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
