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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ChevronDownGlyph, FolderInputGlyph, PencilGlyph } from '@crewlethq/icons/glyphs';
import { LAYER_REPOSITION_EVENT, LayerHost, useModalLayer } from '../Layer/index.js';
import { FOCUS_RETURNED_ATTRIBUTE } from '../utils/focusModality.js';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { installMotion } from '../../../../apps/ui-tests/src/cascade.js';
import { Menu, type MenuEntry } from './index.js';

afterEach(cleanup);

/**
 * The stylesheet without its comments, read as source because jsdom applies
 * no stylesheet and resolves no custom property.
 */
const menuCss = (): string =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Menu.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The ink the cascade leaves on a row (or an element inside one): the last
 * matching class-only rule at the greatest specificity, counted in classes.
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
  // A min-width above a max-width replaces it, so the only minimum is the
  // trigger's floor and the ceiling is lifted to meet it.
  expect(panel).toMatch(/max-width:\s*max\(320px,\s*var\(--crewlet-menu-floor,\s*0px\)\)/);
  expect(panel).toMatch(/min-width:\s*var\(--crewlet-menu-floor,\s*0px\);/);
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
    { key: 'edit', label: 'Edit', icon: <PencilGlyph />, onSelect: overrides.onEdit ?? (() => {}) },
    { key: 'move', label: 'Move to', icon: <FolderInputGlyph />, onSelect: () => {} },
    { key: 'open', label: 'Open seat', disabled: true, onSelect: () => {} },
    { kind: 'separator', key: 'sep' },
    { key: 'delete', label: 'Delete', danger: true, onSelect: overrides.onDelete ?? (() => {}) },
  ];
}

const trigger = () => screen.getByRole('button', { name: 'Actions for Software Engineer' });
const item = (name: string) => screen.getByRole('menuitem', { name });
/** The box that is placed and scrolls: the menu's list of items stands inside it. */
const panelOf = (menu: HTMLElement) => menu.closest<HTMLElement>('.crewlet-menu')!;
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

/*
 * A TRIGGER'S GLYPHS ARE THE BUTTON'S ICONS, each in its own slot a gap away
 * from the words: a glyph written into the trigger text sat flush against it.
 */
test('a text trigger draws its leading and trailing glyphs as the button icons', () => {
  render(
    <Menu
      label="Rank by: Keyword"
      trigger="Keyword"
      icon={<PencilGlyph />}
      trailingIcon={<ChevronDownGlyph />}
      items={entries()}
    />,
  );
  const button = screen.getByRole('button', { name: 'Rank by: Keyword' });
  const slots = [...button.children].map((child) => child.className);
  expect(slots).toEqual(['crewlet-btn__icon', 'crewlet-btn__label', 'crewlet-btn__icon']);
  expect(button.querySelector('.crewlet-btn__label')?.textContent).toBe('Keyword');
});

test('a text trigger is named by the label, which keeps its visible words', () => {
  render(<Menu label="New artifact" trigger="New" items={entries()} />);
  const button = screen.getByRole('button', { name: 'New artifact' });
  expect(button.textContent).toBe('New');
  expect(screen.queryByRole('button', { name: 'New' })).toBeNull();
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
  // Marked as focus handed back, which keeps a pointer reader's ring off it.
  expect(trigger().hasAttribute(FOCUS_RETURNED_ATTRIBUTE)).toBe(true);
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
    visibilityOnFocus = (e.target as HTMLElement).closest<HTMLElement>('.crewlet-menu')!.style.visibility;
  });

  fireEvent.click(trigger());
  const menu = screen.getByRole('menu');
  expect(host.contains(menu)).toBe(true);
  expect(document.activeElement).toBe(item('Edit'));
  expect(visibilityOnFocus).toBe('');
  // Below the trigger by the gap, lined up with its start, in host coordinates.
  expect(panelOf(menu).style.left).toBe('50px');
  expect(panelOf(menu).style.top).toBe('58px');

  anchor = rect(250, 120, 24, 24);
  act(() => {
    host.dispatchEvent(new CustomEvent(LAYER_REPOSITION_EVENT));
  });
  expect(panelOf(menu).style.left).toBe('150px');
  expect(panelOf(menu).style.top).toBe('98px');

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
 * Every row shape the panel draws. Contrast is off because jsdom resolves no
 * custom property; the palette suite measures those inks.
 */
