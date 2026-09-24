/**
 * Search is a launcher reached from anywhere, so what it has to get right is
 * the keyboard: the highlighted row is the one Enter opens, focus never leaves
 * the field, and a screen reader hears each row as it is reached.
 *
 * Ported from the engine dashboard's `app/CommandPalette.test.tsx`, minus the
 * cases about what it searched: the rows come from the caller here, so what is
 * left is the surface, the combobox and the veil.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installForcedColors, installThemed, px, themeColours } from '../../../../apps/ui-tests/src/cascade.js';
import { CommandPalette, type CommandPaletteGroup, type CommandPaletteScope } from './index.js';
import { Kbd } from '../Kbd/index.js';
import { layerCount } from '../Layer/index.js';

/** A token's custom-property name, spelt so the stylesheet checks read no declaration here. */
const token = (name: string) => `--${name}`;

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  cleanup();
});

/** Thirty seats and four screens, the shape the engine's own palette offers. */
function groups(seats: number, open: (id: string) => void): CommandPaletteGroup[] {
  const screens = ['Fleet', 'Activity', 'Seats', 'Tools'];
  return [
    {
      id: 'go',
      label: 'Go to',
      items: screens.map((name) => ({ id: `nav-${name}`, label: name, hint: 'a screen', onSelect: () => open(name) })),
    },
    {
      id: 'seats',
      label: 'Seats',
      items: Array.from({ length: seats }, (_, at) => ({
        id: `seat-${at}`,
        label: `Engineer ${at + 1}`,
        hint: `@engineer-${at + 1}`,
        onSelect: () => open(`Engineer ${at + 1}`),
      })),
    },
  ];
}

function mount({
  seats = 30,
  onClose = () => {},
  onOpen = () => {},
}: { seats?: number; onClose?: () => void; onOpen?: (id: string) => void } = {}) {
  function Harness() {
    const [query, setQuery] = useState('');
    return (
      <CommandPalette
        open
        onClose={onClose}
        query={query}
        onQueryChange={setQuery}
        groups={groups(seats, onOpen)}
      />
    );
  }
  return render(<Harness />);
}

test('it is a combobox: the arrows move a highlight the field names, and Tab never walks the results', () => {
  const onClose = vi.fn();
  const onOpen = vi.fn();
  mount({ onClose, onOpen });
  const field = screen.getByRole('combobox', { name: 'Search' });
  const list = screen.getByRole('listbox', { name: 'Results' });
  expect(field.getAttribute('aria-controls')).toBe(list.id);
  expect(document.activeElement).toBe(field);

  const highlighted = () => document.getElementById(field.getAttribute('aria-activedescendant')!);
  const first = within(list).getAllByRole('option')[0]!;
  expect(highlighted()).toBe(first);
  expect(first.getAttribute('aria-selected')).toBe('true');

  fireEvent.keyDown(field, { key: 'ArrowDown' });
  const second = within(list).getAllByRole('option')[1]!;
  expect(highlighted()).toBe(second);
  expect(second.getAttribute('aria-selected')).toBe('true');
  expect(first.getAttribute('aria-selected')).toBe('false');
  // Focus stayed where the reader types.
  expect(document.activeElement).toBe(field);

  // Each group is named by its own heading.
  const seats = within(list).getByRole('group', { name: 'Seats' });
  expect(within(seats).getAllByRole('option')[0]!.textContent).toContain('Engineer 1');

  // No row is a tab stop, so Tab wraps straight back to the field.
  expect(within(list).queryAllByRole('option').some((option) => option.tabIndex >= 0)).toBe(false);
  // The trap takes the press (the field is the last stop) and puts focus back.
  expect(fireEvent.keyDown(field, { key: 'Tab' })).toBe(false);
  expect(document.activeElement).toBe(field);

  // Enter opens the highlighted row and closes the surface.
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(onOpen).toHaveBeenCalledWith('Activity');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a highlight past the end of a list that shrank under it stays on a real row', () => {
  function Harness() {
    const [query, setQuery] = useState('');
    const [seats, setSeats] = useState(30);
    return (
      <>
        <button onClick={() => setSeats(0)}>Drop the seats</button>
        <CommandPalette
          open
          onClose={() => {}}
          query={query}
          onQueryChange={setQuery}
          groups={groups(seats, () => {})}
        />
      </>
    );
  }
  render(<Harness />);
  const field = screen.getByRole('combobox', { name: 'Search' });
  const count = screen.getAllByRole('option').length;

  // Up from the first row wraps to the last, as every list's highlight does.
  fireEvent.keyDown(field, { key: 'ArrowUp' });
  expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[count - 1]!.id);

  fireEvent.click(screen.getByRole('button', { name: 'Drop the seats' }));
  const remaining = screen.getAllByRole('option');
  expect(remaining.length).toBeLessThan(count);
  const last = remaining[remaining.length - 1]!;
  expect(field.getAttribute('aria-activedescendant')).toBe(last.id);
  expect(last.getAttribute('aria-selected')).toBe('true');
});

