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

function Strip({
  onReorder,
  orientation,
}: {
  onReorder?: (ids: string[]) => void;
  orientation?: 'vertical' | 'horizontal';
}) {
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
        orientation={orientation}
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

test('a row steps with Left and Right, and leaves Up and Down alone', () => {
  render(<Strip orientation="horizontal" />);
  fireEvent.keyDown(thumbs()[0]!, { key: 'ArrowDown' });
  expect(thumbs()[0]!.getAttribute('aria-current')).toBe('true');
  fireEvent.keyDown(thumbs()[0]!, { key: 'ArrowRight' });
  expect(thumbs()[1]!.getAttribute('aria-current')).toBe('true');
  fireEvent.keyDown(thumbs()[1]!, { key: 'ArrowLeft' });
  expect(thumbs()[0]!.getAttribute('aria-current')).toBe('true');
});

test('the strip scrolls itself, and only itself, to the slide on the stage', () => {
  const { container, rerender } = render(
    <SlideFilmstrip slides={SLIDES} selected="cover" onSelect={() => {}} renderSlide={(id) => <p>{id}</p>} />,
  );
  const port = container.querySelector<HTMLElement>('.crewlet-slide-filmstrip')!;
  // A strip 100px tall holding three 80px items, the last at 180 to 260.
  Object.defineProperty(port, 'clientHeight', { configurable: true, value: 100 });
  Object.defineProperty(port, 'scrollHeight', { configurable: true, value: 260 });
  port.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 0, width: 160, height: 100 });
  container.querySelectorAll('li').forEach((li, i) => {
    li.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: i * 90 - port.scrollTop, width: 160, height: 80 });
  });
  const scrolled = vi.spyOn(window, 'scrollTo');
  rerender(<SlideFilmstrip slides={SLIDES} selected="thanks" onSelect={() => {}} renderSlide={(id) => <p>{id}</p>} />);
  // 260 - 100 to bring its foot in, and a quarter of an item more.
  expect(port.scrollTop).toBe(180);
  expect(scrolled).not.toHaveBeenCalled();
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

test('a thumbnail duplicates on Command or Control+D and deletes on Delete or Backspace', () => {
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();
  render(
    <SlideFilmstrip
      slides={SLIDES}
      selected="plan"
      onSelect={() => {}}
      renderSlide={(id) => <p>{id}</p>}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    />,
  );
  const plan = thumbs()[1]!;
  fireEvent.keyDown(plan, { key: 'd', metaKey: true });
  fireEvent.keyDown(plan, { key: 'D', ctrlKey: true });
  expect(onDuplicate.mock.calls).toEqual([['plan'], ['plan']]);
  fireEvent.keyDown(plan, { key: 'Delete' });
  fireEvent.keyDown(plan, { key: 'Backspace' });
  expect(onDelete.mock.calls).toEqual([['plan'], ['plan']]);
  // Plain D and a chord with Shift are not the shortcut.
  fireEvent.keyDown(plan, { key: 'd' });
  fireEvent.keyDown(plan, { key: 'd', metaKey: true, shiftKey: true });
  expect(onDuplicate).toHaveBeenCalledTimes(2);
});

test('a strip without the callbacks ignores the keys and draws no actions menu', () => {
  render(<Strip />);
  fireEvent.keyDown(thumbs()[0]!, { key: 'Delete' });
  expect(thumbs()).toHaveLength(3);
  expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
});

test("a slide's menu holds its actions with their keys, out of the tab order, and the Menu key opens it", () => {
  const onDelete = vi.fn();
  const onHide = vi.fn();
  render(
    <SlideFilmstrip
      slides={SLIDES}
      selected="cover"
      onSelect={() => {}}
      renderSlide={(id) => <p>{id}</p>}
      onDuplicate={() => {}}
      onDelete={onDelete}
      actions={(id) => [{ key: 'hide', label: 'Hide slide', onSelect: () => onHide(id) }]}
      footer={<button type="button">New slide</button>}
    />,
  );
  const trigger = screen.getByRole('button', { name: 'Actions for slide 2, The plan' });
  expect(trigger.tabIndex).toBe(-1);
  fireEvent.click(trigger);
  expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual([
    expect.stringContaining('Duplicate slide'),
    expect.stringContaining('Delete slide'),
    'Hide slide',
  ]);
  fireEvent.click(screen.getByRole('menuitem', { name: /Delete slide/ }));
  expect(onDelete).toHaveBeenCalledWith('plan');
  fireEvent.keyDown(thumbs()[0]!, { key: 'ContextMenu' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Hide slide' }));
  expect(onHide).toHaveBeenCalledWith('cover');
  expect(screen.getByRole('button', { name: 'New slide' })).toBeTruthy();
});
