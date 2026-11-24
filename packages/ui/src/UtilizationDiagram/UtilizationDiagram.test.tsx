import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { UtilizationDiagram } from './index.js';
import {
  BALANCED_LEVEL,
  UTILIZATION_TIMING,
  utilizationCycle,
  utilizationFrame,
  utilizationStill,
} from './UtilizationDiagram.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const levels = (mode: 'balanced' | 'sequential', ms: number) => utilizationFrame(mode, 3, ms).map((one) => one.level);

describe('the loop', () => {
  test('sequential fills lane 1, then 2, then 3, holds about 1.5 s, and starts again', () => {
    const { fill, hold, fade } = UTILIZATION_TIMING;
    expect(levels('sequential', 0)).toEqual([0, 0, 0]);
    expect(levels('sequential', fill / 2)).toEqual([0.5, 0, 0]);
    expect(levels('sequential', fill * 1.5)).toEqual([1, 0.5, 0]);
    expect(levels('sequential', fill * 3)).toEqual([1, 1, 1]);
    expect(levels('sequential', fill * 3 + hold - 1)).toEqual([1, 1, 1]);
    expect(hold).toBeGreaterThanOrEqual(1000);
    expect(hold).toBeLessThanOrEqual(2000);
    expect(utilizationCycle('sequential', 3)).toBe(fill * 3 + hold + fade);
    expect(levels('sequential', utilizationCycle('sequential', 3))).toEqual([0, 0, 0]);
  });

  test('balanced fills every lane together to one level, below the warning line', () => {
    const { balancedFill } = UTILIZATION_TIMING;
    for (const ms of [0, balancedFill / 3, balancedFill / 2, balancedFill]) {
      const [a, b, c] = levels('balanced', ms);
      expect(a).toBe(b);
      expect(b).toBe(c);
    }
    expect(levels('balanced', balancedFill)[0]).toBeCloseTo(BALANCED_LEVEL);
    expect(BALANCED_LEVEL).toBeLessThan(0.8);
  });

  test('the still frame shows each mode at rest', () => {
    expect(utilizationStill('sequential', 3)).toEqual([1, 0.55, 0]);
    expect(utilizationStill('balanced', 3)).toEqual([BALANCED_LEVEL, BALANCED_LEVEL, BALANCED_LEVEL]);
  });
});

describe('the diagram', () => {
  test('numbers sequential lanes only, and is decoration unless named', () => {
    const { container, rerender } = render(<UtilizationDiagram mode="sequential" />);
    const root = container.firstElementChild!;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect([...root.querySelectorAll('.crewlet-utilization-diagram__n')].map((n) => n.textContent)).toEqual(['1', '2', '3']);
    rerender(<UtilizationDiagram mode="balanced" lanes={4} label="Balanced: members share the work" />);
    expect(root.getAttribute('role')).toBe('img');
    expect(root.querySelectorAll('.crewlet-utilization-diagram__n')).toHaveLength(0);
    expect(root.querySelectorAll('.crewlet-utilization-diagram__fill')).toHaveLength(4);
  });

  test('under reduced motion it paints the still frame, in threshold tones, and never animates', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const { container } = render(<UtilizationDiagram mode="sequential" />);
    const fills = [...container.querySelectorAll<HTMLElement>('.crewlet-utilization-diagram__fill')];
    expect(fills.map((f) => f.style.transform)).toEqual(['scaleX(1)', 'scaleX(0.55)', 'scaleX(0)']);
    expect(fills.map((f) => f.dataset['tone'])).toEqual(['danger', 'success', 'success']);
    expect(raf).not.toHaveBeenCalled();
  });

  test('it loops while seen and stops in a hidden tab', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => queue.splice(0));
    const { container } = render(<UtilizationDiagram mode="sequential" />);
    const first = container.querySelector<HTMLElement>('.crewlet-utilization-diagram__fill')!;
    act(() => queue.shift()?.(0));
    act(() => queue.shift()?.(UTILIZATION_TIMING.fill * 0.9));
    expect(first.style.transform).toBe('scaleX(0.9)');
    expect(first.dataset['tone']).toBe('warning');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(queue).toHaveLength(0);
  });

  test('a lane count outside 2 to 5 is refused by name', () => {
    expect(() => render(<UtilizationDiagram mode="balanced" lanes={1} />)).toThrow(/lanes must be a whole number from 2 to 5/);
  });

  test('its tones are the usage tones', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'UtilizationDiagram.css'), 'utf8');
    expect(css).toMatch(/__fill \{[^}]*background: var\(--color-feedback-success\)/);
    expect(css).toMatch(/\[data-tone='warning'\] \{\s*background: var\(--color-feedback-warning\)/);
    expect(css).toMatch(/\[data-tone='danger'\] \{\s*background: var\(--color-feedback-danger\)/);
  });
});
