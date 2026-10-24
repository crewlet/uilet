/**
 * The signed-in reader at the foot of the rail: a link named by who they are
 * and where it goes, marked where they are, with its controls beside it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { Avatar } from '../Avatar/index.js';
import { AccountRow, AppShell } from './index.js';

afterEach(cleanup);

const badge = <Avatar name="Lee Park" kind="human" size="sm" decorative />;

describe('AccountRow', () => {
  test('is a link named by the reader and its target, ending in a chevron', () => {
    render(<AccountRow avatar={badge} name="Lee Park" detail="lee · Operations" href="#/account" />);
    const link = screen.getByRole('link', { name: 'Lee Park, lee · Operations, your account' });
    expect(link.getAttribute('href')).toBe('#/account');
    expect(link.getAttribute('aria-current')).toBeNull();
    expect(link.querySelector('.crewlet-account-row__go')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('says where the reader is on their own account page', () => {
    render(<AccountRow avatar={badge} name="Lee Park" href="#/account" current />);
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page');
    // THE RAIL'S CURRENT-ROW LIFT: the raised surface and a hairline OUTLINE,
    // since forced colours drop a shadow and a background. The chevron is in
    // quiet ink at rest.
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AppShell.css'), 'utf8');
    // ONE RULE for the link's page mark and the menu button's, so the two draw the same lift.
    const current =
      /a\.crewlet-account-row__who\[aria-current='page'\],\s*button\.crewlet-account-row__who\[data-current\]\s*\{([^}]*)\}/.exec(
        css,
      )?.[1] ?? '';
    expect(current).toMatch(/background:\s*var\(--color-surface-elevated\)/);
    expect(current).toMatch(/outline:\s*1px solid var\(--color-border-default\)/);
    const go = /(?:^|\})\s*\.crewlet-account-row__go\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(go).toMatch(/color:\s*var\(--color-text-tertiary\)/);
  });

  test("draws its chevron everywhere but a rail's foot, where the words take its room", () => {
    /*
     * In the foot the row stands around a 32px badge, whose column costs the
     * words 10px over the nav's 14px glyph column. The chevron's 16px (its
     * glyph and the step before it) pay for that, so the name keeps at least
     * the 109px it had beside the smaller badge. The chevron is decoration
     * either way: the link's name or the button's aria-haspopup says what a
     * press does, and both stay.
     */
    const uninstall = installSheets('AppShell/AppShell.css');
    try {
      const menu = { items: [{ key: 'out', label: 'Sign out', onSelect: () => {} }] };
      const { container } = render(
        <>
          <div data-testid="alone">
            <AccountRow avatar={badge} name="Lee Park" href="#/account" />
          </div>
          <AppShell.Rail
            footer={
              <>
                <AccountRow avatar={badge} name="Lee Park" href="#/account" />
                <AccountRow avatar={badge} name="Lee Park" menu={menu} />
              </>
            }
          >
            <div />
          </AppShell.Rail>
        </>,
      );
      const display = (el: Element) => getComputedStyle(el).display;
      const alone = screen.getByTestId('alone').querySelector('.crewlet-account-row__go')!;
      expect(display(alone)).not.toBe('none');
      const inFoot = container.querySelectorAll('.crewlet-app-shell__rail-foot .crewlet-account-row__go');
      expect(inFoot).toHaveLength(2);
      for (const go of inFoot) expect(display(go)).toBe('none');
      // What a press does is still said, and the words give back no margin
      // for a chevron that is not drawn.
      expect(container.querySelector('.crewlet-app-shell__rail-foot button.crewlet-account-row__who')?.getAttribute('aria-haspopup')).toBe('menu');
      const text = container.querySelector('.crewlet-app-shell__rail-foot .crewlet-account-row__text')!;
      expect(['', '0', '0px']).toContain(getComputedStyle(text).marginInlineEnd);
    } finally {
      uninstall();
    }
  });

  test('without a target it states who is signed in and is no link', () => {
    render(<AccountRow avatar={badge} name="Lee Park" />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Lee Park')).toBeTruthy();
  });

  test('its controls are siblings of the link, so each keeps its own name', () => {
    render(
      <AppShell.AccountRow
        avatar={badge}
        name="Lee Park"
        href="#/account"
        actions={<button type="button">Account and preferences</button>}
      />,
    );
    const button = screen.getByRole('button', { name: 'Account and preferences' });
    expect(button.closest('a')).toBeNull();
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <nav aria-label="Account">
        <AccountRow
          avatar={badge}
          name="Lee Park"
          detail="lee"
          href="#/account"
          current
          actions={<button type="button">Preferences</button>}
        />
      </nav>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });

  test('with a menu, the row is the menu button, ending in a menu’s chevron, and goes nowhere', () => {
    render(
      <AccountRow
        avatar={badge}
        name="Lee Park"
        detail="lee · Operations"
        href="#/account"
        menu={{ items: [{ key: 'account', label: 'Account settings', onSelect: () => {} }] }}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    const row = screen.getByRole('button', { name: 'Lee Park, lee · Operations, your account' });
    expect(row.getAttribute('aria-haspopup')).toBe('menu');
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(row.classList.contains('crewlet-account-row__who')).toBe(true);
    expect(row.querySelector('.crewlet-account-row__go')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('pressing the row opens the reader’s menu, its header above the actions', () => {
    const chosen: string[] = [];
    render(
      <AccountRow
        avatar={badge}
        name="Lee Park"
        menu={{
          header: <span>Access: Admin</span>,
          items: [
            { key: 'account', label: 'Account settings', onSelect: () => chosen.push('account') },
            { kind: 'separator', key: 'sep' },
            { key: 'out', label: 'Sign out', onSelect: () => chosen.push('out') },
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Lee Park/ }));
    const menu = screen.getByRole('menu', { name: 'Your account' });
    expect(menu.querySelector('.crewlet-menu__header')?.textContent).toBe('Access: Admin');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(chosen).toEqual(['out']);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('the reader’s menu is never narrower than the row that opens it', () => {
    const realRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList.contains('crewlet-account-row__who')) {
        return { left: 12, top: 600, width: 232, height: 44, right: 244, bottom: 644, x: 12, y: 600 } as DOMRect;
      }
      return realRect.call(this);
    };
    try {
      render(
        <AccountRow avatar={badge} name="Lee Park" menu={{ items: [{ key: 'out', label: 'Sign out', onSelect: () => {} }] }} />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Lee Park/ }));
      expect(screen.getByRole('menu', { name: 'Your account' }).style.getPropertyValue('--crewlet-menu-floor')).toBe('232px');
    } finally {
      Element.prototype.getBoundingClientRect = realRect;
    }
  });

  test('a row that opens a menu is still marked on the account page, and drawn as the link is', () => {
    render(
      <AccountRow
        avatar={badge}
        name="Lee Park"
        current
        menu={{ items: [{ key: 'account', label: 'Account settings', onSelect: () => {} }] }}
      />,
    );
    const row = screen.getByRole('button', { name: /Lee Park/ });
    expect(row.hasAttribute('data-current')).toBe(true);
    expect(row.getAttribute('aria-current')).toBeNull();
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AppShell.css'), 'utf8');
    expect(css).toMatch(/button\.crewlet-account-row__who\[data-current\]/);
    expect(css).toMatch(/button\.crewlet-account-row__who\[aria-expanded='true'\]/);
  });

  test('a row that opens a menu carries no axe violation', async () => {
    const { container } = render(
      <nav aria-label="Account">
        <AccountRow
          avatar={badge}
          name="Lee Park"
          detail="lee"
          menu={{ header: <span>Access: Admin</span>, items: [{ key: 'a', label: 'Account settings', onSelect: () => {} }] }}
          actions={<button type="button">Preferences</button>}
        />
      </nav>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Lee Park/ }));
    const result = await axe.run(document.body, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(container).toBeDefined();
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
