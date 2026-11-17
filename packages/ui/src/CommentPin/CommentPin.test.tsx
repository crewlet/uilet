/**
 * The comment pin: a named button over the content, its mark, its state and
 * whether its thread is the one open.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CommentPin, CommentPinGlyph, commentPinCursor } from './index.js';

afterEach(cleanup);

test('is a button named for its thread, drawing its mark, and says whether it is selected', () => {
  const onClick = vi.fn();
  render(<CommentPin mark="3" label="Avery on the comparison: Can the table say which plan most teams pick?" onClick={onClick} />);
  const pin = screen.getByRole('button', { name: /Avery on the comparison/ });
  expect(pin.textContent).toBe('3');
  expect(pin.getAttribute('aria-pressed')).toBe('false');
  expect(pin.classList.contains('crewlet-comment-pin--open')).toBe(true);
  fireEvent.click(pin);
  expect(onClick).toHaveBeenCalledOnce();
});

test('a resolved pin shows a check instead of its mark, a draft is its own state, and a selected one is pressed', () => {
  const { rerender } = render(<CommentPin mark="2" label="Resolved thread" state="resolved" />);
  const pin = screen.getByRole('button', { name: 'Resolved thread' });
  expect(pin.textContent).toBe('');
  expect(pin.querySelector('svg')).not.toBeNull();
  rerender(<CommentPin mark="A" label="Your new comment" state="draft" selected />);
  const draft = screen.getByRole('button', { name: 'Your new comment' });
  expect(draft.classList.contains('crewlet-comment-pin--draft')).toBe(true);
  expect(draft.classList.contains('crewlet-comment-pin--selected')).toBe(true);
  expect(draft.getAttribute('aria-pressed')).toBe('true');
});

test('the glyph is the pin drawn as a glyph: hidden as decoration, named when titled', () => {
  const { container, rerender } = render(<CommentPinGlyph size="sm" />);
  const svg = container.querySelector('svg')!;
  expect(svg.getAttribute('aria-hidden')).toBe('true');
  expect(svg.getAttribute('width')).toBe('14px');
  expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(svg.querySelectorAll('path')).toHaveLength(2);
  rerender(<CommentPinGlyph title="Comment" />);
  expect(screen.getByRole('img', { name: 'Comment' })).toBeTruthy();
});

const drawing = (cursor: string) => {
  const match = /^url\("data:image\/svg\+xml,([^"]+)"\) (\d+) (\d+), crosshair$/.exec(cursor);
  expect(match, cursor).not.toBeNull();
  return { svg: decodeURIComponent(match![1]!), x: Number(match![2]), y: Number(match![3]) };
};

test("the placing cursor is the draft pin, its hotspot on the pin's tip, with a crosshair to fall back on", () => {
  const ltr = drawing(commentPinCursor({ fill: '#ffffff', edge: '#735af2' }));
  expect(ltr.svg).toContain('fill="#ffffff"');
  expect(ltr.svg).toContain('stroke="#735af2"');
  expect(ltr.svg).toContain('stroke-dasharray');
  expect(ltr.svg).toContain('d="M12 8v8M8 12h8"');
  // The tip is the outline's first point, its bottom-start corner.
  expect([ltr.x, ltr.y]).toEqual([3, 21]);
  const rtl = drawing(commentPinCursor({}, 'rtl'));
  expect([rtl.x, rtl.y]).toEqual([21, 21]);
  expect(rtl.svg).toContain('transform="matrix(-1 0 0 1 24 0)"');
});

test('a colour cannot break out of the drawing', () => {
  const { svg } = drawing(commentPinCursor({ edge: 'red" onload="x' }));
  expect(svg).not.toContain('" onload');
  expect(svg).toContain('red&#34; onload=&#34;x');
});
