/**
 * The compact rail: its tiles, what they say, the folded group's flyout and
 * the keys that walk it, and the figures that ride the tiles.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';
import {
  CompactNav,
  CompactNavGroup,
  CompactNavItem,
  CompactNavSeparator,
  groupBadge,
  placeFlyout,
  type CompactNavLink,
} from './index.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const COMPANY: CompactNavLink[] = [
  { key: 'principles', label: 'Principles', icon: <svg />, href: '#/company/principles' },
  { key: 'org', label: 'Org chart', icon: <svg />, href: '#/company/org', current: true },
  { key: 'budgets', label: 'Budgets', icon: <svg />, href: '#/company/budgets', locked: 'Needs Admin access' },
];

const WORKSPACE: CompactNavLink[] = [
  { key: 'worklet', label: 'Worklet', icon: <svg />, href: '#/worklet', count: { value: 23, label: 'open' } },
  { key: 'chatlet', label: 'Chatlet', icon: <svg />, href: '#/chatlet', badge: { value: 3, label: 'unread' } },
  { key: 'doclet', label: 'Doclet', icon: <svg />, href: '#/doclet', badge: { value: '50+', label: 'to review' } },
];

function Rail({ onSearch = () => {} }: { onSearch?: () => void }) {
  return (
    <>
      <a href="#/before">Before</a>
      <CompactNav label="Navigation">
        <CompactNavItem label="Search" icon={<svg />} keyshortcuts="Meta+K Control+K" onClick={onSearch} />
        <CompactNavItem label="Home" icon={<svg />} href="#/home" />
        <CompactNavItem label="Inbox" icon={<svg />} href="#/inbox" badge={{ value: 5, label: 'unread' }} />
        <CompactNavItem label="My work" icon={<svg />} href="#/me" count={{ value: 23, label: 'open' }} />
        <CompactNavSeparator label="Company and Workspace" />
        <CompactNavGroup label="Company" icon={<svg />} links={COMPANY} />
        <CompactNavGroup label="Workspace" icon={<svg />} links={WORKSPACE} />
      </CompactNav>
      <a href="#/after">After</a>
    </>
  );
}

describe('a tile', () => {
  test('a place is a link named by its words and its figure, and the current one says so', () => {
    render(
      <CompactNav label="Navigation">
        <CompactNavItem label="Inbox" icon={<svg />} href="#/inbox" current badge={{ value: 5, label: 'unread' }} />
        <CompactNavItem label="My work" icon={<svg />} href="#/me" count={{ value: 23, label: 'open' }} />
      </CompactNav>,
    );
    const nav = screen.getByRole('navigation', { name: 'Navigation' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2);
    const inbox = screen.getByRole('link', { name: 'Inbox, 5 unread' });
    expect(inbox.getAttribute('href')).toBe('#/inbox');
    expect(inbox.getAttribute('aria-current')).toBe('page');
    // The name under the tile is the narrowest line in the rail: the title is
    // where it is read whole, with its figure.
    expect(inbox.getAttribute('title')).toBe('Inbox, 5 unread');
    const mine = screen.getByRole('link', { name: 'My work, 23 open' });
    expect(mine.hasAttribute('aria-current')).toBe(false);
  });

  test('the figure is drawn on the tile, once, and hidden from assistive technology', () => {
    render(
      <CompactNav label="Navigation">
        <CompactNavItem label="Inbox" icon={<svg />} href="#/inbox" badge={{ value: 5, label: 'unread' }} />
        <CompactNavItem label="My work" icon={<svg />} href="#/me" count={{ value: 23, label: 'open' }} />
      </CompactNav>,
    );
    const badge = screen.getByRole('link', { name: 'Inbox, 5 unread' }).querySelector('.crewlet-compact-nav__figure')!;
    expect(badge?.textContent).toBe('5');
    expect(badge.classList.contains('crewlet-compact-nav__figure--badge')).toBe(true);
    expect(badge.closest('[aria-hidden]')).not.toBeNull();
    const count = screen.getByRole('link', { name: 'My work, 23 open' }).querySelector('.crewlet-compact-nav__figure')!;
    expect(count?.textContent).toBe('23');
    expect(count.classList.contains('crewlet-compact-nav__figure--badge')).toBe(false);
  });

  test("a badge is one pill on every tile: the reader's own work carries the inbox's", () => {
    render(
      <CompactNav label="Navigation">
        <CompactNavItem label="Inbox" icon={<svg />} href="#/inbox" badge={{ value: '50+', label: 'unread' }} />
        <CompactNavItem label="My work" icon={<svg />} href="#/me" badge={{ value: 23, label: 'open, assigned to you' }} />
      </CompactNav>,
    );
    const figure = (name: string) => screen.getByRole('link', { name }).querySelector('.crewlet-compact-nav__figure')!;
    const inbox = figure('Inbox, 50+ unread');
    const mine = figure('My work, 23 open, assigned to you');
    expect(mine.textContent).toBe('23');
    expect(mine.className).toBe(inbox.className);
    expect(mine.classList.contains('crewlet-compact-nav__figure--badge')).toBe(true);
  });

  test('without a destination it is a button, with its shortcut, and a press runs it', async () => {
    const onSearch = vi.fn();
    render(<Rail onSearch={onSearch} />);
    const search = screen.getByRole('button', { name: 'Search' });
    expect(search.getAttribute('aria-keyshortcuts')).toBe('Meta+K Control+K');
    await userEvent.click(search);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  test('a locked place stays a link, says why after its name, and carries the reason in its title', () => {
    render(
      <CompactNav label="Account">
        <CompactNavItem label="Settings" icon={<svg />} href="#/settings" locked="Needs Admin access" />
      </CompactNav>,
    );
    const settings = screen.getByRole('link', { name: 'Settings, Needs Admin access' });
    expect(settings.getAttribute('title')).toBe('Settings. Needs Admin access');
    expect(settings.classList.contains('crewlet-compact-nav__item--locked')).toBe(true);
  });

  test("a router's link draws the element, with the tile's class, state and prefetch", () => {
    const onPrefetch = vi.fn();
    render(
      <CompactNav label="Navigation">
        <CompactNavItem
          label="Home"
          icon={<svg />}
          href="#/home"
          current
          onPrefetch={onPrefetch}
          renderLink={({ children, ...props }) => (
            <a {...props} data-router="">
              {children}
            </a>
          )}
        />
      </CompactNav>,
    );
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home.hasAttribute('data-router')).toBe(true);
    expect(home.classList.contains('crewlet-compact-nav__item')).toBe(true);
    expect(home.getAttribute('aria-current')).toBe('page');
    fireEvent.focus(home);
    expect(onPrefetch).toHaveBeenCalled();
  });

  test('a separator parts the column and says what it parts', () => {
    render(<Rail />);
    expect(screen.getByRole('separator', { name: 'Company and Workspace' }).isConnected).toBe(true);
  });
});

describe("a folded group's figure", () => {
  test('one badge is drawn as it is, and several are added up', () => {
    expect(groupBadge([{}, { badge: { value: 3, label: 'unread' } }])).toBe(3);
    expect(groupBadge([{ badge: { value: 3, label: 'unread' } }, { badge: { value: 4, label: 'new' } }])).toBe(7);
    expect(groupBadge([{ badge: { value: '50+', label: 'unread' } }, { badge: { value: 3, label: 'new' } }])).toBe('53+');
    expect(groupBadge([{ badge: { value: '1,200', label: 'unread' } }, { badge: { value: 3, label: 'new' } }])).toBe(1203);
    expect(groupBadge([{ badge: { value: 'new', label: 'item' } }, { badge: { value: 3, label: 'new' } }])).toBe('new+');
  });

  test('quiet counts are not carried, and nothing waiting is no figure', () => {
    expect(groupBadge([{}, {}])).toBeUndefined();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    expect(company.querySelector('.crewlet-compact-nav__figure')).toBeNull();
  });

  test("the tile draws the sum and says each place's badge in words", () => {
    render(<Rail />);
    const workspace = screen.getByRole('button', { name: 'Workspace, Chatlet 3 unread, Doclet 50+ to review' });
    const figure = workspace.querySelector('.crewlet-compact-nav__figure')!;
    expect(figure?.textContent).toBe('53+');
    expect(figure.classList.contains('crewlet-compact-nav__figure--badge')).toBe(true);
  });
});

describe('where a flyout stands', () => {
  const bounds = { x: 4, y: 4, width: 1192, height: 792 };

  test('beside the rail, its first place level with the tile', () => {
    const tile = { x: 20, y: 300, width: 36, height: 26 };
    expect(placeFlyout(tile, 76, { width: 208, height: 200 }, bounds, 30)).toEqual({ left: 80, top: 270 });
  });

  test('slid back inside the window near its foot, and never above its top', () => {
    const low = { x: 20, y: 760, width: 36, height: 26 };
    expect(placeFlyout(low, 76, { width: 208, height: 200 }, bounds, 30).top).toBe(596);
    const high = { x: 20, y: 10, width: 36, height: 26 };
    expect(placeFlyout(high, 76, { width: 208, height: 200 }, bounds, 30).top).toBe(4);
  });
});

describe('a folded group', () => {
  test('the tile is a menu button, current while one of its places is', () => {
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    expect(company.getAttribute('aria-haspopup')).toBe('menu');
    expect(company.getAttribute('aria-expanded')).toBe('false');
    expect(company.hasAttribute('aria-controls')).toBe(false);
    // The tile is not the page, so it is current as `true`.
    expect(company.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: /^Workspace/ }).hasAttribute('aria-current')).toBe(false);
  });

  test('Right opens it with focus on the first place; Down and Up walk it, wrapping', async () => {
    const user = userEvent.setup();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    company.focus();
    await user.keyboard('{ArrowRight}');
    const menu = screen.getByRole('menu', { name: 'Company' });
    expect(company.getAttribute('aria-expanded')).toBe('true');
    expect(company.getAttribute('aria-controls')).toBe(menu.id);
    const places = within(menu).getAllByRole('menuitem');
    expect(places.map((place) => place.textContent)).toEqual(['Principles', 'Org chart', 'Budgets, Needs Admin access']);
    expect(document.activeElement).toBe(places[0]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(places[1]);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(document.activeElement).toBe(places[2]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(places[0]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(places[2]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(places[0]);
  });

  test('its places are real links that say where the reader is and why one is closed', async () => {
    const user = userEvent.setup();
    render(<Rail />);
    screen.getByRole('button', { name: 'Company' }).focus();
    await user.keyboard('{ArrowRight}');
    const menu = screen.getByRole('menu', { name: 'Company' });
    const org = within(menu).getByRole('menuitem', { name: 'Org chart' });
    expect(org.tagName).toBe('A');
    expect(org.getAttribute('href')).toBe('#/company/org');
    expect(org.getAttribute('aria-current')).toBe('page');
    expect(within(menu).getByRole('menuitem', { name: 'Budgets, Needs Admin access' }).getAttribute('tabindex')).toBe('-1');
  });

  test("a place's figure is drawn at its end and read after its name", async () => {
    const user = userEvent.setup();
    render(<Rail />);
    screen.getByRole('button', { name: /^Workspace/ }).focus();
    await user.keyboard('{ArrowRight}');
    const menu = screen.getByRole('menu', { name: 'Workspace' });
    const chatlet = within(menu).getByRole('menuitem', { name: 'Chatlet, 3 unread' });
    expect(chatlet.querySelector('.crewlet-compact-nav__link-figure--badge')?.textContent).toBe('3');
    const worklet = within(menu).getByRole('menuitem', { name: 'Worklet, 23 open' });
    const count = worklet.querySelector('.crewlet-compact-nav__link-figure')!;
    expect(count?.textContent).toBe('23');
    expect(count.classList.contains('crewlet-compact-nav__link-figure--badge')).toBe(false);
  });

  test('Escape and Left close it and hand focus back to the tile', async () => {
    const user = userEvent.setup();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    company.focus();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(company);
    expect(company.getAttribute('aria-expanded')).toBe('false');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('menu', { name: 'Company' }).isConnected).toBe(true);
    await user.keyboard('{ArrowLeft}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(company);
  });

  test('Tab closes it and moves on from the tile, as if the flyout sat right after it', async () => {
    const user = userEvent.setup();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    company.focus();
    await user.keyboard('{ArrowRight}');
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Workspace/ }));
  });

  test('Enter on the tile opens it on its first place', async () => {
    const user = userEvent.setup();
    render(<Rail />);
    screen.getByRole('button', { name: 'Company' }).focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(within(screen.getByRole('menu', { name: 'Company' })).getAllByRole('menuitem')[0]);
  });

  test('a press opens it without taking focus off the tile; a second press and a press outside close it', async () => {
    const user = userEvent.setup();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    await user.click(company);
    expect(screen.getByRole('menu', { name: 'Company' }).isConnected).toBe(true);
    expect(document.activeElement).toBe(company);
    await user.click(company);
    expect(screen.queryByRole('menu')).toBeNull();
    await user.click(company);
    await user.click(screen.getByRole('link', { name: 'Before' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('choosing a place runs it and closes the flyout, handing a keyboard reader back to the tile', async () => {
    const user = userEvent.setup();
    const chosen = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <CompactNav label="Navigation">
        <CompactNavGroup
          label="Company"
          icon={<svg />}
          links={[{ key: 'org', label: 'Org chart', icon: <svg />, href: '#/company/org', onClick: chosen }]}
        />
      </CompactNav>,
    );
    const company = screen.getByRole('button', { name: 'Company' });
    company.focus();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Enter}');
    expect(chosen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(company);
  });

  test('the pointer resting on the tile opens it after a moment, and leaving both closes it', () => {
    vi.useFakeTimers();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    fireEvent.pointerEnter(company, { pointerType: 'mouse' });
    expect(screen.queryByRole('menu')).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    const menu = screen.getByRole('menu', { name: 'Company' });
    // Opened by the pointer, it does not take focus from where the reader is.
    expect(document.activeElement).not.toBe(company);
    fireEvent.pointerLeave(company, { pointerType: 'mouse' });
    fireEvent.pointerEnter(menu, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('menu', { name: 'Company' }).isConnected).toBe(true);
    fireEvent.pointerLeave(menu, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('a press on a tile the pointer opened keeps it open until it is dismissed', () => {
    vi.useFakeTimers();
    render(<Rail />);
    const company = screen.getByRole('button', { name: 'Company' });
    fireEvent.pointerEnter(company, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(150));
    fireEvent.click(company, { detail: 1 });
    fireEvent.pointerLeave(company, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('menu', { name: 'Company' }).isConnected).toBe(true);
  });

  test('a touch does not open it on the way to a press', () => {
    vi.useFakeTimers();
    render(<Rail />);
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Company' }), { pointerType: 'touch' });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('accessibility', () => {
  const RULES = {
    runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    resultTypes: ['violations' as const],
  };

  test('the rail has no violations, closed or with a flyout open', async () => {
    const user = userEvent.setup();
    const view = render(<Rail />);
    const closed = await axe.run(view.container, RULES);
    expect(closed.violations.map((violation) => violation.id)).toEqual([]);
    screen.getByRole('button', { name: 'Company' }).focus();
    await user.keyboard('{ArrowRight}');
    const open = await axe.run(document.body, RULES);
    expect(open.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('the stylesheet', () => {
  test('a figure is the one count badge the chrome draws: 16px', () => {
    const uninstall = installSheets('CompactNav/CompactNav.css');
    try {
      render(<Rail />);
      const figure = screen.getByRole('link', { name: 'Inbox, 5 unread' }).querySelector('.crewlet-compact-nav__figure')!;
      expect(px(figure, 'min-width')).toBe(16);
      expect(px(figure, 'height')).toBe(16);
    } finally {
      uninstall();
    }
  });

  test('the tile is the small control step tall, and a place stands under 48px', () => {
    const uninstall = installSheets('CompactNav/CompactNav.css');
    try {
      render(<Rail />);
      const home = screen.getByRole('link', { name: 'Home' });
      const tile = home.querySelector('.crewlet-compact-nav__tile')!;
      expect(px(tile, 'height')).toBe(26);
      expect(px(tile, 'width')).toBe(36);
      expect(px(home, 'padding-top') + px(tile, 'height') + px(home, 'row-gap') + px(home, 'padding-bottom')).toBeLessThan(48);
    } finally {
      uninstall();
    }
  });
});
