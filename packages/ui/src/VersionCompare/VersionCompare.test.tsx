/**
 * Two versions compared: a line diff of two texts or the host's own
 * comparison, the versions side by side, and no lens offered that has nothing
 * to draw.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { VersionCompare } from './index.js';

afterEach(cleanup);

const before = 'Title\nFirst paragraph.\nSecond paragraph.';
const after = 'Title\nFirst paragraph, revised.\nSecond paragraph.';

test('the changes lens draws the line diff of two texts with its summary', () => {
  render(<VersionCompare fromLabel="Version 3" toLabel="Version 5" lens="changes" before={before} after={after} />);
  expect(screen.getByRole('heading', { name: 'Version 3 and Version 5' })).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Changes from Version 3 to Version 5' })).toBeTruthy();
  expect(screen.getByText('1 line added, 1 removed')).toBeTruthy();
  expect(screen.getByText('First paragraph, revised.')).toBeTruthy();
});

test('two identical texts are said in words, not drawn as unmarked lines', () => {
  render(<VersionCompare fromLabel="rev 1" toLabel="rev 2" lens="changes" before={before} after={before} />);
  expect(screen.getByText('Nothing changed')).toBeTruthy();
  expect(screen.queryByRole('group')).toBeNull();
});

test("the host's own comparison is drawn in place of the line diff", () => {
  render(
    <VersionCompare fromLabel="Version 1" toLabel="Version 2" lens="changes" changes={<p>3 files changed</p>} before="a" after="b" />,
  );
  expect(screen.getByText('3 files changed')).toBeTruthy();
  expect(screen.queryByRole('group')).toBeNull();
});

test('the versions lens draws both panes, older first, each under its own heading', () => {
  render(
    <VersionCompare
      fromLabel="Version 3"
      toLabel="Version 5"
      lens="versions"
      from={<p>old body</p>}
      to={<p>new body</p>}
      note="Both versions show today's data."
    />,
  );
  const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
  expect(headings).toEqual(['Version 3', 'Version 5']);
  expect(screen.getByText("Both versions show today's data.")).toBeTruthy();
});

test('the switch changes lens, and is absent when only one lens can be drawn', () => {
  const onLensChange = vi.fn();
  const { rerender } = render(
    <VersionCompare
      fromLabel="rev 1"
      toLabel="rev 2"
      lens="changes"
      onLensChange={onLensChange}
      before={before}
      after={after}
      to={<p>full text</p>}
      labels={{ versions: 'Full text' }}
    />,
  );
  const full = screen.getByRole('radio', { name: 'Full text' });
  fireEvent.click(full);
  expect(onLensChange).toHaveBeenCalledWith('versions');
  rerender(<VersionCompare fromLabel="rev 1" toLabel="rev 2" lens="versions" onLensChange={onLensChange} before={before} after={after} />);
  // Nothing to draw side by side: the switch is gone and the changes are shown.
  expect(screen.queryByRole('radiogroup')).toBeNull();
  expect(screen.getByText('First paragraph, revised.')).toBeTruthy();
});

test('carries no violation on either lens', async () => {
  for (const lens of ['changes', 'versions'] as const) {
    const { container, unmount } = render(
      <main>
        <VersionCompare
          fromLabel="Version 3"
          toLabel="Version 5"
          lens={lens}
          onLensChange={() => {}}
          before={before}
          after={after}
          from={<p>old</p>}
          to={<p>new</p>}
        />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((v) => `${lens} ${v.id}`)).toEqual([]);
    unmount();
  }
});
