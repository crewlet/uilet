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
import { useCallback, useLayoutEffect } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { Tooltip } from './index.js';
import { LayerHost } from '../Layer/index.js';
import { Popover } from '../Popover/index.js';
import { FOCUS_MODALITY_ATTRIBUTE, FOCUS_RETURNED_ATTRIBUTE } from '../utils/focusModality.js';

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
  tabTo(screen.getByRole('button', { name: 'Schedule' }));
  expect(tip()).not.toBeNull();
});

/*
 * FOCUS HOLDS THE TIP ONLY WHEN IT IS KEYBOARD FOCUS. A mouse press focuses a
 * button as well, and a layer hands focus back as it closes, and a tip shown
 * for a hover outlived the hover on either: press Formatting, move away, and
 * "Hide formatting" stayed on the screen until something else took focus.
 */
test('a press closes the tip, and the focus it brings neither opens nor holds it', () => {
  render(
    <Tooltip content="Hide formatting">
      <button>Formatting</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Formatting' });
  fireEvent.pointerEnter(trigger);
  settle();
  expect(tip()).not.toBeNull();
  // The press, then the focus a press brings, as a browser orders them.
  fireEvent.pointerDown(trigger);
  tabTo(trigger);
  expect(tip()).toBeNull();
  // Still on the control: the press answered it, so it stays shut.
  settle();
  expect(tip()).toBeNull();
  // The pointer leaves while the button keeps focus: nothing holds a tip open.
  fireEvent.pointerLeave(trigger);
  settle();
  expect(tip()).toBeNull();
  // And the pointer's next arrival opens it again, focus or not.
  fireEvent.pointerEnter(trigger);
  settle();
  expect(tip()).not.toBeNull();
  fireEvent.pointerLeave(trigger);
  settle();
  expect(tip()).toBeNull();
});

test('a focus that is not visible focus does not open the tip', () => {
  render(
    <Tooltip content="Runs at 09:00">
      <button>Schedule</button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'Schedule' });
  // jsdom matches :focus-visible on any focus, so the browser's answer for a
  // focus a pointer brought is stood in for here.
  const matches = trigger.matches.bind(trigger);
  vi.spyOn(trigger, 'matches').mockImplementation((selector: string) => (selector === ':focus-visible' ? false : matches(selector)));
  tabTo(trigger);
  expect(tip()).toBeNull();
});

