/**
 * An artifact reference: its kind's glyph and its title, named by the title
 * with the kind said first, drawn as a work item's key is.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SquareKanbanGlyph } from '@crewlethq/icons/glyphs';
import { InlineRef } from '../InlineRef/index.js';
import { ArtifactRef } from './index.js';

afterEach(cleanup);

test('is a link named by its title, the kind said before it and its glyph drawn as the mark', () => {
  render(<ArtifactRef kind="slides" title="Q4 roadmap" href="#/artifacts/a1" />);
  const link = screen.getByRole('link');
  // What a screen reader hears (jsdom's name computation trims the hidden kind's space, so the text is read).
  expect(link.textContent).toBe('Slides: Q4 roadmap');
  expect(link.getAttribute('aria-label')).toBeNull();
  expect(link.getAttribute('href')).toBe('#/artifacts/a1');
  expect(link.getAttribute('target')).toBeNull();
  const mark = link.querySelector('.crewlet-inline-ref__mark--glyph');
  expect(mark?.getAttribute('aria-hidden')).toBe('true');
  expect(mark?.querySelector('svg')).not.toBeNull();
});

test("opens the application's own way where the application says one", () => {
  let opened = 0;
  render(<ArtifactRef kind="slides" title="Q4 roadmap" href="#/artifacts/a1" onFollow={() => (opened += 1)} />);
  expect(fireEvent.click(screen.getByRole('link'))).toBe(false);
  expect(opened).toBe(1);
});

test("takes a work item key's size, ink and hover: the same reference, with a title that wraps", () => {
  render(
    <p>
      <InlineRef mark={<SquareKanbanGlyph />} kind="Task" href="#/worklet/ENG-1" code>
        ENG-1
      </InlineRef>{' '}
      <ArtifactRef kind="doc" title="Launch plan" href="#/artifacts/a2" />
    </p>,
  );
  const [task, artifact] = screen.getAllByRole('link') as [HTMLElement, HTMLElement];
  expect(artifact.textContent).toBe('Doc: Launch plan');
  for (const name of ['crewlet-inline-ref', 'crewlet-inline-ref--link']) {
    expect(task.classList.contains(name)).toBe(true);
    expect(artifact.classList.contains(name)).toBe(true);
  }
  expect(artifact.classList.contains('crewlet-inline-ref--wrap')).toBe(true);
  expect(artifact.classList.contains('crewlet-inline-ref--code')).toBe(false);
});

test('draws its words with no link where it has nowhere to go, and any artifact while its kind is unknown', () => {
  const { rerender } = render(<ArtifactRef kind="sheet" title="Budget" />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('Budget')).toBeTruthy();
  rerender(<ArtifactRef title="Budget" hint="Budget 2026, all teams" after=", version 3" />);
  const ref = document.querySelector('.crewlet-inline-ref')!;
  expect(ref.textContent).toBe('Artifact: Budget, version 3');
  expect(ref.getAttribute('title')).toBe('Budget 2026, all teams');
});

test('says its kind in the words it is given', () => {
  render(<ArtifactRef kind="html" kindLabel="Page" title="Status board" href="#/artifacts/a3" />);
  expect(screen.getByRole('link').textContent).toBe('Page: Status board');
});
