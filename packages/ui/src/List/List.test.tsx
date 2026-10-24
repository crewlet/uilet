/**
 * A row that does something is a control, and a row that failed says so in
 * words as well as in colour.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { List, ListItem } from './index.js';
import { installSheets, px } from '../../../../apps/ui-tests/src/cascade.js';

afterEach(cleanup);

test('a row that goes somewhere is an anchor, and one that acts is a button', () => {
  // Never a div with a click handler: that row is not reached by Tab, not
  // activated by Enter, and announced as nothing at all.
  const onClick = vi.fn();
  render(
    <List variant="divided">
      <ListItem href="#/turns/t-1">Turn t-1</ListItem>
      <ListItem href="#/turns/t-2" trailing="4m ago">
        Turn t-2
      </ListItem>
      <ListItem onClick={onClick}>Retry</ListItem>
      <ListItem>Nothing to do here</ListItem>
    </List>,
  );

  expect(screen.getByRole('link', { name: 'Turn t-1' }).getAttribute('href')).toBe('#/turns/t-1');
  // The slots sit inside the control, so they are part of its name, and a row
  // showing a time beside an id was announced as "Turn t-24m ago".
  expect(screen.getByRole('link', { name: 'Turn t-2 4m ago' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onClick).toHaveBeenCalledTimes(1);
  // A row with nothing to do is not a control and takes no tab stop.
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getAllByRole('button')).toHaveLength(1);
});

test('a failed row carries a word beside its rail', () => {
  // The rail is the scannable half. A reader who cannot tell its hue from the
  // row above still meets a mark and a word.
  render(
    <List>
      <ListItem tone="danger" dangerLabel="Failed">
        publish_event
      </ListItem>
      <ListItem tone="danger" dangerLabel="Failed" href="#/events/e-1">
        deliver_event
      </ListItem>
    </List>,
  );
  expect(screen.getAllByText('Failed')[0]?.className).toContain('crewlet-visually-hidden');
  // AND THE WORD IS SEPARATED FROM THE ROW'S OWN. An accessible name is its
  // parts concatenated with nothing between them, so the link was announced as
  // "Faileddeliver_event" until the space became a text node of its own.
  expect(screen.getByRole('link', { name: 'Failed deliver_event' })).toBeDefined();
});

test('the selected row says so on the control a reader lands on', () => {
  render(
    <List>
      <ListItem href="#/a">A</ListItem>
      <ListItem href="#/b" selected>
        B
      </ListItem>
      <ListItem selected>C</ListItem>
    </List>,
  );
  // On the LINK, not on the row around it: a reader moving through a list by
  // link hears only what each link carries.
  expect(screen.getByRole('link', { name: 'A' }).getAttribute('aria-current')).toBeNull();
  expect(screen.getByRole('link', { name: 'B' }).getAttribute('aria-current')).toBe('true');
  const rows = screen.getAllByRole('listitem');
  expect(rows[1]?.getAttribute('aria-current')).toBeNull();
  // A row with no control of its own still says it, on itself.
  expect(rows[2]?.getAttribute('aria-current')).toBe('true');
});

test('a numbered list is an ol and the rest are ul, because the element is the claim', () => {
  const { container: numbered } = render(
    <List variant="numbered">
      <ListItem>one</ListItem>
    </List>,
  );
  expect(numbered.querySelector('ol')).not.toBeNull();

  const { container: plain } = render(
    <List variant="plain">
      <ListItem>one</ListItem>
    </List>,
  );
  expect(plain.querySelector('ul')).not.toBeNull();
});

test('a numbered and divided list is an ol too, its rows framed by the variant', () => {
  // The position is the list's claim, so the element carries it; the drawn
  // figure is the stylesheet's counter and is not a second copy in the text.
  const { container } = render(
    <List variant="numbered-divided">
      <ListItem>Every amount is exact to the cent.</ListItem>
      <ListItem>Ask before deleting anything.</ListItem>
    </List>,
  );
  const list = container.querySelector('ol')!;
  expect(list.classList.contains('crewlet-list--numbered-divided')).toBe(true);
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Every amount is exact to the cent.',
    'Ask before deleting anything.',
  ]);
});

test('the column template is set once, on the list', () => {
  // Set per row it lines nothing up, which is the whole reason it belongs to
  // the list.
  const { container } = render(
    <List template="auto 1fr auto">
      <ListItem>one</ListItem>
      <ListItem>two</ListItem>
    </List>,
  );
  const root = container.querySelector('.crewlet-list') as HTMLElement;
  expect(root.style.getPropertyValue('--crewlet-list-template')).toBe('auto 1fr auto');
  expect(container.querySelectorAll('.crewlet-list__row--templated')).toHaveLength(2);
});

test('a list is divided unless it is asked not to be', () => {
  // The list every screen draws: a feed, a set of results, a conversation.
  // Rows a reader scans down want a boundary they can count, and an undivided
  // stack of them is a table that threw its rules away. `plain` stays one word
  // away, for a group where a hairline would draw a table nobody asked for.
  const { container } = render(
    <List>
      <List.Item>publish_event</List.Item>
      <List.Item>deliver_event</List.Item>
    </List>,
  );
  expect(container.querySelector('.crewlet-list')?.className).toContain('crewlet-list--divided');

  cleanup();
  const { container: plain } = render(
    <List variant="plain">
      <List.Item>publish_event</List.Item>
    </List>,
  );
  expect(plain.querySelector('.crewlet-list')?.className).toContain('crewlet-list--plain');
  expect(plain.querySelector('.crewlet-list')?.className).not.toContain('crewlet-list--divided');
});

test('a compact numbered list sets its rows a small step apart in the body’s size, and comfortable is unchanged', () => {
  const remove = installSheets('List/List.css');
  try {
    const { container } = render(
      <>
        <List variant="numbered-divided" aria-label="Comfortable">
          <ListItem>Every amount is exact to the cent.</ListItem>
        </List>
        <List variant="numbered-divided" density="compact" aria-label="Compact">
          <ListItem>Every amount is exact to the cent.</ListItem>
        </List>
      </>,
    );
    const [comfortable, compact] = [...container.querySelectorAll<HTMLElement>('.crewlet-list__row')];
    expect(container.querySelector('[aria-label="Comfortable"]')?.className).not.toContain('crewlet-list--compact');
    expect(px(comfortable!, 'padding-top')).toBe(12);
    // The logical property as written: jsdom keeps it rather than expanding
    // it onto the physical sides.
    expect(px(compact!, 'padding-block')).toBe(8);
    expect(px(compact!, 'padding-left')).toBe(16);
    expect(px(compact!, 'font-size')).toBe(14);
  } finally {
    remove();
  }
});

test('a list asked for a measure holds its words to it, and the row still spans the list', () => {
  const remove = installSheets('List/List.css');
  try {
    const { container } = render(
      <>
        <List variant="numbered-divided" aria-label="Unbounded">
          <ListItem>Every amount is exact to the cent.</ListItem>
        </List>
        <List variant="numbered-divided" measure="normal" aria-label="Normal">
          <ListItem>Every amount is exact to the cent.</ListItem>
        </List>
        <List variant="numbered-divided" density="compact" measure="wide" aria-label="Wide">
          <ListItem>Every amount is exact to the cent.</ListItem>
        </List>
      </>,
    );
    const words = (name: string) =>
      container.querySelector<HTMLElement>(`[aria-label="${name}"] .crewlet-list__content`)!;
    expect(['', 'none']).toContain(getComputedStyle(words('Unbounded')).getPropertyValue('max-inline-size'));
    // The helper resolves the length tokens: 68ch and 80ch at its 7px character.
    const normal = px(words('Normal'), 'max-inline-size');
    const wide = px(words('Wide'), 'max-inline-size');
    expect(normal).toBeGreaterThan(0);
    expect(wide).toBeGreaterThan(normal);
    expect(['', 'none']).toContain(
      getComputedStyle(container.querySelector<HTMLElement>('[aria-label="Wide"] .crewlet-list__row')!).getPropertyValue(
        'max-inline-size',
      ),
    );
  } finally {
    remove();
  }
});