test('focus handed back to the trigger while the reader uses a pointer does not open the tip', () => {
  const root = document.documentElement;
  root.setAttribute(FOCUS_MODALITY_ATTRIBUTE, 'pointer');
  try {
    render(
      <Tooltip content="Open the room's details">
        <button>Details</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Details' });
    trigger.setAttribute(FOCUS_RETURNED_ATTRIBUTE, '');
    tabTo(trigger);
    expect(tip()).toBeNull();
    // A key makes it the keyboard's again, and the same focus is a reader's.
    act(() => trigger.blur());
    root.setAttribute(FOCUS_MODALITY_ATTRIBUTE, 'keyboard');
    tabTo(trigger);
    expect(tip()).not.toBeNull();
  } finally {
    root.removeAttribute(FOCUS_MODALITY_ATTRIBUTE);
  }
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
  tabTo(trigger);
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
  tabTo(trigger);
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
  tabTo(trigger);
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
  tabTo(screen.getByRole('button', { name: 'Schedule' }));
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

/*
 * AND IT KEEPS IT ACROSS A RE-RENDER. The tip used to clone its trigger with a
 * new ref callback on every render, so React released the trigger's own ref
 * and attached it again in each commit, in tree order: a layout effect EARLIER
 * in the tree read null while the button stood in the document.
 */
test("a re-render of the tip never takes the trigger's own ref away", () => {
  const own = vi.fn();
  const seen: (HTMLElement | null)[] = [];
  const box = { current: null as HTMLElement | null };
  function Earlier({ tick }: { tick: number }) {
    // Reads the ref in a layout effect that runs before the tip's commit.
    useLayoutEffect(() => {
      seen.push(box.current);
    }, [tick]);
    return null;
  }
  function Screen({ tick }: { tick: number }) {
    return (
      <>
        <Earlier tick={tick} />
        <Tooltip content={`Runs at 0${tick}:00`}>
          <button
            ref={useCallback((el: HTMLButtonElement | null) => {
              box.current = el;
              own(el);
            }, [])}
          >
            Schedule
          </button>
        </Tooltip>
      </>
    );
  }
  const view = render(<Screen tick={1} />);
  view.rerender(<Screen tick={2} />);
  view.rerender(<Screen tick={3} />);
  const button = screen.getByRole('button', { name: 'Schedule' });
  expect(seen.slice(1)).toEqual([button, button]);
  expect(own.mock.calls).toEqual([[button]]);
});

/*
 * A TOOLTIP CAN STAND WHERE A TRIGGER IS EXPECTED. A Popover clones its
 * trigger with a ref and its state; when the trigger is a tooltip round a
 * button, those land on the tooltip and are merged onto the button, so the
 * panel is anchored to it and the button says what it opens.
 */
test('a ref and attributes handed to the tooltip are the trigger\'s, composed with its own', () => {
  let forwarded: HTMLElement | null = null;
  let own: HTMLElement | null = null;
  const order: string[] = [];
  render(
    <Tooltip
      content="Add a reaction"
      ref={(el) => { forwarded = el; }}
      aria-expanded={false}
      aria-describedby="hint"
      data-state="closed"
      style={{ color: 'inherit' }}
      onClick={() => order.push('outer')}
    >
      <button ref={(el) => { own = el; }} aria-describedby="own" style={{ margin: 0 }} onClick={() => order.push('own')}>
        React
      </button>
    </Tooltip>,
  );
  const trigger = screen.getByRole('button', { name: 'React' });
  expect(forwarded).toBe(trigger);
  expect(own).toBe(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger.getAttribute('data-state')).toBe('closed');
  expect(trigger.getAttribute('aria-describedby')).toBe('own hint');
  expect(trigger.style.margin).toBe('0px');
  expect(trigger.style.color).toBe('inherit');
  fireEvent.click(trigger);
  expect(order).toEqual(['own', 'outer']);
});

test("a Popover's trigger may be a tooltip round its button", () => {
  render(
    <Popover
      label="Reactions"
      trigger={(_open, toggle) => (
        <Tooltip content="Add a reaction">
          <button onClick={toggle}>React</button>
        </Tooltip>
      )}
    >
      <p>Pick one</p>
    </Popover>,
  );
  const trigger = screen.getByRole('button', { name: 'React' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).not.toBeNull();
  expect(document.getElementById(trigger.getAttribute('aria-controls')!)).not.toBeNull();
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
  tabTo(screen.getByRole('button', { name: 'Schedule' }));
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

/*
 * THE PANEL IS RE-PLACED WHEN ITS OWN SIZE CHANGES, which matters more here
 * than anywhere: this surface is CENTRED on its trigger, and the centring is
 * arithmetic over the panel's own measured width (`placePopup` aligns to the
 * anchor's start, so the offset is computed by hand). A tooltip whose content
 * changes while it is open was left off-centre by half the width delta, and
 * one near an edge overhung it, because the clamp had been computed for the
 * old width too.
 *
 * The suite's ResizeObserver is a no-op, so the callback is captured and fired
 * by hand: what is asserted is that the component subscribed the PANEL.
 */
test('a tooltip whose content changes while open is centred again', () => {
  const observed: Element[] = [];
  let fire: (() => void) | undefined;
  const realRO = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb: () => void) {
      fire = cb;
    }
    observe(el: Element) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  const box = (left: number, width: number) =>
    ({ left, top: 200, width, height: 24, right: left + width, bottom: 224, x: left, y: 200 }) as DOMRect;
  const boxes = { anchor: box(500, 80), panel: box(0, 120) };
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.getAttribute('role') === 'tooltip') return boxes.panel;
    if (this.tagName === 'BUTTON') return boxes.anchor;
    return realRect.call(this);
  };
  try {
    render(
      <Tooltip content="Runs at 09:00 in Europe/Berlin">
        <button>Schedule</button>
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Schedule' }));
    settle();
    const panel = tip()!;
    expect(observed).toContain(panel);
    // Centred on the trigger: 500 + 80/2 - 120/2 = 480.
    expect(panel.style.left).toBe('480px');

    boxes.panel = box(0, 200);
    act(() => fire?.());
    // 500 + 40 - 100 = 440, not the 480 the old width gave.
    expect(panel.style.left).toBe('440px');
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
    globalThis.ResizeObserver = realRO;
  }
});

test('a start-aligned tip lines up with its trigger\'s leading edge, on either side of the page', () => {
  const box = (left: number, width: number) =>
    ({ left, top: 200, width, height: 24, right: left + width, bottom: 224, x: left, y: 200 }) as DOMRect;
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.getAttribute('role') === 'tooltip') return box(0, 120);
    if (this.tagName === 'BUTTON') return box(500, 26);
    return realRect.call(this);
  };
  try {
    const { unmount } = render(
      <Tooltip content="Actions for row 2" align="start">
        <button>Actions</button>
      </Tooltip>,
    );
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Actions' }));
    settle();
    // At the trigger's left edge, where centring put it at 500 + 13 - 60 = 453.
    expect(tip()!.style.left).toBe('500px');
    unmount();

    render(
      <div dir="rtl" style={{ direction: 'rtl' }}>
        <Tooltip content="Actions for row 2" align="start">
          <button>Actions</button>
        </Tooltip>
      </div>,
    );
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Actions' }));
    settle();
    // Right to left, its right edge on the trigger's: 526 - 120 = 406.
    expect(tip()!.style.left).toBe('406px');
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
  }
});
