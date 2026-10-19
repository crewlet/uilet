/**
 * A slide drawn at its authored size and scaled to its box, and the keys a
 * show answers.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useLayoutEffect, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { SlideStage, useSlideKeys, type SlideKeys } from './index.js';

afterEach(cleanup);

test('a slide is a named group laid out at 1920 by 1080 and scaled as a whole', () => {
  render(
    <SlideStage label="Slide 1 of 3, Plan" scale={0.25}>
      <h1>Plan</h1>
    </SlideStage>,
  );
  const group = screen.getByRole('group', { name: 'Slide 1 of 3, Plan' });
  expect(group.getAttribute('aria-roledescription')).toBe('slide');
  const frame = group.firstElementChild as HTMLElement;
  expect(frame.style.width).toBe('1920px');
  expect(frame.style.height).toBe('1080px');
  expect(frame.style.transform).toContain('scale(0.25)');
  expect(group.style.width).toBe('480px');
});

test("a framed stage draws the slide's edge, except where the box is letterboxed by design", () => {
  const { rerender } = render(
    <SlideStage label="Plan" framed>
      <h1>Plan</h1>
    </SlideStage>,
  );
  expect(screen.getByRole('group', { name: 'Plan' }).classList.contains('crewlet-slide-stage--framed')).toBe(true);
  rerender(
    <SlideStage label="Plan" framed fit="contain">
      <h1>Plan</h1>
    </SlideStage>,
  );
  expect(screen.getByRole('group', { name: 'Plan' }).classList.contains('crewlet-slide-stage--framed')).toBe(false);
});

test('a stage of another size names what it holds', () => {
  render(
    <SlideStage label="Pricing, 1440 by 900" scale={0.5} width={1440} height={900} roleDescription="artboard">
      <h1>Pricing</h1>
    </SlideStage>,
  );
  const group = screen.getByRole('group', { name: 'Pricing, 1440 by 900' });
  expect(group.getAttribute('aria-roledescription')).toBe('artboard');
  expect((group.firstElementChild as HTMLElement).style.width).toBe('1440px');
});

test('an unmeasured stage paints nothing at full size', () => {
  render(
    <SlideStage label="Slide">
      <p>Text</p>
    </SlideStage>,
  );
  // jsdom lays nothing out, so the box measures zero and the frame stays hidden.
  const frame = screen.getByRole('group').firstElementChild as HTMLElement;
  expect(frame.style.visibility).toBe('hidden');
});

function Show(props: SlideKeys) {
  useSlideKeys(props);
  return (
    <div>
      <input aria-label="Field" />
      <button type="button">Button</button>
    </div>
  );
}

test('the show keys move forward, back, to the ends and out, and leave a field alone', () => {
  const keys = { onNext: vi.fn(), onPrevious: vi.fn(), onFirst: vi.fn(), onLast: vi.fn(), onExit: vi.fn() };
  render(<Show {...keys} />);
  for (const key of ['ArrowRight', 'PageDown', ' ']) fireEvent.keyDown(document.body, { key });
  for (const key of ['ArrowLeft', 'PageUp']) fireEvent.keyDown(document.body, { key });
  fireEvent.keyDown(document.body, { key: 'Home' });
  fireEvent.keyDown(document.body, { key: 'End' });
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(keys.onNext).toHaveBeenCalledTimes(3);
  expect(keys.onPrevious).toHaveBeenCalledTimes(2);
  expect(keys.onFirst).toHaveBeenCalledOnce();
  expect(keys.onLast).toHaveBeenCalledOnce();
  expect(keys.onExit).toHaveBeenCalledOnce();

  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowRight' });
  fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
  fireEvent.keyDown(document.body, { key: 'ArrowRight', metaKey: true });
  expect(keys.onNext).toHaveBeenCalledTimes(3);
});

test('a show that is off listens to nothing', () => {
  const onNext = vi.fn();
  render(<Show onNext={onNext} onPrevious={vi.fn()} enabled={false} />);
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(onNext).not.toHaveBeenCalled();
});

/**
 * A show whose handlers close over its slide, and a key that arrives the
 * moment a step commits, as a clicker's second press can.
 */
function Stepper({ onAt }: { onAt: (at: number) => void }) {
  const [at, setAt] = useState(0);
  useSlideKeys({ onNext: () => setAt(at + 1), onPrevious: () => setAt(at - 1) });
  useLayoutEffect(() => {
    onAt(at);
    if (at === 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
  }, [at, onAt]);
  return <p>{at}</p>;
}

test("a key that arrives as a step commits moves on from the new slide, never the old one's", () => {
  const seen: number[] = [];
  const onAt = (at: number) => seen.push(at);
  render(<Stepper onAt={onAt} />);
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(seen).toEqual([0, 1, 2]);
});
