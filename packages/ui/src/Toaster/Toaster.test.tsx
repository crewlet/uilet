/**
 * The three defects this rewrite fixes, each held by a case that fails without
 * it, plus the provider the engine's own Toast module becomes.
 *
 * 1. The region arrived WITH the first toast. A live region inserted already
 *    holding its text is a region most screen readers never announce: they
 *    watch for a change, and a first appearance is not one. (Inverted from the
 *    0.2.0 audit probe.)
 * 2. Dismissal was the drain's `animationend`, so a reader whose system asks
 *    for reduced motion, and every application with a global rule collapsing
 *    animations, got a toast that never went away.
 * 3. A failure auto-dismissed alongside a success, so news removed itself
 *    while somebody was reading the form they were about to fix.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LayerHost } from '../Layer/index.js';
import { ToastProvider, Toaster, useToast } from './index.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const region = (politeness: 'polite' | 'assertive') =>
  document.querySelector(`[aria-live="${politeness}"]`) as HTMLElement | null;

const toasterCss = () => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Toaster.css'), 'utf8');

describe('Toaster', () => {
  test('its live regions exist before the first toast', () => {
    const { rerender } = render(<Toaster toasts={[]} onDismiss={() => {}} />);
    // Both, and mounted: this is the whole fix. The element used to arrive
    // with the toast inside it.
    expect(region('polite')).not.toBeNull();
    expect(region('assertive')).not.toBeNull();
    expect(region('polite')?.textContent).toBe('');

    rerender(<Toaster toasts={[{ id: 1, variant: 'success', message: 'Saved' }]} onDismiss={() => {}} />);
    expect(region('polite')?.textContent).toBe('Saved');
  });

  test('a failure interrupts and everything else waits its turn', () => {
    render(
      <Toaster
        toasts={[
          { id: 1, variant: 'success', message: 'Saved' },
          { id: 2, variant: 'danger', message: 'The write was refused' },
        ]}
        onDismiss={() => {}}
      />,
    );
    expect(region('polite')?.textContent).toBe('Saved');
    expect(region('assertive')?.textContent).toBe('The write was refused');
  });

  test('two that land together are both said, not just the last one', () => {
    // Two writes finishing in one render is one state change, so a region set
    // per toast keeps only the last of them and the first is never announced.
    const { rerender } = render(<Toaster toasts={[]} onDismiss={() => {}} />);
    rerender(
      <Toaster
        toasts={[
          { id: 1, variant: 'success', message: 'The seat was saved' },
          { id: 2, variant: 'success', message: 'The schedule was saved' },
        ]}
        onDismiss={() => {}}
      />,
    );
    expect(region('polite')?.textContent).toBe('The seat was saved. The schedule was saved.');
  });

  test('the lead-in a variant falls back to is a prop', () => {
    render(
      <Toaster
        toasts={[{ id: 1, variant: 'success' }]}
        onDismiss={() => {}}
        titles={{ success: 'Erledigt' }}
      />,
    );
    expect(document.querySelector('.crewlet-toast__title')?.textContent).toBe('Erledigt');
    expect(region('polite')?.textContent).toBe('Erledigt');
  });

  test('a failure spends its hue on the edge and on the words, never behind them', () => {
    // The fill step on the boundary, where 3:1 is the floor a rule has to
    // clear, and the ink step on every word, which is the measured text pair
    // on this surface. A `background` here would be the fill behind a label,
    // which is the swap the whole soft-and-ink split exists to stop.
    const rule = /\.crewlet-toast--danger\s*\{([^}]*)\}/.exec(toasterCss())?.[1] ?? '';
    expect(rule).toContain('--crewlet-toast-line: var(--color-feedback-danger)');
    expect(rule).toContain('--crewlet-toast-ink: var(--color-feedback-danger-ink)');
    expect(rule).toContain('--crewlet-toast-ink-quiet: var(--color-feedback-danger-ink)');
    expect(rule).not.toMatch(/(^|;|\s)background/);
    // And the strip reads them, rather than declaring them and painting the
    // neutral steps anyway.
    const css = toasterCss().replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(css).toMatch(/\.crewlet-toast\s*\{[^}]*color:\s*var\(--crewlet-toast-ink\)/);
    expect(css).toMatch(/\.crewlet-toast__message\s*\{[^}]*color:\s*var\(--crewlet-toast-ink-quiet\)/);
  });

  test('no toast is a live region of its own', () => {
    render(<Toaster toasts={[{ id: 1, variant: 'danger', message: 'Refused' }]} onDismiss={() => {}} />);
    const strip = document.querySelector('.crewlet-toast')!;
    expect(strip.getAttribute('role')).toBeNull();
    expect(strip.getAttribute('aria-live')).toBeNull();
    // Nested regions are read twice by some assistive technology and not at
    // all by others.
    expect(strip.querySelector('[aria-live]')).toBeNull();
  });

  test('a success goes on a timer, not on an animation', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toaster toasts={[{ id: 1, variant: 'success', message: 'Saved' }]} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  test('a success still goes after its full duration under reduced motion', () => {
    // The dismissal used to be the drain's `animationend`, and an animation a
    // reader has asked not to see never ends: the strip stayed on the screen
    // for the rest of the session. Nothing here may consult the preference.
    const real = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    try {
      render(<Toaster toasts={[{ id: 1, variant: 'success', message: 'Saved' }]} onDismiss={onDismiss} />);
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(onDismiss).toHaveBeenCalledWith(1);
    } finally {
      window.matchMedia = real;
    }
  });

  test('a warning and a failure stay until they are dismissed', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <Toaster
        toasts={[
          { id: 1, variant: 'warning', message: 'Two seats are waiting' },
          { id: 2, variant: 'danger', message: 'The write was refused' },
        ]}
        onDismiss={onDismiss}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[1]!);
    expect(onDismiss).toHaveBeenCalledWith(2);
  });

  test('the countdown holds while the pointer is on it, and keeps what is left', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toaster toasts={[{ id: 1, variant: 'success', message: 'Saved' }]} onDismiss={onDismiss} />);
    const strip = document.querySelector('.crewlet-toast')!;

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.mouseEnter(strip);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // What is LEFT, not the whole thing again: a reader who hovered for a
    // minute gets the remaining second, not another four.
    fireEvent.mouseLeave(strip);
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  test('the default title is dropped where there is a message to read', () => {
    render(
      <Toaster
        toasts={[
          { id: 1, variant: 'success', message: 'Saved. The engine is applying it.' },
          { id: 2, variant: 'success' },
        ]}
        onDismiss={() => {}}
      />,
    );
    // "Success" above "Saved." says the same thing twice, so only the toast
    // with nothing else to read carries the fallback.
    const titles = [...document.querySelectorAll('.crewlet-toast__title')].map((node) => node.textContent);
    expect(titles).toEqual(['Success']);
  });

  test('it portals into the nearest LayerHost, so a fullscreen surface still shows it', () => {
    const { container } = render(
      <LayerHost>
        <Toaster toasts={[{ id: 1, variant: 'info', message: 'Applying' }]} onDismiss={() => {}} />
      </LayerHost>,
    );
    const host = container.querySelector('.crewlet-layer-host')!;
    expect(host.querySelector('.crewlet-toaster')).not.toBeNull();
  });

  test('carries no axe violation', async () => {
    render(
      <main>
        <h1>Secrets</h1>
        <Toaster
          toasts={[
            { id: 1, variant: 'success', message: 'Saved' },
            { id: 2, variant: 'danger', title: 'Refused', message: 'The revision moved', action: { label: 'Reload', onClick: () => {} } },
          ]}
          onDismiss={() => {}}
        />
      </main>,
    );
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

function Writer({ label = 'Save' }: { label?: string }) {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.ok('Saved. The engine is applying it.')}>
        {label}
      </button>
      <button type="button" onClick={() => toast.failed('The write was refused.')}>
        Break
      </button>
    </>
  );
}

describe('ToastProvider', () => {
  test('useToast is a no-op with no provider, rather than a crash', () => {
    render(<Writer />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Save' }))).not.toThrow();
    expect(document.querySelector('.crewlet-toast')).toBeNull();
  });

  test('ok reports a write and takes itself away; failed stays', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Writer />
      </ToastProvider>,
    );
    const messages = () => [...document.querySelectorAll('.crewlet-toast__message')].map((node) => node.textContent);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(messages()).toEqual(['Saved. The engine is applying it.']);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(messages()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Break' }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(messages()).toEqual(['The write was refused.']);
  });

  test('a repeat of one id replaces the strip rather than stacking a second', () => {
    function Repeater() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.show({ id: 'writes', variant: 'danger', message: 'A write failed' })}>
          Fail
        </button>
      );
    }
    render(
      <ToastProvider>
        <Repeater />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }));
    expect(document.querySelectorAll('.crewlet-toast')).toHaveLength(1);
  });

  test('a provider inside a fullscreen surface takes its own toasts, inside it', () => {
    function Inner() {
      const [open, setOpen] = useState(false);
      return (
        // The provider sits INSIDE the surface's own host, which is the whole
        // arrangement: a fullscreen element renders only its own subtree, so a
        // toast portalled to the document body while it is up is invisible and
        // the reader presses Save and watches nothing happen.
        <LayerHost>
          <ToastProvider>
            <button type="button" onClick={() => setOpen(true)}>
              Open the builder
            </button>
            {open ? <Writer label="Save the draft" /> : null}
          </ToastProvider>
        </LayerHost>
      );
    }
    const { container } = render(
      <ToastProvider>
        <Inner />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open the builder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save the draft' }));
    // Exactly one strip, it belongs to the nearest provider, and it is drawn
    // inside the surface rather than behind it.
    expect(document.querySelectorAll('.crewlet-toast')).toHaveLength(1);
    expect(container.querySelector('.crewlet-layer-host')?.querySelector('.crewlet-toast')).not.toBeNull();
  });

  test('the stack is bounded, oldest first', () => {
    function Many() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.failed(`Refusal ${Math.random()}`)}>
          Fail
        </button>
      );
    }
    render(
      <ToastProvider max={2}>
        <Many />
      </ToastProvider>,
    );
    const fail = screen.getByRole('button', { name: 'Fail' });
    fireEvent.click(fail);
    fireEvent.click(fail);
    fireEvent.click(fail);
    expect(document.querySelectorAll('.crewlet-toast')).toHaveLength(2);
  });
});
