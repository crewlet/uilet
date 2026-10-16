/**
 * The signed-in reader at the foot of the rail: a link named by who they are
 * and where it goes, marked where they are, with its controls beside it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
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
    const current = /a\.crewlet-account-row__who\[aria-current='page'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(current).toMatch(/background:\s*var\(--color-surface-elevated\)/);
    expect(current).toMatch(/outline:\s*1px solid var\(--color-border-default\)/);
    const go = /\.crewlet-account-row__go\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(go).toMatch(/color:\s*var\(--color-text-tertiary\)/);
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
});
