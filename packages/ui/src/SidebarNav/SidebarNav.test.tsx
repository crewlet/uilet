/**
 * The rail's rows: where the reader is, what they cannot reach yet, and what
 * expands.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { contrast, flatten, paletteStates, parseHex, type Rgb } from '@crewlethq/tokens/test/palette';
import { NavGroup, NavItem, SidebarNav } from './index.js';

afterEach(cleanup);

function Rail() {
  return (
    <SidebarNav label="Sections">
      <NavItem href="#/" label="Overview" current badge={<span>3</span>} badgeTone="attention" />
      <NavGroup label="Company">
        <NavItem href="#/people" label="People" badge={<span>4 live</span>} />
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
  // The badge is INSIDE the row's name ("People 4 live"), because a count of
  // what needs a person is a fact about the destination rather than decoration
  // beside it.
  const people = screen.getByRole('link', { name: /^People/ });
  expect(people.textContent).toContain('4 live');
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

test('a badge says how loudly on the badge itself, and only when asked', () => {
  render(<Rail />);
  // The tone is a class on the SLOT rather than a component the caller passes
  // in, because the tint has to clear its floor on the ground the ROW has.
  const loud = screen.getByRole('link', { name: /^Overview/ }).querySelector('.crewlet-nav-item__badge');
  expect(loud?.classList.contains('crewlet-nav-item__badge--attention')).toBe(true);
  const quiet = screen.getByRole('link', { name: /^People/ }).querySelector('.crewlet-nav-item__badge');
  expect(quiet).not.toBeNull();
  expect(quiet?.classList.contains('crewlet-nav-item__badge--attention')).toBe(false);
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
 * The rail is the one surface in the product that draws a tint on a tint: the
 * attention count's warning tint lands on the accent tint of the row the
 * reader is on. @crewlethq/tokens measures that composite against the tokens
 * it emits; what it cannot know is which tokens this stylesheet spends, so the
 * pairs are read back out of the CSS here and measured on the rail's own
 * grounds. Swap either token for one nobody measured and the number moves.
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
  /** The rail's own ground, which is the bar's surface rather than the page's. */
  const RAIL = token('color-surface-topbar');

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
  const ATTENTION = '.crewlet-nav-item__badge--attention';

  function colour(values: Map<string, string>, name: string, ground: Rgb): Rgb {
    const raw = values.get(name);
    if (raw === undefined) throw new Error(`SidebarNav.css reads ${name}, which @crewlethq/tokens does not emit`);
    return parseHex(raw) ?? flatten(raw, ground);
  }

  test('the suite reads the pairs the stylesheet actually binds', () => {
    // A reading that found nothing would pass every measurement below for any
    // stylesheet at all.
    expect(pair(RESTING).ink).toBe(token('color-text-primary'));
    expect(pair(CURRENT).fill).toBe(token('color-brand-accent-soft'));
    expect(pair(CURRENT).ink).toBe(token('color-brand-accent-ink'));
    expect(pair(ATTENTION).fill).toBe(token('color-feedback-warning-soft'));
    expect(pair(ATTENTION).ink).toBe(token('color-feedback-warning-ink'));
    expect(Object.keys(states)).toContain('dark (attribute)');
  });

  test('every ink the rail paints clears 4.5:1 on the ground the row gives it', () => {
    const resting = pair(RESTING);
    const current = pair(CURRENT);
    const attention = pair(ATTENTION);
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
        measure('a quiet badge and a group label', colour(values, token('color-text-tertiary'), page), ground, on);
      }
      // THE TINT ON A TINT: the attention count's own ground is the warning
      // tint composited over whichever ground the row already had.
      for (const [on, ground] of rows) {
        measure(
          'the attention count',
          colour(values, attention.ink, page),
          flatten(values.get(attention.fill ?? '') ?? '', ground),
          on,
        );
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
    // An outset ring on the first or last row is cut off by the scroller.
    expect(ring).toContain('outline-offset: var(--size-focus-ring-inset-offset)');
    // NO SECOND MARK OF THE CURRENT ROW. A data-current or an is-current
    // beside aria-current is a second answer to one question, and the first
    // stylesheet to read the wrong one is the one that disagrees.
    expect(css).not.toMatch(/data-current|\.is-current|--current\b/);
  });

  test('an attention badge keeps its own ink on the row the reader is on', () => {
    /*
     * The two rules weigh the same without the :not(): a quiet badge takes the
     * row's ink on the current row, and an attention badge would have taken
     * the accent ink on its warning tint, which is a pair nobody measured and
     * which no reading of the stylesheet would have shown.
     */
    const inherit = new RegExp(
      "\\.crewlet-nav-item__row\\[aria-current='page'\\] \\.crewlet-nav-item__badge([^{]*)\\{",
    ).exec(css);
    expect(inherit).toBeTruthy();
    expect(inherit?.[1]).toContain(':not(.crewlet-nav-item__badge--attention)');
  });

  test('the glyph follows the label rather than keeping a ramp of its own', () => {
    // A second ramp is how a row comes to paint its label and its glyph two
    // different answers to "where am I".
    const rest = /\.crewlet-nav-item__icon svg\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rest).toContain('color: var(--color-text-muted)');
    const follows = /:hover \.crewlet-nav-item__icon svg,\s*[^{]*\.crewlet-nav-item__icon svg\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(follows).toContain('color: inherit');
  });

  test('the rows inside a group are flush', () => {
    /*
     * One step per row is 4px fifteen times over, which stood the rail 823px
     * in a 755px scroller and put the last two destinations behind the foot.
     * The label's own bottom pad is what holds a heading off the row it names.
     */
    const group = /\.crewlet-nav-group \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(group).toContain('gap: var(--spacing-0)');
    const label = /\.crewlet-nav-group__label \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(label).toContain('padding: var(--spacing-3) var(--size-nav-row-pad) var(--spacing-1)');
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
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\}/.exec(css)?.[1] ?? '';
    const collapsed = new Set([...reduced.matchAll(/\.([\w-]+)[^{,]*[,{]/g)].map((match) => match[1]));
    const animated = new Set(
      [...css.replace(reduced, '').matchAll(/\.([\w-]+)[^{]*\{[^}]*transition:/g)].map((match) => match[1]),
    );
    expect(animated.size).toBeGreaterThan(0);
    expect([...animated].filter((name) => !collapsed.has(name))).toEqual([]);
  });
});
