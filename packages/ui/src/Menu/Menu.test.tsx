/**
 * The menu button pattern: where focus goes in, where it goes back, and which
 * surface a key closes.
 *
 * Ported from the engine dashboard's `ui/Menu.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState, type ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { EditGlyph, MoveItemGlyph } from '@crewlethq/icons/glyphs';
import { LAYER_REPOSITION_EVENT, LayerHost, useModalLayer } from '../Layer/index.js';
import { Menu, type MenuEntry } from './index.js';

afterEach(cleanup);

/**
 * The stylesheet, with its comments taken out.
 *
 * Read as source because jsdom applies no stylesheet: `getComputedStyle`
 * answers the initial value for every property here and resolves no custom
 * property at all, so a rendered menu cannot see one of these rules. The file
 * is the only place they can be measured, which is where they are measured.
 * `DataTable/styles.test.tsx` carries the long version of this note.
 */
const menuCss = (): string =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Menu.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The ink the cascade leaves on a row, or on an element inside one, each
 * described by the classes it carries.
 *
 * WALKED RATHER THAN NAMED. Which of two rules of equal weight wins is their
 * order in the file, and a test that asserts the order asserts the mechanism
 * instead of the result: it stays green through any edit that keeps the order
 * and draws the wrong thing anyway. So every rule whose selector this element
 * satisfies is collected, and the last one at the greatest specificity is the
 * answer, specificity here being a count of classes. Only class selectors are
 * collected: a state is not a row at rest.
 */
function ink(row: string[], inside?: string[]): string | undefined {
  const element = inside ?? row;
  const names = (compound: string) => compound.slice(1).split('.');
  const carried = (compound: string, classes: string[]) => names(compound).every((name) => classes.includes(name));
  let best: { weight: number; at: number; colour: string } | undefined;
  for (const match of menuCss().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const colour = /(?:^|[\s;])color:\s*([^;]+)/.exec(match[2]!)?.[1]?.trim();
    if (colour === undefined) continue;
    for (const selector of match[1]!.split(',')) {
      const compounds = selector.trim().split(/\s+/);
      if (compounds.some((compound) => !/^(?:\.[\w-]+)+$/.test(compound))) continue;
      const target = compounds[compounds.length - 1]!;
      const ancestors = compounds.slice(0, -1);
      if (!carried(target, element)) continue;
      if (ancestors.length > (inside === undefined ? 0 : 1)) continue;
      if (ancestors.length === 1 && !carried(ancestors[0]!, row)) continue;
      const weight = compounds.reduce((total, compound) => total + names(compound).length, 0);
      if (!best || weight > best.weight || (weight === best.weight && match.index > best.at)) {
        best = { weight, at: match.index, colour };
      }
    }
  }
  return best?.colour;
}

test('the panel is as wide as its longest row, under a ceiling that still holds', () => {
  const panel = /\.crewlet-menu\s*\{([^}]*)\}/.exec(menuCss())?.[1] ?? '';
  expect(panel).toMatch(/(?<![-\w])width:\s*max-content/);
  expect(panel).toMatch(/max-width:\s*320px/);
  /*
   * A min-width above a max-width REPLACES it. Spelt as the pair, the panel
   * grew to its longest label however long that label was, the ceiling was a
   * number nothing read, and a label nobody expected left the window instead
   * of truncating inside it.
   */
  expect(panel).not.toMatch(/min-width:/);
});

test('a destructive row that cannot be pressed is drawn unavailable, its glyph with it', () => {
  expect(ink(['crewlet-menu__item'])).toBe('var(--color-text-primary)');
  expect(ink(['crewlet-menu__item', 'is-danger'])).toBe('var(--color-feedback-danger-ink)');
  expect(ink(['crewlet-menu__item', 'is-disabled'])).toBe('var(--color-text-tertiary)');
  /*
   * The pair is the case the opacity this replaced never had to decide: a
   * Delete nobody is allowed to press, drawn in full danger ink, is the
   * strongest "press me" in the palette.
   */
  expect(ink(['crewlet-menu__item', 'is-danger', 'is-disabled'])).toBe('var(--color-text-tertiary)');
  expect(ink(['crewlet-menu__item', 'is-danger', 'is-disabled'], ['crewlet-menu__icon'])).toBe(
    'var(--color-text-tertiary)',
  );
});

