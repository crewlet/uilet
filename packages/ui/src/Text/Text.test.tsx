/**
 * The registers reach the stylesheet, and nothing else reaches the DOM.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Text } from './index.js';

afterEach(cleanup);

test('no presentation prop is rendered as an attribute', () => {
  // The same defect Card's section padding had: a prop declared on the type
  // and left in the rest spread reaches the DOM as an attribute, where it
  // styles nothing and where a strict HTML check calls it unknown.
  const { container } = render(
    <Text variant="caption" tone="secondary" mono numeric truncate clamp={2} measure="narrow">
      seat_01HZX
    </Text>,
  );
  const span = container.firstElementChild as HTMLElement;
  for (const name of ['variant', 'tone', 'mono', 'numeric', 'truncate', 'clamp', 'measure']) {
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
