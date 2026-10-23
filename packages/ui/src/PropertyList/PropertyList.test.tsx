/**
 * What an absent property means, how the sections share one column, and who
 * is said to have set what.
 *
 * Four different facts share one empty cell: the object has no such property;
 * it has it and it holds nothing; the emptiness itself means something; or the
 * whole section is empty and means one thing rather than four. The other half
 * is the attribution, with two rules of its own: one line per CHANGE rather
 * than per row, and never a line under a value that is not there.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { EMPTY_VALUE } from '../EmptyValue/index.js';
import { PropertyList } from './index.js';

afterEach(cleanup);

/** The value drawn beside a label, or null when the label is not there. */
function valueOf(label: string): string | null {
  const term = screen.queryByText(label)?.closest('dt');
  const detail = term?.nextElementSibling;
  return detail ? detail.textContent : null;
}

const setBys = (container: HTMLElement) =>
  [...container.querySelectorAll('.crewlet-property-list__set-by')].map((line) => line.textContent);

describe('an absent property', () => {
  test('draws the dash and its words when the property exists and holds nothing', () => {
    render(<PropertyList groups={[{ items: [{ label: 'Due' }, { label: 'Start', value: '' }] }]} />);
    expect(valueOf('Due')).toBe(`${EMPTY_VALUE}Not set`);
    expect(valueOf('Start')).toBe(`${EMPTY_VALUE}Not set`);
  });

  test('reads the absence in the words the caller names', () => {
    render(<PropertyList emptyLabel="Not configured" groups={[{ items: [{ label: 'Model' }] }]} />);
    expect(valueOf('Model')).toBe(`${EMPTY_VALUE}Not configured`);
  });

  test('keeps zero and false, which are values a property can hold', () => {
    render(
      <PropertyList
        groups={[
          {
            items: [
              { label: 'Hand-offs', value: 0 },
              { label: 'Archived', value: 'no' },
            ],
          },
        ]}
      />,
    );
    expect(valueOf('Hand-offs')).toBe('0');
    expect(valueOf('Archived')).toBe('no');
  });

  test('collapses a section the caller said one thing about, keeping its heading', () => {
    const { container } = render(
      <PropertyList
        groups={[
          {
            name: 'Plan',
            whenAllAbsent: 'Nothing scheduled: no dates, no estimate, no size.',
            items: [{ label: 'Start' }, { label: 'Due' }, { label: 'Estimate', value: '' }],
          },
          {
            name: 'State',
            whenAllAbsent: 'Nothing is known about this.',
            items: [{ label: 'Status', value: 'todo' }, { label: 'Type' }],
          },
        ]}
      />,
    );
    expect(screen.getByText('Nothing scheduled: no dates, no estimate, no size.')).toBeTruthy();
    for (const gone of ['Start', 'Due', 'Estimate']) expect(screen.queryByText(gone)).toBeNull();
    expect(screen.getByText('Plan')).toBeTruthy();
    // The section that HAS something keeps every row, its dash included.
    expect(screen.queryByText('Nothing is known about this.')).toBeNull();
    expect(valueOf('Status')).toBe('todo');
    expect(valueOf('Type')).toBe(`${EMPTY_VALUE}Not set`);
    expect(container.querySelectorAll('.crewlet-property-list__empty')).toHaveLength(1);
  });

  test('keeps every dash when the caller named no sentence for the section', () => {
    const { container } = render(<PropertyList groups={[{ name: 'Plan', items: [{ label: 'Due' }] }]} />);
    expect(valueOf('Due')).toBe(`${EMPTY_VALUE}Not set`);
    expect(container.querySelectorAll('.crewlet-property-list__empty')).toHaveLength(0);
  });
});