test('the open menu carries no accessibility violation', async () => {
  render(
    <Menu
      label="Actions for Software Engineer"
      items={[
        { key: 'none', label: 'No lead', checked: false, onSelect: () => {} },
        { key: 'vpe', label: 'VP Engineering', checked: true, onSelect: () => {} },
        { kind: 'separator', key: 'sep' },
        { key: 'edit', label: 'Edit', icon: <PencilGlyph />, hint: 'E', onSelect: () => {} },
        {
          key: 'move',
          label: 'Move to',
          icon: <FolderInputGlyph />,
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

/*
 * Every item is a flex item of the scrolling panel, and an explicit
 * `min-height` replaces the automatic minimum, so without `flex: none` a long
 * menu squeezes a two-line row into the height of one.
 */
test('a menu row keeps its floor and cannot be shrunk under its own content', () => {
  const row = /\.crewlet-menu__item\s*\{([^}]*)\}/.exec(menuCss())?.[1] ?? '';
  expect(row).toMatch(/min-height:\s*var\(--size-row-sm\)/);
  expect(row).toMatch(/flex:\s*none/);
});

// The suite's ResizeObserver is a no-op, so the callback is captured and
// fired by hand: the panel must be observed and re-placed when it resizes.
test('a menu whose panel changes size while open is placed again', () => {
  const observed: Element[] = [];
  let fire: (() => void) | undefined;
  const realRO = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb: () => void) {
      fire = cb;
    }
    observe(el: Element) {
      observed.push(el);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  const box = (left: number, width: number) =>
    ({ left, top: 100, width, height: 200, right: left + width, bottom: 300, x: left, y: 100 }) as DOMRect;
  // Clear of the left edge, so an `end` alignment is not clamped to the gap.
  const boxes = { anchor: box(700, 120), panel: box(0, 200) };
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('crewlet-menu')) return boxes.panel;
    // The trigger, which is the one button outside the panel: a menu ROW is
    // a button too.
    if (this.tagName === 'BUTTON' && !this.classList.contains('crewlet-menu__item')) return boxes.anchor;
    return realRect.call(this);
  };
  try {
    render(<Menu label="Actions for Software Engineer" align="end" items={entries()} />);
    fireEvent.click(trigger());
    const panel = panelOf(screen.getByRole('menu'));
    expect(observed).toContain(panel);
    const before = panel.style.left;

    boxes.panel = box(0, 320);
    act(() => fire?.());
    expect(panel.style.left).not.toBe(before);
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
    globalThis.ResizeObserver = realRO;
  }
});

test('a menu given width="trigger" is never narrower than its trigger', () => {
  // The stylesheet's half, the floor and the ceiling that meets it, is held
  // by the panel's own test at the head of this file.
  const anchor = { left: 40, top: 500, width: 248, height: 40, right: 288, bottom: 540, x: 40, y: 500 } as DOMRect;
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.tagName === 'BUTTON' && !this.classList.contains('crewlet-menu__item')) return anchor;
    return realRect.call(this);
  };
  try {
    render(<Menu label="Actions for Software Engineer" width="trigger" items={entries()} />);
    fireEvent.click(trigger());
    const panel = panelOf(screen.getByRole('menu'));
    expect(panel.style.getPropertyValue('--crewlet-menu-floor')).toBe('248px');
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
  }
});

test('a menu left at its content width carries no floor', () => {
  render(<Menu label="Actions for Software Engineer" items={entries()} />);
  fireEvent.click(trigger());
  expect(panelOf(screen.getByRole('menu')).style.getPropertyValue('--crewlet-menu-floor')).toBe('');
});

test('a header puts a name and its value on one line', () => {
  const header = /\.crewlet-menu__header\s*\{([^}]*)\}/.exec(menuCss())?.[1] ?? '';
  expect(header).not.toMatch(/flex-direction:\s*column/);
  expect(header).toMatch(/justify-content:\s*space-between/);
  expect(header).toMatch(/flex-wrap:\s*wrap/);
});

