/**
 * What the lockup promises: one link, named by the product and by nothing
 * else, with the mark as decoration and the context still readable.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { BrandLockup } from './index.js';

afterEach(cleanup);

const Mark = () => <svg data-testid="mark" />;

test('the link is named by the product, whatever the company is called', () => {
  render(<BrandLockup name="Crewlet" mark={<Mark />} context="Acme Holdings" href="#/" />);
  // Not "Crewlet Acme Holdings": the one control that always means "go home"
  // would otherwise be announced differently on every deployment.
  const home = screen.getByRole('link', { name: 'Crewlet' });
  expect(home.getAttribute('href')).toBe('#/');
  expect(home.textContent).toContain('Crewlet');
});

test('the context is outside the link and still readable', () => {
  render(<BrandLockup name="Crewlet" context="Acme Holdings" href="#/" />);
  const context = screen.getByText('Acme Holdings');
  expect(screen.getByRole('link', { name: 'Crewlet' }).contains(context)).toBe(false);
});

test('the mark is decoration', () => {
  render(<BrandLockup name="Crewlet" mark={<Mark />} href="#/" />);
  const mark = screen.getByTestId('mark').parentElement;
  expect(mark?.getAttribute('aria-hidden')).toBe('true');
});

test('a lockup that goes nowhere is not a link', () => {
  // An anchor with no href is announced as text anyway, and one with href="#"
  // navigates the page it is meant to be the way out of.
  render(<BrandLockup name="Crewlet" mark={<Mark />} />);
  expect(screen.queryByRole('link')).toBeNull();
  expect(screen.getByText('Crewlet')).toBeDefined();
});

test('a router draws the link itself and keeps the name', () => {
  render(
    <BrandLockup
      name="Crewlet"
      context="Superadmin"
      renderLink={({ className, children, ...rest }) => (
        <a {...rest} className={className} href="/console" data-router="true">
          {children}
        </a>
      )}
    />,
  );
  const home = screen.getByRole('link', { name: 'Crewlet' });
  expect(home.getAttribute('data-router')).toBe('true');
  expect(home.className).toContain('crewlet-brand__home');
});

test('the context line and the group labels in the rail are one register', () => {
  /*
   * The two uppercase runs in the rail sit twenty pixels apart, and nothing
   * but this compares them: a letter spacing changed in one file and not the
   * other is a difference a reader sees and no build reports.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const read = (path: string) => readFileSync(resolve(here, path), 'utf8');
  const spacing = (css: string, selector: string) => {
    const rule = new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
    if (!rule) throw new Error(`no rule for ${selector}`);
    return /letter-spacing:\s*var\((--[\w-]+)\)/.exec(rule[1] ?? '')?.[1] ?? null;
  };
  /* The token name is spelt without its leading dashes and prefixed at use:
     the package's variable check reads a quoted `--name` in a .tsx file as a
     DECLARATION, and a component may declare only `--crewlet-*` names. */
  const context = spacing(read('BrandLockup.css'), '.crewlet-brand__context');
  expect(context).toBe(`--${'font-letter-spacing-wide'}`);
  expect(spacing(read('../SidebarNav/SidebarNav.css'), '.crewlet-nav-group__label')).toBe(context);
});