function entries(overrides: { onEdit?: () => void; onDelete?: () => void } = {}): MenuEntry[] {
  return [
    { key: 'edit', label: 'Edit', icon: <EditGlyph />, onSelect: overrides.onEdit ?? (() => {}) },
    { key: 'move', label: 'Move to', icon: <MoveItemGlyph />, onSelect: () => {} },
    { key: 'open', label: 'Open seat', disabled: true, onSelect: () => {} },
    { kind: 'separator', key: 'sep' },
    { key: 'delete', label: 'Delete', danger: true, onSelect: overrides.onDelete ?? (() => {}) },
  ];
}

const trigger = () => screen.getByRole('button', { name: 'Actions for Software Engineer' });
const item = (name: string) => screen.getByRole('menuitem', { name });
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });

/** The modal shell, so a menu can be raised inside one. */
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

test('the row focus is on is painted, and not only when a ring is drawn on it', () => {
  const css = menuCss();
  /*
   * A menu puts focus on a row as it opens, and a row a script focused after a
   * POINTER opened the panel matches no browser's :focus-visible. Drawn only
   * there, the panel came up with nothing lit at all.
   */
  expect(css).toMatch(/\.crewlet-menu__item:focus\s*\{[^}]*background:\s*var\(--color-surface-hover\)/);
  expect(css).toMatch(/\.crewlet-menu__item:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-focus\)/);
});

test('only a row with a second line is drawn at the taller register', () => {
  render(
    <Menu
      label="Actions for Software Engineer"
      items={[
        { key: 'edit', label: 'Edit', onSelect: () => {} },
        { key: 'move', label: 'Move to', description: 'Pick a new unit', onSelect: () => {} },
      ]}
    />,
  );
  fireEvent.click(trigger());
  const described = (label: string) =>
    screen.getByText(label).closest('.crewlet-menu__item')!.classList.contains('crewlet-menu__item--described');
  expect(described('Edit')).toBe(false);
  expect(described('Move to')).toBe(true);
});

test('the trigger announces a menu, and opening it puts focus on the first item', () => {
  render(<Menu label="Actions for Software Engineer" items={entries()} />);
  expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
  expect(trigger().getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(trigger());
  expect(trigger().getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('menu').id).toBe(trigger().getAttribute('aria-controls'));
  expect(document.activeElement).toBe(item('Edit'));
});

test('ArrowUp on the trigger opens on the last item; arrows wrap, Home and End jump, a letter finds', () => {
  render(<Menu label="Actions for Software Engineer" items={entries()} />);
  trigger().focus();
  fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
  expect(document.activeElement).toBe(item('Delete'));

  press('ArrowDown');
  expect(document.activeElement).toBe(item('Edit'));
  press('ArrowUp');
  expect(document.activeElement).toBe(item('Delete'));
  press('Home');
  expect(document.activeElement).toBe(item('Edit'));
  press('End');
  expect(document.activeElement).toBe(item('Delete'));
  press('m');
  expect(document.activeElement).toBe(item('Move to'));
  // A disabled item is still reached, and says it is unavailable.
  press('ArrowDown');
  expect(document.activeElement).toBe(item('Open seat'));
  expect(item('Open seat').getAttribute('aria-disabled')).toBe('true');
});

test('a choice’s answers are radio items that say which one is current, and the arrows walk them', () => {
  const chosen = vi.fn();
  const items: MenuEntry[] = [
    { key: 'none', label: 'No lead', checked: false, onSelect: () => chosen('none') },
    { key: 'vpe', label: 'VP Engineering', checked: true, onSelect: () => chosen('vpe') },
    { kind: 'separator', key: 'sep' },
    { key: 'other', label: 'Choose another seat', onSelect: () => chosen('other') },
  ];
  render(<Menu label="Lead of Engineering" items={items} />);
  fireEvent.click(screen.getByRole('button', { name: 'Lead of Engineering' }));
  const none = screen.getByRole('menuitemradio', { name: 'No lead' });
  const vpe = screen.getByRole('menuitemradio', { name: 'VP Engineering' });
  expect(none.getAttribute('aria-checked')).toBe('false');
  expect(vpe.getAttribute('aria-checked')).toBe('true');
  // An item that says nothing about `checked` stays an action.
  expect(item('Choose another seat')).toBeDefined();
  // The answers stand in one group, apart from the action, so a screen reader
  // counts them among themselves.
  const group = screen.getByRole('group');
  expect(within(group).getAllByRole('menuitemradio')).toEqual([none, vpe]);
  expect(group.contains(item('Choose another seat'))).toBe(false);

  expect(document.activeElement).toBe(none);
  press('ArrowDown');
  expect(document.activeElement).toBe(vpe);
  press('ArrowDown');
  expect(document.activeElement).toBe(item('Choose another seat'));
  press('ArrowDown');
  expect(document.activeElement).toBe(none);
  fireEvent.click(vpe);
  expect(chosen).toHaveBeenCalledWith('vpe');
});

test('Escape closes the menu and returns focus to the trigger, even inside a dialog', () => {
  const closed = vi.fn();
  render(
    <Dialog title="Edit unit" onClose={closed}>
      <Menu label="Actions for Software Engineer" items={entries()} />
    </Dialog>,
  );
  fireEvent.click(trigger());
  expect(screen.getByRole('menu')).toBeDefined();

  press('Escape');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger());
  expect(closed).not.toHaveBeenCalled();
});