test('a header says what the actions are about: never an item, and the menu is described by it', () => {
  render(<Menu label="Actions for Software Engineer" items={entries()} header={<span>Access: Admin</span>} />);
  fireEvent.click(trigger());
  const menu = screen.getByRole('menu');
  const header = panelOf(menu).querySelector('.crewlet-menu__header')!;
  expect(header.textContent).toBe('Access: Admin');
  // Beside the menu in its panel, never inside it: a menu owns only items.
  expect(menu.contains(header)).toBe(false);
  expect(menu.getAttribute('aria-describedby')).toBe(header.id);
  // The arrows walk the items alone: the header is read, never stopped on.
  expect(document.activeElement).toBe(item('Edit'));
  press('ArrowUp');
  expect(document.activeElement).toBe(item('Delete'));
});

test('without a header the menu is described by nothing', () => {
  render(<Menu label="Actions for Software Engineer" items={entries()} />);
  fireEvent.click(trigger());
  expect(screen.getByRole('menu').hasAttribute('aria-describedby')).toBe(false);
  expect(panelOf(screen.getByRole('menu')).querySelector('.crewlet-menu__header')).toBeNull();
});

test('the caller’s own trigger opens the menu and keeps every rule of the button', () => {
  const edited = vi.fn();
  render(
    <Menu
      label="Your account"
      items={entries({ onEdit: edited })}
      renderTrigger={(props) => (
        <button type="button" className="own" {...props}>
          Lee Park
        </button>
      )}
    />,
  );
  const own = screen.getByRole('button', { name: 'Lee Park' });
  expect(own.classList.contains('own')).toBe(true);
  expect(own.getAttribute('aria-haspopup')).toBe('menu');
  expect(own.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('button', { name: 'Your account' })).toBeNull();

  fireEvent.click(own);
  expect(own.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('menu', { name: 'Your account' }).id).toBe(own.getAttribute('aria-controls'));
  expect(document.activeElement).toBe(item('Edit'));

  // Escape gives focus back to the caller's element, and an action runs with
  // focus already there.
  press('Escape');
  expect(document.activeElement).toBe(own);
  own.focus();
  fireEvent.keyDown(own, { key: 'ArrowDown' });
  fireEvent.click(item('Edit'));
  expect(edited).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(own);
});

/*
 * THE HEADER IS WHAT A CALLER REALLY PASSES: a description list and a tag,
 * which have roles of their own. A bare span has none, so a menu that owned
 * one passed `aria-required-children` while a menu that owned a list did not.
 */
test('a menu with a header carries no axe violation, whatever the header holds', async () => {
  const { container } = render(
    <Menu
      label="Actions for Software Engineer"
      items={entries()}
      header={
        <dl>
          <dt>Access</dt>
          <dd>
            <ul>
              <li>Admin</li>
            </ul>
          </dd>
          <dt>Signed in</dt>
          <dd>with a token</dd>
        </dl>
      }
    />,
  );
  fireEvent.click(trigger());
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(container).toBeDefined();
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

test('an end-aligned menu wider than its trigger\'s right edge opens, held inside the window', () => {
  // A phone's toolbar wraps its last control to the left edge: an end-aligned
  // 200px menu under a 64px trigger at x 12 would start left of the window.
  const box = (left: number, width: number) =>
    ({ left, top: 100, width, height: 32, right: left + width, bottom: 132, x: left, y: 100 }) as DOMRect;
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('crewlet-menu')) return box(0, 200);
    if (this.tagName === 'BUTTON' && !this.classList.contains('crewlet-menu__item')) return box(12, 64);
    return realRect.call(this);
  };
  try {
    render(<Menu label="Actions for Software Engineer" align="end" items={entries()} />);
    fireEvent.click(trigger());
    const panel = panelOf(screen.getByRole('menu'));
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(0);
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
  }
});

