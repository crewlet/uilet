/**
 * A file attached to a message: its thumbnail as an image element, its state
 * said in words, and a remove control named by the file only while it can be
 * taken off.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { AttachmentChip } from './index.js';

afterEach(cleanup);

test('a ready chip draws its thumbnail and removes by name', () => {
  const onRemove = vi.fn();
  const { container } = render(<AttachmentChip name="screenshot.png" preview="blob:one" onRemove={onRemove} />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:one');
  fireEvent.click(screen.getByRole('button', { name: 'Remove screenshot.png' }));
  expect(onRemove).toHaveBeenCalledTimes(1);
});

test('uploading and failed chips say so after the name, and draw no thumbnail', () => {
  const { container, rerender } = render(<AttachmentChip name="a.png" preview="blob:a" state="uploading" />);
  expect(container.textContent).toBe('a.png, Uploading');
  expect(container.querySelector('img')).toBeNull();
  rerender(<AttachmentChip name="a.png" preview="blob:a" state="failed" />);
  expect(container.textContent).toBe('a.png, Not attached');
  expect(container.querySelector('.crewlet-tag--danger')).not.toBeNull();
});

test('a sent chip has no remove control, and a broken thumbnail falls back to the mark', () => {
  const { container } = render(<AttachmentChip name="a.png" preview="/files/a" />);
  expect(screen.queryByRole('button')).toBeNull();
  fireEvent.error(container.querySelector('img')!);
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('svg')).not.toBeNull();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <AttachmentChip name="a.png" preview="blob:a" onRemove={() => {}} />
      <AttachmentChip name="b.png" state="failed" onRemove={() => {}} />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations).toEqual([]);
});
