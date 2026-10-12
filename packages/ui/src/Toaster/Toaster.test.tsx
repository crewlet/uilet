/**
 * The four defects this rewrite fixes, each held by a case that fails without
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
 * 4. The provider kept its newest `max` toasts whatever they were, so the
 *    toast after them evicted a failure nobody had read: the same
 *    auto-dismissal, by another road.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LayerHost } from '../Layer/index.js';
import { ToastProvider, Toaster, useToast, type ToastApi } from './index.js';

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

  test('a variant spends its hue on its mark and its wash, never on its words or its edge', () => {
    // The first release's rule: a failure is a soft rose mark, never a red
    // flood. The mark is the ink step, measured as text on every theme, and
    // the wash is the soft step behind the words of a toast that counts down.
    const css = toasterCss().replace(/\/\*[\s\S]*?\*\//g, ' ');
    const rule = /\.crewlet-toast--danger\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('--crewlet-toast-mark: var(--color-feedback-danger-ink)');
    expect(rule).toContain('--crewlet-toast-wash: var(--color-feedback-danger-soft)');
    expect(rule).not.toMatch(/(^|;|\s)(color|border|border-color|background):/);
    // The strip reads them: the mark on the glyph and the wash on the countdown,
    // and the words keep the strip's own inks on the strip's own hairline.
    expect(css).toMatch(/\.crewlet-toast__icon\s*\{[^}]*color:\s*var\(--crewlet-toast-mark\)/);
    expect(css).toMatch(/\.crewlet-toast__progress\s*\{[^}]*background:\s*var\(--crewlet-toast-wash\)/);
    expect(css).toMatch(/\.crewlet-toast\s*\{[^}]*border:\s*1px solid var\(--color-border-default\)/);
    expect(css).toMatch(/\.crewlet-toast__message\s*\{[^}]*color:\s*var\(--color-text-secondary\)/);
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

  /**
   * A provider whose API the case holds, so it raises toasts in exactly the
   * order it means; and what is on screen, oldest first.
   */
  function provider(max: number) {
    const held: { api?: ToastApi } = {};
    function Hold() {
      const toast = useToast();
      useEffect(() => {
        held.api = toast;
      }, [toast]);
      return null;
    }
    render(
      <ToastProvider max={max}>
        <Hold />
      </ToastProvider>,
    );
    const strip = (message: string) =>
      [...document.querySelectorAll('.crewlet-toast')].find(
        (one) => one.querySelector('.crewlet-toast__message')?.textContent === message,
      );
    return {
      raise: (raising: (toast: ToastApi) => unknown) =>
        act(() => {
          raising(held.api!);
        }),
      onScreen: () => [...document.querySelectorAll('.crewlet-toast__message')].map((node) => node.textContent),
      dismiss: (message: string) => fireEvent.click(strip(message)!.querySelector('.crewlet-toast__dismiss')!),
    };
  }

  test('the stack is bounded, and what goes is the oldest toast that would have gone by itself', () => {
    const { raise, onScreen } = provider(3);
    raise((toast) => toast.failed('The write was refused.'));
    raise((toast) => toast.ok('Saved the seat.'));
    raise((toast) => toast.ok('Saved the schedule.'));
    // The fourth used to take the refusal, the oldest of the three. It takes
    // the oldest success instead, which was leaving within seconds anyway.
    raise((toast) => toast.ok('Saved the budget.'));
    expect(onScreen()).toEqual(['The write was refused.', 'Saved the schedule.', 'Saved the budget.']);
    raise((toast) => toast.failed('The apply was refused.'));
    expect(onScreen()).toEqual(['The write was refused.', 'Saved the budget.', 'The apply was refused.']);
  });

  test("a toast's own duration decides whether the stack may drop it, as it decides its timer", () => {
    const { raise, onScreen } = provider(2);
    // A success asked to stay, and a variant of the caller's own that names no
    // duration, are both sticky. A failure given a duration counts down, so it
    // is the one the stack may drop.
    raise((toast) => toast.ok('Kept until it is dismissed.', { duration: 0 }));
    raise((toast) => toast.failed('Going by itself.', { duration: 3000 }));
    raise((toast) => toast.show({ variant: 'quota', title: 'Usage limit reached', message: 'The allowance is spent.' }));
    expect(onScreen()).toEqual(['Kept until it is dismissed.', 'The allowance is spent.']);
  });

  test('when every toast held is sticky, none goes, and the stack holds more than its bound', () => {
    vi.useFakeTimers();
    const { raise, onScreen, dismiss } = provider(2);
    const refusals = ['The seat was refused.', 'The schedule was refused.', 'The budget was refused.'];
    for (const refusal of refusals) raise((toast) => toast.failed(refusal));
    expect(onScreen()).toEqual(refusals);

    // A timed arrival is drawn too, over the bound, and takes itself away.
    raise((toast) => toast.ok('Saved the draft.'));
    expect(onScreen()).toEqual([...refusals, 'Saved the draft.']);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onScreen()).toEqual(refusals);

    // Once the reader has dismissed below it, the bound holds again.
    dismiss('The seat was refused.');
    dismiss('The schedule was refused.');
    raise((toast) => toast.ok('Saved the seat.'));
    raise((toast) => toast.ok('Saved the schedule.'));
    expect(onScreen()).toEqual(['The budget was refused.', 'Saved the schedule.']);
  });
});
