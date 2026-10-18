/**
 * The column of thumbnails beside a deck's stage: one tab stop, the arrow keys
 * move the selection, and a handle moves a slide and says where it landed.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { SlideFilmstrip, type FilmstripSlide } from './index.js';

afterEach(cleanup);

const SLIDES: FilmstripSlide[] = [
  { id: 'cover', title: 'Quarterly plan' },
  { id: 'plan', title: 'The plan' },
  { id: 'thanks', title: 'Thank you', hidden: true },
];

function Strip({ onReorder }: { onReorder?: (ids: string[]) => void }) {
  const [selected, setSelected] = useState('cover');
  const [slides, setSlides] = useState(SLIDES);
  return (
    <>
      <Announcer />
      <SlideFilmstrip
        slides={slides}
        selected={selected}
        onSelect={setSelected}
        renderSlide={(id) => <p>{id}</p>}
        onReorder={
          onReorder &&
          ((ids) => {
            onReorder(ids);
            setSlides(ids.map((id) => slides.find((s) => s.id === id)!));
          })
        }
      />
    </>
  );
}

const thumbs = () => screen.getAllByRole('button', { name: /^Slide/ });

test('the thumbnails are one tab stop whose arrow keys move the slide on the stage', () => {
  render(<Strip />);
  const options = thumbs();
  expect(options.map((o) => o.getAttribute('aria-label'))).toEqual([
    'Slide 1, Quarterly plan',
    'Slide 2, The plan',
    'Slide 3, Thank you, Hidden when presenting',
  ]);
  expect(options.map((o) => o.tabIndex)).toEqual([0, -1, -1]);
  fireEvent.keyDown(options[0]!, { key: 'ArrowDown' });
  expect(thumbs()[1]!.getAttribute('aria-current')).toBe('true');
  fireEvent.keyDown(thumbs()[1]!, { key: 'End' });
  expect(thumbs()[2]!.getAttribute('aria-current')).toBe('true');
  expect(document.activeElement).toBe(thumbs()[2]);
});

test('a read-only strip draws no handles', () => {
  render(<Strip />);
  expect(screen.queryByRole('button', { name: /Move/ })).toBeNull();
});

test('a handle moves its slide with the arrow keys and reports the new order', () => {
  const onReorder = vi.fn();
  render(<Strip onReorder={onReorder} />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Move Slide 2, The plan' }), { key: 'ArrowUp' });
  expect(onReorder).toHaveBeenCalledWith(['plan', 'cover', 'thanks']);
  expect(thumbs()[0]!.getAttribute('aria-label')).toBe('Slide 1, The plan');
});

test('the strip passes axe', async () => {
  const { container } = render(<Strip onReorder={() => {}} />);
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