test('an action runs after focus is back on the opener, so a dialog it opens can return there', () => {
  let focusedWhenSelected: Element | null = null;
  render(
    <Menu
      label="Actions for Software Engineer"
      items={entries({ onEdit: () => (focusedWhenSelected = document.activeElement) })}
    />,
  );
  trigger().focus();
  fireEvent.click(trigger());
  fireEvent.click(item('Edit'));
  expect(focusedWhenSelected).toBe(trigger());
  expect(screen.queryByRole('menu')).toBeNull();
});

test('a disabled item does nothing and leaves the menu open', () => {
  const onSelect = vi.fn();
  const items: MenuEntry[] = [{ key: 'x', label: 'Open seat', disabled: true, onSelect }];
  render(<Menu label="Actions for Software Engineer" items={items} />);
  fireEvent.click(trigger());
  fireEvent.click(item('Open seat'));
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByRole('menu')).toBeDefined();
});

test('a press outside closes it without pulling focus back', () => {
  render(
    <>
      <input aria-label="elsewhere" />
      <Menu label="Actions for Software Engineer" items={entries()} />
    </>,
  );
  fireEvent.click(trigger());
  const elsewhere = screen.getByLabelText('elsewhere');
  fireEvent.pointerDown(elsewhere);
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).not.toBe(trigger());
});

test('Tab closes it and hands focus back to the opener for the Tab to carry on from', () => {
  render(<Menu label="Actions for Software Engineer" items={entries()} />);
  trigger().focus();
  fireEvent.click(trigger());
  // Not prevented: the browser's own Tab then moves on from the trigger.
  expect(press('Tab')).toBe(true);
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

test('Tab out of a menu that is the last control in a dialog stays inside the dialog', () => {
  render(
    <Dialog title="Edit seat" onClose={() => {}}>
      <input aria-label="Name" />
      <Menu label="Actions for Software Engineer" items={entries()} />
    </Dialog>,
  );
  trigger().focus();
  fireEvent.click(trigger());
  press('Tab');
  // Focus went back to the trigger, which is the dialog's last control, so the
  // trap wraps the Tab to the first one instead of letting it leave.
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(screen.getByLabelText('Name'));
});

test('opened from a focused tree item, it returns there rather than to its pointer-only trigger', () => {
  function Card() {
    const [open, setOpen] = useState(false);
    return (
      <div
        role="treeitem"
        aria-selected={false}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) setOpen(true);
        }}
      >
        Software Engineer
        <Menu
          label="Actions for Software Engineer"
          items={entries()}
          open={open}
          onOpenChange={setOpen}
          triggerTabIndex={-1}
        />
      </div>
    );
  }
  render(<Card />);
  expect(trigger().tabIndex).toBe(-1);
  const card = screen.getByRole('treeitem');
  card.focus();
  fireEvent.keyDown(card, { key: 'F10', shiftKey: true });
  expect(document.activeElement).toBe(item('Edit'));
  press('Escape');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(card);
});

