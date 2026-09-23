/**
 * The rail's rows: where the reader is, what they cannot reach yet, what
 * expands, and the figures and the heading control a row and a group carry.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { size, themes } from '@crewlethq/tokens';
import {
  contrast,
  deltaE,
  flatten,
  paletteStates,
  parseHex,
  RAIL_CURRENT_ROW,
  RAIL_GROUND,
  type Rgb,
} from '@crewlethq/tokens/test/palette';
import { channels, installSheets, installThemed, px } from '../../../../apps/ui-tests/src/cascade.js';
import { NavGroup, NavItem, SidebarNav } from './index.js';

afterEach(cleanup);

function Rail() {
  return (
    <SidebarNav label="Sections">
      <NavItem href="#/" label="Overview" current badge={{ value: 3, label: 'need a person' }} />
      <NavGroup label="Company">
        <NavItem href="#/people" label="People" count={{ value: 4, label: 'live' }} />
        <NavItem href="#/org" label="Org chart">
          <NavItem href="#/org?lens=chart" label="Chart" />
          <NavItem href="#/org?lens=charter" label="Charter" current />
        </NavItem>
      </NavGroup>
      <NavGroup label="Operations">
        <NavItem href="#/secrets" label="Secrets" disabledReason="Only an operator can read the secret names." />
      </NavGroup>
    </SidebarNav>
  );
}

test('the region and its groups are named, so a reader can say where to go', () => {
  render(<Rail />);
  const nav = screen.getByRole('navigation', { name: 'Sections' });
  expect(within(nav).getByRole('group', { name: 'Company' })).toBeDefined();
  expect(within(nav).getByRole('group', { name: 'Operations' })).toBeDefined();
});

test('the row for the screen the reader is on says so', () => {
  render(<Rail />);
  expect(screen.getByRole('link', { name: /^Overview/ }).getAttribute('aria-current')).toBe('page');
  // The count is INSIDE the row's name ("People, 4 live"), because how many
  // are live is a fact about the destination rather than decoration beside it.
  const people = screen.getByRole('link', { name: 'People, 4 live' });
  expect(people.getAttribute('aria-current')).toBeNull();
});

test('an unavailable row keeps its place in the tab order and says why', () => {
  render(<Rail />);
  // Not `disabled`: a row taken out of the tab order teaches a keyboard reader
  // that the destination does not exist.
  const secrets = screen.getByRole('link', { name: /Secrets/ });
  expect(secrets.getAttribute('aria-disabled')).toBe('true');
  expect(secrets.tabIndex).toBe(0);
  expect(secrets.hasAttribute('href')).toBe(false);
  const reason = document.getElementById(secrets.getAttribute('aria-describedby') ?? '');
  expect(reason?.textContent).toBe('Only an operator can read the secret names.');
});

test('nested rows are hidden until the row that holds them is expanded', () => {
  render(<Rail />);
  expect(screen.queryByRole('link', { name: 'Charter' })).toBeNull();

  const toggle = screen.getByRole('button', { name: 'Org chart sections' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('link', { name: 'Charter' })).toBeDefined();

  // The control names what it controls, so a screen reader can jump to it.
  const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  expect(panel?.contains(screen.getByRole('link', { name: 'Charter' }))).toBe(true);
});

test('a row that navigates and a control that expands are two controls, never nested', () => {
  render(<Rail />);
  const org = screen.getByRole('link', { name: 'Org chart' });
  const toggle = screen.getByRole('button', { name: 'Org chart sections' });
  // A button inside a link is reachable cleanly by neither a pointer nor a
  // keyboard, and it is what a single row carrying both would be.
  expect(org.contains(toggle)).toBe(false);
  expect(toggle.contains(org)).toBe(false);
});

test('a row with no destination is the control that expands its own rows', () => {
  render(
    <SidebarNav label="Sections">
      <NavItem label="This company">
        <NavItem href="#/seats/ada" label="Ada" />
      </NavItem>
    </SidebarNav>,
  );
  const row = screen.getByRole('button', { name: 'This company' });
  expect(row.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(row);
  expect(row.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('link', { name: 'Ada' })).toBeDefined();
});

test('a controlled expansion belongs to the caller', () => {
  const view = render(
    <SidebarNav label="Sections">
      <NavItem href="#/org" label="Org chart" expanded={false}>
        <NavItem href="#/org?lens=chart" label="Chart" />
      </NavItem>
    </SidebarNav>,
  );
  const toggle = screen.getByRole('button', { name: 'Org chart sections' });
  fireEvent.click(toggle);
  // It reports the press and does not act on it: the state is the caller's.
  expect(toggle.getAttribute('aria-expanded')).toBe('false');

  view.rerender(
    <SidebarNav label="Sections">
      <NavItem href="#/org" label="Org chart" expanded>
        <NavItem href="#/org?lens=chart" label="Chart" />
      </NavItem>
    </SidebarNav>,
  );
  expect(screen.getByRole('link', { name: 'Chart' })).toBeDefined();
});

test('a router draws the rows, and they still say where the reader is', () => {
  render(
    <SidebarNav label="Sections">
      <NavItem
        label="People"
        current
        renderLink={({ className, children, ...rest }) => (
          <a {...rest} className={className} href="/console/people" data-router="true">
            {children}
          </a>
        )}
      />
    </SidebarNav>,
  );
  const people = screen.getByRole('link', { name: 'People' });
  expect(people.getAttribute('data-router')).toBe('true');
  expect(people.getAttribute('aria-current')).toBe('page');
});

/**
 * A COUNT AND A BADGE, which are two different facts: how many of something
 * the destination holds, and how many things there are waiting on the reader.
 */
