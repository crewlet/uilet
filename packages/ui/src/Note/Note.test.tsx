/**
 * Words on a coloured paper: one of the six hues or the page's own, at the
 * start or centred, at the body size or a size read across the room.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { NODE_HUES } from '../utils/nodeHue.js';
import { Note } from './index.js';

afterEach(cleanup);

const paper = (container: HTMLElement) => container.querySelector<HTMLElement>('.crewlet-note')!;

test('holds its words, on amber paper at the start by default', () => {
  const { container } = render(
    <Note>
      <p>Answer the two scope questions.</p>
    </Note>,
  );
  const note = paper(container);
  expect(note.textContent).toBe('Answer the two scope questions.');
  expect(note.className).toBe('crewlet-note crewlet-note--amber');
});

test('takes each hue as its paper, and the page’s own', () => {
  for (const tone of [...NODE_HUES, 'none'] as const) {
    const { container } = render(<Note tone={tone}>Words</Note>);
    expect(paper(container).classList.contains(`crewlet-note--${tone}`), tone).toBe(true);
    cleanup();
  }
});

test('centres and enlarges its words when asked', () => {
  const { container } = render(
    <Note align="center" size="lg" className="goal">
      Ship the MVP
    </Note>,
  );
  const note = paper(container);
  expect(note.classList.contains('crewlet-note--center')).toBe(true);
  expect(note.classList.contains('crewlet-note--lg')).toBe(true);
  expect(note.classList.contains('goal')).toBe(true);
});

test('a heading names it, over its words, at the level asked for', () => {
  const { container, getByRole } = render(
    <Note tone="none" heading="How to read this board" headingLevel={2}>
      <p>Work is read live as you.</p>
    </Note>,
  );
  const region = getByRole('region', { name: 'How to read this board' });
  expect(region).toBe(paper(container));
  const heading = region.firstElementChild!;
  expect(heading.tagName).toBe('H2');
  expect(heading.className).toBe('crewlet-note__heading');
  expect(heading.nextElementSibling?.textContent).toBe('Work is read live as you.');
});

test('without a heading it is no region', () => {
  const { container } = render(<Note>Words</Note>);
  expect(paper(container).getAttribute('role')).toBeNull();
  expect(container.querySelector('.crewlet-note__heading')).toBeNull();
});

test('passes axe', async () => {
  const { container } = render(
    <Note tone="cyan">
      <p>
        Read the <a href="#/knowledge">runbook</a> first.
      </p>
    </Note>,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});

test('paragraphs stand a step apart, whatever the host resets', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Note.css'), 'utf8');
  expect(css).toMatch(/\.crewlet-note :is\(p, ul, ol\) \+ :is\(p, ul, ol\) \{\s*margin-block-start: var\(--spacing-2\);/);
  expect(css).toMatch(/\.crewlet-note :is\(p, ul, ol\) \{\s*margin-block: 0;/);
});
