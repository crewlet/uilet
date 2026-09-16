/**
 * What the anchored panel promises now that it is on the layer stack.
 *
 * Every case is a defect it shipped with: it told a screen reader that a
 * filter form was a menu, it reported "open: false" on mount and on every
 * render after it, one Escape closed it and the Modal around it together, and
 * it portalled to the body where a fullscreen container does not paint.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { LAYER_REPOSITION_EVENT, LayerHost, useModalLayer } from '../Layer/index.js';
import { Popover } from './index.js';

afterEach(cleanup);

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;

function Chip({
  onOpenChange,
  ...props
}: Partial<React.ComponentProps<typeof Popover>> & { onOpenChange?: (open: boolean, reason: string) => void }) {
  return (
    <Popover
      label="Owner"
      onOpenChange={onOpenChange}
      {...props}
      trigger={(open, toggle) => (
        <button type="button" onClick={toggle}>
          Owner{open ? ' (open)' : ''}
        </button>
      )}
    >
      <label>
        Value
        <input aria-label="Owner value" />
      </label>
    </Popover>
  );
}

test('a panel is a dialog by default, named, and the trigger says so', () => {
  render(<Chip />);
  const trigger = screen.getByRole('button', { name: 'Owner' });
  expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(trigger.getAttribute('aria-controls')).toBeNull();

  fireEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: 'Owner' });
  expect(panel.id).toBe(screen.getByRole('button', { name: 'Owner (open)' }).getAttribute('aria-controls'));
  // NOT a menu. A form full of inputs announced as a menu of commands told a
  // screen reader that every field was a menu item.
  expect(screen.queryByRole('menu')).toBeNull();
});

test('a caller that really has a menu or a list says which', () => {
  render(
    <Chip role="listbox">
      <div role="option" aria-selected={false}>
        Anything
      </div>
    </Chip>,
  );
  const trigger = screen.getByRole('button', { name: 'Owner' });
  expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
  fireEvent.click(trigger);
  expect(screen.getByRole('listbox', { name: 'Owner' })).toBeDefined();
});

test('it reports a change and only a change, never on mount', () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(<Chip onOpenChange={onOpenChange} />);
  // The effect this replaced fired here, so a caller that cleared a flag when
  // the panel opened cleared it immediately and forever.
  expect(onOpenChange).not.toHaveBeenCalled();
  rerender(<Chip onOpenChange={onOpenChange} />);
  expect(onOpenChange).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  expect(onOpenChange.mock.calls).toEqual([[true, 'trigger']]);
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(onOpenChange.mock.calls).toEqual([
    [true, 'trigger'],
    [false, 'escape'],
  ]);
});

test('focus moves into a dialog panel and back to the trigger on Escape', () => {
  render(<Chip />);
  const trigger = screen.getByRole('button', { name: 'Owner' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(document.activeElement).toBe(screen.getByLabelText('Owner value'));
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Owner' }));
});

test('a menu or listbox panel leaves focus on the control that drives it', () => {
  // A combobox points at its list with aria-activedescendant. Pulling focus
  // into the list would take the arrows away from the field.
  render(<Chip role="menu" />);
  const trigger = screen.getByRole('button', { name: 'Owner' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Owner (open)' }));
});

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const modal = useModalLayer({ onClose });
  return (
    <div className="veil" ref={modal.veilRef} role="presentation">
      <div role="dialog" aria-modal aria-label={title} tabIndex={-1} ref={modal.panelRef}>
        {children}
      </div>
    </div>
  );
}

test('Escape closes the panel and leaves the modal around it open', () => {
  const closed = vi.fn();
  render(
    <Dialog title="Edit seat" onClose={closed}>
      <Chip />
    </Dialog>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Owner' })).toBeNull();
  expect(closed).not.toHaveBeenCalled();

  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(closed).toHaveBeenCalledTimes(1);
});

test('a press on the veil dismisses the panel, not the modal beneath it', () => {
  const closed = vi.fn();
  const { container } = render(
    <Dialog title="Edit seat" onClose={closed}>
      <Chip />
    </Dialog>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  const veil = container.querySelector('.veil')!;
  fireEvent.pointerDown(veil);
  fireEvent.click(veil);
  expect(screen.queryByRole('dialog', { name: 'Owner' })).toBeNull();
  expect(closed).not.toHaveBeenCalled();
});

test('keys inside the panel do not reach what it was opened from', () => {
  const keys: string[] = [];
  render(
    <div role="presentation" onKeyDown={(e) => keys.push(e.key)}>
      <Chip />
    </div>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Owner' }));
  const field = screen.getByLabelText('Owner value');
  for (const key of ['ArrowDown', 'Enter', 'Backspace', 'a']) fireEvent.keyDown(field, { key });
  expect(keys).toEqual([]);
  // Escape and Tab still travel, because the stack acts on them at the document.
  fireEvent.keyDown(field, { key: 'Tab' });
  expect(keys).toEqual(['Tab']);
});

test('inside a layer host it is drawn there, placed from the anchor, and closes when the anchor is panned away', () => {
  const { container } = render(
    <LayerHost>
      <Chip />
    </LayerHost>,
  );
  const host = container.querySelector<HTMLElement>('.crewlet-layer-host')!;
  host.getBoundingClientRect = () => rect(100, 50, 600, 400);
  let anchor = rect(150, 80, 80, 24);
  const trigger = screen.getByRole('button', { name: 'Owner' });
  trigger.getBoundingClientRect = () => anchor;

  fireEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: 'Owner' });
  expect(host.contains(panel)).toBe(true);
  // Below the anchor by the gap, in the host's own coordinates.
  expect(panel.style.left).toBe('50px');
  expect(panel.style.top).toBe('58px');

  anchor = rect(3000, 80, 80, 24);
  act(() => {
    host.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT));
  });
  expect(screen.queryByRole('dialog', { name: 'Owner' })).toBeNull();
});

test('a controlled panel is driven by its owner and still reports what it wanted', () => {
  function Controlled() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open from elsewhere</button>
        <Chip open={open} onOpenChange={(next) => setOpen(next)} />
      </>
    );
  }
  render(<Controlled />);
  fireEvent.click(screen.getByRole('button', { name: 'Open from elsewhere' }));
  expect(screen.getByRole('dialog', { name: 'Owner' })).toBeDefined();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Owner' })).toBeNull();
});

/**
 * The stylesheet, with its comments taken out. jsdom applies none, so a
 * rendered panel can see none of these rules and the file is the only place
 * they can be measured. See `DataTable/styles.test.tsx`.
 */