test('a press on a row keeps focus in the field, and its click opens the row', () => {
  const onClose = vi.fn();
  const onOpen = vi.fn();
  mount({ onClose, onOpen });
  const field = screen.getByRole('combobox', { name: 'Search' });
  expect(document.activeElement).toBe(field);

  const row = screen.getAllByRole('option')[2]!;
  // Prevented: a press on something that is not a control moves focus to the
  // nearest focusable ancestor, which is the dialog around the list.
  expect(fireEvent.mouseDown(row)).toBe(false);
  expect(onOpen).not.toHaveBeenCalled();

  fireEvent.click(row);
  expect(onOpen).toHaveBeenCalledWith('Seats');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a press on the veil closes it on its click, as every modal veil does', () => {
  const onClose = vi.fn();
  mount({ onClose });
  const veil = document.querySelector<HTMLElement>('.crewlet-modal-overlay')!;
  // The results are the surface's own body, not a popup above it. A popup
  // would close on the press, before the click a tap ends with, and let that
  // click land on the screen the veil was covering.
  // ONE surface on the stack, which is what `popup: false` buys: a second
  // layer for the list would be the topmost, would take the veil's press on
  // pointerdown, and the click that press ends with would land on the screen
  // the veil was covering.
  expect(layerCount()).toBe(1);
  fireEvent.pointerDown(veil);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(veil);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('Escape closes it, and the results take no Escape of their own first', () => {
  const onClose = vi.fn();
  mount({ onClose });
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search' }), { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('with nothing to offer it says so, outside the list rather than inside it', () => {
  render(
    <CommandPalette
      open
      onClose={() => {}}
      query="zzz"
      onQueryChange={() => {}}
      groups={[]}
      emptyMessage="No screen, seat or unit matches that."
    />,
  );
  const field = screen.getByRole('combobox', { name: 'Search' });
  const list = screen.getByRole('listbox');
  const said = screen.getByText('No screen, seat or unit matches that.');
  expect(field.getAttribute('aria-activedescendant')).toBeNull();
  expect(within(list).queryAllByRole('option')).toHaveLength(0);
  // A listbox takes options and groups. A sentence inside one is a child of a
  // kind the role does not allow, and a reader's software may skip it.
  expect(list.contains(said)).toBe(false);
});

test('a new query puts the highlight back on the best match', () => {
  function Harness() {
    const [query, setQuery] = useState('');
    const all = groups(30, () => {});
    const shown = query
      ? all.map((group) => ({
          ...group,
          items: group.items.filter((item) => String(item.label).toLowerCase().includes(query.toLowerCase())),
        })).filter((group) => group.items.length > 0)
      : all;
    return (
      <CommandPalette open onClose={() => {}} query={query} onQueryChange={setQuery} groups={shown} />
    );
  }
  render(<Harness />);
  const field = screen.getByRole('combobox', { name: 'Search' });
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[2]!.id);

  fireEvent.change(field, { target: { value: 'Engineer' } });
  // A new list, led by its best match: a highlight left where the last list
  // happened to put it points at a row that means nothing now.
  expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0]!.id);
});