describe('a figure at the end of a row', () => {
  function Figures() {
    return (
      <SidebarNav label="Sections">
        <NavItem href="#/inbox" label="Inbox" badge={{ value: 5, label: 'unread' }} />
        <NavItem href="#/mine" label="My work" count={{ value: 3, label: 'open' }} />
        <NavItem
          href="#/agents"
          label="Agents"
          count={{ value: 4, label: 'working', mark: <span data-mark="working" /> }}
        />
        <NavItem href="#/triage" label="Triage" count={{ value: 12, label: 'open' }} badge={{ value: 2, label: 'unread' }} />
      </SidebarNav>
    );
  }

  test('is read as the end of the row name, with the words that say what it counts', () => {
    render(<Figures />);
    // "Inbox, 5 unread", never "Inbox 5": a bare figure after a name is a
    // number nobody can place, and the comma is the pause between the two.
    expect(screen.getByRole('link', { name: 'Inbox, 5 unread' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'My work, 3 open' })).toBeDefined();
    // The mark is decoration: the words say "working" already.
    expect(screen.getByRole('link', { name: 'Agents, 4 working' })).toBeDefined();
    expect(document.querySelector('[data-mark="working"]')?.closest('[aria-hidden="true"]')).not.toBeNull();
    // Both on one row, the count first, each with its own words.
    expect(screen.getByRole('link', { name: 'Triage, 12 open, 2 unread' })).toBeDefined();
  });

  test('is drawn once for the eye and read once, never both to either', () => {
    render(<Figures />);
    const inbox = screen.getByRole('link', { name: 'Inbox, 5 unread' });
    const drawn = inbox.querySelector('.crewlet-nav-item__badge');
    // The drawn figure is hidden from assistive technology, so the sentence is
    // the only thing read, and a screen reader does not say "5, 5 unread".
    expect(drawn?.getAttribute('aria-hidden')).toBe('true');
    expect(drawn?.textContent).toBe('5');
  });

  test('a count is the quiet figure and a badge the filled one, each in its own slot', () => {
    render(<Figures />);
    // Two props rather than one with a tone: which one a figure is decides
    // whether it is the one hue in the chrome, and that is a decision the
    // caller makes by naming it.
    const inbox = screen.getByRole('link', { name: 'Inbox, 5 unread' });
    expect(inbox.querySelector('.crewlet-nav-item__badge')).not.toBeNull();
    expect(inbox.querySelector('.crewlet-nav-item__count')).toBeNull();
    const mine = screen.getByRole('link', { name: 'My work, 3 open' });
    expect(mine.querySelector('.crewlet-nav-item__count')).not.toBeNull();
    expect(mine.querySelector('.crewlet-nav-item__badge')).toBeNull();
  });
});

