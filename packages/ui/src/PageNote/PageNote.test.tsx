/**
 * PageNote: one paragraph, at the measure, with no margin of its own.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { PageNote } from './index.js';

afterEach(cleanup);

test('is a paragraph carrying its words and its caller class', () => {
  render(<PageNote className="extra">Read only here.</PageNote>);
  const note = screen.getByText('Read only here.');
  expect(note.tagName).toBe('P');
  expect(note.className).toBe('crewlet-page-note extra');
});

test('keeps no margin and stands at the reading measure', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'PageNote.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  expect(css).toMatch(/margin:\s*0;/);
  expect(css).toMatch(/max-width:\s*var\(--size-measure\);/);
});