// A MENU DRAWN AS THE VALUE it changes (a status chosen in place) lines up
// with the plain values beside it and reads in their size and ink: its
// trigger is a flush button in the surrounding text's register.
test('valueTrigger draws the trigger as the value: flush, in the surrounding text', () => {
  render(<Menu label="Status of ENG-1" trigger="In progress" valueTrigger items={[{ key: 'a', label: 'Done', onSelect: () => {} }]} />);
  const trigger = screen.getByRole('button', { name: 'In progress, Status of ENG-1' });
  expect(trigger.classList.contains('crewlet-btn--flush')).toBe(true);
  expect(trigger.classList.contains('crewlet-menu__value-trigger')).toBe(true);
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Menu.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  // RAISED over the button's size and variant classes (one class each).
  expect(css).toMatch(
    /\.crewlet-menu-anchor > \.crewlet-btn\.crewlet-menu__value-trigger \{[^}]*font-size: inherit;[^}]*font-weight: inherit;[^}]*color: inherit;/,
  );
});

// A value trigger is named by the value it shows, then by `label`; the menu
// itself keeps `label` as its name.
test('a value trigger is named by its value first, and carries no name of its own', () => {
  render(
    <Menu
      label="Status of ENG-1"
      trigger={<span className="badge">In progress</span>}
      valueTrigger
      items={[{ key: 'a', label: 'Done', onSelect: () => {} }]}
    />,
  );
  const trigger = screen.getByRole('button', { name: 'In progress, Status of ENG-1' });
  expect(trigger.hasAttribute('aria-label')).toBe(false);
  expect(trigger.textContent?.startsWith('In progress')).toBe(true);
  fireEvent.click(trigger);
  expect(screen.getByRole('menu', { name: 'Status of ENG-1' })).toBeDefined();
});

// A TEXT TRIGGER THAT IS NOT A VALUE keeps `label` as its name ("New" read as
// "New artifact"), which the label is written to contain.
test('a text trigger that is not a value is still named by its label', () => {
  render(<Menu label="New artifact" trigger="New" items={[{ key: 'a', label: 'Doc', onSelect: () => {} }]} />);
  expect(screen.getByRole('button', { name: 'New artifact' })).toBeDefined();
});

describe('a tooltip on the trigger', () => {
  const ACTIONS: MenuEntry[] = [
    { key: 'edit', label: 'Edit', onSelect: () => {} },
    { key: 'move', label: 'Move to', onSelect: () => {} },
  ];
  const tip = () => document.querySelector<HTMLElement>('[role="tooltip"]');
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const settle = () =>
    act(() => {
      vi.advanceTimersByTime(1000);
    });

  test('the pointer resting on the trigger shows it, shown and not read, and the icon gives up its own title', () => {
    render(<Menu label="More actions for Product Lead" tooltip="More actions" items={ACTIONS} />);
    const trigger = screen.getByRole('button', { name: 'More actions for Product Lead' });
    expect(trigger.getAttribute('title')).toBe('');
    fireEvent.pointerEnter(trigger);
    settle();
    expect(tip()?.textContent).toBe('More actions');
    expect(tip()?.getAttribute('aria-hidden')).toBe('true');
  });

  test('keyboard focus shows it, and it steps aside while the menu is open', () => {
    render(<Menu label="More actions for Product Lead" tooltip="More actions" items={ACTIONS} />);
    const trigger = screen.getByRole('button', { name: 'More actions for Product Lead' });
    tabTo(trigger);
    expect(tip()).not.toBeNull();
    fireEvent.click(trigger);
    settle();
    expect(screen.getByRole('menu')).not.toBeNull();
    expect(tip()).toBeNull();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });

  test('a text trigger takes it too, and an icon trigger without one says its label', () => {
    render(
      <>
        <Menu label="Add to the organization" trigger="Add" tooltip="Add a seat or a team" items={ACTIONS} />
        <Menu label="Row actions" items={ACTIONS} />
      </>,
    );
    const text = screen.getByRole('button', { name: 'Add to the organization' });
    fireEvent.pointerEnter(text);
    settle();
    expect(tip()?.textContent).toBe('Add a seat or a team');
    fireEvent.pointerLeave(text);
    settle();
    const icon = screen.getByRole('button', { name: 'Row actions' });
    expect(icon.getAttribute('title')).toBe('');
    fireEvent.pointerEnter(icon);
    settle();
    expect(tip()?.textContent).toBe('Row actions');
  });
});