describe("a row's lead", () => {
  test("is a project's key, drawn as a chip and read as the start of the name", () => {
    render(
      <SidebarNav label="Projects">
        <NavItem href="#/work/eng" label="Core platform" lead="ENG" count={{ value: 23, label: 'open' }} />
      </SidebarNav>,
    );
    // A space the layout ignores keeps the key and the name two words, so a
    // screen reader says "ENG Core platform" rather than "ENGCore platform".
    const row = screen.getByRole('link', { name: 'ENG Core platform, 23 open' });
    const chip = row.querySelector('.crewlet-nav-item__lead');
    expect(chip?.textContent).toBe('ENG');
    // It is text rather than decoration: the key is what every item in the
    // project is filed under.
    expect(chip?.closest('[aria-hidden="true"]')).toBeNull();
    // Before the label, which is the glyph's place.
    expect(chip?.compareDocumentPosition(row.querySelector('.crewlet-nav-item__label')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  test('an empty key draws no chip and adds no space', () => {
    render(
      <SidebarNav label="Projects">
        <NavItem href="#/work/x" label="Unfiled" lead="" />
      </SidebarNav>,
    );
    const row = screen.getByRole('link', { name: 'Unfiled' });
    expect(row.querySelector('.crewlet-nav-item__lead')).toBeNull();
    expect(row.textContent).toBe('Unfiled');
  });
});

describe("a group's heading control", () => {
  function Projects({ onAdd }: { onAdd: () => void }) {
    return (
      <SidebarNav label="Sections">
        <NavItem href="#/" label="Home" current />
        <NavGroup label="Projects" action={{ label: 'New project', icon: <svg data-glyph="plus" />, onClick: onAdd }}>
          <NavItem href="#/work/eng" label="Core platform" lead="ENG" />
        </NavGroup>
      </SidebarNav>
    );
  }

  test('is a named button, and the group is still named by its words alone', () => {
    render(<Projects onAdd={() => {}} />);
    const group = screen.getByRole('group', { name: 'Projects' });
    const add = within(group).getByRole('button', { name: 'New project' });
    // The glyph is decoration; the label is the name.
    expect(add.querySelector('[data-glyph="plus"]')?.closest('[aria-hidden="true"]')).not.toBeNull();
    // A sibling of the heading's words, not inside them: "Projects New project"
    // is not the name of a group.
    const heading = document.getElementById(group.getAttribute('aria-labelledby') ?? '');
    expect(heading?.textContent).toBe('Projects');
    expect(heading?.contains(add)).toBe(false);
  });

  test('is reached from the keyboard, between the row above and the first row of its group', async () => {
    const onAdd = vi.fn();
    render(<Projects onAdd={onAdd} />);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Home' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'New project' }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onAdd).toHaveBeenCalledTimes(2);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'ENG Core platform' }));
  });

  test('without words the heading still draws the control, and is no group', () => {
    render(
      <SidebarNav label="Sections">
        <NavGroup action={{ label: 'New view', icon: <svg />, onClick: () => {} }}>
          <NavItem href="#/v" label="Blocked" />
        </NavGroup>
      </SidebarNav>,
    );
    // A control nobody can reach because its group had no name would be a
    // silent no-op: the prop is honoured, and nothing claims a name it lacks.
    expect(screen.getByRole('button', { name: 'New view' })).toBeDefined();
    expect(document.querySelector('.crewlet-nav-group__label')).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
  });

  test('has no accessibility violations', async () => {
    const view = render(<Projects onAdd={() => {}} />);
    const result = await axe.run(view.container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

test.each([
  ['an empty string', ''],
  ['null', null],
  ['false', false],
  ['nothing at all', undefined],
])('a group named by %s draws no heading box', (_what, label) => {
  render(
    <SidebarNav label="Sections">
      <NavGroup label={label as never}>
        <NavItem href="#/" label="Overview" />
      </NavGroup>
    </SidebarNav>,
  );
  // The box, not just the word: the heading carries its own padding, so an
  // empty one is sixteen pixels of the rail spent on nothing.
  expect(document.querySelector('.crewlet-nav-group__label')).toBeNull();
  expect(document.querySelector('.crewlet-nav-group__head')).toBeNull();
  // And it is not a group to a screen reader either, because it has no name.
  expect(screen.queryByRole('group')).toBeNull();
  expect(screen.getByRole('link', { name: 'Overview' })).toBeDefined();
});

test('a group that is named draws its heading and says so', () => {
  render(
    <SidebarNav label="Sections">
      <NavGroup label="Company">
        <NavItem href="#/people" label="People" />
      </NavGroup>
    </SidebarNav>,
  );
  expect(document.querySelector('.crewlet-nav-group__label')?.textContent).toBe('Company');
  expect(screen.getByRole('group', { name: 'Company' })).toBeDefined();
});

test('the rail has no accessibility violations, expanded or collapsed', async () => {
  const view = render(<Rail />);
  fireEvent.click(screen.getByRole('button', { name: 'Org chart sections' }));
  const result = await axe.run(view.container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

/**
 * What the rail PAINTS, measured from the stylesheet that ships.
 *
 * The rail stands on the frame, and its current row on raised with a hairline
 * round it. @crewlethq/tokens measures those grounds and that line against the
 * tokens it emits; what it cannot know is which tokens this stylesheet spends,
 * so the pairs are read back out of the CSS here and measured on the rail's
 * own grounds. Swap a token for one nobody measured and the number moves.
 */
describe('the rail colour', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const tokensCss = resolve(here, '../../../tokens/dist/css');
  const css = readFileSync(resolve(here, 'SidebarNav.css'), 'utf8');
  const states = paletteStates({
    tokens: readFileSync(resolve(tokensCss, 'tokens.css'), 'utf8'),
    themes: readFileSync(resolve(tokensCss, 'themes.css'), 'utf8'),
  });
  /*
   * Token names are written without their leading dashes and prefixed at use:
   * the package's variable check reads a quoted `--name` in a .tsx file as a
   * DECLARATION, and a component may declare only `--crewlet-*` names.
   */
  const token = (name: string) => `--${name}`;
  /**
   * The rail's own ground, the frame rather than the sheet: the ground the
   * palette suite measures the rail on, and the one the shell paints under it
   * (asserted below, so the two cannot drift apart).
   */
  const RAIL = RAIL_GROUND;

  /** The fill and the ink one rule binds, by the tokens it names. */
  function pair(selector: string): { fill: string | null; ink: string } {
    const rule = new RegExp(`${selector.replace(/[.[\]()^$*+?|\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
    if (!rule) throw new Error(`SidebarNav.css declares no rule for ${selector}`);
    const body = rule[1] ?? '';
    const fill = /background:\s*var\((--[\w-]+)\)/.exec(body);
    const ink = /(?:^|;|\s)color:\s*var\((--[\w-]+)\)/.exec(body);
    if (!ink) throw new Error(`${selector} binds no ink`);
    return { fill: fill?.[1] ?? null, ink: ink[1] ?? '' };
  }

  const RESTING = '.crewlet-nav-item__row';
  const CURRENT = ".crewlet-nav-item__row[aria-current='page']";
  const ATTENTION = '.crewlet-nav-item__badge';
  const LEAD = '.crewlet-nav-item__lead';

  function colour(values: Map<string, string>, name: string, ground: Rgb): Rgb {
    const raw = values.get(name);
    if (raw === undefined) throw new Error(`SidebarNav.css reads ${name}, which @crewlethq/tokens does not emit`);
    return parseHex(raw) ?? flatten(raw, ground);
  }

  test('the suite reads the pairs the stylesheet actually binds', () => {
    // A reading that found nothing would pass every measurement below for any
    // stylesheet at all.
    expect(pair(RESTING).ink).toBe(token('color-text-primary'));
    expect(pair(CURRENT).fill).toBe(token('color-surface-elevated'));
    expect(pair(CURRENT).ink).toBe(token('color-text-primary'));
    expect(pair(ATTENTION).fill).toBe(token('color-brand-accent'));
    expect(pair(ATTENTION).ink).toBe(token('color-text-on-accent'));
    expect(pair(LEAD).fill).toBe(token('color-surface-elevated'));
    expect(pair(LEAD).ink).toBe(token('color-text-secondary'));
    expect(Object.keys(states)).toEqual(['base', 'dark', 'light (media query)', 'light (attribute)']);
  });

  test('the current row is the one the palette suite measures: raised, with the plain border round it', () => {
    // @crewlethq/tokens holds RAIL_CURRENT_ROW to its two floors (the row
    // lifts off the rail, the hairline is visible on the row). Those floors
    // say nothing about a stylesheet that drew some other fill or line.
    const [fill, line] = RAIL_CURRENT_ROW;
    const rule = /\.crewlet-nav-item__row\[aria-current='page'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(pair(CURRENT).fill).toBe(fill);
    expect(rule).toContain(`outline: 1px solid var(${line})`);
    expect(rule).toContain('outline-offset: -1px');
    // The hairline is an OUTLINE rather than an inset box-shadow, because
    // forced-colors mode drops a box-shadow and keeps an outline.
    expect(rule).not.toMatch(/box-shadow/);
    // And nothing in it is the accent, which the rail keeps for the one count
    // that asks the reader to act.
    expect(rule).not.toMatch(/brand-accent/);
  });

  test('a focused current row draws the ring rather than its hairline', () => {
    // Both rules set `outline` and weigh the same, so the one declared LAST
    // wins on a row that is both current and focused.
    const current = css.indexOf(".crewlet-nav-item__row[aria-current='page'] {");
    const ring = css.indexOf('.crewlet-nav-item__row:focus-visible {');
    expect(current).toBeGreaterThan(0);
    expect(ring).toBeGreaterThan(current);
  });

  test('the shell paints the rail on the ground every measurement here is taken on', () => {
    // The rail is drawn by AppShell and measured, here and in the palette
    // suite, on RAIL_GROUND. A shell that moved its rail to another rung would
    // leave every number in this block measuring a ground nobody sees.
    const shell = readFileSync(resolve(here, '../AppShell/AppShell.css'), 'utf8');
    const rule = /\.crewlet-app-shell__rail\s*\{([^}]*)\}/.exec(shell)?.[1] ?? '';
    expect(/(?:^|;|\s)background:\s*var\((--[\w-]+)\)/.exec(rule)?.[1]).toBe(RAIL);
  });

  test('every ink the rail paints clears 4.5:1 on the ground the row gives it', () => {
    const resting = pair(RESTING);
    const current = pair(CURRENT);
    const attention = pair(ATTENTION);
    const lead = pair(LEAD);
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      // The marketing root has no rail: it paints one brand hue on a black
      // page, which is a look rather than a product palette.
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      const rail = colour(values, RAIL, page);
      /* The three grounds a row in this rail can have. */
      const rows: [string, Rgb][] = [
        ['a row', rail],
        ['a hovered row', flatten(values.get(token('color-surface-hover')) ?? '', rail)],
        ['the row the reader is on', flatten(values.get(current.fill ?? '') ?? '', rail)],
      ];
      const measure = (what: string, ink: Rgb, ground: Rgb, on: string) => {
        const ratio = contrast(ink, ground);
        if (ratio < 4.5) failures.push(`${state}: ${what} on ${on}: ${ratio.toFixed(2)}:1`);
      };
      const [, railGround] = rows[0] as [string, Rgb];
      const [, hovered] = rows[1] as [string, Rgb];
      const [, chosen] = rows[2] as [string, Rgb];
      measure("a row's label", colour(values, resting.ink, page), railGround, 'a row');
      measure('a hovered row', colour(values, resting.ink, page), hovered, 'a hovered row');
      // The label AND the glyph: the glyph takes the row's own colour there.
      measure('the current row', colour(values, current.ink, page), chosen, 'the row the reader is on');
      for (const [on, ground] of [rows[0], rows[1]] as [string, Rgb][]) {
        measure('a count, a group label and its action', colour(values, token('color-text-tertiary'), page), ground, on);
      }
      // The badge and the key chip on their own fills, over whichever ground
      // the row already had: both fills are opaque today, and composited this
      // way a translucent one would still be measured on the grounds it lands
      // on.
      for (const [on, ground] of rows) {
        measure(
          'the badge',
          colour(values, attention.ink, page),
          flatten(values.get(attention.fill ?? '') ?? '', ground),
          on,
        );
        measure("a project's key chip", colour(values, lead.ink, page), flatten(values.get(lead.fill ?? '') ?? '', ground), on);
      }
    }
    expect(failures).toEqual([]);
  });

  test('the focus ring clears 3:1 on every ground a row can have', () => {
    // It is drawn INSIDE the row's box (the rail is a clipping scroller), so
    // the row's own tint is a ground the ring lands on rather than one beside
    // it.
    const current = pair(CURRENT);
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null) throw new Error(`${state} has no opaque page colour`);
      const rail = colour(values, RAIL, page);
      const ring = colour(values, token('color-focus'), page);
      for (const [on, tint] of [
        ['a row', null],
        ['a hovered row', token('color-surface-hover')],
        ['the row the reader is on', current.fill],
      ] as [string, string | null][]) {
        const ground = tint === null ? rail : flatten(values.get(tint) ?? '', rail);
        const ratio = contrast(ring, ground);
        if (ratio < 3) failures.push(`${state}: the focus ring on ${on}: ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  test('the ring is drawn inside the row, and the state comes from aria-current alone', () => {
    const ring = /\.crewlet-nav-item__row:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    // An outset ring on the first or last row is cut off by the scroller, and
    // the heading's control sits in the same scroller.
    expect(ring).toContain('outline-offset: var(--size-focus-ring-inset-offset)');
    const action = /\.crewlet-nav-group__action:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(action).toContain('outline-offset: var(--size-focus-ring-inset-offset)');
    // NO SECOND MARK OF THE CURRENT ROW. A data-current or an is-current
    // beside aria-current is a second answer to one question, and the first
    // stylesheet to read the wrong one is the one that disagrees.
    expect(css).not.toMatch(/data-current|\.is-current|--current\b/);
  });

  test('on the row the reader is on the count takes the row ink, and the badge keeps its own', () => {
    /*
     * The tertiary step is measured on the rail and under the hover overlay,
     * never on the raised row, so the count lifts to the row's own ink there.
     * The badge must NOT follow it: the rail's full ink on the accent fill is
     * a pair nobody measured. Asserted through the cascade, which is what
     * decides it, rather than by reading the rule.
     */
    for (const theme of ['dark', 'light'] as const) {
      const uninstall = installThemed(theme, 'SidebarNav/SidebarNav.css');
      const { unmount } = render(
        <SidebarNav label="Sections">
          <NavItem href="#/" label="Triage" current count={{ value: 12, label: 'open' }} badge={{ value: 2, label: 'unread' }} />
          <NavItem href="#/mine" label="My work" count={{ value: 3, label: 'open' }} />
        </SidebarNav>,
      );
      const palette = themes[theme].color;
      const triage = screen.getByRole('link', { name: 'Triage, 12 open, 2 unread' });
      const count = getComputedStyle(triage.querySelector('.crewlet-nav-item__count')!);
      expect(channels(count.color), `${theme}: the current row's count`).toEqual(parseHex(palette.text.primary));
      const badge = getComputedStyle(triage.querySelector('.crewlet-nav-item__badge')!);
      expect(channels(badge.color), `${theme}: the current row's badge`).toEqual(parseHex(palette.text.onAccent));
      const resting = getComputedStyle(screen.getByRole('link', { name: 'My work, 3 open' }).querySelector('.crewlet-nav-item__count')!);
      expect(channels(resting.color), `${theme}: a resting count`).toEqual(parseHex(palette.text.tertiary));
      unmount();
      uninstall();
    }
  });

  test('the glyph follows the label rather than keeping a ramp of its own', () => {
    // A second ramp is how a row comes to paint its label and its glyph two
    // different answers to "where am I".
    const rest = /\.crewlet-nav-item__icon svg\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rest).toContain('color: var(--color-text-muted)');
    const follows = /:hover \.crewlet-nav-item__icon svg,\s*[^{]*\.crewlet-nav-item__icon svg\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(follows).toContain('color: inherit');
  });

  test('a group label is a word in sentence case, not an uppercase micro-label', () => {
    // It is the same case as every row it names; the quieter ink is what sets
    // it apart from them.
    const label = /\.crewlet-nav-group__label \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(label).toContain('font-size: var(--font-size-xs)');
    expect(label).toContain('color: var(--color-text-tertiary)');
    expect(label).not.toMatch(/text-transform|letter-spacing/);
  });

  test('hover is the tint, because the resting row is already at full ink', () => {
    /*
     * There is no ink step above the resting one now, so a hover rule naming a
     * colour would either be a no-op somebody has to read or a step DOWN. The
     * tint and the glyph are what say a row is pointed at.
     */
    const hover = /\.crewlet-nav-item__row:hover \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(hover).toContain('background: var(--color-surface-hover)');
    expect(hover).not.toMatch(/(^|;|\s)color:/);
    expect(pair(RESTING).ink).toBe(token('color-text-primary'));
  });

  test('every transition the rail declares is collapsed under reduced motion', () => {
    // Read without its comments: a "4.5:1" in prose is a class name to the
    // pattern below, and it reads on from there into the next rule's body.
    const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\}/.exec(source)?.[1] ?? '';
    const collapsed = new Set([...reduced.matchAll(/\.([\w-]+)[^{,]*[,{]/g)].map((match) => match[1]));
    const animated = new Set(
      [...source.replace(reduced, '').matchAll(/\.([\w-]+)[^{}]*\{[^}]*transition:/g)].map((match) => match[1]),
    );
    expect(animated).toContain('crewlet-nav-group__action');
    expect(animated.size).toBeGreaterThan(0);
    expect([...animated].filter((name) => !collapsed.has(name))).toEqual([]);
  });
  test('as the cascade decides it, the current row is raised and the badge is the accent, in both palettes', () => {
    /*
     * The pairs above are read out of the source. This is what jsdom's own
     * cascade paints on the rendered rail with the values each theme ships:
     * a later rule winning on source order, or a selector that matches
     * nothing the component renders, shows up here and nowhere above.
     */
    for (const theme of ['dark', 'light'] as const) {
      const uninstall = installThemed(theme, 'SidebarNav/SidebarNav.css');
      const { unmount } = render(<Rail />);
      const palette = themes[theme].color;
      const current = screen.getByRole('link', { name: /^Overview/ });
      const style = getComputedStyle(current);
      const where = `${theme}: the current row`;
      expect(channels(style.backgroundColor), where).toEqual(parseHex(palette.surface.elevated));
      expect(channels(style.color), where).toEqual(parseHex(palette.text.primary));
      // jsdom keeps the `outline` shorthand as written rather than expanding
      // it into its longhands, so the winning declaration is read whole.
      const [width, drawn, line] = style.outline.split(' ');
      expect([width, drawn], where).toEqual(['1px', 'solid']);
      expect(channels(line ?? ''), where).toEqual(parseHex(palette.border.default));
      expect(channels(style.backgroundColor), where).not.toEqual(parseHex(palette.brand.accent));

      const resting = getComputedStyle(screen.getByRole('link', { name: /^People/ }));
      expect(resting.outline, `${theme}: a resting row`).toBe('');

      const badge = getComputedStyle(current.querySelector('.crewlet-nav-item__badge')!);
      expect(channels(badge.backgroundColor), `${theme}: the attention count`).toEqual(parseHex(palette.brand.accent));
      expect(channels(badge.color), `${theme}: the attention count`).toEqual(parseHex(palette.text.onAccent));
      unmount();
      uninstall();
    }
  });

  test('the fill and the line the current row paints clear the floors the palette suite sets for them', () => {
    // Measured here on the tokens the STYLESHEET names, so a rule that moved
    // to a fill or a line the palette suite never held is caught by number.
    const current = pair(CURRENT);
    const line = /outline:\s*1px solid var\((--[\w-]+)\)/.exec(
      /\.crewlet-nav-item__row\[aria-current='page'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '',
    )?.[1];
    const failures: string[] = [];
    for (const [state, values] of Object.entries(states)) {
      if (state === 'base') continue;
      const page = parseHex(values.get(token('color-surface-background')) ?? '');
      if (page === null || line === undefined) throw new Error(`${state} has no page colour, or the row draws no line`);
      const rail = colour(values, RAIL, page);
      const fill = flatten(values.get(current.fill ?? '') ?? '', rail);
      const lift = deltaE(fill, rail);
      if (lift < 1.5) failures.push(`${state}: the current row lifts dE ${lift.toFixed(2)} off the rail`);
      const drawn = deltaE(flatten(values.get(line) ?? '', fill), fill);
      if (drawn < 3) failures.push(`${state}: the hairline is dE ${drawn.toFixed(2)} off the row`);
    }
    expect(failures).toEqual([]);
  });
});

/**
 * The rail's geometry as the cascade applies it: the design's 30px row, the
 * half step between rows, and a heading that stands at the target floor so the
 * control in it is one.
 */
describe('the rail geometry', () => {
  function Measured() {
    return (
      <SidebarNav label="Sections">
        <NavGroup label="Projects" action={{ label: 'New project', icon: <svg />, onClick: () => {} }}>
          <NavItem href="#/work/eng" label="Core platform" lead="ENG" />
          <NavItem href="#/work/prod" label="Product" lead="PROD" current />
        </NavGroup>
      </SidebarNav>
    );
  }

  test("a row stands at the rail's own step, 30px, and not a list's 36px", () => {
    const uninstall = installSheets('SidebarNav/SidebarNav.css');
    try {
      render(<Measured />);
      expect(size.nav.row).toBe('30px');
      for (const name of ['ENG Core platform', 'PROD Product']) {
        expect(px(screen.getByRole('link', { name }), 'min-height'), name).toBe(30);
      }
    } finally {
      uninstall();
    }
  });

  test('the rows in a group are half a step apart, and the heading is off the run above by 14px with the rail gap', () => {
    const uninstall = installSheets('SidebarNav/SidebarNav.css');
    try {
      render(<Measured />);
      const group = screen.getByRole('group', { name: 'Projects' });
      // `gap`, not `row-gap`: jsdom keeps the shorthand it was given.
      expect(px(group, 'gap')).toBe(2);
      const head = group.querySelector('.crewlet-nav-group__head')!;
      const nav = screen.getByRole('navigation', { name: 'Sections' });
      expect(px(head, 'margin-top') + px(nav, 'gap')).toBe(14);
    } finally {
      uninstall();
    }
  });

  test('the heading and its control stand at the pointer-target floor', () => {
    const uninstall = installSheets('SidebarNav/SidebarNav.css');
    try {
      render(<Measured />);
      const head = screen.getByRole('group', { name: 'Projects' }).querySelector('.crewlet-nav-group__head')!;
      const add = screen.getByRole('button', { name: 'New project' });
      expect(px(head, 'min-height')).toBe(24);
      expect([px(add, 'width'), px(add, 'height')]).toEqual([24, 24]);
    } finally {
      uninstall();
    }
  });
});