describe('the shape', () => {
  test('is one description list per section, named by its heading', () => {
    const { container } = render(
      <PropertyList
        groups={[
          { name: 'State', items: [{ label: 'Status', value: 'todo' }] },
          { name: 'Plan', items: [{ label: 'Due', value: 'Friday' }] },
        ]}
      />,
    );
    const lists = [...container.querySelectorAll('dl')];
    expect(lists).toHaveLength(2);
    const names = lists.map((list) => document.getElementById(list.getAttribute('aria-labelledby')!)?.textContent);
    expect(names).toEqual(['State', 'Plan']);
    // Every section is a direct child of the one grid, which is what lets it
    // be a subgrid of it and share the term column.
    const root = container.firstElementChild!;
    for (const list of lists) expect(list.parentElement).toBe(root);
  });

  test('only the first heading of the list is its first child', () => {
    // Which is what decides whether a heading draws the hairline above it.
    const { container } = render(
      <PropertyList
        groups={[
          { name: 'State', items: [{ label: 'Status', value: 'todo' }] },
          { name: 'Plan', items: [{ label: 'Due', value: 'Friday' }] },
        ]}
      />,
    );
    const headings = [...container.querySelectorAll('.crewlet-property-list__heading')];
    expect(headings.map((heading) => heading.matches(':first-child'))).toEqual([true, false]);
  });

  test('a list that opens with rows of no section leaves its first heading the hairline', () => {
    const { container } = render(
      <PropertyList
        groups={[
          { items: [{ label: 'Status', value: 'todo' }] },
          { name: 'Fields', items: [{ label: 'Due', value: 'Friday' }] },
        ]}
      />,
    );
    expect(container.querySelector('.crewlet-property-list__heading')!.matches(':first-child')).toBe(false);
    expect(container.querySelector('dl')!.hasAttribute('aria-labelledby')).toBe(false);
  });

  test('links a value the caller gave a page, and nothing else', () => {
    const { container } = render(
      <PropertyList
        groups={[
          {
            items: [
              { label: 'Turn', value: 't-1', href: '#/live/turns/t-1' },
              { label: 'Points', value: 3 },
            ],
          },
        ]}
      />,
    );
    const links = container.querySelectorAll('dd a');
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute('href')).toBe('#/live/turns/t-1');
  });

  test('sets an identifier label in the mono face, and a word not, with its hover sentence', () => {
    render(
      <PropertyList
        groups={[
          {
            items: [
              { label: 'GITHUB_TOKEN', value: '${GH}', identifierLabel: true },
              { label: 'Reports to', value: 'ada', title: 'The seat this one answers to' },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByText('GITHUB_TOKEN').className).toBe('crewlet-property-list__identifier');
    const word = screen.getByText('Reports to');
    expect(word.className).toBe('');
    expect(word.getAttribute('title')).toBe('The seat this one answers to');
  });

  test('sets its headings in the case the caller asks for', () => {
    const { container, rerender } = render(<PropertyList groups={[]} />);
    expect(container.firstElementChild!.className).toContain('crewlet-property-list--eyebrow');
    rerender(<PropertyList groups={[]} headings="sentence" />);
    expect(container.firstElementChild!.className).toContain('crewlet-property-list--sentence');
  });
});

describe('who set it', () => {
  const CREATE = { actor: 'agent-ceo', ago: '21h ago', turnHref: '#/live/turns/t-1' };

  test('says one change once, naming every property it set, under the last of them', () => {
    const { container } = render(
      <PropertyList
        groups={[
          {
            items: [
              { label: 'Status', value: 'todo', setBy: CREATE },
              { label: 'Priority', value: 'none', setBy: CREATE },
              { label: 'Type', value: 'Task', setBy: CREATE },
            ],
          },
        ]}
      />,
    );
    expect(setBys(container)).toEqual(['Status, Priority and Type · set by agent-ceo · 21h ago · turn ']);
    const line = container.querySelector('.crewlet-property-list__set-by')!;
    expect(line.closest('dd')!.previousElementSibling!.textContent).toBe('Type');
  });

  test('keeps two changes apart that read alike, by the change the caller names', () => {
    const { container } = render(
      <PropertyList
        groups={[
          {
            items: [
              { label: 'Status', value: 'in_progress', setBy: CREATE, change: '10:00' },
              { label: 'Type', value: 'Task', setBy: CREATE, change: '09:00' },
            ],
          },
        ]}
      />,
    );
    const lines = setBys(container);
    expect(lines).toHaveLength(2);
    // Neither names a field: a line covering its own row is labelled by it.
    for (const line of lines) expect(line).not.toContain('Status');
  });

  test('draws no attribution under a value that is not there, and the run ends at it', () => {
    const { container } = render(
      <PropertyList
        groups={[
          {
            items: [
              { label: 'Status', value: 'todo', setBy: CREATE },
              { label: 'Priority', setBy: CREATE },
              { label: 'Type', value: 'Task', setBy: CREATE },
            ],
          },
        ]}
      />,
    );
    expect(setBys(container)).toEqual([
      'set by agent-ceo · 21h ago · turn ',
      'set by agent-ceo · 21h ago · turn ',
    ]);
    expect(valueOf('Priority')).toBe(`${EMPTY_VALUE}Not set`);
  });

  test('says who cleared a value, the one blank with a record', () => {
    const { container } = render(
      <PropertyList groups={[{ items: [{ label: 'Due', setBy: { actor: 'ada', ago: '2h ago', cleared: true } }] }]} />,
    );
    expect(setBys(container)).toEqual(['cleared by ada · 2h ago']);
  });

  test('a collapsed section takes its attributions with it', () => {
    const { container } = render(
      <PropertyList
        groups={[
          {
            name: 'Plan',
            whenAllAbsent: 'Nothing scheduled.',
            items: [{ label: 'Due', setBy: { ...CREATE, cleared: true } }],
          },
        ]}
      />,
    );
    expect(setBys(container)).toEqual([]);
  });
});

describe('the stylesheet', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'PropertyList.css'), 'utf8');

  test('reads its term column from the description list measure', () => {
    // One measure for every key-value surface on a page: set once, a list of
    // properties starts its values where the page's cards start theirs.
    expect(css).toMatch(/grid-template-columns: var\(--crewlet-description-list-term,/);
  });

  test('lays each section on the list tracks, at every width', () => {
    expect(css).toMatch(
      /\.crewlet-property-list > \.crewlet-property-list__group \{[^}]*grid-template-columns: subgrid;/,
    );
  });
});