/*
 * WHOLE AT THE WINDOW'S FOOT. A layer host taller than the window (a long
 * table's) had room below every trigger, so a menu near the window's foot
 * opened below it, past the edge. It is placed in the part the window shows.
 */
test("in a layer taller than the window, a menu near the window's foot opens upward, whole", () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('crewlet-layer-host')) return rect(0, 0, 900, 3000);
    if (this.classList.contains('crewlet-menu')) return rect(0, 0, 180, 200);
    if (this.tagName === 'BUTTON' && !this.classList.contains('crewlet-menu__item')) return rect(600, window.innerHeight - 40, 24, 24);
    return realRect.call(this);
  };
  try {
    render(
      <LayerHost>
        <Menu label="Actions for Software Engineer" items={entries()} />
      </LayerHost>,
    );
    fireEvent.click(trigger());
    const menu = screen.getByRole('menu');
    const top = Number.parseFloat(panelOf(menu).style.top);
    // Above the trigger by the gap, and inside the window.
    expect(top).toBe(window.innerHeight - 40 - 4 - 200);
    expect(top + 200).toBeLessThanOrEqual(window.innerHeight);
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
  }
});

/*
 * AS TALL AS THE ROOM BESIDE ITS ANCHOR. A fixed 360px cut a fourteen-item
 * menu in half on a phone, with 480px of screen free under it.
 */
test('a menu may grow to the room beside its anchor, not a fixed 360px', () => {
  const height = window.innerHeight;
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
  const anchor = { left: 340, top: 40, width: 40, height: 40, right: 380, bottom: 80, x: 340, y: 40 } as DOMRect;
  const realRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('crewlet-menu')) {
      // Its rows are 605px tall; the panel shows what its ceiling allows.
      const room = Number.parseFloat((this as HTMLElement).style.getPropertyValue('--crewlet-menu-room'));
      const shown = Math.min(605, Number.isFinite(room) ? room : 360);
      return { left: 0, top: 0, width: 260, height: shown, right: 260, bottom: shown, x: 0, y: 0 } as DOMRect;
    }
    if (this.tagName === 'BUTTON' && !this.classList.contains('crewlet-menu__item')) return anchor;
    return realRect.call(this);
  };
  try {
    render(<Menu label="Actions for Software Engineer" items={entries()} />);
    fireEvent.click(trigger());
    const panel = panelOf(screen.getByRole('menu'));
    // The window less the gap at its foot, less the anchor and the gap under it.
    expect(panel.style.getPropertyValue('--crewlet-menu-room')).toBe(`${844 - 4 - (80 + 4)}px`);
    expect(Number.parseFloat(panel.style.top)).toBe(84);
  } finally {
    Element.prototype.getBoundingClientRect = realRect;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  }
  // And the stylesheet reads it as the ceiling.
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'Menu.css'), 'utf8');
  expect(sheet).toMatch(/max-height:\s*var\(--crewlet-menu-room,/);
});

// `instant` is drawn the frame it is placed; the default rises; reduced motion stills both.
test('an instant menu arrives with no animation; the default rises; reduced motion stills both', () => {
  for (const [preference, entrance, moves] of [
    ['no-preference', 'rise', true],
    ['no-preference', 'instant', false],
    ['reduce', 'rise', false],
  ] as const) {
    const uninstall = installMotion(preference, 'Menu/Menu.css');
    render(<Menu label="Actions for Software Engineer" items={entries()} entrance={entrance} />);
    fireEvent.click(trigger());
    const panel = panelOf(screen.getByRole('menu'));
    expect(panel.classList.contains('crewlet-menu--instant'), `${preference} ${entrance}`).toBe(entrance === 'instant');
    // Only the stop and the instant rule write `none`; the rise is left as written.
    expect(getComputedStyle(panel).animation === 'none', `${preference} ${entrance}`).toBe(!moves);
    cleanup();
    uninstall();
  }
});

