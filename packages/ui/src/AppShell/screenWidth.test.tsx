/**
 * The screen's width: answered from the shell's measured content column, so a
 * width the aside takes counts, and from the window outside a shell.
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AppShell } from './AppShell.js';
import { useScreenBelow, useScreenWidth } from './screenWidth.js';

let observers: { callback: ResizeObserverCallback; targets: Element[] }[] = [];
let windowNarrow = false;

beforeEach(() => {
  observers = [];
  windowNarrow = false;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private entry: { callback: ResizeObserverCallback; targets: Element[] };
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, targets: [] };
        observers.push(this.entry);
      }
      observe(target: Element) {
        this.entry.targets.push(target);
      }
      unobserve() {}
      disconnect() {
        this.entry.targets = [];
      }
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('640px') ? windowNarrow : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Give the shell's content column a box `width` px wide and tell its observer. */
function resizeContent(width: number) {
  const column = document.querySelector<HTMLElement>('.crewlet-app-shell__content')!;
  Object.defineProperty(column, 'clientWidth', { configurable: true, value: width });
  column.getClientRects = () => [{}] as unknown as DOMRectList;
  act(() => {
    for (const o of observers) if (o.targets.includes(column)) o.callback([], {} as ResizeObserver);
  });
}

function Probe() {
  const narrow = useScreenBelow(640);
  const width = useScreenWidth();
  return <p data-testid="probe">{`${narrow ? 'narrow' : 'wide'} ${width ?? 'unmeasured'}`}</p>;
}

test('answers from the content column, not the window', () => {
  render(
    <AppShell>
      <Probe />
    </AppShell>,
  );
  // A document without layout has no box to measure: the window answers.
  expect(screen.getByTestId('probe').textContent).toBe('wide unmeasured');
  // The window stays wide while an aside takes the screen down to 443px.
  resizeContent(443);
  expect(screen.getByTestId('probe').textContent).toBe('narrow 443');
  resizeContent(640);
  expect(screen.getByTestId('probe').textContent).toBe('wide 640');
});

test('re-renders a screen on a crossing, not on every pixel', () => {
  let renders = 0;
  function Counted() {
    renders++;
    return <p>{useScreenBelow(640) ? 'narrow' : 'wide'}</p>;
  }
  render(
    <AppShell>
      <Counted />
    </AppShell>,
  );
  resizeContent(900);
  const settled = renders;
  resizeContent(880);
  resizeContent(860);
  expect(renders).toBe(settled);
  resizeContent(600);
  expect(renders).toBe(settled + 1);
});

test('outside a shell it is the window', () => {
  windowNarrow = true;
  render(<Probe />);
  expect(screen.getByTestId('probe').textContent).toBe('narrow unmeasured');
});
