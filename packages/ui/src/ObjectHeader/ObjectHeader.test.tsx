/**
 * What an object's header says, and what it deliberately does not. Ported
 * from the engine dashboard's `app/frame/ObjectHeader.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, test } from 'vitest';
import { FactLine, ObjectHeader, SetByLine, type SetBy } from './index.js';

afterEach(cleanup);

const SET: SetBy = { actor: 'ada', ago: '2h ago', turnHref: '#/live/turns/t-1' };
const css = () => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'ObjectHeader.css'), 'utf8');

describe('SetByLine', () => {
  test('says provenance in one wording, the turn a link', () => {
    const { container } = render(<SetByLine setBy={SET} />);
    expect(container.textContent).toBe('set by ada · 2h ago · turn ');
    expect(screen.getByRole('link', { name: 'turn' }).getAttribute('href')).toBe('#/live/turns/t-1');
  });

  test('names the properties one line covers, without a locale deciding how', () => {
    render(<SetByLine setBy={SET} fields={['Status', 'Priority', 'Type']} />);
    expect(screen.getByText(/Status, Priority and Type · set by ada/)).toBeTruthy();
  });

  test('says cleared for a change that emptied the field', () => {
    const { container } = render(<SetByLine setBy={{ actor: 'ada', cleared: true }} />);
    expect(container.textContent).toBe('cleared by ada');
  });
});

describe('FactLine', () => {
  test('drops a fact that has no value, attribution and all', () => {
    const { container } = render(
      <FactLine
        facts={[
          { label: 'Status', value: 'In progress', setBy: SET },
          { label: 'Due', value: undefined, setBy: SET },
          { label: 'Owner', value: '' },
        ]}
      />,
    );
    expect(screen.queryByText('Due')).toBeNull();
    expect(screen.queryByText('Owner')).toBeNull();
    expect(container.querySelectorAll('.crewlet-fact-line__set-by')).toHaveLength(1);
  });

  test('draws nothing at all when no fact has a value', () => {
    const { container } = render(<FactLine facts={[{ label: 'Due', value: null }]} />);
    expect(container.firstChild).toBeNull();
  });

  test("a value clamps at two lines; a token keeps one; a set and a whole value are never clamped", () => {
    const { container } = render(
      <FactLine
        facts={[
          { label: 'Runtime', value: 'not running on this node' },
          { label: 'Type', value: 'turn.guard_breach', token: true },
          { label: 'Roles', value: <span>ingress seats workers</span>, set: true },
          { label: 'Cron', value: <span>*/20 * * * *</span>, whole: true },
        ]}
      />,
    );
    const values = [...container.querySelectorAll('.crewlet-fact-line__value')];
    const clamped = values.map((value) => value.classList.contains('crewlet-fact-line__value--clamp'));
    expect(clamped).toEqual([true, false, false, false]);
    expect(values[1]!.classList.contains('crewlet-fact-line__value--token')).toBe(true);
    const facts = [...container.querySelectorAll('.crewlet-fact-line__fact')];
    expect(facts[1]!.classList.contains('crewlet-fact-line__fact--token')).toBe(true);
    expect(facts[2]!.classList.contains('crewlet-fact-line__fact--set')).toBe(true);
    expect(css()).toMatch(/\.crewlet-fact-line__fact--set\s*\{\s*grid-column:\s*span 2;/);
  });

  test("a fact's note and by-line sit in the same cell as its value", () => {
    const { container } = render(
      <FactLine facts={[{ label: 'Cache', value: '37%', note: '16.8k of 46.0k input read from cache', setBy: SET }]} />,
    );
    const fact = container.querySelector('.crewlet-fact-line__fact')!;
    expect([...fact.children].map((child) => child.className)).toEqual([
      'crewlet-fact-line__label',
      'crewlet-fact-line__body',
    ]);
    const body = fact.querySelector('.crewlet-fact-line__body')!;
    expect([...body.children].map((child) => child.className.split(' ')[0])).toEqual([
      'crewlet-fact-line__value',
      'crewlet-fact-line__note',
      'crewlet-set-by',
    ]);
  });

  test('a footnote cannot set its fact\'s column or its row', () => {
    // A GRID WITH A REGULAR TRACK, not a flex row sized to content: measured
    // before, "v1" under a 146px "set by Agent CEO · 2m ago" beside three
    // note-less facts at 66 to 75px drew five columns placed at random.
    const sheet = css().replace(/\/\*[\s\S]*?\*\//g, ' ');
    const rule = (selector: string) =>
      new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(sheet)?.[1] ?? '';
    const line = rule('.crewlet-fact-line');
    expect(line).toMatch(/display:\s*grid/);
    expect(line).toMatch(/grid-template-columns:\s*repeat\(/);
    // A turn's seven facts fit one line at 1280, where the line is 984px wide.
    const floor = Number(/minmax\((?:min\()?([\d.]+)rem/.exec(line)?.[1]) * 16;
    expect(line).toMatch(/column-gap:\s*var\(--spacing-4\)/);
    expect(7 * floor + 6 * 16).toBeLessThanOrEqual(984);
    // Every fact sits on the same two bands, its notes in its value's cell.
    const fact = rule('.crewlet-fact-line__fact');
    expect(fact).toMatch(/grid-template-rows:\s*subgrid/);
    expect(fact).toMatch(/grid-row:\s*span 2/);
    // The track bounds a note; a cap on top of it would only cut one early.
    expect(sheet).not.toMatch(/\.crewlet-fact-line__note[^{]*\{[^}]*max-width/);
  });

  test('a fact with a page links its value', () => {
    render(<FactLine facts={[{ label: 'Seat', value: 'Operations lead', href: '#/agents/ops' }]} />);
    expect(screen.getByRole('link', { name: 'Operations lead' }).getAttribute('href')).toBe('#/agents/ops');
  });
});

describe('ObjectHeader', () => {
  test('draws no fact line when the caller passes none, and keeps the state marks', () => {
    const { container } = render(
      <ObjectHeader size="peek" kind="Item" identifier="LEAD-1" title="Test purpose" status={<span>Blocked</span>} />,
    );
    expect(container.querySelector('.crewlet-fact-line')).toBeNull();
    expect(screen.getByText('LEAD-1')).toBeTruthy();
    expect(screen.getByText('Blocked')).toBeTruthy();
  });

  test('its title is a level-two heading in every frame', () => {
    render(<ObjectHeader kind="Person" title="Lee Park" facts={[{ label: 'Stage', value: 'Active' }]} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Lee Park' })).toBeTruthy();
    expect(screen.getByText('Stage')).toBeTruthy();
  });

  test('carries no axe violation', async () => {
    const { container } = render(
      <main>
        <h1>People</h1>
        <ObjectHeader
          kind="Person"
          identifier="lee"
          title="Lee Park"
          status={<span>Active</span>}
          actions={<button type="button">Suspend</button>}
          facts={[
            { label: 'Seat', value: 'Operations lead', href: '#/agents/ops', setBy: SET },
            { label: 'Access', value: 'Worklet, Doclet' },
          ]}
        />
      </main>,
    );
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
      resultTypes: ['violations'],
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('ObjectHeader description', () => {
  test('draws the author sentence under the title, quieter than it and clamped to two lines', () => {
    render(<ObjectHeader kind="Sheet" title="Pipeline health" description="Where every deal stands this week." />);
    const sentence = screen.getByText('Where every deal stands this week.');
    expect(sentence.className).toBe('crewlet-object-header__description');
    expect(sentence.previousElementSibling?.className).toBe('crewlet-object-header__head');
    const rule = /\.crewlet-object-header__description\s*\{([^}]*)\}/.exec(css())?.[1] ?? '';
    expect(rule).toMatch(/font-size:\s*var\(--font-size-compact\)/);
    expect(rule).toMatch(/color:\s*var\(--color-text-secondary\)/);
    expect(rule).toMatch(/line-clamp:\s*2/);
  });

  test('draws nothing for no description', () => {
    const { container } = render(<ObjectHeader kind="Sheet" title="Pipeline health" />);
    expect(container.querySelector('.crewlet-object-header__description')).toBeNull();
  });
});

// SENTENCE CASE: the micro-caps are a table's column head, and over an
// object's name ("UNIT", then TYPE, LEAD and SEATS) they read as a form.
test('the eyebrow and the fact labels keep the words as written', () => {
  const rule = (selector: string) => {
    const at = css().indexOf(`${selector} {`);
    return css().slice(at, css().indexOf('}', at));
  };
  for (const selector of ['.crewlet-object-header__eyebrow', '.crewlet-fact-line__label']) {
    expect(rule(selector)).not.toMatch(/text-transform/);
    expect(rule(selector)).toMatch(/font-size:\s*var\(--font-size-xs\)/);
  }
});

test('draws a mark on its own plate beside the header, and only when given one', () => {
  const { container, rerender } = render(<ObjectHeader kind="Integration" title="Slack" />);
  expect(container.querySelector('.crewlet-object-header__mark')).toBeNull();
  expect(container.querySelector('.crewlet-object-header--marked')).toBeNull();
  rerender(<ObjectHeader kind="Integration" title="Slack" mark={<svg data-testid="mark" />} description="Each agent posts as its own bot." />);
  const plate = container.querySelector('.crewlet-object-header__mark')!;
  expect(plate.getAttribute('aria-hidden')).toBe('true');
  expect(plate.querySelector('[data-testid="mark"]')).toBeTruthy();
  const body = container.querySelector('.crewlet-object-header__body')!;
  expect(body.querySelector('h2')!.textContent).toBe('Slack');
  expect(body.textContent).toContain('Each agent posts as its own bot.');
});

test('a fact line holds two sizes: a note and a by-line are set as the label is', () => {
  const sheet = css();
  const label = /\.crewlet-fact-line__label\s*\{([^}]*)\}/.exec(sheet)?.[1]?.match(/font-size:\s*([^;]+);/)?.[1];
  const note = /\.crewlet-fact-line__note,\s*\.crewlet-fact-line__set-by\s*\{([^}]*)\}/.exec(sheet)?.[1]?.match(/font-size:\s*([^;]+);/)?.[1];
  expect(label).toBe('var(--font-size-xs)');
  expect(note).toBe(label);
});
