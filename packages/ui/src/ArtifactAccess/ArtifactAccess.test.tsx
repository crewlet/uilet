/**
 * An artifact's access: one glyph per access, decorative, and its word
 * always printed, so it is never told by the glyph alone.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ARTIFACT_ACCESSES, ARTIFACT_ACCESS_LABELS, ArtifactAccessGlyph, ArtifactAccessLabel } from './index.js';

afterEach(cleanup);

test('every access is printed in its word, its glyph hidden', () => {
  for (const access of ARTIFACT_ACCESSES) {
    const { container } = render(<ArtifactAccessLabel access={access} />);
    expect(screen.getByText(ARTIFACT_ACCESS_LABELS[access])).toBeDefined();
    expect(container.querySelector('.crewlet-artifact-access__glyph')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector(`.crewlet-artifact-access--${access}`)).not.toBeNull();
    cleanup();
  }
});

test('a caller words it, and titles it with more than the word', () => {
  render(<ArtifactAccessLabel access="shared" label="3 people" title="Shared with 3 people" />);
  expect(screen.getByText('3 people')).toBeDefined();
  expect(screen.getByTitle('Shared with 3 people')).toBeDefined();
});

test('each access draws a glyph of its own', () => {
  const drawn = ARTIFACT_ACCESSES.map((access) => {
    const { container } = render(<ArtifactAccessGlyph access={access} />);
    const html = container.innerHTML;
    cleanup();
    return html;
  });
  expect(new Set(drawn).size).toBe(ARTIFACT_ACCESSES.length);
});
