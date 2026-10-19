/**
 * A drawn chart saved as an image in the reader's own browser.
 *
 * jsdom lays nothing out and draws nothing, so the suite holds the half that
 * decides what is drawn (the vector path, the computed styles written onto it,
 * a CSS variable arriving as its colour, the foreignObject path for HTML) and
 * drives the rasteriser through a stubbed canvas and image, which is what
 * proves the refusals carry the reason a host words them by.
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ElementToPngError, elementToPng, serializeElement } from './elementToPng.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function sized(el: Element, width = 200, height = 100) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width, height, x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, toJSON: () => ({}) } as DOMRect);
}

test('a lone svg is serialised as vectors, every node carrying its computed style and no class', () => {
  const { container } = render(
    <figure>
      <svg viewBox="0 0 10 10" className="chart">
        <path d="M0 0L10 10" className="chart__line" style={{ stroke: 'rgb(10, 20, 30)', strokeWidth: '2px' }} />
      </svg>
    </figure>,
  );
  const markup = serializeElement(container.firstElementChild!, { width: 220, height: 120, padding: 10 });
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = doc.documentElement;
  expect(root.namespaceURI).toBe('http://www.w3.org/2000/svg');
  expect(root.getAttribute('width')).toBe('220');
  expect(root.getAttribute('viewBox')).toBe('0 0 220 120');
  expect(doc.querySelector('foreignObject')).toBeNull();
  const inner = root.querySelector('svg')!;
  expect(inner.getAttribute('x')).toBe('10');
  const path = root.querySelector('path')!;
  expect(path.getAttribute('class')).toBeNull();
  expect(path.getAttribute('style')).toContain('stroke:rgb(10, 20, 30)');
  expect(path.getAttribute('style')).toContain('stroke-width:2px');
});

test('a colour given by a CSS variable arrives as the colour it resolved to', () => {
  const { container } = render(
    <svg>
      <rect className="bar" width="4" height="4" />
    </svg>,
  );
  const rect = container.querySelector('rect')!;
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
    const style = real(el);
    if (el !== rect) return style;
    return new Proxy(style, {
      get(target, key) {
        if (key === 'getPropertyValue') {
          return (property: string) => (property === 'fill' ? 'rgb(124, 58, 237)' : target.getPropertyValue(property));
        }
        return Reflect.get(target, key) as unknown;
      },
    });
  });
  const markup = serializeElement(container.firstElementChild!, { width: 10, height: 10 });
  expect(markup).toContain('fill:rgb(124, 58, 237)');
  expect(markup).not.toContain('var(');
});

test('a chart drawn in HTML goes through foreignObject, as XHTML', () => {
  const { container } = render(
    <div className="bars">
      <span>Open</span>
      <span style={{ width: '40%' }} />
    </div>,
  );
  const markup = serializeElement(container.firstElementChild!, { width: 100, height: 40 });
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const object = doc.querySelector('foreignObject')!;
  expect(object).not.toBeNull();
  expect(object.firstElementChild!.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
  expect(markup).toContain('xmlns="http://www.w3.org/1999/xhtml"');
  expect(object.textContent).toContain('Open');
});

test('an element with no size is refused as empty', async () => {
  const { container } = render(<div />);
  await expect(elementToPng(container.firstElementChild!)).rejects.toMatchObject({ name: 'ElementToPngError', reason: 'empty' });
});

/** A canvas and an image that draw nothing and record what was asked of them. */
function stubRaster(toBlob: (callback: BlobCallback) => void) {
  const drawn: string[] = [];
  const context = { scale: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
    drawn.push(`${this.width}x${this.height}`);
    toBlob(callback);
  });
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      expect(value.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('Image', FakeImage);
  return { drawn, context };
}

test('rasterises at the asked scale, padded, on the background given', async () => {
  const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
  const { drawn, context } = stubRaster((callback) => callback(png));
  const { container } = render(<svg />);
  const el = container.firstElementChild!;
  sized(el);
  await expect(elementToPng(el, { scale: 2, padding: 8, background: 'rgb(255, 255, 255)' })).resolves.toBe(png);
  expect(drawn).toEqual(['432x232']);
  expect(context.scale).toHaveBeenCalledWith(2, 2);
  expect(context.fillStyle).toBe('rgb(255, 255, 255)');
});

test('clamps the scale, so a wide chart is not a canvas the browser refuses', async () => {
  const { drawn } = stubRaster((callback) => callback(new Blob([])));
  const { container } = render(<svg />);
  sized(container.firstElementChild!, 100, 50);
  await elementToPng(container.firstElementChild!, { scale: 8 });
  expect(drawn).toEqual(['300x150']);
});

test('a canvas the browser will not read back is refused as tainted', async () => {
  stubRaster(() => {
    throw new DOMException('The canvas has been tainted', 'SecurityError');
  });
  const { container } = render(<div>bars</div>);
  sized(container.firstElementChild!);
  const refusal = await elementToPng(container.firstElementChild!).catch((error: unknown) => error);
  expect(refusal).toBeInstanceOf(ElementToPngError);
  expect((refusal as ElementToPngError).reason).toBe('tainted');
});
