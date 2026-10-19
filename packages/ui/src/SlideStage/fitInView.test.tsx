/**
 * A stage presented in the page (`fit="view"`): its show is seen whole, from
 * its top to the foot of the view, or takes the whole view once scrolled to
 * when it sits too low to be read where it is; in full screen it fills its box.
 */

import axe from 'axe-core';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SlideStage } from './index.js';
import { fitInView, scrollportOf } from './fitInView.js';

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/**
 * A show `top` pixels down a scrollport `view` pixels tall, scrolled by
 * `scrolled`, holding a stage `width` wide and `rest` pixels of controls.
 */
function laidOut({ top, view, width, rest = 0, scrolled = 0 }: Record<string, number>) {
  const port = document.createElement('div');
  port.style.overflowY = 'auto';
  const show = document.createElement('div');
  show.style.scrollMarginTop = '48px';
  show.style.scrollMarginBottom = '16px';
  const stage = document.createElement('div');
  show.append(stage);
  port.append(show);
  document.body.append(port);
  Object.defineProperty(port, 'clientHeight', { value: view });
  Object.defineProperty(port, 'scrollTop', { value: scrolled });
  Object.defineProperty(stage, 'clientWidth', { value: width });
  Object.defineProperty(stage, 'offsetHeight', { value: 100 });
  Object.defineProperty(show, 'offsetHeight', { value: 100 + rest! });
  port.getBoundingClientRect = () => new DOMRect(0, 10, 0, view);
  show.getBoundingClientRect = () => new DOMRect(0, 10 + top! - scrolled!, 0, 0);
  return { port, show, stage };
}

const NINE_SIXTEENTHS = 1080 / 1920;

test('the scrollport is the nearest ancestor that scrolls, or the window', () => {
  const { port, stage } = laidOut({ top: 0, view: 800, width: 0 });
  expect(scrollportOf(stage)).toBe(port);
  const loose = document.createElement('div');
  document.body.append(loose);
  expect(scrollportOf(loose)).toBeNull();
});

test('a show with room to spare gets the slide at its width', () => {
  // 640 wide is 360 tall, plus 40 of controls: 400 of the 484 below the show.
  const { stage } = laidOut({ top: 300, view: 800, width: 640, rest: 40 });
  expect(fitInView(stage, NINE_SIXTEENTHS)).toEqual({ height: 360, scroll: false });
});

test('a show taller than the room below it is letterboxed into that room', () => {
  // 1143 wide is 643 tall, plus 48 of controls; the room is 830 - 314 - 16 = 500.
  const { stage } = laidOut({ top: 314, view: 830, width: 1143, rest: 48 });
  expect(fitInView(stage, NINE_SIXTEENTHS)).toEqual({ height: 452, scroll: false });
});

test('the room is measured with the scrollport at its top, so scrolling does not change it', () => {
  const { stage } = laidOut({ top: 314, view: 830, width: 1143, rest: 48, scrolled: 250 });
  expect(fitInView(stage, NINE_SIXTEENTHS)).toEqual({ height: 452, scroll: false });
});

test('a show too low to get half of what it asks takes the whole view, scrolled to', () => {
  // It asks for 643 + 48; 800 - 700 - 16 = 84 is under half of that.
  const { stage } = laidOut({ top: 700, view: 800, width: 1143, rest: 48 });
  const low = fitInView(stage, NINE_SIXTEENTHS);
  expect(low.scroll).toBe(true);
  expect(low.height).toBeCloseTo(643, 0);
  const short = laidOut({ top: 700, view: 500, width: 1143, rest: 48 });
  expect(fitInView(short.stage, NINE_SIXTEENTHS)).toEqual({ height: 388, scroll: true });
});

/** A page at 1440 by 900: the show 314px down an 830px scrollport, its stage 1143px wide. */
function pageAt1440() {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.tagName === 'MAIN' ? 830 : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('crewlet-slide-stage') ? 1143 : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return new DOMRect(0, this.tagName === 'MAIN' ? 10 : this.dataset.show ? 324 : 0, 0, 0);
  });
}

function Page({ fit }: { fit: 'view' | 'contain' }) {
  return (
    <main style={{ overflowY: 'auto' }}>
      <section aria-label="Slide show" data-show="true">
        <SlideStage fit={fit} label="Slide 1 of 3, Plan">
          <h1>Plan</h1>
        </SlideStage>
        <p>1 of 3</p>
      </section>
    </main>
  );
}

test('a view stage is as tall as the room below its show, and a contain stage is not measured', () => {
  pageAt1440();
  render(<Page fit="view" />);
  const stage = screen.getByRole('group', { name: 'Slide 1 of 3, Plan' });
  expect(stage.className).toContain('crewlet-slide-stage--view');
  expect(stage.style.height).toBe('516px');
  expect(stage.style.getPropertyValue('--crewlet-slide-stage-ratio')).toBe('1920 / 1080');
  cleanup();
  render(<Page fit="contain" />);
  expect(screen.getByRole('group').style.height).toBe('');
});

test('in full screen a view stage fills its box rather than the measured room', () => {
  pageAt1440();
  let full: Element | null = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => full });
  try {
    render(<Page fit="view" />);
    const stage = screen.getByRole('group');
    expect(stage.style.height).toBe('516px');
    full = screen.getByRole('region', { name: 'Slide show' });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(stage.style.height).toBe('');
  } finally {
    Reflect.deleteProperty(document, 'fullscreenElement');
  }
});

test('carries no axe violation in a show', async () => {
  pageAt1440();
  const { container } = render(<Page fit="view" />);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
