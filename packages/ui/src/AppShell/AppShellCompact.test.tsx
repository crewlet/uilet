/**
 * The rail folded to its marks: the shape the shell draws, the one fold
 * control and the focus it keeps, the rail's slots in the compact shape, and
 * the mark and the control standing still while the rail folds.
 */

import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import { tabTo } from '../../../../apps/ui-tests/src/keyboard.js';
import { BrandLockup } from '../BrandLockup/index.js';
import { CompactNav, CompactNavGroup, CompactNavItem } from '../CompactNav/index.js';
import { NavItem, SidebarNav } from '../SidebarNav/index.js';
import { StatusDot } from '../StatusDot/index.js';
import { AppShell, useAppShell, type AppShellRailShape } from './index.js';

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
    await user.click(fold);
    expect(changed).toHaveBeenCalledWith('compact');
    expect(root().getAttribute('data-rail')).toBe('compact');
    expect(fold.getAttribute('aria-label') ?? fold.textContent).toContain('Expand the sidebar');
    await user.click(fold);
    expect(changed).toHaveBeenLastCalledWith('full');
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

  test('the field is not drawn, and the status stands at the top of the foot', () => {
    narrowWindow(false);
    render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
    expect(screen.queryByRole('button', { name: 'Ask or jump to' })).toBeNull();
    expect(document.querySelector('.crewlet-app-shell__rail-head .crewlet-app-shell__rail-status')).toBeNull();
    const foot = document.querySelector('.crewlet-app-shell__rail-foot')!;
    expect(foot.firstElementChild?.classList.contains('crewlet-app-shell__rail-status')).toBe(true);
    expect(within(foot as HTMLElement).getByText('Engine serving, 2 alarms')).toBeDefined();
  });

  test("the account is the reader's face, named by who they are, with no controls beside it", () => {
    narrowWindow(false);
    render(<AppShell rail="compact" sidebar={<FullRail />}>screen</AppShell>);
    const me = screen.getByRole('link', { name: 'Miles, miles.crewlet, your account' });
    expect(me.getAttribute('href')).toBe('#/account');
    expect(me.classList.contains('crewlet-account-row__who--compact')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
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

  test('folding is the one rail variable narrowed to the compact column', () => {
    expect(css).toMatch(
      /\.crewlet-app-shell\[data-rail='compact'\] \{\s*--crewlet-app-shell-rail: var\(--size-shell-rail-compact\);\s*\}/,
    );
  });

  test('the mark and the fold control stand over the compact column’s centre in both shapes', () => {
    narrowWindow(false);
    const uninstall = installSheets('AppShell/AppShell.css', 'BrandLockup/BrandLockup.css');
    try {
      const { unmount } = render(<Shell />);
      const centre = 76 / 2;
      const fold = document.querySelector<HTMLElement>('.crewlet-app-shell__fold')!;
      expect(px(fold, 'left') + 26 / 2).toBe(centre);
      const brand = document.querySelector<HTMLElement>('.crewlet-brand')!;
      expect(px(brand, 'padding-left') + 24 / 2).toBe(centre);
      // Full, the field starts a step after the control.
      const search = document.querySelector<HTMLElement>('.crewlet-app-shell__rail-search')!;
      expect(px(search, 'padding-left')).toBe(centre + 26 / 2 + 8);
      unmount();
      render(<Shell initial="compact" />);
      expect(px(document.querySelector<HTMLElement>('.crewlet-app-shell__fold')!, 'left') + 26 / 2).toBe(centre);
      expect(px(document.querySelector<HTMLElement>('.crewlet-brand')!, 'padding-left') + 24 / 2).toBe(centre);
    } finally {
      uninstall();
    }
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
