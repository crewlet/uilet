/**
 * A named band, and the document outline it puts its contents into.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Section } from './index.js';
import { Card } from '../Card/index.js';
import { HeadingLevelProvider } from '../utils/headingLevel.js';

afterEach(cleanup);

test('a titled section is named by its own heading', () => {
  render(
    <Section title="Coding runs" description="every run in the last hour">
      rows
    </Section>,
  );
  const region = screen.getByRole('region', { name: 'Coding runs' });
  expect(region.tagName).toBe('SECTION');
  expect(screen.getByText('every run in the last hour')).toBeDefined();
});

test('an untitled section claims no name and no region', () => {
  // A region with no name is one more thing a screen reader lists and one more
  // thing a reader has to open to find out what it was.
  const { container } = render(<Section>rows</Section>);
  expect(container.querySelector('section')?.getAttribute('aria-labelledby')).toBeNull();
});

test('the heading is the level where the section sits, and its contents go one deeper', () => {
  render(
    <HeadingLevelProvider level={3}>
      <Section title="Spend">
        <Card as="section">
          <Card.Header>
            <Card.Title>By model</Card.Title>
          </Card.Header>
        </Card>
      </Section>
    </HeadingLevelProvider>,
  );
  // Level 3, not 2: the context's own default is 2, so a section that
  // hard-coded its tag would pass a test that only ever rendered at the
  // default, which is the outline defect this guard exists for.
  expect(screen.getByText('Spend').tagName).toBe('H3');
  // Built by hand, this was whatever the author typed, and outlines shipped
  // with a level missing.
  expect(screen.getByText('By model').tagName).toBe('H4');
});

test('the actions sit in the heading row and are not part of the heading', () => {
  render(
    <Section title="Secrets" actions={<button type="button">Add</button>}>
      rows
    </Section>,
  );
  const heading = screen.getByRole('heading', { name: 'Secrets' });
  const action = screen.getByRole('button', { name: 'Add' });
  expect(heading.contains(action)).toBe(false);
});

test('the console preset drops the marketing band', () => {
  const { container } = render(
    <Section spacing="compact" title="Runs">
      rows
    </Section>,
  );
  expect(container.querySelector('.crewlet-section')?.className).toContain('crewlet-section--compact');
});

test('the band title and its sentence read at the page register', () => {
  // The title is a heading element, so the document baseline sets it at the
  // tight step: on a row it shares with its own sentence that puts the two on
  // different rhythms. And the sentence is glanced at rather than read, being
  // truncated before the heading gives up a character, so it sits in the
  // caption register rather than at a table cell's weight.
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'Section.css'),
    'utf8',
  );
  const rule = (name: string) =>
    new RegExp(`\\.crewlet-section__${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  expect(rule('title')).toMatch(/line-height:\s*var\(--font-line-height-normal\)/);
  expect(rule('description')).toMatch(/font-size:\s*var\(--font-size-xs\)/);
});

// TIGHT IS ONE SMALL STEP between a heading and what it names, titled or not:
// the titled column's own gap comes later in the sheet, so without a rule of
// its own a titled tight band would take the compact band's step.
test('a tight section keeps its one small step with a title', () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Section.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  const tight = /\.crewlet-section--tight\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const titled = /\.crewlet-section--tight\.crewlet-section--titled\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(tight).toMatch(/gap:\s*var\(--spacing-2\)/);
  expect(tight).toMatch(/padding-block:\s*0/);
  expect(titled).toMatch(/gap:\s*var\(--spacing-2\)/);
  expect(css.indexOf('.crewlet-section--tight.crewlet-section--titled')).toBeGreaterThan(
    css.indexOf('.crewlet-section--titled {'),
  );
  render(
    <Section spacing="tight" title="In use" data-testid="tight">
      cards
    </Section>,
  );
  const band = screen.getByTestId('tight');
  expect(band.className).toContain('crewlet-section--tight');
  expect(screen.getByRole('region', { name: 'In use' })).toBe(band);
});

test('a section with no spacing named is the console band', () => {
  // The marketing band was the default, so every named section on a console
  // screen spent 80px above and 80px below itself and a screen of three of
  // them carried 480px of nothing. A band is a marketing decision; a page that
  // wants one asks.
  render(<Section title="Coding runs" data-testid="band">rows</Section>);
  const band = screen.getByTestId('band');
  expect(band.className).toContain('crewlet-section--compact');
  expect(band.className).not.toContain('crewlet-section--md');

  cleanup();
  render(<Section spacing="md" title="Why Crewlet" data-testid="marketing">copy</Section>);
  expect(screen.getByTestId('marketing').className).toContain('crewlet-section--md');
});

test('the title never wraps for its hint: the hint gives way instead', () => {
  // "What it can do" broke onto two lines beside a hint that still truncated,
  // so both halves of the header lost.
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'Section.css'), 'utf8');
  const title = /\.crewlet-section__title\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(title).toMatch(/flex:\s*none/);
  expect(title).toMatch(/white-space:\s*nowrap/);
});
