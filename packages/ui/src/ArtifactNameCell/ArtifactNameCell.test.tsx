/**
 * An artifact's name in a list: the kind's mark on its tint, never read; the
 * title; and under it the kind's word with the description, said as one line.
 */

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS } from '../ArtifactKindGlyph/index.js';
import { ArtifactNameCell } from './index.js';

afterEach(cleanup);

test('the mark is the kind, tinted by the kind and never read', () => {
  const { container } = render(<ArtifactNameCell kind="sheet" title="Vendor scorecard" />);
  const mark = container.querySelector('.crewlet-artifact-name__mark')!;
  expect(mark.classList.contains('crewlet-kind--sheet')).toBe(true);
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  expect(container.querySelector('svg')).not.toBeNull();
});

test('the kind is printed under the title, and the description after it', () => {
  const { container } = render(<ArtifactNameCell kind="html" title="Pipeline health" detail="CI over the last 14 days" />);
  expect(screen.getByText('Pipeline health').getAttribute('title')).toBe('Pipeline health');
  const detail = container.querySelector('.crewlet-artifact-name__detail')!;
  // ONE LINE FOR A SCREEN READER: the dot is drawn, a comma is read.
  expect(detail.textContent).toBe('HTML·, CI over the last 14 days');
  expect(detail.getAttribute('title')).toBe('HTML, CI over the last 14 days');
  expect(container.querySelector('.crewlet-artifact-name__dot')?.getAttribute('aria-hidden')).toBe('true');
});

test('a blank description leaves the kind alone', () => {
  const { container } = render(<ArtifactNameCell kind="doc" title="Plain note" detail="   " />);
  expect(container.querySelector('.crewlet-artifact-name__detail')?.textContent).toBe('Doc');
  expect(container.querySelector('.crewlet-artifact-name__about')).toBeNull();
});

test('a pin is drawn and said', () => {
  render(<ArtifactNameCell kind="slides" title="Q4 roadmap" pinned labels={{ pinned: 'Pinned by you' }} />);
  expect(screen.getByText('Pinned by you')).toBeDefined();
  expect(screen.getByTitle('Pinned by you')).toBeDefined();
});

test('a trashed artifact drops its kind tint', () => {
  const { container } = render(<ArtifactNameCell kind="design" title="Retired board" trashed />);
  expect(container.querySelector('.crewlet-artifact-name--trashed')).not.toBeNull();
});

test('a list of every kind carries no axe violation', async () => {
  const { container } = render(
    <main>
      <ul>
        {ARTIFACT_KINDS.map((kind) => (
          <li key={kind}>
            <ArtifactNameCell kind={kind} title={`A ${kind}`} detail="What it is about" pinned={kind === 'doc'} />
          </li>
        ))}
      </ul>
    </main>,
  );
  const result = await axe.run(container);
  expect(result.violations).toEqual([]);
});
