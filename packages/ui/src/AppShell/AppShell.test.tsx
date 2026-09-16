/**
 * The shell's landmarks, its skip link, and the drawer.
 *
 * The drawer cases are ported from the engine dashboard's `app/Shell.test.tsx`,
 * where the rail was a veil with a click handler and nothing else: Escape did
 * nothing, Tab walked out behind the veil, and a dialog raised over it shared
 * no stack with it.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useModalLayer } from '../Layer/index.js';
import { NavGroup, NavItem, SidebarNav } from '../SidebarNav/index.js';
import { AppShell, useAppShell } from './index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * A media query list the test drives.
 *
 * jsdom has no matchMedia, and the suite's own stub answers "never matches",
 * which is the wide layout. Crossing the breakpoint is a state only a
 * controllable one can reach.
 */
function installMedia(initial: boolean): { set: (matches: boolean) => void; restore: () => void } {
  const listeners = new Set<() => void>();
  let matches = initial;
  const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: () => void) => void listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => void listeners.delete(listener),
      addListener: (listener: () => void) => void listeners.add(listener),
      removeListener: (listener: () => void) => void listeners.delete(listener),
      dispatchEvent: () => false,
    }),
  });
  return {
    set: (next: boolean) => {
      matches = next;
      act(() => {
        for (const listener of [...listeners]) listener();
      });
    },
    restore: () => {
      if (had) Object.defineProperty(globalThis, 'matchMedia', had);
      else delete (globalThis as Record<string, unknown>).matchMedia;
    },
  };
}

