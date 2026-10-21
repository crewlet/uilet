/**
 * No gap in a list belongs to no row.
 *
 * A list draws its rows a step apart, and the step used to be a strip the
 * pointer met the list itself on: crossing the list slowly turned the hand
 * into the arrow and put the hover fill out between every two rows, which a
 * reader sees as the cursor flickering. Each row now reaches half the gap on
 * each side (HitArea.css), so the targets meet.
 *
 * jsdom lays nothing out, so the reach is checked where it is decided: every
 * list below lays its rows out with a gap held in ONE custom property, and its
 * rows reach half of that same property. A gap changed in one place and not
 * the other is a failure here rather than a strip of dead pointer.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { AccountRow } from '../AppShell/index.js';
import { ArtifactMakeRow } from '../ArtifactMakeRow/index.js';
import { ChoiceList } from '../ChoiceList/index.js';
import { DatasetSource } from '../DatasetSource/index.js';
import { SegmentedControl } from '../SegmentedControl/index.js';
import { NavGroup, NavItem, SidebarNav } from '../SidebarNav/index.js';
import { Tabs } from '../Tabs/index.js';
import { HIT_AREA_CLASS } from './index.js';

const SOURCE = join(dirname(fileURLToPath(import.meta.url)), '..');
const sheet = (path: string) => readFileSync(join(SOURCE, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the one rule written for exactly this selector. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const found = new RegExp(`(?:^|[}\\n])\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!found) throw new Error(`no rule for ${selector}`);
  return found[1]!;
}

afterEach(cleanup);

test('the reach is an empty pseudo-element at half the gap on each side, and the row stays where it is', () => {
  const css = sheet('HitArea/HitArea.css');
  const after = rule(css, '.crewlet-hit-area::after');
  expect(after).toMatch(/content:\s*''/);
  expect(after).toMatch(/position:\s*absolute/);
  for (const side of ['top', 'bottom', 'inset-inline-start', 'inset-inline-end']) {
    expect(after).toMatch(new RegExp(`${side}:\\s*calc\\(var\\(--crewlet-hit-area-[\\w-]+`));
  }
  // Nothing drawn: no paint, no size of its own and no layout effect on the row.
  expect(after).not.toMatch(/background|border|box-shadow|outline|width|height|margin/);
  // The containing block is the row, at no weight, so a row positioned on purpose keeps its position.
  expect(rule(css, ':where(.crewlet-hit-area)')).toMatch(/position:\s*relative/);
});

/*
 * Every list whose rows reach across its gap: the stylesheet, the rule that
 * lays the rows out, the property its gap is held in, the row's rule, and the
 * reach it declares from that property.
 */
const LISTS = [
  ['ChoiceList/ChoiceList.css', '.crewlet-choice-list', '--crewlet-choice-list-gap', '.crewlet-choice-list__row', ['block']],
  ['ChoiceList/ChoiceList.css', '.crewlet-choice-list__group', '--crewlet-choice-list-gap', '.crewlet-choice-list__row', ['block']],
  ['SidebarNav/SidebarNav.css', '.crewlet-nav-group', '--crewlet-nav-group-gap', '.crewlet-nav-item__row', ['block']],
  ['SidebarNav/SidebarNav.css', '.crewlet-nav-item__children', '--crewlet-nav-children-gap', '.crewlet-nav-item__row', ['block']],
  ['ArtifactMakeRow/ArtifactMakeRow.css', '.crewlet-make-row__list', '--crewlet-make-row-gap', '.crewlet-make-row__item', ['block', 'inline']],
  ['Tabs/Tabs.css', '.crewlet-tabs--underline', '--crewlet-tabs-gap', '.crewlet-tabs__tab', ['inline']],
  ['Tabs/Tabs.css', '.crewlet-tabs--pill', '--crewlet-tabs-gap', '.crewlet-tabs__tab', ['inline']],
  ['Tabs/Tabs.css', '.crewlet-tabs--chip', '--crewlet-tabs-gap', '.crewlet-tabs__tab', ['inline']],
  ['Select/Select.css', '.crewlet-select__group', '--crewlet-listbox-gap', null, []],
  ['Combobox/Combobox.css', '.crewlet-combobox__panel', '--crewlet-listbox-gap', null, []],
  ['Listbox/Listbox.css', null, '--crewlet-listbox-gap', '.crewlet-listbox__option', ['block']],
  ['DatasetSource/DatasetSource.css', '.crewlet-dataset-source-list', '--crewlet-dataset-source-list-gap', 'button.crewlet-dataset-source__summary', ['block']],
  ['CommandPalette/CommandPalette.css', '.crewlet-palette__scopes', '--crewlet-palette-scope-gap', '.crewlet-palette__scope', ['inline']],
  ['AppShell/AppShell.css', '.crewlet-app-shell__rail-foot', '--crewlet-rail-foot-gap', '.crewlet-app-shell__rail-foot .crewlet-account-row__who', ['block-start']],
] as const;

