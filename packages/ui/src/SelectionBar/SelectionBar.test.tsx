/**
 * The selection bar: the count printed and said politely as it changes, the
 * bulk actions and Clear as one toolbar, nothing drawn at zero, and focus
 * handed back once Clear takes the bar away.
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useRef, useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { Announcer } from '../Announcer/index.js';
import { Button } from '../Button/index.js';
import { SelectionBar } from './index.js';

afterEach(cleanup);

function said(): string {
  return screen.getByRole('status').textContent ?? '';
}

function Gallery({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Announcer />
      <button ref={toggle} type="button" onClick={() => setCount((n) => n + 1)}>
        Select one more
      </button>
      <SelectionBar count={count} onClear={() => setCount(0)} returnFocusRef={toggle}>
        <Button size="small" variant="secondary">
          Move to…
        </Button>
      </SelectionBar>
    </>
  );
}

test('draws nothing while nothing is picked', () => {
  render(<SelectionBar count={0} onClear={() => {}} />);
  expect(screen.queryByRole('toolbar')).toBeNull();
});

test('prints the count and is one named toolbar holding the actions and Clear', () => {
  render(
    <SelectionBar count={3} onClear={() => {}}>
      <Button size="small">Move to…</Button>
    </SelectionBar>,
  );
  const bar = screen.getByRole('toolbar', { name: 'Selection' });
  expect(bar.textContent).toContain('3 selected');
  expect(screen.getByRole('button', { name: 'Move to…' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Clear' })).toBeDefined();
});

test('says the count politely as it changes, and says so when the last pick is cleared', () => {
  render(<Gallery />);
  expect(said()).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Select one more' }));
  expect(said()).toBe('1 selected');
  fireEvent.click(screen.getByRole('button', { name: 'Select one more' }));
  expect(said()).toBe('2 selected');
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(said()).toBe('Selection cleared');
  expect(screen.queryByRole('toolbar')).toBeNull();
});

test('hands focus back to the given control once Clear takes the bar away', () => {
  render(<Gallery start={2} />);
  const clear = screen.getByRole('button', { name: 'Clear' });
  act(() => clear.focus());
  fireEvent.click(clear);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Select one more' }));
});

test('Clear reports, and an action only some picks allow says why it cannot be pressed', () => {
  const onClear = vi.fn();
  render(
    <SelectionBar count={3} onClear={onClear}>
      <Button size="small" disabledReason="You own 2 of 3">
        Move to the trash
      </Button>
    </SelectionBar>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(onClear).toHaveBeenCalledTimes(1);
  const trash = screen.getByRole('button', { name: 'Move to the trash' });
  expect(trash.getAttribute('aria-disabled')).toBe('true');
  expect(document.getElementById(trash.getAttribute('aria-describedby') ?? '')?.textContent).toBe('You own 2 of 3');
});

test('takes its words from the host', () => {
  render(<SelectionBar count={2} onClear={() => {}} labels={{ count: (n) => `${n} picked`, clear: 'Deselect', label: 'Picked artifacts' }} />);
  expect(screen.getByRole('toolbar', { name: 'Picked artifacts' }).textContent).toContain('2 picked');
  expect(screen.getByRole('button', { name: 'Deselect' })).toBeDefined();
});

test('carries no axe violation', async () => {
  const { container } = render(
    <main>
      <h1>Artifacts</h1>
      <SelectionBar count={3} onClear={() => {}}>
        <Button size="small" variant="secondary">
          Move to…
        </Button>
      </SelectionBar>
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
