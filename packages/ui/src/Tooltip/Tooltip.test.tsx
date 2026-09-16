/**
 * The tooltip, and the three rules of WCAG 2.2's 1.4.13 that a hand-rolled one
 * almost always breaks: it must be dismissable, hoverable and persistent.
 *
 * The first two are behaviour a reader can see. The third is the absence of
 * behaviour, so it is asserted by running the clock a long way forward and
 * finding the panel still there: a tooltip that hides itself on a timer takes
 * the line away from exactly the reader who needed longer to read it.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Tooltip } from './index.js';
import { LayerHost } from '../Layer/index.js';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Past every delay this component has, and then some. */
function settle(ms = 1000) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function tip(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

test('the pointer resting on the trigger opens it, and the trigger is described by it', () => {
  render(
    <Tooltip content="Runs at 09:00 in Europe/Berlin">
      <button>Schedule</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  fireEvent.pointerEnter(trigger);
  // Not immediately: a panel that opens the instant a pointer touches a control
  // flashes at every control the pointer crosses on its way somewhere else.
  expect(tip()).toBeNull();

  settle();
  const panel = tip()!;
  expect(panel.textContent).toBe('Runs at 09:00 in Europe/Berlin');
  expect(trigger.getAttribute('aria-describedby')).toBe(panel.id);
});

test('focus opens it at once, because a keyboard reader asked for it', () => {
  render(
    <Tooltip content="Runs at 09:00">
      <button>Schedule</button>
    </Tooltip>,
  );
  fireEvent.focus(screen.getByRole('button', { name: 'Schedule' }));
  expect(tip()).not.toBeNull();
});

test('it is HOVERABLE: the pointer may travel from the trigger onto the panel', () => {
  render(
    <Tooltip content="Runs at 09:00">
      <button>Schedule</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  fireEvent.pointerEnter(trigger);
  settle();
  const panel = tip()!;

  // The pointer leaves the trigger and arrives on the panel within the grace
  // period, which is the whole journey a reader makes to read a long line.
  fireEvent.pointerLeave(trigger);
  fireEvent.pointerEnter(panel);
  settle();
  expect(tip()).not.toBeNull();

  fireEvent.pointerLeave(panel);
  settle();
  expect(tip()).toBeNull();
});

test('it is PERSISTENT: nothing hides it while the pointer is still on the trigger', () => {
  render(
    <Tooltip content="Runs at 09:00">
      <button>Schedule</button>
    </Tooltip>,
  );
  fireEvent.pointerEnter(screen.getByRole('button', { name: 'Schedule' }));
  settle();
  settle(60_000);
  expect(tip()).not.toBeNull();
});

test('it is DISMISSABLE: Escape closes it and leaves focus where it was', () => {
  render(
    <Tooltip content="Runs at 09:00">
      <button>Schedule</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  trigger.focus();
  fireEvent.focus(trigger);
  expect(tip()).not.toBeNull();

  fireEvent.keyDown(trigger, { key: 'Escape' });
  expect(tip()).toBeNull();
  expect(document.activeElement).toBe(trigger);
  // And it stays dismissed while the pointer and focus are where they were: a
  // panel that came back on the next render would make Escape useless.
  settle();
  expect(tip()).toBeNull();
});

test('a control focused by the keyboard keeps its tip when the pointer passes over and leaves', () => {
  render(
    <Tooltip content="Runs at 09:00">
      <button>Schedule</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  fireEvent.focus(trigger);
  fireEvent.pointerEnter(trigger);
  fireEvent.pointerLeave(trigger);
  settle();
  expect(tip()).not.toBeNull();
});

test('nothing opens while it is disabled', () => {
  render(
    <Tooltip content="Runs at 09:00" disabled>
      <button>Schedule</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  fireEvent.pointerEnter(trigger);
  fireEvent.focus(trigger);
  settle();
  expect(tip()).toBeNull();
  expect(trigger.getAttribute('aria-describedby')).toBeNull();
});

/*
 * A fullscreen element paints only its own subtree, so a panel portalled to the
 * body while a canvas is fullscreen is not drawn at all: the reader hovers and
 * nothing happens.
 */
test('it portals into the nearest LayerHost rather than always into the body', () => {
  render(
    <div data-testid="canvas">
      <LayerHost>
        <Tooltip content="Runs at 09:00">
          <button>Schedule</button>
        </Tooltip>
      </LayerHost>
    </div>,
  );
  fireEvent.focus(screen.getByRole('button', { name: 'Schedule' }));
  expect(screen.getByTestId('canvas').contains(tip())).toBe(true);
});

test('the trigger keeps its own handlers and its own description', () => {
  let entered = 0;
  render(
    <Tooltip content="Runs at 09:00">
      <button aria-describedby="note" onPointerEnter={() => { entered += 1; }}>
        Schedule
      </button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  fireEvent.pointerEnter(trigger);
  settle();
  expect(entered).toBe(1);
  expect(trigger.getAttribute('aria-describedby')).toBe(`note ${tip()!.id}`);
});

/*
 * The trigger is cloned with a ref of the tooltip's own making, so a ref the
 * caller had already put on it is dropped unless it is carried through. A Menu
 * trigger that has to be focused again when its menu closes is exactly such a
 * control, and it would stop being handed its element the day somebody wrapped
 * it in a tip.
 */
test('the trigger keeps its own ref, and gets it back on the way out', () => {
  let own: HTMLElement | null = null;
  function Screen({ mounted }: { mounted: boolean }) {
    return mounted ? (
      <Tooltip content="Runs at 09:00">
        <button ref={(el) => { own = el; }}>Schedule</button>
      </Tooltip>
    ) : null;
  }
  const view = render(<Screen mounted />);
  expect(own).toBe(screen.getByRole('button', { name: 'Schedule' }));

  view.rerender(<Screen mounted={false} />);
  expect(own).toBeNull();
});

test('the tip carries no accessibility violation', async () => {
  // axe schedules its own work, so it needs the real clock back.
  vi.useRealTimers();
  render(
    <main>
      <h1>Schedules</h1>
      <Tooltip content="Runs at 09:00 in Europe/Berlin">
        <button>Schedule</button>
      </Tooltip>
    </main>,
  );
  fireEvent.focus(screen.getByRole('button', { name: 'Schedule' }));
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
