/**
 * Previous, the position and Next: the controls stop at the ends and say why.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { SlideNav } from './index.js';

afterEach(cleanup);

function nav(position: number, total: number) {
  const props = { onPrevious: vi.fn(), onNext: vi.fn() };
  render(<SlideNav position={position} total={total} {...props} />);
  return props;
}

test('the controls move the show in the middle of the deck', () => {
  const props = nav(4, 12);
  expect(screen.getByRole('group', { name: 'Slide controls' })).toBeTruthy();
  expect(screen.getByText('4 of 12')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
  expect(props.onPrevious).toHaveBeenCalledOnce();
  expect(props.onNext).toHaveBeenCalledOnce();
});

test('Previous is off on the first slide and Next on the last, each saying why', () => {
  const props = nav(1, 1);
  const previous = screen.getByRole('button', { name: 'Previous slide' });
  const next = screen.getByRole('button', { name: 'Next slide' });
  fireEvent.click(previous);
  fireEvent.click(next);
  expect(props.onPrevious).not.toHaveBeenCalled();
  expect(props.onNext).not.toHaveBeenCalled();
  expect(previous.getAttribute('aria-disabled')).toBe('true');
  expect(next.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByText('This is the first slide')).toBeTruthy();
  expect(screen.getByText('End of the deck')).toBeTruthy();
});

test('controls after Next are set apart, and the group passes axe', async () => {
  const { container } = render(
    <SlideNav position={2} total={3} onPrevious={() => {}} onNext={() => {}}>
      <button type="button">Full screen</button>
    </SlideNav>,
  );
  const more = screen.getByRole('button', { name: 'Full screen' }).parentElement;
  expect(more?.className).toBe('crewlet-slide-nav__more');
  expect((await axe.run(container)).violations).toEqual([]);
});
