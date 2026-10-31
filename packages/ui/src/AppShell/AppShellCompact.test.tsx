/**
 * The rail folded to its marks: the shape the shell draws, the one fold
 * control in the rail's corner and the focus it keeps, the rail's slots in
 * the compact shape, the mark and the control standing still while the rail
 * folds, and the order in which a fold draws the two shapes.
 */

import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useState, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MinusGlyph, PlusGlyph } from '@crewlethq/icons/glyphs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { BrandLockup } from '../BrandLockup/index.js';
import { CompactNav, CompactNavGroup, CompactNavItem } from '../CompactNav/index.js';
import { NavItem, SidebarNav } from '../SidebarNav/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { AppShell, useAppShell, type AppShellRailShape } from './index.js';
import { RAIL_FADE_ANIMATION, RAIL_SETTLE_ANIMATION, transitionMs } from './railMotion.js';

const restorers: (() => void)[] = [];

afterEach(() => {
  cleanup();
  while (restorers.length > 0) restorers.pop()?.();
  vi.useRealTimers();
});

/** Answers the shell's one question, whether the window is under the shell step. */
function narrowWindow(narrow: boolean): void {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: narrow,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  restorers.push(() => {
    if (had) Object.defineProperty(globalThis, 'matchMedia', had);
    else delete (globalThis as Record<string, unknown>).matchMedia;
  });
}

const root = () => document.querySelector<HTMLElement>('.crewlet-app-shell')!;

/** The places, ONE LIST, drawn in whichever shape the shell says. */
function Places() {
  const { rail } = useAppShell();
  return rail === 'compact' ? (
    <CompactNav label="Navigation">
      <CompactNavItem label="Home" icon={<svg />} href="#/home" current />
      <CompactNavGroup label="Company" icon={<svg />} links={[{ key: 'org', label: 'Org chart', icon: <svg />, href: '#/org' }]} />
    </CompactNav>
  ) : (
    <SidebarNav label="Navigation">
      <NavItem label="Home" icon={<svg />} href="#/home" current />
      <NavItem label="Org chart" icon={<svg />} href="#/org" />
    </SidebarNav>
  );
}

/**
 * An application that draws a DIFFERENT element tree for each shape, which is
 * the hard case for keeping focus: nothing of its rail survives the change.
 */
function FullRail() {
  return (
    <AppShell.Rail
      header={<BrandLockup name="GoPhrase" href="#/home" mark={<svg />} />}
      search={<button type="button">Ask or jump to</button>}
      status={
        <AppShell.RailStatus icon={<StatusDot tone="success" />} count={{ value: 2, label: 'alarms' }}>
          Engine serving
        </AppShell.RailStatus>
      }
      footer={<AppShell.AccountRow avatar={<svg />} name="Miles" detail="miles.crewlet" href="#/account" actions={<button type="button">Settings</button>} />}
    >
      <Places />
    </AppShell.Rail>
  );
}

function FoldedRail() {
  return (
    <section>
      <FullRail />
    </section>
  );
}

function Shell({
  initial = 'full',
  onRailChange,
  keys,
  children,
}: {
  initial?: AppShellRailShape;
  onRailChange?: (next: AppShellRailShape) => void;
  keys?: readonly string[];
  children?: ReactNode;
}) {
  const [rail, setRail] = useState<AppShellRailShape>(initial);
  return (
    <AppShell
      rail={rail}
      onRailChange={(next) => {
        setRail(next);
        onRailChange?.(next);
      }}
      railFoldKeys={keys}
      sidebar={rail === 'compact' ? <FoldedRail /> : <FullRail />}
      topbar={<AppShell.Topbar title="Chatlet" />}
    >
      {children ?? <p>The screen</p>}
    </AppShell>
  );
}