test('given a layer host, it renders there, placed from the trigger’s rectangle, and follows a pan', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
    }) as DOMRect;
  const { container } = render(
    <LayerHost>
      <Menu label="Actions for Software Engineer" items={entries()} />
    </LayerHost>,
  );
  const host = container.querySelector<HTMLElement>('.crewlet-layer-host')!;
  host.getBoundingClientRect = () => rect(100, 50, 600, 400);
  let anchor = rect(150, 80, 24, 24);
  trigger().getBoundingClientRect = () => anchor;
  // A browser refuses focus to an element under `visibility: hidden`, which
  // jsdom does not model, so the menu's style is read at the moment focus
  // arrives.
  let visibilityOnFocus: string | null = null;
  host.addEventListener('focusin', (e) => {
    visibilityOnFocus = (e.target as HTMLElement).closest<HTMLElement>("[role='menu']")!.style.visibility;
  });

  fireEvent.click(trigger());
  const menu = screen.getByRole('menu');
  expect(host.contains(menu)).toBe(true);
  expect(document.activeElement).toBe(item('Edit'));
  expect(visibilityOnFocus).toBe('');
  // Below the trigger by the gap, lined up with its start, in host coordinates.
  expect(menu.style.left).toBe('50px');
  expect(menu.style.top).toBe('58px');

  anchor = rect(250, 120, 24, 24);
  act(() => {
    host.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT));
  });
  expect(menu.style.left).toBe('150px');
  expect(menu.style.top).toBe('98px');

  // Panned out of the host entirely: the menu closes, and focus goes back.
  anchor = rect(2000, 120, 24, 24);
  act(() => {
    host.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT));
  });
  expect(screen.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

test('keys, presses and clicks inside the menu do not reach the element it opened from', () => {
  const card = { keys: [] as string[], clicks: 0, presses: 0 };
  const onEdit = vi.fn();
  function Card({ inHost }: { inHost: boolean }) {
    const menu = (
      <Menu label="Actions for Software Engineer" items={entries({ onEdit })} />
    );
    return (
      <div
        role="treeitem"
        aria-selected={false}
        tabIndex={0}
        onKeyDown={(e) => card.keys.push(e.key)}
        onClick={() => card.clicks++}
        onPointerDown={() => card.presses++}
      >
        Software Engineer
        {inHost ? <LayerHost>{menu}</LayerHost> : menu}
      </div>
    );
  }
  // Both routes a menu reaches its card by: the document (portalled to the
  // body) and the component tree through a portal into a host inside the card.
  for (const inHost of [false, true]) {
    card.keys = [];
    card.clicks = 0;
    card.presses = 0;
    const { unmount } = render(<Card inHost={inHost} />);
    fireEvent.click(trigger());
    card.clicks = 0;
    for (const key of ['ArrowDown', 'Enter', ' ', 'Delete', 'Backspace', 'm']) {
      fireEvent.keyDown(item('Move to'), { key });
    }
    fireEvent.pointerDown(item('Edit'));
    fireEvent.click(item('Edit'));
    expect(onEdit).toHaveBeenCalled();
    expect({ inHost, ...card }).toEqual({ inHost, keys: [], clicks: 0, presses: 0 });

    // Escape and Tab still travel: the layer stack acts on them at the document.
    fireEvent.click(trigger());
    card.clicks = 0;
    fireEvent.keyDown(item('Edit'), { key: 'Tab' });
    expect(card.keys).toEqual(['Tab']);
    unmount();
    onEdit.mockClear();
  }
});

/**
 * The open panel, with every row shape the restyle draws in it: a group of
 * answers with a check column, a row that carries a second line, a row that
 * carries a hint, a disabled row and a destructive one.
 *
 * Contrast is off because jsdom applies no stylesheet and resolves no custom
 * property; the palette suite measures every ink here on the panel it sits on.
 * What is left is the half a palette cannot see: the roles, the names and the
 * relationships the markup claims.
 */
test('the open menu carries no accessibility violation', async () => {
  render(
    <Menu
      label="Actions for Software Engineer"
      items={[
        { key: 'none', label: 'No lead', checked: false, onSelect: () => {} },
        { key: 'vpe', label: 'VP Engineering', checked: true, onSelect: () => {} },
        { kind: 'separator', key: 'sep' },
        { key: 'edit', label: 'Edit', icon: <EditGlyph />, hint: 'E', onSelect: () => {} },
        {
          key: 'move',
          label: 'Move to',
          icon: <MoveItemGlyph />,
          description: 'Pick a new unit for this seat',
          onSelect: () => {},
        },
        { key: 'open', label: 'Open seat', disabled: true, onSelect: () => {} },
        { key: 'delete', label: 'Delete', danger: true, disabled: true, onSelect: () => {} },
      ]}
    />,
  );
  fireEvent.click(trigger());
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});