const popoverCss = (): string =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Popover.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

test('a row wraps, because this panel is a width range and cannot grow to a long one', () => {
  const row = /\.crewlet-popover__item\s*\{([^}]*)\}/.exec(popoverCss())?.[1] ?? '';
  // Still the menu's row: one line high, and tight.
  expect(row).toMatch(/min-height:\s*var\(--size-row-sm\)/);
  expect(row).toMatch(/padding:\s*0 var\(--spacing-2\)/);
  /*
   * A menu panel is as wide as its longest row and can afford a line that
   * cannot break. This one is floored and ceilinged, its `overflow-y` makes
   * the other axis scroll as well, and a row's label is often a bare child of
   * the row, which is a place `text-overflow` cannot reach. Nowrap here clips
   * a label with nothing to say it was clipped.
   */
  expect(row).not.toMatch(/white-space:\s*nowrap/);
});

test('the pointer lights no row it cannot press, and focus lights the row it is on', () => {
  const css = popoverCss();
  const hover = /(\.crewlet-popover__item:hover[^{]*)\{([^}]*)\}/.exec(css);
  expect(hover?.[2]).toMatch(/background:\s*var\(--color-surface-hover\)/);
  expect(hover?.[1]).toMatch(/:not\(\.is-disabled\)/);
  expect(hover?.[1]).toMatch(/aria-disabled/);
  // As in a menu: a panel that takes focus hands it to its first row, and
  // :focus-visible does not match a row a script focused after a pointer.
  expect(css).toMatch(/\.crewlet-popover__item:focus\s*\{[^}]*background:\s*var\(--color-surface-hover\)/);
});

/**
 * The open panel in the shape a console actually builds one: a heading over a
 * list of rows, which is conlet's Filter and Sort menus, plus the editor
 * shape. Contrast is off because jsdom applies no stylesheet and resolves no
 * custom property; the palette suite measures the inks. What is left is the
 * roles, the names and the relationships.
 */
test('the open panel carries no accessibility violation', async () => {
  render(
    <Popover
      open
      label="Add filter"
      trigger={(isOpen, toggle) => (
        <button type="button" onClick={toggle}>
          Filter{isOpen ? ' (open)' : ''}
        </button>
      )}
    >
      {() => (
        <div>
          <div className="crewlet-popover__heading">Add filter</div>
          <ul className="crewlet-popover__list">
            <li>
              <button type="button" className="crewlet-popover__item">
                Subscription status
              </button>
            </li>
            <li>
              <button type="button" className="crewlet-popover__item is-active">
                Seats in use
                <span className="crewlet-popover__item-trail">2</span>
              </button>
            </li>
            <li className="crewlet-popover__divider" aria-hidden />
            <li>
              <button type="button" className="crewlet-popover__item is-disabled" aria-disabled="true">
                Region
              </button>
            </li>
          </ul>
        </div>
      )}
    </Popover>,
  );
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