describe('the shape the shell draws', () => {
  test('full by default, and compact where the host asks for it on a wide window', () => {
    narrowWindow(false);
    const { unmount } = render(<AppShell sidebar={<FullRail />}>screen</AppShell>);
    expect(root().getAttribute('data-rail')).toBe('full');
    unmount();
    render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(screen.queryByRole('link', { name: 'Home' })?.closest('.crewlet-compact-nav')).not.toBeNull();
  });

  test('under the shell step the drawer is the full list, whatever the reader chose', () => {
    narrowWindow(true);
    render(<AppShell rail="compact" onRailChange={() => {}} sidebar={<FullRail />}>screen</AppShell>);
    expect(root().getAttribute('data-rail')).toBe('full');
    expect(screen.getByRole('navigation', { name: 'Navigation' }).classList.contains('crewlet-sidebar-nav')).toBe(true);
    // The drawer has no fold: there is no column to fold it to.
    expect(screen.queryByRole('button', { name: /the sidebar/ })).toBeNull();
  });

  test('a shell with no rail says nothing about one', () => {
    narrowWindow(false);
    render(<AppShell rail="compact">screen</AppShell>);
    expect(root().hasAttribute('data-rail')).toBe(false);
  });
});

describe('the fold control', () => {
  test('drawn only where the host can fold the rail', () => {
    narrowWindow(false);
    render(<AppShell sidebar={<FullRail />}>screen</AppShell>);
    expect(screen.queryByRole('button', { name: /the sidebar/ })).toBeNull();
  });

  test('it is the rail’s first control, and it says what pressing it does', async () => {
    narrowWindow(false);
    const changed = vi.fn();
    const user = userEvent.setup();
    render(<Shell onRailChange={changed} />);
    const rail = screen.getByRole('complementary');
    const fold = within(rail).getByRole('button', { name: 'Collapse the sidebar' });
    expect(within(rail).getAllByRole('button')[0]).toBe(fold);
    expect(fold.getAttribute('aria-controls')).toBe(rail.id);
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    await user.click(fold);
    expect(changed).toHaveBeenCalledWith('compact');
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(fold.getAttribute('aria-label') ?? fold.textContent).toContain('Expand the sidebar');
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    await user.click(fold);
    expect(changed).toHaveBeenLastCalledWith('full');
    expect(fold.getAttribute('aria-expanded')).toBe('true');
  });

  test("it is a minus while the rail is full and a plus while it is compact, the kit's own glyphs", async () => {
    narrowWindow(false);
    const user = userEvent.setup();
    render(<Shell />);
    const fold = screen.getByRole('button', { name: 'Collapse the sidebar' });
    // The drawing inside the glyph, which is what tells a plus from a minus.
    const drawing = (markup: string) => /<svg[^>]*>([\s\S]*)<\/svg>/.exec(markup)?.[1];
    const glyph = () => drawing(fold.querySelector('svg')?.outerHTML ?? '');
    expect(glyph()).toBe(drawing(renderToStaticMarkup(<MinusGlyph size="sm" />)));
    await user.click(fold);
    expect(glyph()).toBe(drawing(renderToStaticMarkup(<PlusGlyph size="sm" />)));
    // No chevron is drawn anywhere in the rail's head: the corner control is
    // the one fold control.
    expect(document.querySelectorAll('.crewlet-app-shell__fold')).toHaveLength(1);
  });

  test('it is one element across the change, so the focus that folded the rail is on the control that unfolds it', async () => {
    narrowWindow(false);
    const user = userEvent.setup();
    render(<Shell />);
    const fold = screen.getByRole('button', { name: 'Collapse the sidebar' });
    fold.focus();
    await user.keyboard('{Enter}');
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(screen.getByRole('button', { name: 'Expand the sidebar' })).toBe(fold);
    expect(document.activeElement).toBe(fold);
    await user.keyboard('{Enter}');
    expect(root().getAttribute('data-rail')).toBe('full');
    expect(document.activeElement).toBe(fold);
  });

  test('it names the keys the application binds, and binds none itself', async () => {
    narrowWindow(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Shell keys={['Mod', '\\']} />);
    const fold = screen.getByRole('button', { name: 'Collapse the sidebar' });
    expect(fold.getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+\\$/);
    // A tooltip opens for keyboard focus, so the control is reached as Tab
    // reaches it.
    tabTo(fold);
    const tip = await screen.findByRole('tooltip');
    expect(tip.textContent).toContain('Collapse the sidebar');
    expect(tip.querySelector('kbd')).not.toBeNull();
    // Pressing the keys does nothing the shell decided.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '\\', ctrlKey: true, metaKey: true }));
    });
    expect(root().getAttribute('data-rail')).toBe('full');
  });

  test('the host can name it in its own words', () => {
    narrowWindow(false);
    render(
      <AppShell
        rail="compact"
        onRailChange={() => {}}
        railFoldLabels={{ collapse: 'Fold the navigation', expand: 'Unfold the navigation' }}
        sidebar={<FullRail />}
      >
        screen
      </AppShell>,
    );
    expect(screen.getByRole('button', { name: 'Unfold the navigation' })).toBeDefined();
  });
});

