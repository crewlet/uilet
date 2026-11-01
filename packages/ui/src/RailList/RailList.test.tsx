/**
 * A directory in a card: the groups as a rail beside the chosen group's list,
 * each group read with its count, a plain click choosing in place and a link
 * kept for a new tab, and a picker of the same groups in the rail's place
 * once the card is too narrow for it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { installAtWidth, installCss, installSheets } from '../../../../apps/ui-tests/src/cascade.js';
import { RailList, type RailListItem, type RailListProps } from './index.js';

afterEach(cleanup);

const GROUPS: RailListItem[] = [
  { key: '', label: 'All apps', count: 14, href: '#/apps' },
  { key: 'chat', label: 'Chat', count: 6, href: '#/apps?category=chat', description: 'Where people and agents talk.' },
  { key: 'code', label: 'Code', count: 8, href: '#/apps?category=code' },
];

function Directory(props: Partial<RailListProps>) {
  const [group, setGroup] = useState('');
  return (
    <RailList label="Categories" items={GROUPS} value={group} onChange={setGroup} labels={{ counted: 'apps' }} {...props}>
      <ul aria-label="Apps">
        <li>{group || 'every category'}</li>
      </ul>
    </RailList>
  );
}

const rail = () => screen.getByRole('navigation', { name: 'Categories' });

test('the rail is a navigation named by the directory, a row for each group read with its count', () => {
  render(<Directory />);
  const rows = within(rail()).getAllByRole('link');
  expect(rows.map((row) => row.textContent)).toEqual(['All apps, 14 apps14', 'Chat, 6 apps6', 'Code, 8 apps8']);
  expect(within(rail()).getByRole('link', { name: 'Chat, 6 apps' }).getAttribute('href')).toBe('#/apps?category=chat');
  expect(within(rail()).getByRole('link', { name: 'All apps, 14 apps' }).getAttribute('aria-current')).toBe('page');
});

test('a plain click chooses the group in place, and the chosen row says so', () => {
  render(<Directory />);
  const chat = within(rail()).getByRole('link', { name: 'Chat, 6 apps' });
  const click = fireEvent.click(chat);
  // The default was prevented: the page did not follow the link.
  expect(click).toBe(false);
  expect(chat.getAttribute('aria-current')).toBe('page');
  expect(within(rail()).getByRole('link', { name: 'All apps, 14 apps' }).hasAttribute('aria-current')).toBe(false);
  expect(screen.getByRole('list', { name: 'Apps' }).textContent).toBe('chat');
});

test('a click that opens the group elsewhere is left to the browser', () => {
  const onChange = vi.fn();
  render(<RailList label="Categories" items={GROUPS} value="" onChange={onChange}>{null}</RailList>);
  const code = within(rail()).getByRole('link', { name: /^Code/ });
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }]) {
    expect(fireEvent.click(code, modifier)).toBe(true);
  }
  expect(onChange).not.toHaveBeenCalled();
});

test('groups with no address are buttons that choose', () => {
  const onChange = vi.fn();
  render(
    <RailList
      label="Categories"
      items={[
        { key: 'chat', label: 'Chat' },
        { key: 'code', label: 'Code' },
      ]}
      value="chat"
      onChange={onChange}
    >
      {null}
    </RailList>,
  );
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Categories' })).getByRole('button', { name: 'Code' }));
  expect(onChange).toHaveBeenCalledWith('code');
});

test('the chosen group’s description stands over its list, and a group with none says nothing', () => {
  const { container, rerender } = render(
    <RailList label="Categories" items={GROUPS} value="chat" onChange={() => {}}>
      {null}
    </RailList>,
  );
  const about = screen.getByText('Where people and agents talk.');
  expect(about.className).toContain('crewlet-rail-list__about');
  expect(about.parentElement!.className).toBe('crewlet-rail-list__list');
  rerender(
    <RailList label="Categories" items={GROUPS} value="code" onChange={() => {}}>
      {null}
    </RailList>,
  );
  expect(container.querySelector('.crewlet-rail-list__about')).toBeNull();
});

test('a note about the whole directory stands under the rail’s rows', () => {
  render(<Directory note="Every app here is reviewed before it is listed." />);
  const note = screen.getByText('Every app here is reviewed before it is listed.');
  expect(note.closest('.crewlet-rail-list__rail')).not.toBeNull();
  expect(note.previousElementSibling).toBe(rail());
});

test('the picker is a select of the same groups, named the same, each with its count, and it chooses', () => {
  render(<Directory />);
  const picker = screen.getByRole('combobox', { name: 'Categories' });
  fireEvent.click(picker);
  const options = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(options.map((option) => option.textContent)).toEqual(['All apps (14)', 'Chat (6)', 'Code (8)']);
  fireEvent.keyDown(picker, { key: 'ArrowDown' });
  fireEvent.keyDown(picker, { key: 'ArrowDown' });
  fireEvent.keyDown(picker, { key: 'Enter' });
  expect(screen.getByRole('list', { name: 'Apps' }).textContent).toBe('code');
  expect(within(rail()).getByRole('link', { name: 'Code, 8 apps' }).getAttribute('aria-current')).toBe('page');
});

test('a toolbar given as a function places the picker among its own controls; given as content, the picker leads', () => {
  const { container, rerender } = render(
    <Directory
      toolbar={(picker) => (
        <>
          <input aria-label="Search apps" />
          {picker}
          <button type="button">Installed</button>
        </>
      )}
    />,
  );
  const bar = container.querySelector('.crewlet-rail-list__bar')!;
  expect([...bar.children].map((child) => child.tagName.toLowerCase() + (child.className ? `.${child.className}` : ''))).toEqual([
    'input',
    'span.crewlet-rail-list__picker',
    'button',
  ]);
  expect(bar.className).toBe('crewlet-rail-list__bar');

  rerender(<Directory toolbar={<input aria-label="Search apps" />} />);
  expect(container.querySelector('.crewlet-rail-list__bar')!.firstElementChild!.className).toBe('crewlet-rail-list__picker');

  rerender(<Directory />);
  expect(container.querySelector('.crewlet-rail-list__bar')!.className).toContain('crewlet-rail-list__bar--picker-only');
});

/** The narrow block's rules, as a browser applies them once the card is under 44rem. */
function narrowRules(): string {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'RailList.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(css).toMatch(/\.crewlet-rail-list \{[^}]*container:\s*crewlet-rail-list \/ inline-size;/);
  const block = /@container crewlet-rail-list \(width < 44rem\) \{([\s\S]*?)\n\}/.exec(css)?.[1];
  expect(block).toBeDefined();
  return block!;
}

