/**
 * The fullscreen control: drawn only where the browser has fullscreen, named
 * for what a press does, and asking for the element it was given.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FullscreenToggle } from './index.js';

function Surface() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} data-testid="surface">
      <FullscreenToggle target={ref} />
    </div>
  );
}

const enabled = Object.getOwnPropertyDescriptor(Document.prototype, 'fullscreenEnabled');
const request = Element.prototype.requestFullscreen;

afterEach(() => {
  cleanup();
  if (enabled) Object.defineProperty(Document.prototype, 'fullscreenEnabled', enabled);
  else delete (Document.prototype as { fullscreenEnabled?: boolean }).fullscreenEnabled;
  Element.prototype.requestFullscreen = request;
  delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
});

describe('FullscreenToggle', () => {
  test('is not drawn where the browser has no fullscreen', () => {
    render(<Surface />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('asks for its target, and is named for leaving once the target is fullscreen', () => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get: () => true });
    const asked = vi.fn(() => Promise.resolve());
    Element.prototype.requestFullscreen = asked;
    render(<Surface />);
    const surface = screen.getByTestId('surface');
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    expect(asked).toHaveBeenCalledTimes(1);
    expect(asked.mock.contexts[0]).toBe(surface);
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => surface });
    act(() => void document.dispatchEvent(new Event('fullscreenchange')));
    expect(screen.getByRole('button', { name: 'Leave fullscreen' })).toBeTruthy();
  });
});