describe("the rail's slots, compact", () => {
  test('the head holds the mark alone, named and titled by the brand', () => {
    narrowWindow(false);
    const { unmount } = render(<AppShell sidebar={<FullRail />}>screen</AppShell>);
    expect(screen.getByRole('link', { name: 'GoPhrase' }).hasAttribute('title')).toBe(false);
    unmount();
    render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
    expect(screen.getByRole('link', { name: 'GoPhrase' }).getAttribute('title')).toBe('GoPhrase');
  });

  test('the field is not drawn, and the status has a row of its own under the mark, before the places', () => {
    narrowWindow(false);
    render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
    expect(screen.queryByRole('button', { name: 'Ask or jump to' })).toBeNull();
    expect(document.querySelector('.crewlet-app-shell__rail-head .crewlet-app-shell__rail-status')).toBeNull();
    expect(document.querySelector('.crewlet-app-shell__rail-foot .crewlet-app-shell__rail-status')).toBeNull();
    const status = document.querySelector<HTMLElement>('.crewlet-app-shell__rail-status')!;
    expect(status.parentElement?.classList.contains('crewlet-app-shell__rail-inner')).toBe(true);
    expect(status.previousElementSibling?.classList.contains('crewlet-app-shell__rail-head')).toBe(true);
    expect(status.nextElementSibling?.classList.contains('crewlet-app-shell__rail-body')).toBe(true);
    expect(within(status).getByText('Engine serving, 2 alarms')).toBeDefined();
  });

  test('a status that opens a panel keeps its button, its name and its popup there', () => {
    narrowWindow(false);
    render(
      <AppShell
        rail="compact"
        sidebar={
          <AppShell.Rail
            header={<BrandLockup name="GoPhrase" href="#/home" mark={<svg />} />}
            status={
              <AppShell.RailStatus
                icon={<StatusDot tone="success" />}
                count={{ value: 2, label: 'alarms', tone: 'warning' }}
                onClick={() => {}}
                aria-haspopup="dialog"
                aria-expanded={false}
              >
                Engine serving
              </AppShell.RailStatus>
            }
          />
        }
      >
        screen
      </AppShell>,
    );
    const status = screen.getByRole('button', { name: 'Engine serving, 2 alarms' });
    expect(status.classList.contains('crewlet-app-shell__rail-status-mark')).toBe(true);
    expect(status.getAttribute('aria-haspopup')).toBe('dialog');
    expect(status.getAttribute('aria-expanded')).toBe('false');
    expect(status.closest('.crewlet-app-shell__rail-head')).toBeNull();
  });

  test('the status row stands where the fold control stood: under the head, a small control step tall, centred', () => {
    narrowWindow(false);
    const uninstall = installSheets('AppShell/AppShell.css');
    try {
      render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
      const row = document.querySelector<HTMLElement>('.crewlet-app-shell__rail-status')!;
      expect(px(row, 'min-height')).toBe(26);
      expect(getComputedStyle(row).justifyContent).toBe('center');
      expect(px(row, 'margin-right')).toBe(0);
    } finally {
      uninstall();
    }
  });

  test("the account is the reader's face, named by who they are, with no controls beside it", () => {
    narrowWindow(false);
    render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
    const me = screen.getByRole('link', { name: 'Miles, miles.crewlet, your account' });
    expect(me.getAttribute('href')).toBe('#/account');
    expect(me.classList.contains('crewlet-account-row__who--compact')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
  });

  test("the face is centred on the tiles' line: it gives up the full row's badge column and the step after it", () => {
    narrowWindow(false);
    const uninstall = installSheets('AppShell/AppShell.css');
    try {
      const { unmount } = render(<AppShell sidebar={<FullRail />}>screen</AppShell>);
      // Full, the badge stands in a column of its own width.
      expect(getComputedStyle(document.querySelector('.crewlet-account-row__avatar')!).width).toBe('32px');
      unmount();
      render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
      // Compact, the face is its own width, so the box round it is the face
      // and its pad, centred in the foot.
      expect(getComputedStyle(document.querySelector('.crewlet-account-row__avatar')!).width).toBe('auto');
    } finally {
      uninstall();
    }
    // jsdom drops logical properties, so the step after the face is held in
    // the stylesheet's own words.
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AppShell.css'), 'utf8');
    const rule = /\.crewlet-app-shell__rail-foot \.crewlet-account-row--compact \.crewlet-account-row__avatar \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('margin-inline-end: 0;');
    expect(rule).toContain('width: auto;');
  });

  test('an account row asked for in full keeps its words in a compact rail', () => {
    narrowWindow(false);
    render(
      <AppShell
        rail="compact"
        sidebar={<AppShell.Rail footer={<AppShell.AccountRow avatar={<svg />} name="Miles" href="#/account" compact={false} />} />}
      >
        screen
      </AppShell>,
    );
    expect(document.querySelector('.crewlet-account-row__who--compact')).toBeNull();
    expect(screen.getByText('Miles')).toBeDefined();
  });

  test('a compact account that opens a menu is the menu button', async () => {
    narrowWindow(false);
    const user = userEvent.setup();
    render(
      <AppShell
        rail="compact"
        sidebar={
          <AppShell.Rail
            footer={
              <AppShell.AccountRow
                avatar={<svg />}
                name="Miles"
                menu={{ items: [{ key: 'out', label: 'Sign out', onSelect: () => {} }] }}
              />
            }
          />
        }
      >
        screen
      </AppShell>,
    );
    const me = screen.getByRole('button', { name: 'Miles, your account' });
    expect(me.getAttribute('aria-haspopup')).toBe('menu');
    await user.click(me);
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeDefined();
  });

  test('the compact shell has no accessibility violations', async () => {
    narrowWindow(false);
    const view = render(<Shell initial="compact" />);
    const result = await axe.run(view.container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('the geometry', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AppShell.css'), 'utf8');
  /** The declarations of the first rule written for exactly this selector. */
  const rule = (selector: string): string => {
    const at = css.indexOf(`\n${selector} {`);
    return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
  };

  test('folding is the one rail variable narrowed to the compact column', () => {
    expect(css).toMatch(
      /\.crewlet-app-shell\[data-rail='compact'\] \{\s*--crewlet-app-shell-rail: var\(--size-shell-rail-compact\);\s*\}/,
    );
  });

  test('the fold control stands in the top left corner in both shapes, ending before the mark on the column’s centre', () => {
    narrowWindow(false);
    const uninstall = installSheets('AppShell/AppShell.css', 'BrandLockup/BrandLockup.css', 'IconButton/IconButton.css');
    try {
      for (const initial of ['full', 'compact'] as const) {
        const { unmount } = render(<Shell initial={initial} />);
        const fold = document.querySelector<HTMLElement>('.crewlet-app-shell__fold')!;
        const control = fold.querySelector<HTMLElement>('button')!;
        expect(getComputedStyle(fold).position).toBe('absolute');
        expect(px(fold, 'top')).toBe(0);
        expect(px(fold, 'left')).toBe(0);
        // The target floor, so it holds at every density.
        expect(px(control, 'width')).toBe(24);
        expect(px(control, 'height')).toBe(24);
        // The mark stands over the compact column's centre in both shapes,
        // and the control ends short of it.
        const brand = document.querySelector<HTMLElement>('.crewlet-brand')!;
        expect(px(brand, 'padding-left') + 24 / 2).toBe(76 / 2);
        expect(px(fold, 'left') + px(control, 'width')).toBeLessThan(px(brand, 'padding-left'));
        // Its ring is drawn inside its own box: the corner is the window's.
        expect(rule('.crewlet-app-shell__fold > .crewlet-icon-btn:focus-visible')).toContain(
          'outline-offset: var(--size-focus-ring-inset-offset)',
        );
        unmount();
      }
    } finally {
      uninstall();
    }
  });

  test('full, the field keeps the nav’s own columns: nothing stands before it any more', () => {
    narrowWindow(false);
    const uninstall = installSheets('AppShell/AppShell.css');
    try {
      const { unmount } = render(<Shell />);
      const foldable = px(document.querySelector<HTMLElement>('.crewlet-app-shell__rail-search')!, 'padding-left');
      unmount();
      render(<AppShell sidebar={<FullRail />}>screen</AppShell>);
      expect(foldable).toBe(px(document.querySelector<HTMLElement>('.crewlet-app-shell__rail-search')!, 'padding-left'));
      expect(css).not.toMatch(/--foldable\[data-rail='full'\] \.crewlet-app-shell__rail-search/);
    } finally {
      uninstall();
    }
  });

  test('the rail is its own width, and the grid’s first track follows it', () => {
    expect(css).toMatch(/\.crewlet-app-shell \{[^}]*grid-template-columns: auto minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.crewlet-app-shell\[data-aside='column'\] \{\s*grid-template-columns: auto minmax\(0, 1fr\)/);
    // The one rail variable, which the compact shape narrows (above).
    expect(rule('.crewlet-app-shell__rail')).toContain('width: var(--crewlet-app-shell-rail);');
  });

  test('the rail eases its width on the slow step, and its content keeps the width of the shape drawn', () => {
    expect(rule('.crewlet-app-shell__rail')).toContain(
      'transition: width var(--motion-duration-slow) var(--motion-easing-emphasized)',
    );
    // The moving edge clips across only, so no ring or badge is cut at a
    // row's top or bottom.
    expect(rule('.crewlet-app-shell__rail')).toContain('overflow-x: clip;');
    expect(rule('.crewlet-app-shell__rail')).not.toMatch(/overflow(-y)?: (hidden|clip)/);
    // The content takes the same variable, which names the shape DRAWN, so a
    // fold that keeps the full rail drawn keeps it at the full rail's width.
    expect(rule('.crewlet-app-shell__rail-inner')).toContain('width: var(--crewlet-app-shell-rail);');
    // The drawer never changes shape, and fills a window narrower than it.
    const narrow = css.slice(css.indexOf('@media (width < 1024px)'));
    expect(narrow).toMatch(/\.crewlet-app-shell__rail-inner \{\s*width: auto;/);
  });

  test('folding narrows the rail to the compact column while the full rail is still drawn', () => {
    expect(rule(".crewlet-app-shell[data-rail-motion='fold'] > .crewlet-app-shell__rail")).toContain(
      'width: var(--size-shell-rail-compact)',
    );
  });

  test('every fade has its stop under reduced motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const motion of ['fold', 'unfold', 'folded']) {
      for (const part of ['rail-body', 'rail-foot', 'rail-status']) {
        expect(reduced).toContain(`.crewlet-app-shell[data-rail-motion='${motion}'] .crewlet-app-shell__${part}`);
      }
    }
    expect(css).toContain(`@keyframes ${RAIL_FADE_ANIMATION}`);
    expect(css).toContain(`@keyframes ${RAIL_SETTLE_ANIMATION}`);
  });

  test('the rail is the fold control’s containing block wide, and the drawer’s fixed layer narrow', () => {
    // The base rule positions the rail for the control; the narrow block, at
    // the same weight and later, puts it back on the fixed layer.
    const base = /\.crewlet-app-shell__rail \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(base).toContain('position: relative;');
    const narrow = css.slice(css.indexOf('@media (width < 1024px)'));
    expect(/\.crewlet-app-shell__rail \{[^}]*position: fixed;/.test(narrow)).toBe(true);
  });
});

describe('a flush screen', () => {
  test('fill="flush" is a fill screen whose column runs edge to edge', () => {
    narrowWindow(false);
    render(
      <AppShell fill="flush" sidebar={<FullRail />}>
        screen
      </AppShell>,
    );
    expect(root().classList.contains('crewlet-app-shell--fill')).toBe(true);
    expect(root().classList.contains('crewlet-app-shell--fill-flush')).toBe(true);
  });

  test('its column gives up its pad, measure and gap, and anchors a layer host', () => {
    narrowWindow(false);
    const uninstall = installSheets('AppShell/AppShell.css');
    try {
      render(
        <AppShell fill="flush" sidebar={<FullRail />}>
          screen
        </AppShell>,
      );
      const column = document.querySelector<HTMLElement>('.crewlet-app-shell__content')!;
      expect(px(column, 'padding-left')).toBe(0);
      expect(px(column, 'padding-bottom')).toBe(0);
      expect(getComputedStyle(column).position).toBe('relative');
      expect(getComputedStyle(column).maxWidth).toBe('none');
    } finally {
      uninstall();
    }
  });
});

describe("the rail's motion", () => {
  /**
   * Gives the rail the transition the stylesheet gives it, which jsdom never
   * computes: the shell reads the rail's own transition to know how long a
   * change of shape takes, and reads none here otherwise.
   */
  function railTransition(duration: string, property = 'width'): void {
    const original = globalThis.getComputedStyle.bind(globalThis);
    const spy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element, pseudo) => {
      const style = original(element, pseudo);
      if (!(element instanceof HTMLElement) || !element.classList.contains('crewlet-app-shell__rail')) return style;
      const stub: Record<string, string> = { transitionDuration: duration, transitionDelay: '0s', transitionProperty: property };
      return new Proxy(style, {
        get: (target, key) => {
          if (typeof key === 'string' && key in stub) return stub[key];
          const value: unknown = Reflect.get(target, key);
          return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
        },
      });
    });
    restorers.push(() => spy.mockRestore());
  }

  /** The end of an animation or a transition, as the browser reports it. */
  function ended(target: Element, type: 'animationend' | 'transitionend', detail: Record<string, string>): void {
    const event = new Event(type, { bubbles: true });
    for (const [key, value] of Object.entries(detail)) Object.defineProperty(event, key, { value });
    act(() => {
      target.dispatchEvent(event);
    });
  }

  const motion = () => root().getAttribute('data-rail-motion');
  const drawnNav = () => screen.getByRole('navigation', { name: 'Navigation' }).className;
  const press = () => {
    act(() => {
      document.querySelector<HTMLButtonElement>('.crewlet-app-shell__fold button')!.click();
    });
  };

  test('with nothing to animate, the new shape is drawn at once', () => {
    narrowWindow(false);
    render(<Shell />);
    press();
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(motion()).toBeNull();
    expect(drawnNav()).toContain('crewlet-compact-nav');
  });

  test('under a reduced-motion baseline nothing moves: a transition to none is no transition', () => {
    narrowWindow(false);
    railTransition('1e-05s', 'none');
    render(<Shell />);
    press();
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(motion()).toBeNull();
  });

  test('folding keeps the full rail drawn until its words have faded, then fades the compact column in', () => {
    narrowWindow(false);
    vi.useFakeTimers();
    railTransition('0.3s');
    render(<Shell />);
    press();
    expect(motion()).toBe('fold');
    expect(root().getAttribute('data-rail')).toBe('full');
    expect(drawnNav()).toContain('crewlet-sidebar-nav');
    // The control says the CHOSEN shape at once: it already offers to unfold.
    const fold = screen.getByRole('button', { name: 'Expand the sidebar' });
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    const body = document.querySelector('.crewlet-app-shell__rail-body')!;
    // Another animation ending inside the rail is not the fade.
    ended(body, 'animationend', { animationName: 'crewlet-status-dot-pulse' });
    expect(motion()).toBe('fold');
    ended(body, 'animationend', { animationName: RAIL_FADE_ANIMATION });
    expect(motion()).toBe('folded');
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(drawnNav()).toContain('crewlet-compact-nav');
    ended(document.querySelector('.crewlet-app-shell__rail-body')!, 'animationend', { animationName: RAIL_SETTLE_ANIMATION });
    expect(motion()).toBeNull();
    // Focus and identity are the control's throughout.
    expect(screen.getByRole('button', { name: 'Expand the sidebar' })).toBe(fold);
  });

  test("unfolding draws the full rail at once and ends when the rail's own width stops", () => {
    narrowWindow(false);
    vi.useFakeTimers();
    railTransition('0.3s');
    render(<Shell initial="compact" />);
    press();
    expect(motion()).toBe('unfold');
    expect(root().getAttribute('data-rail')).toBe('full');
    expect(drawnNav()).toContain('crewlet-sidebar-nav');
    const rail = document.querySelector('.crewlet-app-shell__rail')!;
    // A row's own transition, and another property of the rail, end nothing.
    ended(document.querySelector('.crewlet-nav-item__row')!, 'transitionend', { propertyName: 'width' });
    ended(rail, 'transitionend', { propertyName: 'background-color' });
    expect(motion()).toBe('unfold');
    ended(rail, 'transitionend', { propertyName: 'width' });
    expect(motion()).toBeNull();
  });

  test('the clock ends a phase no event reports, as long as the rail’s own transition', () => {
    narrowWindow(false);
    vi.useFakeTimers();
    railTransition('300ms');
    render(<Shell />);
    press();
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(motion()).toBe('fold');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(motion()).toBe('folded');
    expect(root().getAttribute('data-rail')).toBe('compact');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(motion()).toBeNull();
  });

  test('a press during a fold unfolds, and the fold that was under way ends nothing', () => {
    narrowWindow(false);
    vi.useFakeTimers();
    railTransition('0.3s');
    render(<Shell />);
    press();
    expect(motion()).toBe('fold');
    press();
    expect(motion()).toBe('unfold');
    expect(root().getAttribute('data-rail')).toBe('full');
    ended(document.querySelector('.crewlet-app-shell__rail-body')!, 'animationend', { animationName: RAIL_FADE_ANIMATION });
    expect(motion()).toBe('unfold');
    expect(root().getAttribute('data-rail')).toBe('full');
  });

  test('a shape that changes with the window crossing into the wide layout is drawn at once', () => {
    let narrow = true;
    const listeners = new Set<() => void>();
    const had = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        get matches() {
          return narrow;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    restorers.push(() => {
      if (had) Object.defineProperty(globalThis, 'matchMedia', had);
      else delete (globalThis as Record<string, unknown>).matchMedia;
    });
    railTransition('0.3s');
    render(
      <AppShell rail="compact" onRailChange={() => {}} sidebar={<FullRail />}>
        screen
      </AppShell>,
    );
    expect(root().getAttribute('data-rail')).toBe('full');
    narrow = false;
    act(() => {
      for (const listener of listeners) listener();
    });
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(motion()).toBeNull();
  });

  test('the length of a change is the rail’s longest transition, in whole ms', () => {
    const element = document.createElement('div');
    const cases: [duration: string, delay: string, property: string, ms: number][] = [
      ['0.3s', '0s', 'width', 300],
      ['120ms, 0.3s', '0s', 'opacity, width', 300],
      ['0.2s', '0.1s', 'width', 300],
      ['0.3s, 0.2s', '0s', 'none, width', 200],
      // The document baseline's way of stopping motion.
      ['1e-05s', '0s', 'none', 0],
      ['1e-05s', '0s', 'width', 0],
      // jsdom, or no stylesheet at all.
      ['', '', '', 0],
    ];
    for (const [transitionDuration, transitionDelay, transitionProperty, ms] of cases) {
      const spy = vi
        .spyOn(globalThis, 'getComputedStyle')
        .mockReturnValue({ transitionDuration, transitionDelay, transitionProperty } as CSSStyleDeclaration);
      expect(transitionMs(element), `${transitionProperty} over ${transitionDuration} after ${transitionDelay}`).toBe(ms);
      spy.mockRestore();
    }
  });
});
