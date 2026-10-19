/**
 * Every slide at once, by section, numbered across the deck.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, expect, test, vi } from 'vitest';
import { SlideGrid } from './index.js';

afterEach(cleanup);

const SECTIONS = [
  { title: 'Where we are', slides: [{ id: 'cover', title: 'Plan' }, { id: 'agenda', title: 'Agenda' }] },
  { title: 'What we need', slides: [{ id: 'ask', title: 'The ask', hidden: true }] },
];

test('slides are numbered across sections and each opens on a press', () => {
  const onOpen = vi.fn();
  render(<SlideGrid sections={SECTIONS} renderSlide={(id) => <p>{id}</p>} onOpen={onOpen} current="agenda" />);
  expect(screen.getByRole('heading', { name: 'What we need' })).toBeTruthy();
  const ask = screen.getByRole('button', { name: 'Slide 3, The ask, Hidden when presenting' });
  fireEvent.click(ask);
  expect(onOpen).toHaveBeenCalledWith('ask');
  expect(screen.getByRole('button', { name: 'Slide 2, Agenda' }).getAttribute('aria-current')).toBe('true');
});

test('the grid passes axe', async () => {
  const { container } = render(<SlideGrid sections={SECTIONS} renderSlide={() => null} onOpen={() => {}} />);
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
