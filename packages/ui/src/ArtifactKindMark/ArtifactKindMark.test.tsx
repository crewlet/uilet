/**
 * A kind's mark: the kind's own glyph in its ink by default, or its maker
 * character, one per kind and never shared, on the kind's plate, hidden from
 * assistive technology because the kind's name is always printed beside it.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_KINDS, ArtifactKindGlyph } from '../ArtifactKindGlyph/index.js';
import { ARTIFACT_KIND_CHARACTERS, ArtifactKindMark } from './index.js';

afterEach(cleanup);

test('every kind has a maker of its own', () => {
  const makers = ARTIFACT_KINDS.map((kind) => ARTIFACT_KIND_CHARACTERS[kind]);
  expect(new Set(makers).size).toBe(ARTIFACT_KINDS.length);
});

test("draws the kind's glyph by default, the same drawing a card's badge carries, hidden from assistive technology", () => {
  for (const kind of ARTIFACT_KINDS) {
    const { container, unmount } = render(<ArtifactKindMark kind={kind} />);
    const mark = container.querySelector('.crewlet-kind-mark')!;
    expect(mark.getAttribute('aria-hidden')).toBe('true');
    expect(mark.classList.contains(`crewlet-kind--${kind}`)).toBe(true);
    expect(mark.classList.contains('crewlet-kind-mark--glyph')).toBe(true);
    expect(mark.querySelector('svg[data-character]')).toBeNull();
    const card = render(<ArtifactKindGlyph kind={kind} size={18} />);
    expect(mark.querySelector('svg')?.innerHTML).toBe(card.container.querySelector('svg')?.innerHTML);
    card.unmount();
    unmount();
  }
});

test("draws the kind's maker on request, in full only at the stage step, where its hairlines read", () => {
  const { container, rerender } = render(<ArtifactKindMark kind="doc" art="character" size="md" />);
  expect(container.querySelector('svg')?.getAttribute('data-character')).toBe(ARTIFACT_KIND_CHARACTERS.doc);
  expect(container.querySelector('svg')?.getAttribute('data-detail')).toBe('compact');
  rerender(<ArtifactKindMark kind="doc" art="character" size="xl" surface="bare" />);
  expect(container.querySelector('svg')?.getAttribute('data-detail')).toBe('full');
  expect(container.querySelector('.crewlet-kind-mark--bare')).not.toBeNull();
});