test.each(LISTS)('%s: %s lays its rows out on %s and %s reaches half of it', (file, list, gap, row, axes) => {
  const css = sheet(file);
  if (list) {
    const layout = rule(css, list);
    // Declared by this list or by the list it is nested in, in the same sheet.
    expect(css).toMatch(new RegExp(`${gap}:`));
    expect(layout).toMatch(new RegExp(`(?:^|[\\s;{])gap:[^;]*var\\(${gap}\\)`));
  }
  if (row) {
    // A list whose rows also sit in other lists hands its gap to them under
    // one name the row reads (`--crewlet-nav-row-gap: var(--crewlet-nav-group-gap)`).
    const handed = list ? new RegExp(`(--crewlet-[\\w-]+):\\s*var\\(${gap}\\)`).exec(rule(css, list))?.[1] : undefined;
    const reach = rule(css, row);
    for (const axis of axes) {
      expect(reach).toMatch(new RegExp(`--crewlet-hit-area-${axis}:\\s*calc\\(var\\((?:${gap}${handed ? `|${handed}` : ''})(?:, 0px)?\\) / 2`));
    }
  }
});

test('a component whose rows reach brings the reach with it', () => {
  // A row that takes the class without the sheet that draws it reaches nothing,
  // so every folder that declares a reach imports HitArea.css from its entry.
  for (const folder of ['ChoiceList', 'SidebarNav', 'ArtifactMakeRow', 'Tabs', 'SegmentedControl', 'Select', 'Combobox', 'DatasetSource', 'CommandPalette', 'AppShell']) {
    expect(readFileSync(join(SOURCE, folder, 'index.ts'), 'utf8'), folder).toContain("import '../HitArea/HitArea.css';");
  }
});

test('the rows of every list take the reach', () => {
  const rows = (container: HTMLElement, selector: string) => [...container.querySelectorAll(selector)];
  const every = (found: Element[]) => {
    expect(found.length).toBeGreaterThan(0);
    for (const element of found) expect(element.classList.contains(HIT_AREA_CLASS), element.outerHTML.slice(0, 80)).toBe(true);
  };

  every(
    rows(
      render(
        <ChoiceList
          label="Start from"
          value="blank"
          onChange={() => {}}
          options={[
            { value: 'blank', label: 'Blank', detail: 'One column to start from.' },
            { value: 'tracker', label: 'Tracker', detail: 'Work with an owner.' },
            { value: 'import', label: 'Import a CSV', separated: true },
          ]}
        />,
      ).container,
      '.crewlet-choice-list__row',
    ),
  );
  cleanup();

  every(
    rows(
      render(
        <SidebarNav label="Sections">
          <NavGroup label="Workspace">
            <NavItem href="#/work" label="Work" />
            <NavItem href="#/agents" label="Agents" />
            <NavItem label="Projects">
              <NavItem href="#/p/one" label="One" />
            </NavItem>
          </NavGroup>
        </SidebarNav>,
      ).container,
      '.crewlet-nav-item__row',
    ),
  );
  cleanup();

  every(
    rows(
      render(
        <ArtifactMakeRow
          aria-label="Start a new artifact"
          items={[
            { kind: 'doc', label: 'Docs', detail: 'Write and print', href: '#/artifacts/new/doc' },
            { kind: 'sheet', label: 'Sheet', detail: 'A table to fill in', disabledReason: 'This needs the Artifacts app.' },
          ]}
        />,
      ).container,
      '.crewlet-make-row__item',
    ),
  );
  cleanup();

  for (const variant of ['underline', 'pill', 'chip'] as const) {
    every(
      rows(
        render(
          <Tabs
            ariaLabel="View"
            variant={variant}
            value="all"
            items={[
              { value: 'all', label: 'All' },
              { value: 'yours', label: 'Yours' },
            ]}
            onValueChange={() => {}}
          />,
        ).container,
        '.crewlet-tabs__tab',
      ),
    );
    cleanup();
  }

  every(
    rows(
      render(
        <SegmentedControl
          label="Shape"
          semantics="radio"
          value="grid"
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'List' },
          ]}
          onValueChange={() => {}}
        />,
      ).container,
      '.crewlet-segmented__option',
    ),
  );
  cleanup();

  every(
    rows(
      render(<DatasetSource title="Spend" kind="store" definition="spend" status="live" rows={3} onSelect={() => {}} />).container,
      'button.crewlet-dataset-source__summary',
    ),
  );
  cleanup();

  every(rows(render(<AccountRow avatar={<span>LP</span>} name="Lee Park" href="#/account" />).container, '.crewlet-account-row__who'));
});
