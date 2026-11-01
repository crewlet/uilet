/**
 * The registers reach the stylesheet, and nothing else reaches the DOM.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Text } from './index.js';

afterEach(cleanup);

test('no presentation prop is rendered as an attribute', () => {
  // The same defect Card's section padding had: a prop declared on the type
  // and left in the rest spread reaches the DOM as an attribute, where it
  // styles nothing and where a strict HTML check calls it unknown.
  const { container } = render(
    <Text variant="caption" tone="secondary" mono numeric truncate clamp={2} measure="narrow" titleWhenCut>
      seat_01HZX
    </Text>,
  );
  const span = container.firstElementChild as HTMLElement;
  for (const name of ['variant', 'tone', 'mono', 'numeric', 'truncate', 'clamp', 'measure', 'titleWhenCut', 'titlewhencut']) {
    expect(span.getAttribute(name)).toBeNull();
  }
  expect(span.className).toBe(
    'crewlet-text crewlet-text--caption crewlet-text--tone-secondary crewlet-text--mono' +
      ' crewlet-text--numeric crewlet-text--truncate crewlet-text--clamp-2 crewlet-text--measure-narrow',
  );
});

test('a variant carries its own ink and a tone overrides it', () => {
  // A caption is quiet by default, which is what it is for, and a caption that
  // carries a fact a reader must not miss says so with one prop.
  const { container } = render(
    <>
      <Text variant="caption">quiet</Text>
      <Text variant="caption" tone="primary">
        loud
      </Text>
    </>,
  );
  const [quiet, loud] = [...container.children] as HTMLElement[];
  expect(quiet?.className).not.toContain('crewlet-text--tone');
  expect(loud?.className).toContain('crewlet-text--tone-primary');
});

test('it draws the element it is told to, so a paragraph is a paragraph', () => {
  render(
    <Text as="p" variant="lead">
      What this screen is for.
    </Text>,
  );
  expect(screen.getByText('What this screen is for.').tagName).toBe('P');
});

test('everything else a caller passes still reaches the element', () => {
  render(
    <Text id="total" data-value="42" title="Tokens this hour" variant="stat" numeric>
      12,400
    </Text>,
  );
  const span = screen.getByTitle('Tokens this hour');
  expect(span.id).toBe('total');
  expect(span.getAttribute('data-value')).toBe('42');
});

test('the inherit register sets nothing of its own, so a mono run keeps its sentence', () => {
  render(
    <p>
      Signed in as{' '}
      <Text variant="inherit" mono>
        jane.founder
      </Text>
    </p>,
  );
  const run = screen.getByText('jane.founder');
  expect(run.className).toContain('crewlet-text--inherit');
  expect(run.className).toContain('crewlet-text--mono');
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Text.css'), 'utf8');
  const rule = /\.crewlet-text--inherit\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toMatch(/font-size:\s*inherit/);
  expect(rule).toMatch(/color:\s*inherit/);
});

test('a passage keeps its author’s lines and breaks a long word, at the body’s size', () => {
  // Read off the stylesheet, since jsdom does not apply it: the whole point
  // of the register is the four declarations a reader of a mission needs.
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Text.css'), 'utf8');
  const rule = /\.crewlet-text--passage \{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rule).toContain('font-size: var(--font-size-sm)');
  expect(rule).toContain('line-height: var(--font-line-height-relaxed)');
  expect(rule).toContain('white-space: pre-wrap');
  expect(rule).toContain('overflow-wrap: anywhere');
  const { container } = render(<Text variant="passage">One.{'\n'}Two.</Text>);
  expect(container.firstElementChild?.className).toContain('crewlet-text--passage');
});

/** Lays an element out as a browser would have: jsdom measures every box as 0 by 0. */
function laidOut(element: HTMLElement, box: { scrollWidth?: number; clientWidth?: number; scrollHeight?: number; clientHeight?: number }) {
  for (const [name, value] of Object.entries(box)) {
    Object.defineProperty(element, name, { configurable: true, get: () => value });
  }
}

test('a cut line carries its whole words on its title, read as it is shown', () => {
  render(
    <Text truncate>
      Answers within <Text variant="inherit" mono>linear-production-workspace</Text>
      {'\n'} only
    </Text>,
  );
  const line = screen.getByText(/Answers within/);
  laidOut(line, { scrollWidth: 412, clientWidth: 180 });
  fireEvent.mouseEnter(line);
  expect(line.getAttribute('title')).toBe('Answers within linear-production-workspace only');
});

test('a line that fits carries no title, and loses one once the column grows to fit it', () => {
  render(<Text truncate>Remote, company-shared</Text>);
  const line = screen.getByText('Remote, company-shared');
  laidOut(line, { scrollWidth: 140, clientWidth: 140 });
  fireEvent.mouseEnter(line);
  expect(line.hasAttribute('title')).toBe(false);

  laidOut(line, { scrollWidth: 140, clientWidth: 90 });
  fireEvent.mouseEnter(line);
  expect(line.getAttribute('title')).toBe('Remote, company-shared');

  laidOut(line, { scrollWidth: 140, clientWidth: 220 });
  fireEvent.mouseEnter(line);
  expect(line.hasAttribute('title')).toBe(false);
});

test('a clamp is cut downward, so its height decides, not its width', () => {
  render(<Text clamp={2}>A description long enough to need a third line in a narrow card.</Text>);
  const text = screen.getByText(/A description/);
  // As wide as its box, as wrapping text always is; taller than two lines.
  laidOut(text, { scrollWidth: 200, clientWidth: 200, scrollHeight: 60, clientHeight: 40 });
  fireEvent.mouseEnter(text);
  expect(text.getAttribute('title')).toBe('A description long enough to need a third line in a narrow card.');
});

test('the caller’s own title wins, and titleWhenCut={false} leaves the title to whatever shows it', () => {
  render(
    <>
      <Text truncate title="linear, at api.linear.app">
        linear
      </Text>
      <Text truncate titleWhenCut={false}>
        api.linear.app/graphql
      </Text>
    </>,
  );
  const named = screen.getByText('linear');
  const quiet = screen.getByText('api.linear.app/graphql');
  for (const line of [named, quiet]) laidOut(line, { scrollWidth: 300, clientWidth: 60 });
  fireEvent.mouseEnter(named);
  fireEvent.mouseEnter(quiet);
  expect(named.getAttribute('title')).toBe('linear, at api.linear.app');
  expect(quiet.hasAttribute('title')).toBe(false);
});

test('words that are not cut are never measured, and the caller’s pointer handler still runs', () => {
  const entered = vi.fn();
  render(
    <>
      <Text onMouseEnter={entered}>Plain words</Text>
      <Text truncate onMouseEnter={entered}>
        Cut words
      </Text>
    </>,
  );
  const plain = screen.getByText('Plain words');
  const cut = screen.getByText('Cut words');
  laidOut(plain, { scrollWidth: 300, clientWidth: 60 });
  laidOut(cut, { scrollWidth: 300, clientWidth: 60 });
  fireEvent.mouseEnter(plain);
  fireEvent.mouseEnter(cut);
  expect(plain.hasAttribute('title')).toBe(false);
  expect(cut.getAttribute('title')).toBe('Cut words');
  expect(entered).toHaveBeenCalledTimes(2);
});