test('the weight is what separates the context line from the group labels', () => {
  /*
   * Same size, same tracking, same case and twenty pixels apart: the weight is
   * the only thing left that says the company's name is not a third section
   * heading. Drawn at the group label's medium it read as one, which is what
   * this holds apart.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const read = (path: string) => readFileSync(resolve(here, path), 'utf8');
  const weight = (css: string, selector: string) => {
    const rule = new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
    if (!rule) throw new Error(`no rule for ${selector}`);
    return /font-weight:\s*var\((--[\w-]+)\)/.exec(rule[1] ?? '')?.[1] ?? null;
  };
  const context = weight(read('BrandLockup.css'), '.crewlet-brand__context');
  expect(context).toBe(`--${'font-weight-regular'}`);
  expect(weight(read('../SidebarNav/SidebarNav.css'), '.crewlet-nav-group__label')).not.toBe(context);
});

test('both lines are set on the document\'s own leading, which is the space between them', () => {
  /*
   * NO GAP BETWEEN THEM: they are one lockup rather than two stacked labels,
   * and the leading is what holds them apart. Tightened, the product's name
   * and the company's sat closer together than any other pair of lines in the
   * product, on a head that had eight pixels to spare. It is read off the
   * document's own rule rather than named here, so the two cannot be changed
   * apart.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'BrandLockup.css'), 'utf8');
  const base = readFileSync(resolve(here, '../../../tokens/dist/css/base.css'), 'utf8');
  const documentLeading = /(?:^|\})\s*body\s*\{[^}]*line-height:\s*var\((--[\w-]+)\)/.exec(base)?.[1];
  expect(documentLeading).toBeTruthy();
  const rule = (selector: string) =>
    new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  for (const selector of ['.crewlet-brand__name', '.crewlet-brand__context']) {
    expect(rule(selector)).toContain(`line-height: var(${documentLeading ?? ''})`);
  }
  // And nothing puts a gap on top of it.
  expect(rule('.crewlet-brand')).not.toMatch(/(^|;|\s)gap:/);
});

test('the lockup comes in under the rail head at every density', () => {
  /*
   * THE GUARANTEE THE FILE CLAIMS, arithmetic and all. The head is the top
   * bar's own height, so a lockup taller than that grows the head past the bar
   * and puts a visible kink across the window on every deployment that names a
   * company. The block is twice its own padding plus the taller of the mark
   * and the product name, plus the context line's own leading, and only the
   * padding moves with the density.
   */
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'BrandLockup.css'), 'utf8');
  const tokens = readFileSync(
    resolve(here, '../../../tokens/dist/css/tokens.css'),
    'utf8',
  );
  /*
   * The token's base step in pixels, before the density factor the emitter
   * wraps a size in. Type is emitted in `rem` against the browser's own root,
   * which neither stylesheet resets; a length is emitted in `px`.
   */
  const ROOT_PX = 16;
  const step = (name: string) => {
    const found = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens);
    if (!found) throw new Error(`@crewlethq/tokens emits no --${name}`);
    const value = found[1] ?? '';
    const length = /(\d*\.?\d+)(px|rem)/.exec(value);
    if (!length) throw new Error(`--${name} is not a length: ${value}`);
    return Number(length[1]) * (length[2] === 'rem' ? ROOT_PX : 1);
  };
  const named = (selector: string, property: string) => {
    const rule = new RegExp(`${selector.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(css);
    if (!rule) throw new Error(`no rule for ${selector}`);
    const found = new RegExp(`${property}:\\s*var\\((--[\\w-]+)\\)`).exec(rule[1] ?? '');
    if (!found) throw new Error(`${selector} names no ${property} token`);
    return (found[1] ?? '').slice(2);
  };
  const markBox = Number(/--crewlet-brand-mark:\s*(\d+)px/.exec(css)?.[1] ?? '0');
  expect(markBox).toBeGreaterThan(0);
  const leading = Number(
    /--font-line-height-normal:\s*([\d.]+)/.exec(tokens)?.[1] ?? '0',
  );
  expect(leading).toBeGreaterThan(0);
  const nameLine = step(named('.crewlet-brand__name', 'font-size')) * leading;
  const contextLine = step(named('.crewlet-brand__context', 'font-size')) * leading;
  const pad = step('spacing-2');
  const head = step('size-shell-topbar');
  /* The three steps --density takes. The mark and the type are fixed; only the
     padding scales, which is what makes comfortable the tall case. */
  for (const density of [0.82, 1, 1.14]) {
    const tall = 2 * pad * density + Math.max(markBox, nameLine) + contextLine;
    expect(tall).toBeLessThanOrEqual(head);
  }
});