describe('the active-descendant mode', () => {
  const menu = () => screen.getByRole('menu');
  const highlighted = () => {
    const id = menu().getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  };

  // Mutation: focus the first item on open, as the default does, and focus leaves the menu.
  test('opens on a press with focus on the menu and nothing highlighted; ArrowDown highlights the first item', () => {
    render(<Menu label="Actions for Software Engineer" items={entries()} activeDescendant />);
    fireEvent.click(trigger());
    expect(document.activeElement).toBe(menu());
    expect(menu().hasAttribute('aria-activedescendant')).toBe(false);
    press('ArrowDown');
    expect(document.activeElement).toBe(menu());
    expect(highlighted()).toBe(item('Edit'));
    expect(item('Edit').classList.contains('is-active')).toBe(true);
  });

  test('the arrows wrap, Home and End jump, a letter finds, a disabled item is still reached', () => {
    render(<Menu label="Actions for Software Engineer" items={entries()} activeDescendant />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    expect(highlighted()).toBe(item('Delete'));
    press('ArrowDown');
    expect(highlighted()).toBe(item('Edit'));
    press('ArrowUp');
    expect(highlighted()).toBe(item('Delete'));
    press('Home');
    expect(highlighted()).toBe(item('Edit'));
    press('End');
    expect(highlighted()).toBe(item('Delete'));
    press('m');
    expect(highlighted()).toBe(item('Move to'));
    press('ArrowDown');
    expect(highlighted()).toBe(item('Open seat'));
    expect(document.activeElement).toBe(menu());
  });

  test('Enter runs the highlighted item after focus is back on the trigger; with nothing highlighted it runs nothing', () => {
    const onEdit = vi.fn(() => expect(document.activeElement).toBe(trigger()));
    render(<Menu label="Actions for Software Engineer" items={entries({ onEdit })} activeDescendant />);
    fireEvent.click(trigger());
    press('Enter');
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeTruthy();
    press('ArrowDown');
    press('Enter');
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('Space runs it too, and a disabled item does nothing and leaves the menu open', () => {
    render(<Menu label="Actions for Software Engineer" items={entries()} activeDescendant />);
    fireEvent.click(trigger());
    press('m');
    press('ArrowDown');
    expect(highlighted()).toBe(item('Open seat'));
    press(' ');
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  test('the pointer moves the highlight and never takes focus off the menu', () => {
    render(<Menu label="Actions for Software Engineer" items={entries()} activeDescendant />);
    fireEvent.click(trigger());
    fireEvent.pointerMove(item('Move to'));
    expect(highlighted()).toBe(item('Move to'));
    const down = fireEvent.mouseDown(item('Move to'));
    expect(down).toBe(false);
    press('ArrowDown');
    expect(highlighted()).toBe(item('Open seat'));
  });

  test('Escape closes it and returns focus to the trigger', () => {
    render(<Menu label="Actions for Software Engineer" items={entries()} activeDescendant />);
    fireEvent.click(trigger());
    press('Escape');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  // The fill is the one cue: no ring on a row, the accent under the on-accent ink.
  test('draws the highlighted row as the accent fill with no ring, and the panel draws none either', () => {
    const css = menuCss().replace(/\s+/g, ' ');
    expect(css).toContain('.crewlet-menu--descendant .crewlet-menu__item.is-active { background: var(--color-brand-accent); color: var(--color-text-on-accent); }');
    expect(css).toContain('.crewlet-menu--descendant .crewlet-menu__list:focus-visible { outline: 2px solid transparent; }');
    expect(css).not.toMatch(/\.crewlet-menu--descendant[^{]*is-active[^{]*\{[^}]*outline: 2px solid var/);
  });

  test('the open menu in this mode carries no accessibility violation', async () => {
    const { container } = render(
      <main>
        <h1>Seats</h1>
        <Menu label="Actions for Software Engineer" items={entries()} activeDescendant />
      </main>,
    );
    fireEvent.click(trigger());
    press('ArrowDown');
    const results = await axe.run(container.ownerDocument.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(results.violations).toEqual([]);
  });
});