/** The smallest surface that holds the keyboard, on the shared layer stack. */
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
  const { panelRef, veilRef } = useModalLayer({ onClose });
  return (
    <div ref={veilRef} role="presentation">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

function Rail({ children }: { children?: ReactNode }) {
  return (
    <AppShell.Rail header={<a href="#/">Crewlet</a>} footer={children}>
      <SidebarNav label="Sections">
        <NavItem href="#/" label="Overview" current />
        <NavGroup label="Company">
          <NavItem href="#/people" label="People" />
        </NavGroup>
      </SidebarNav>
    </AppShell.Rail>
  );
}

function Console({
  navigationKey,
  footer,
  banner,
}: {
  navigationKey?: string;
  footer?: ReactNode;
  banner?: ReactNode;
}) {
  return (
    <AppShell
      sidebar={<Rail>{footer}</Rail>}
      topbar={<AppShell.Topbar title="Overview" actions={<button>Search</button>} />}
      navigationKey={navigationKey}
      banner={banner}
    >
      <h2>The screen</h2>
      <button>Retry</button>
    </AppShell>
  );
}

function press(key: string, init: Partial<KeyboardEventInit> = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
}

test('the top bar is the page banner, and it is outside main', () => {
  render(<Console />);
  const banner = screen.getByRole('banner');
  const main = screen.getByRole('main');
  // A header inside main is part of the screen rather than the page's own
  // chrome, and a screen reader offered "banner" would land inside the thing
  // it was trying to skip.
  expect(main.contains(banner)).toBe(false);
  expect(within(banner).getByRole('heading', { level: 1, name: 'Overview' })).toBeDefined();
  expect(screen.getByRole('complementary')).toBeDefined();
});

test('a banner is chrome: it sits under the bar and outside the scroller', () => {
  render(<Console banner={<p>Reconnecting to the engine.</p>} />);
  const banner = screen.getByText('Reconnecting to the engine.');
  const main = screen.getByRole('main');
  // Inside the scroller it would scroll away with the screen, which is the
  // one thing a report about the whole page must not do.
  expect(main.contains(banner)).toBe(false);
  expect(screen.getByRole('banner').compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('the skip link is first, and it moves focus into main', () => {
  render(<Console />);
  const skip = screen.getByRole('link', { name: 'Skip to content' });
  const main = screen.getByRole('main');
  expect(skip.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  // Focus is MOVED rather than left to the browser's fragment: an application
  // routed on the hash would read "#main" as a route and navigate away from
  // the page the reader was skipping into. fireEvent answers false when a
  // listener claimed the press, which is the only way to see the fragment
  // navigation refused: jsdom performs none, so a location that stayed put
  // would say the same thing whether or not the press was claimed.
  expect(fireEvent.click(skip)).toBe(false);
  expect(document.activeElement).toBe(main);
  expect(main.getAttribute('id')).toBe(skip.getAttribute('href')?.slice(1));
});

test('the sections drawer is a modal on the stack: focus goes in, Tab stays, Escape closes it', () => {
  render(<Console />);
  const toggle = screen.getByRole('button', { name: 'Sections' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(toggle.getAttribute('aria-haspopup')).toBe('dialog');
  toggle.focus();
  fireEvent.click(toggle);

  // Only while it is open is the rail a dialog; beside a wide layout it is the
  // page's own navigation and must not announce itself as modal.
  const drawer = screen.getByRole('dialog', { name: 'Sections' });
  expect(drawer.tagName).toBe('ASIDE');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(drawer.getAttribute('id')).toBe(toggle.getAttribute('aria-controls'));

  // It opens on the row for the screen the reader is on.
  const overview = within(drawer).getByRole('link', { name: 'Overview' });
  expect(overview.getAttribute('aria-current')).toBe('page');
  expect(document.activeElement).toBe(overview);

  // Shift+Tab from the first control wraps inside rather than leaving for the
  // page behind the veil.
  within(drawer).getByRole('link', { name: 'Crewlet' }).focus();
  press('Tab', { shiftKey: true });
  expect(drawer.contains(document.activeElement)).toBe(true);

  press('Escape');
  expect(screen.queryByRole('dialog', { name: 'Sections' })).toBeNull();
  expect(document.activeElement).toBe(toggle);
  expect(screen.getByRole('navigation', { name: 'Sections' })).toBeDefined();
});

test('a navigation closes the drawer, and focus comes back to the toggle', () => {
  const view = render(<Console navigationKey="#/" />);
  const toggle = screen.getByRole('button', { name: 'Sections' });
  toggle.focus();
  fireEvent.click(toggle);
  const drawer = screen.getByRole('dialog', { name: 'Sections' });
  within(drawer).getByRole('link', { name: 'People' }).focus();

  // A drawer left open over the screen you have just navigated to is the
  // classic mobile navigation defect.
  view.rerender(<Console navigationKey="#/people" />);
  expect(screen.queryByRole('dialog', { name: 'Sections' })).toBeNull();
  expect(document.activeElement).toBe(toggle);
});

test('the drawer closes on its veil, and a dialog raised over it closes first', () => {
  function WithPanel() {
    const [panel, setPanel] = useState(false);
    return (
      <AppShell
        sidebar={
          <Rail>
            <button onClick={() => setPanel(true)}>Engine</button>
          </Rail>
        }
        topbar={<AppShell.Topbar title="Overview" />}
      >
        {panel ? (
          <Dialog title="Engine" onClose={() => setPanel(false)}>
            <button>Set token</button>
          </Dialog>
        ) : null}
      </AppShell>
    );
  }
  render(<WithPanel />);
  const toggle = screen.getByRole('button', { name: 'Sections' });
  toggle.focus();
  fireEvent.click(toggle);
  const drawer = screen.getByRole('dialog', { name: 'Sections' });

  // A dialog opened from the rail sits above it, and Escape reaches only that.
  const pill = within(drawer).getByRole('button', { name: 'Engine' });
  pill.focus();
  fireEvent.click(pill);
  press('Escape');
  expect(screen.queryByRole('dialog', { name: 'Engine' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Sections' })).toBe(drawer);
  expect(document.activeElement).toBe(pill);

  const veil = document.querySelector('.crewlet-app-shell__veil')!;
  fireEvent.pointerDown(veil);
  fireEvent.click(veil);
  expect(screen.queryByRole('dialog', { name: 'Sections' })).toBeNull();
  expect(document.activeElement).toBe(toggle);
});

test('the drawer closes when the layout it belongs to ends', () => {
  const media = installMedia(true);
  try {
    render(<Console />);
    fireEvent.click(screen.getByRole('button', { name: 'Sections' }));
    expect(screen.getByRole('dialog', { name: 'Sections' })).toBeDefined();

    // Still narrow: a change that keeps the layout changes nothing.
    media.set(true);
    expect(screen.getByRole('dialog', { name: 'Sections' })).toBeDefined();

    // Past the breakpoint the rail is the page's column again rather than a
    // modal over it, and a tablet turned to landscape is exactly this.
    media.set(false);
    expect(screen.queryByRole('dialog', { name: 'Sections' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeDefined();
  } finally {
    media.restore();
  }
});

test('an open rail is painted one step above its own veil', () => {
  const { container } = render(<Console />);
  const shell = container.firstElementChild as HTMLElement;
  expect(shell.style.getPropertyValue('--crewlet-app-shell-drawer-z')).toBe('');

  fireEvent.click(screen.getByRole('button', { name: 'Sections' }));
  const veil = document.querySelector<HTMLElement>('.crewlet-app-shell__veil')!;
  // The veil's place comes from the layer stack, by DEPTH, so it is not a
  // constant the stylesheet could hold: a drawer opened over something else
  // sits higher than one opened from the page. The rail reads it and adds one.
  expect(veil.style.zIndex).not.toBe('');
  expect(shell.style.getPropertyValue('--crewlet-app-shell-drawer-z')).toBe(veil.style.zIndex);

  press('Escape');
  expect(shell.style.getPropertyValue('--crewlet-app-shell-drawer-z')).toBe('');
});

test('the shell reports the layout and the scroller to what is inside it', () => {
  const media = installMedia(true);
  function Probe() {
    const { narrow, scroller, drawerOpen, openDrawer, closeDrawer } = useAppShell();
    return (
      <div>
        <p>narrow: {String(narrow)}</p>
        <p>open: {String(drawerOpen)}</p>
        <p>scroller: {scroller?.tagName ?? 'none'}</p>
        <button onClick={openDrawer}>Open the rail</button>
        <button onClick={closeDrawer}>Close the rail</button>
      </div>
    );
  }
  try {
    render(
      <AppShell sidebar={<Rail />} topbar={<AppShell.Topbar title="Overview" />}>
        <Probe />
      </AppShell>,
    );
    expect(screen.getByText('narrow: true')).toBeDefined();
    // The one scroll container, which is what a router restores a position on.
    expect(screen.getByText('scroller: MAIN')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Open the rail' }));
    expect(screen.getByText('open: true')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close the rail' }));
    expect(screen.getByText('open: false')).toBeDefined();
  } finally {
    media.restore();
  }
});

test('the scroller is handed to a ref the application owns', () => {
  const seen: (HTMLElement | null)[] = [];
  render(
    <AppShell topbar={<AppShell.Topbar title="Overview" />} mainId="screen-scroll" mainRef={(el) => void seen.push(el)}>
      <p>screen</p>
    </AppShell>,
  );
  expect(seen.at(-1)).toBe(document.getElementById('screen-scroll'));
});

test('a shell with no rail draws no control for one', () => {
  render(
    <AppShell topbar={<AppShell.Topbar title="Overview" />}>
      <p>screen</p>
    </AppShell>,
  );
  expect(screen.queryByRole('button', { name: 'Sections' })).toBeNull();
  expect(screen.queryByRole('complementary')).toBeNull();
});

/**
 * Every rule in a stylesheet, with the at-rule it sits inside.
 *
 * Small enough to write out because a plain rule in this file holds no nested
 * rule: a `{` after a selector runs to the next `}`, and only an `@` block
 * pushes a level. The path Vite does NOT rewrite is the one used to reach the
 * file, `fileURLToPath(import.meta.url)`; `new URL('./x', import.meta.url)`
 * becomes an asset reference and answers with a dev-server URL.
 */
function cssRules(css: string): { at: string; selector: string; body: string }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found: { at: string; selector: string; body: string }[] = [];
  const at: string[] = [];
  let head = '';
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '{') {
      const selector = head.trim();
      head = '';
      index += 1;
      if (selector.startsWith('@')) {
        at.push(selector);
        continue;
      }
      const end = text.indexOf('}', index);
      found.push({ at: at.join(' '), selector, body: text.slice(index, end) });
      index = end + 1;
      continue;
    }
    if (character === '}') {
      at.pop();
      head = '';
      index += 1;
      continue;
    }
    head += character;
    index += 1;
  }
  return found;
}

/** The properties a rule body sets, lower-cased. */
function properties(body: string): Set<string> {
  return new Set(
    body
      .split(';')
      .map((declaration) => declaration.split(':')[0]?.trim().toLowerCase() ?? '')
      .filter((property) => property.length > 0),
  );
}

test('nothing the open rail declares can outrank the layout it is drawn in', () => {
  /*
   * The one cascade trap in this file, held over the file itself because the
   * suite runs in jsdom, which computes no layout and resolves no stylesheet
   * a component imports.
   *
   * `.crewlet-app-shell__rail[data-open='true']` is an attribute selector and
   * outranks the plain `.crewlet-app-shell__rail` the narrow block
   * re-declares, so any property the unconditional rule sets wins inside that
   * block as well. A `position: relative` there (which the rule briefly
   * carried, to make z-index bite) therefore beat the narrow layout's
   * `position: fixed`, and the open drawer left the fixed layer to become a
   * grid item, taking the whole column and pushing the application into the
   * next row. It is the exact failure the veil's own comment describes, in the
   * one state the drawer exists for.
   */
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AppShell.css'), 'utf8');
  const rules = cssRules(css);
  const open = rules.filter((rule) => rule.at === '' && rule.selector === ".crewlet-app-shell__rail[data-open='true']");
  const narrow = rules.filter((rule) => rule.at.startsWith('@media (max-width') && rule.selector === '.crewlet-app-shell__rail');
  // A reading that found neither rule would pass the assertion below for any
  // stylesheet at all.
  expect(open).toHaveLength(1);
  expect(narrow).toHaveLength(1);
  const narrowProperties = properties(narrow[0]?.body ?? '');
  expect([...properties(open[0]?.body ?? '')].filter((property) => narrowProperties.has(property))).toEqual([]);
});

test('the shell has no accessibility violations, with the drawer open or closed', async () => {
  const view = render(<Console />);
  const closed = await axe.run(view.container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(closed.violations.map((violation) => violation.id)).toEqual([]);

  fireEvent.click(screen.getByRole('button', { name: 'Sections' }));
  const open = await axe.run(view.container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(open.violations.map((violation) => violation.id)).toEqual([]);
});

/**
 * The rail's foot, and the one vertical line the whole rail is built on.
 *
 * The geometry is in two parts on purpose: the gutter insets the rail, which
 * is where a row's background begins, and the row pad insets the content
 * inside the row. Two files spend those two tokens, this one and
 * SidebarNav.css, and if they ever spend different ones the foot's mark stops
 * landing on the line every nav glyph sits on. Nothing else compares them.
 */
describe("the rail's foot", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'AppShell.css'), 'utf8');
  const nav = readFileSync(resolve(here, '../SidebarNav/SidebarNav.css'), 'utf8');

  /**
   * The body of the rule this selector is in, whether it is alone in the
   * selector list or one name in it: the foot's own row and a control dropped
   * into the foot are ONE rule, which is the point of them.
   */
  function body(sheet: string, selector: string): string {
    const escaped = selector.replace(/[.[\]()^$*+?|\\]/g, '\\$&');
    const rule = new RegExp(`${escaped}(?:\\s*,[^{}]*)?\\s*\\{([^}]*)\\}`).exec(sheet);
    if (!rule) throw new Error(`no rule for ${selector}`);
    return rule[1] ?? '';
  }

  /** The horizontal half of a rule's `padding` shorthand. */
  function inset(sheet: string, selector: string): string {
    const padding = /(?:^|;|\s)padding:\s*([^;]*)/.exec(body(sheet, selector));
    if (!padding) throw new Error(`${selector} sets no padding`);
    // Not inside a calc(): `calc(var(--spacing-2) - 1px) var(--pad)` is two
    // values, and a naive split on whitespace reads it as four.
    const parts = (padding[1] ?? '').trim().split(/\s+(?![^(]*\))/);
    return (parts.length === 1 ? parts[0] : parts[1]) ?? '';
  }

  test('the foot and the nav take the same gutter, and their rows the same pad', () => {
    expect(inset(css, '.crewlet-app-shell__rail-foot')).toBe('var(--size-nav-gutter)');
    expect(inset(nav, '.crewlet-sidebar-nav')).toBe('var(--size-nav-gutter)');
    expect(inset(css, '.crewlet-app-shell__rail-row')).toBe('var(--size-nav-row-pad)');
    expect(inset(nav, '.crewlet-nav-item__row')).toBe('var(--size-nav-row-pad)');
  });

  test("a foot row's target clears 24px at every density", () => {
    // --size-row-sm is the step that carries the floor, which is the whole
    // reason a status line takes it rather than a height of its own: the
    // engine's own pill had neither, and compact density took it under the
    // size a finger can hit.
    const row = body(css, '.crewlet-app-shell__rail-row');
    expect(row).toContain('min-height: var(--size-row-sm)');
    const tokens = readFileSync(resolve(here, '../../../tokens/dist/css/tokens.css'), 'utf8');
    expect(tokens).toMatch(/--size-row-sm:\s*max\(24px,/);
    // And the same rule is what a control dropped into the foot takes, so the
    // floor cannot hold for one row in the foot and not the other.
    expect(body(css, '.crewlet-app-shell__rail-foot > .crewlet-btn')).toBe(row);
  });

  test('a control dropped into the foot is a row in the rail', () => {
    /*
     * THE SLOT TAKES A CONTROL FROM ANYWHERE. `AppShell.RailRow` is the row
     * this package draws, but an application with a status button of its own
     * reaches for that one, and the engine does: a tertiary Button arrived
     * centred in a 263px rail, on a toolbar's inset, in a toolbar's ink and at
     * a toolbar's weight. The foot claims a direct child instead.
     */
    const row = body(css, '.crewlet-app-shell__rail-foot > .crewlet-btn');
    expect(row).toContain('padding: calc(var(--spacing-2) - 1px) var(--size-nav-row-pad)');
    expect(row).toContain('justify-content: flex-start');
    expect(row).toContain('text-align: left');
    expect(row).toContain('color: var(--color-text-tertiary)');
    expect(row).toContain('font-weight: var(--font-weight-regular)');
    expect(row).toContain('line-height: var(--font-line-height-normal)');
    // It is claimed as a DIRECT child, so the theme and density controls a foot
    // also holds, which sit in a row of their own, keep their own register.
    expect(css).not.toMatch(/\.crewlet-app-shell__rail-foot \.crewlet-btn\b/);
  });

  test('the transparent boundary spends a pixel of the row rather than adding one', () => {
    /*
     * A button carries a transparent border at every variant so a bordered one
     * and a borderless one stand the same height. Left to add to the step, the
     * status line stood 36px beside a 34px row for a border nobody can see.
     */
    const row = body(css, '.crewlet-app-shell__rail-row');
    expect(row).toContain('border: 1px solid transparent');
    expect(row).toContain('padding: calc(var(--spacing-2) - 1px)');
  });

  test('a foot control keeps its ring inside its own box', () => {
    // The shell's root is `overflow: hidden` at exactly the viewport's height,
    // so an outset ring on the last row in the foot is cut off by the window.
    const ring = body(css, '.crewlet-app-shell__rail-foot > .crewlet-btn:focus-visible');
    expect(ring).toContain('outline-offset: var(--size-focus-ring-inset-offset)');
  });

  test('the rail draws no divider under its head', () => {
    // The bar's line belongs to the bar. A second one across the rail at the
    // same height reads as one rule running the width of the window, with the
    // brand and the screen title above it like a second bar.
    const head = /\.crewlet-app-shell__rail-head\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(head).toContain('min-height: var(--crewlet-app-shell-topbar)');
    expect(head).not.toMatch(/border/);
    // The foot's rule is the one rule inside the rail, and it stays.
    expect(/\.crewlet-app-shell__rail-foot\s*\{([^}]*)\}/.exec(css)?.[1]).toContain('border-top');
  });

  test('a foot row is a control only when it does something', () => {
    render(
      <AppShell
        sidebar={
          <AppShell.Rail
            footer={
              <>
                <AppShell.RailRow icon={<span data-mark="dot" />}>engine connected</AppShell.RailRow>
                <AppShell.RailRow label="What this node is running" onClick={() => {}}>
                  engine connected
                </AppShell.RailRow>
              </>
            }
          >
            <p>rows</p>
          </AppShell.Rail>
        }
      >
        <p>screen</p>
      </AppShell>,
    );
    /*
     * ONE CONTROL, NOT TWO. A row the rail merely states is a line of text: a
     * button there puts a tab stop in front of a keyboard reader that does
     * nothing when they press it, which is worse than no affordance at all.
     * Asserted over the rows themselves rather than by name, because a button
     * with no accessible name is exactly what the regression would produce and
     * a query by name would not find it.
     */
    const rows = [...document.querySelectorAll('.crewlet-app-shell__rail-row')];
    expect(rows.map((row) => row.tagName)).toEqual(['DIV', 'BUTTON']);
    expect(screen.getAllByRole('button', { name: 'What this node is running' })).toHaveLength(1);
    // And the mark is decoration, because the words beside it say the same.
    expect(document.querySelector('[data-mark="dot"]')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  test('a foot row that presses has no accessibility violations', async () => {
    const view = render(
      <AppShell
        sidebar={
          <AppShell.Rail
            footer={
              <AppShell.RailRow label="What this node is running" onClick={() => {}} trailing={<span>2 in flight</span>}>
                engine connected
              </AppShell.RailRow>
            }
          >
            <p>rows</p>
          </AppShell.Rail>
        }
      >
        <p>screen</p>
      </AppShell>,
    );
    const result = await axe.run(view.container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