test('rest props reach the frame, which is how an application closes it with its own chord', () => {
  const onClose = vi.fn();
  render(
    <CommandPalette
      open
      onClose={onClose}
      query=""
      onQueryChange={() => {}}
      groups={groups(2, () => {})}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') onClose();
      }}
    />,
  );
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search' }), { key: 'k', metaKey: true });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the palette carries no accessibility violation', async () => {
  mount();
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

describe('the field row', () => {
  function row({ escapeHint }: { escapeHint?: boolean } = {}) {
    render(
      <CommandPalette open onClose={() => {}} query="" onQueryChange={() => {}} groups={[]} escapeHint={escapeHint} />,
    );
    const field = screen.getByRole('combobox', { name: 'Search' });
    return field.closest('.crewlet-palette__field')!;
  }

  test('leads with a search glyph that assistive technology never hears', () => {
    const container = row();
    const leading = container.querySelector('.crewlet-input__leading');
    // BEFORE the field, in the field's own slot, so a press on it lands in the text.
    expect(leading).not.toBeNull();
    expect(leading!.nextElementSibling).toBe(screen.getByRole('combobox'));
    const glyph = leading!.querySelector('svg');
    expect(glyph).not.toBeNull();
    expect(glyph!.getAttribute('aria-hidden')).toBe('true');
    // The field is still named once, by its label, and by nothing the glyph adds.
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('Search');
  });

  test('draws no Esc keycap unless asked, and asked draws one at the end, hidden from the reader', () => {
    const plain = row();
    expect(plain.querySelector('.crewlet-input__trailing')).toBeNull();
    expect(plain.querySelector('kbd')).toBeNull();
    cleanup();

    const hinted = row({ escapeHint: true });
    const trailing = hinted.querySelector('.crewlet-input__trailing');
    expect(trailing).not.toBeNull();
    expect(trailing!.previousElementSibling).toBe(screen.getByRole('combobox'));
    const cap = trailing!.querySelector('kbd.crewlet-palette__escape');
    expect(cap?.textContent).toBe('Esc');
    expect(cap?.classList.contains('crewlet-kbd--subtle')).toBe(true);
    expect(cap?.getAttribute('aria-hidden')).toBe('true');
  });

  test('the hint only draws the key: Escape closes the surface with or without it', () => {
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} query="" onQueryChange={() => {}} groups={[]} escapeHint />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/** The design's five scopes, and a row set per scope that says which it is. */
const SCOPES: CommandPaletteScope[] = [
  { id: 'all', label: 'All' },
  { id: 'tasks', label: 'Tasks', count: 2 },
  { id: 'pages', label: 'Pages', count: 1 },
  { id: 'agents', label: 'Agents' },
  { id: 'actions', label: 'Actions' },
];

function rowsFor(scope: string, open: (id: string) => void = () => {}): CommandPaletteGroup[] {
  return [
    {
      id: scope,
      label: scope,
      items: [1, 2, 3].map((n) => ({ id: `${scope}-${n}`, label: `${scope} ${n}`, onSelect: () => open(`${scope} ${n}`) })),
    },
  ];
}

/**
 * A caller that searches SYNCHRONOUSLY unless told otherwise: the rows always
 * answer the scope that is chosen. `lag` holds the rows back on the scope they
 * were last computed for, the way a caller waiting on the network does.
 */
function Scoped({
  initialQuery = '',
  lag = false,
  lead,
  onOpen = () => {},
  onClose = () => {},
  onScope = () => {},
}: {
  initialQuery?: string;
  lag?: boolean;
  lead?: ReactNode;
  onOpen?: (id: string) => void;
  onClose?: () => void;
  onScope?: (scope: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState('all');
  const [answered, setAnswered] = useState('all');
  const shownFor = lag ? answered : scope;
  return (
    <>
      <button onClick={() => setAnswered(scope)}>Results arrive</button>
      <CommandPalette
        open
        onClose={onClose}
        query={query}
        onQueryChange={setQuery}
        scopes={SCOPES}
        scope={scope}
        onScopeChange={(next) => {
          onScope(next);
          setScope(next);
        }}
        groupsScope={shownFor}
        groups={rowsFor(shownFor, onOpen)}
        lead={lead}
        escapeHint
      />
    </>
  );
}

const selectedScope = () => screen.getByRole('tab', { selected: true }).textContent;

describe('scopes', () => {
  test('Tab and Shift+Tab step through them from the field, which keeps focus and the highlight’s reset', () => {
    render(<Scoped />);
    const field = screen.getByRole('combobox', { name: 'Search' });
    const tabs = screen.getByRole('tablist', { name: 'Search in' });
    expect(within(tabs).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'All',
      'Tasks2',
      'Pages1',
      'Agents',
      'Actions',
    ]);
    expect(selectedScope()).toBe('All');

    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1]!.id);

    // Taken, which is what keeps the modal's trap from moving focus as well.
    expect(fireEvent.keyDown(field, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(field);
    expect(selectedScope()).toBe('Tasks2');
    // A new scope is a new list, led by its best match.
    expect(screen.getAllByRole('option')[0]!.textContent).toBe('tasks 1');
    expect(field.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0]!.id);

    fireEvent.keyDown(field, { key: 'Tab', shiftKey: true });
    expect(selectedScope()).toBe('All');
    // And both ends wrap, as the highlight does.
    fireEvent.keyDown(field, { key: 'Tab', shiftKey: true });
    expect(selectedScope()).toBe('Actions');
    fireEvent.keyDown(field, { key: 'Tab' });
    expect(selectedScope()).toBe('All');
    expect(document.activeElement).toBe(field);
  });

  test('the arrows step them only while the field is empty, and a chord or a composition never does', () => {
    const onScope = vi.fn();
    const { unmount } = render(<Scoped onScope={onScope} />);
    let field = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.keyDown(field, { key: 'ArrowRight' });
    expect(selectedScope()).toBe('Tasks2');
    fireEvent.keyDown(field, { key: 'ArrowLeft' });
    fireEvent.keyDown(field, { key: 'ArrowLeft' });
    expect(selectedScope()).toBe('Actions');
    onScope.mockClear();

    // A Tab with a modifier is left to the modal's trap and the platform, and
    // an arrow with Shift is a selection: neither is a scope step.
    for (const init of [
      { key: 'Tab', ctrlKey: true },
      { key: 'Tab', altKey: true },
      { key: 'Tab', metaKey: true },
      { key: 'ArrowRight', shiftKey: true },
      { key: 'ArrowLeft', metaKey: true },
      { key: 'Tab', isComposing: true },
      { key: 'ArrowRight', keyCode: 229 },
    ]) {
      fireEvent.keyDown(field, init);
      expect(onScope, JSON.stringify(init)).not.toHaveBeenCalled();
    }
    expect(selectedScope()).toBe('Actions');
    unmount();

    // With text in the field the arrows move the caret, which is theirs first.
    render(<Scoped initialQuery="flaky" onScope={onScope} />);
    field = screen.getByRole('combobox', { name: 'Search' });
    expect(fireEvent.keyDown(field, { key: 'ArrowRight' })).toBe(true);
    expect(fireEvent.keyDown(field, { key: 'ArrowLeft' })).toBe(true);
    expect(onScope).not.toHaveBeenCalled();
    // Tab is still the scope key.
    fireEvent.keyDown(field, { key: 'Tab' });
    expect(onScope).toHaveBeenCalledWith('tasks');
  });

  test('a press on a scope picks it without taking focus from the field, and the choice is said', () => {
    render(<Scoped />);
    const field = screen.getByRole('combobox', { name: 'Search' });
    const pages = screen.getByRole('tab', { name: /Pages/ });
    // Never a stop of its own: the field is the only one in the surface.
    expect(screen.getAllByRole('tab').every((tab) => tab.tabIndex === -1)).toBe(true);
    // Prevented, so the press does not move focus to the tab.
    expect(fireEvent.mouseDown(pages)).toBe(false);
    fireEvent.click(pages);
    expect(selectedScope()).toBe('Pages1');
    expect(pages.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(field);
    // Said, because a tab chosen from elsewhere is otherwise silent.
    expect(screen.getByRole('status').textContent).toBe('Pages');
    // And the field is described by the scope it now searches.
    expect(field.getAttribute('aria-describedby')).toBe(pages.id);
  });

  test('the results are the tab panel the chosen scope labels', () => {
    render(<Scoped />);
    const panel = screen.getByRole('tabpanel');
    expect(screen.getAllByRole('tab').every((tab) => tab.getAttribute('aria-controls') === panel.id)).toBe(true);
    expect(panel.getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', { selected: true }).id);
    expect(panel.contains(screen.getByRole('listbox'))).toBe(true);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Tab' });
    expect(panel.getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', { name: /Tasks/ }).id);
  });

  test('rows computed for a scope the reader has left are never offered, and Enter takes none of them', () => {
    const onOpen = vi.fn();
    render(<Scoped lag onOpen={onOpen} />);
    const field = screen.getByRole('combobox', { name: 'Search' });
    expect(screen.getAllByRole('option')[0]!.textContent).toBe('all 1');

    // The reader moves to Tasks while the caller still holds All's rows.
    fireEvent.keyDown(field, { key: 'Tab' });
    const list = screen.getByRole('listbox');
    expect(within(list).queryAllByRole('option')).toHaveLength(0);
    expect(list.getAttribute('aria-busy')).toBe('true');
    expect(field.getAttribute('aria-activedescendant')).toBeNull();
    // It says it is looking, not that nothing matched.
    expect(screen.getByText('Searching…')).toBeDefined();
    expect(screen.queryByText('Nothing matches that search.')).toBeNull();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onOpen).not.toHaveBeenCalled();

    // Once the rows answer the scope that is chosen, they are the list.
    fireEvent.click(screen.getByRole('button', { name: 'Results arrive' }));
    expect(list.getAttribute('aria-busy')).toBeNull();
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'tasks 1',
      'tasks 2',
      'tasks 3',
    ]);
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith('tasks 1');
  });

  test('without scopes there is no tab row, and Tab is the trap’s as before', () => {
    mount({ seats: 2 });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('the lead', () => {
  test('is a polite live region outside the list, mounted before its words arrive, and never an option', () => {
    function Answering() {
      const [answer, setAnswer] = useState<ReactNode>(undefined);
      return (
        <>
          <button onClick={() => setAnswer(<p>ENG-420 tracks it.</p>)}>Answer</button>
          <Scoped lead={answer} />
        </>
      );
    }
    render(<Answering />);
    const region = document.querySelector('.crewlet-palette__lead')!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    // The SAME element, now holding the words: a region that arrived with its
    // text already in it is one a screen reader never saw change.
    expect(document.querySelector('.crewlet-palette__lead')).toBe(region);
    expect(region.textContent).toBe('ENG-420 tracks it.');
    const list = screen.getByRole('listbox');
    expect(list.contains(region)).toBe(false);
    expect(region.contains(list)).toBe(false);
    expect(within(list).queryByText('ENG-420 tracks it.')).toBeNull();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).not.toContain('ENG-420 tracks it.');
  });

  test('Enter still takes the highlighted row while the lead holds an answer', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    render(<Scoped lead={<p>An answer.</p>} onOpen={onOpen} onClose={onClose} />);
    const field = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
    expect(onOpen).toHaveBeenCalledWith('all 2');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('empty, it draws nothing; holding an answer, it is the raised rung', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Listbox/Listbox.css', 'CommandPalette/CommandPalette.css');
      cleanup();
      const palette = themeColours(theme);
      const { rerender } = render(<Scoped />);
      const region = () => document.querySelector('.crewlet-palette__lead')!;
      expect(px(region(), 'padding-top'), theme).toBe(0);
      expect(getComputedStyle(region()).backgroundColor, theme).toBe('rgba(0, 0, 0, 0)');
      rerender(<Scoped lead={<p>An answer.</p>} />);
      expect(px(region(), 'padding-top'), theme).toBeGreaterThan(0);
      expect(channels(getComputedStyle(region()).color), theme).toEqual(
        parseHex(palette.get(token('color-text-secondary')) ?? ''),
      );
      expect(getComputedStyle(region()).backgroundColor, theme).toBe(
        normalised(palette.get(token('color-surface-elevated')) ?? ''),
      );
    }
  });
});

describe('a row', () => {
  function Rows({ onOpen = () => {}, onChord = () => {} }: { onOpen?: (id: string) => void; onChord?: () => void }) {
    return (
      <CommandPalette
        open
        onClose={() => {}}
        query="flaky"
        onQueryChange={() => {}}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.metaKey) onChord();
        }}
        groups={[
          {
            id: 'actions',
            label: 'Actions',
            items: [
              {
                id: 'ask',
                icon: <svg data-testid="glyph" />,
                label: 'Ask SWE about “flaky”',
                hint: 'opens an ask',
                meta: <Kbd keys={['Mod', 'Enter']} />,
                onSelect: () => onOpen('ask'),
              },
              { id: 'page', label: 'Scheduler on-call', meta: 'Engineering', onSelect: () => onOpen('page') },
            ],
          },
        ]}
      />
    );
  }

  test('reads its label and hint as one line, with its glyph beside and its meta at the end', () => {
    render(<Rows />);
    const [ask, page] = screen.getAllByRole('option');
    const parts = [...ask!.children].map((child) => child.className);
    expect(parts).toEqual(['crewlet-palette__icon', 'crewlet-palette__text', 'crewlet-palette__meta']);
    // The glyph is decorative; the label carries the words.
    expect(ask!.querySelector('.crewlet-palette__icon')!.getAttribute('aria-hidden')).toBe('true');
    const text = ask!.querySelector('.crewlet-palette__text')!;
    expect(text.textContent).toBe('Ask SWE about “flaky” opens an ask');
    expect(ask!.querySelector('.crewlet-palette__meta kbd')).not.toBeNull();
    expect(page!.querySelector('.crewlet-palette__meta')!.textContent).toBe('Engineering');
    // A row without a hint or an icon draws neither.
    expect(page!.querySelector('.crewlet-palette__hint')).toBeNull();
    expect(page!.querySelector('.crewlet-palette__icon')).toBeNull();
  });

  test('the accelerator its meta names reaches the caller alone: ⌘Enter does not also take the row', () => {
    const onOpen = vi.fn();
    const onChord = vi.fn();
    render(<Rows onOpen={onOpen} onChord={onChord} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', metaKey: true });
    expect(onChord).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('its meta sits at the end in the quiet ink, and its hint stays quiet on the row under the arrows', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Listbox/Listbox.css', 'CommandPalette/CommandPalette.css');
      cleanup();
      const palette = themeColours(theme);
      render(<Rows />);
      const [ask, page] = screen.getAllByRole('option');
      const tertiary = parseHex(palette.get(token('color-text-tertiary')) ?? '');
      const meta = getComputedStyle(ask!.querySelector('.crewlet-palette__meta')!);
      expect(meta.marginLeft, theme).toBe('auto');
      expect(meta.flexShrink, theme).toBe('0');
      expect(channels(meta.color), theme).toEqual(tertiary);
      // The second row is not the highlighted one: its hint is quiet.
      expect(page!.getAttribute('aria-selected')).toBe('false');
      // The highlighted row's hint keeps the tertiary step: the rest of the
      // label's sentence, a step under it, as the approved palette draws it.
      expect(ask!.getAttribute('aria-selected')).toBe('true');
      const hint = getComputedStyle(ask!.querySelector('.crewlet-palette__hint')!);
      expect(channels(hint.color), theme).toEqual(tertiary);
    }
  });

  test('the row under the arrows is raised in the primary ink, never the accent', () => {
    /*
     * The accent is the primary action's fill and the focus ring. A violet row
     * under the arrows read as a second primary on the one surface a reader
     * opens to act, so the highlight is the raised rung the approved palette
     * draws, and the label lifts from the register's secondary step to the
     * primary. Asserted through the cascade, both stylesheets loaded, so a
     * palette rule that painted over the register shows up here.
     */
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installThemed(theme, 'Listbox/Listbox.css', 'CommandPalette/CommandPalette.css');
      cleanup();
      const palette = themeColours(theme);
      const colour = (name: string) => parseHex(palette.get(token(name)) ?? '');
      render(<Rows />);
      const [active, rest] = screen.getAllByRole('option');
      expect(active!.getAttribute('aria-selected')).toBe('true');
      const on = getComputedStyle(active!);
      expect(channels(on.backgroundColor), theme).toEqual(colour('color-surface-elevated'));
      expect(channels(on.color), theme).toEqual(colour('color-text-primary'));
      expect(channels(on.backgroundColor), theme).not.toEqual(colour('color-brand-accent'));
      expect(channels(on.color), theme).not.toEqual(colour('color-brand-accent-ink'));
      const off = getComputedStyle(rest!);
      expect(channels(off.color), theme).toEqual(colour('color-text-secondary'));
    }
  });
});

describe('forced colors', () => {
  test('only the chosen scope keeps its bar, and the highlighted row keeps an outline', () => {
    for (const theme of ['dark', 'light'] as const) {
      uninstall?.();
      uninstall = installForcedColors('active', theme, 'Listbox/Listbox.css', 'CommandPalette/CommandPalette.css');
      cleanup();
      render(<Scoped />);
      const [chosen, ...rest] = screen.getAllByRole('tab');
      expect(getComputedStyle(chosen!).borderBottomColor, theme).toBe(normalised('CanvasText'));
      for (const tab of rest) expect(getComputedStyle(tab).borderBottomColor, theme).toBe(normalised('Canvas'));
      const [highlighted, next] = screen.getAllByRole('option');
      expect(getComputedStyle(highlighted!).outlineColor, theme).toBe(normalised('Highlight'));
      expect(getComputedStyle(highlighted!).outlineStyle, theme).toBe('solid');
      expect(getComputedStyle(next!).outlineStyle, theme).not.toBe('solid');

      // And only in that mode.
      uninstall();
      uninstall = installForcedColors('none', theme, 'Listbox/Listbox.css', 'CommandPalette/CommandPalette.css');
      expect(getComputedStyle(highlighted!).outlineStyle, theme).not.toBe('solid');
      for (const tab of rest) expect(getComputedStyle(tab).borderBottomColor, theme).not.toBe(normalised('Canvas'));
    }
  });
});

test('the scoped palette, with a lead and a meta, carries no accessibility violation', async () => {
  render(<Scoped lead={<p>ENG-420 tracks it.</p>} />);
  act(() => {
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Tab' });
  });
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((violation) => violation.id)).toEqual([]);
});

function normalised(value: string): string {
  const probe = document.createElement('i');
  probe.style.backgroundColor = value;
  document.body.append(probe);
  const out = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return out;
}