test('wide, the rail stands beside the list and the picker is not drawn', () => {
  const remove = installSheets('RailList/RailList.css');
  try {
    const { container } = render(<Directory />);
    const body = container.querySelector('.crewlet-rail-list__body')!;
    expect(getComputedStyle(body).gridTemplateColumns).toBe('13rem minmax(0, 1fr)');
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__rail')!).display).toBe('flex');
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__picker')!).display).toBe('none');
    // With no toolbar of the caller's, the bar holds only the picker, so it is not drawn either.
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__bar')!).display).toBe('none');
  } finally {
    remove();
  }
});

test('under 44rem of the card’s own width the rail goes, and the picker takes its place in the bar', () => {
  const remove = installSheets('RailList/RailList.css');
  const narrow = installCss(narrowRules());
  try {
    const { container } = render(<Directory />);
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__body')!).gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__rail')!).display).toBe('none');
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__picker')!).display).toBe('inline-flex');
    expect(getComputedStyle(container.querySelector('.crewlet-rail-list__bar')!).display).toBe('flex');
  } finally {
    narrow();
    remove();
  }
});

test('a grid at the list’s top draws no second rule under the bar’s or the description’s', () => {
  // Every token resolved, the colours included, so a rule drawn in a colour is in the cascade.
  const remove = installAtWidth(1200, 'light', 'DataGrid/DataGrid.css', 'RailList/RailList.css');
  try {
    const grid = <div className="crewlet-data-grid" data-flush="" data-testid="grid" />;
    const { rerender } = render(
      <RailList label="Categories" items={GROUPS} value="" onChange={() => {}}>
        {grid}
      </RailList>,
    );
    expect(getComputedStyle(screen.getByTestId('grid')).borderTopStyle).toBe('none');
    rerender(
      <RailList label="Categories" items={GROUPS} value="chat" onChange={() => {}}>
        {grid}
      </RailList>,
    );
    expect(screen.getByTestId('grid').previousElementSibling!.className).toContain('crewlet-rail-list__about');
    expect(getComputedStyle(screen.getByTestId('grid')).borderTopStyle).toBe('none');
    // Anywhere else a flush grid keeps the rule that parts it from what is above it.
    rerender(<div>{grid}</div>);
    expect(getComputedStyle(screen.getByTestId('grid')).borderTopStyle).toBe('solid');
  } finally {
    remove();
  }
});

test('a directory carries no violation', async () => {
  const { container } = render(<Directory note="Every app here is reviewed." toolbar={<input aria-label="Search apps" />} />);
  const result = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
