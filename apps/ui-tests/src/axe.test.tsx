/**
 * Every surface this package draws by itself, run through axe.
 *
 * WHY A SECOND KIND OF TEST. The component suites assert the rules somebody
 * thought of: that Escape reaches the topmost surface, that a titled glyph is
 * exposed, that a menu's arrows wrap. axe asserts the rules nobody in this
 * repository thought of, out of a table maintained by people who do nothing
 * else, and it is the only check here that can catch a defect introduced by a
 * change made somewhere else entirely.
 *
 * It earned its place on the first run: the default Popover role had just
 * become `dialog`, and `label` was optional, so the two pickers in this
 * package were shipping a dialog a screen reader announces as "dialog" and
 * nothing more. Every component suite passed. `aria-dialog-name` did not.
 *
 * THE RULE SET IS THE WCAG 2.2 A AND AA TAGS, and nothing is disabled. A rule
 * that has to be turned off for a component is a defect in the component; a
 * rule that has to be turned off for jsdom would mean the check does not
 * belong here at all.
 *
 * WHAT IS NOT HERE: contrast. jsdom computes no layout and resolves no custom
 * property, so `color-contrast` cannot run and axe reports it as incomplete
 * rather than as a pass. Contrast is measured from the stylesheets that ship,
 * by the palette suite in @crewlethq/tokens, over composites a browser would
 * have to be driven through every state to produce.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import {
  Avatar,
  AvatarStack,
  CanvasBoard,
  Button,
  ButtonLink,
  CharacterPicker,
  Count,
  DateTimePicker,
  EmptyValue,
  FormField,
  HuePicker,
  IconButton,
  Kbd,
  Menu,
  Meter,
  Popover,
  SearchTrigger,
  SegmentedControl,
  SegmentedMeter,
  Sparkline,
  StatCard,
  StatusDot,
  Stepper,
  Tag,
  ThemeSwitcher,
  ThemeToggle,
  DensitySwitcher,
  TimeWindowPicker,
  VisuallyHidden,
  Document,
  DocumentTitle,
  Highlight,
  MarkdownEditor,
  Outline,
  RichEditor,
  CatalogTile,
  List,
  ListItem,
  SettingsTable,
  TileGrid,
} from '@crewlethq/ui';
import { PlusGlyph, XGlyph } from '@crewlethq/icons/glyphs';

afterEach(cleanup);

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(element: Element): Promise<string[]> {
  const result = await axe.run(element, {
    runOnly: { type: 'tag', values: WCAG },
    // Contrast needs layout and resolved custom properties, neither of which
    // jsdom has. The palette suite measures it from the stylesheets instead.
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return result.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.html).join(', ')})`,
  );
}

test('a settings table, a catalogue of tiles and a numbered list carry no violation', async () => {
  const { container } = render(
    <main>
      <h1>Limits</h1>
      <h2 id="turn">Guardrails on every turn</h2>
      <SettingsTable aria-labelledby="turn">
        <SettingsTable.Row label="Review rounds per turn" settingKey="turn_engine.max_iterations" source="Default">
          3
        </SettingsTable.Row>
        <SettingsTable.Row label="Tool rounds per run" source="Changed from 24" changed>
          32
        </SettingsTable.Row>
      </SettingsTable>
      <TileGrid columns={3}>
        <CatalogTile
          mark={<svg />}
          title="GitHub"
          status={<Tag size="sm">Connected</Tag>}
          description="Issues and pull requests."
          meta="2 agents"
          action={<Button size="small">Manage</Button>}
        />
        <CatalogTile quiet mark={<svg />} title="Slack" description="Each agent posts as its own bot." />
      </TileGrid>
      <TileGrid as="ul" aria-label="Spaces">
        <CatalogTile as="li" mark={<svg />} title="Engineering" />
      </TileGrid>
      <List variant="numbered-divided" aria-label="Standing policies">
        <ListItem>Every amount is exact to the cent.</ListItem>
        <ListItem>Ask before deleting anything.</ListItem>
      </List>
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('the buttons, the marks and the hidden text carry no violation', async () => {
  const { container } = render(
    <main>
      <h1>Seats</h1>
      <Button variant="primary">Save</Button>
      <Button variant="danger" leadingIcon={<PlusGlyph />}>
        Delete
      </Button>
      <Button loading>Saving</Button>
      <Button disabledReason="Nothing has changed">Review and save</Button>
      <ButtonLink href="https://example.com" external>
        Documentation
      </ButtonLink>
      <IconButton label="Close" icon={<XGlyph />} />
      <IconButton label="Pin" icon={<PlusGlyph />} pressed />
      <p>
        Open incidents <Count value={3} label="open incidents" />
      </p>
      <p>
        <StatusDot tone="danger" /> Broken
      </p>
      <p>
        Cost <EmptyValue />
      </p>
      <p>
        <Avatar name="Software Engineer" status="working" /> <Avatar name="Jane Founder" kind="human" ring="brand" />
        <Avatar name="Backend Engineer" character="hexlet" hue="cyan" status="needs" />{' '}
        <Avatar name="Frontend Engineer" character="crewlet" hue="purple" size={96} status="stopped" />
        <span>
          <Avatar name="Product Manager" character="gemlet" hue="rose" status="stopped" decorative /> Product Manager
        </span>
      </p>
      <p>
        <AvatarStack
          members={[
            { name: 'Jane Founder', kind: 'human' },
            { name: 'CTO', character: 'hexlet', hue: 'amber' },
            { name: 'SWE' },
            { name: 'PM' },
            { name: 'AI Systems' },
          ]}
        />
      </p>
      <p>
        <AvatarStack members={[{ name: 'SWE' }, { name: 'CTO' }]} decorative /> read by 2 agents today
      </p>
      <VisuallyHidden>Loaded</VisuallyHidden>
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('the agent identity pickers carry no violation: the character grid and the hue chips', async () => {
  const { container } = render(
    <main>
      <h1>Edit seat</h1>
      <FormField label="Character" as="fieldset">
        <CharacterPicker label="Character" value="hexlet" hue="cyan" onValueChange={() => {}} />
      </FormField>
      <FormField label="Color" as="fieldset">
        <HuePicker label="Color" value="cyan" onValueChange={() => {}} />
      </FormField>
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('the restyled primitives carry no violation: the register, the pill, the keycap, the well, the field and the tile', async () => {
  const { container } = render(
    <main>
      <h1>Home</h1>
      <SearchTrigger label="Ask or jump to…" shortcut={<Kbd keys={['Mod', 'k']} apple />} keyshortcuts="Meta+K" />
      <SearchTrigger variant="toolbar" label="Search ENG" shortcut={<Kbd>/</Kbd>} keyshortcuts="/" />
      <SegmentedControl
        label="Time range"
        semantics="radio"
        value="week"
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: '7 days' },
          { value: 'month', label: '30 days' },
        ]}
        onValueChange={() => {}}
      />
      <Button variant="secondary" size="small">
        Ship anyway
      </Button>
      <Button variant="ghost" size="small">
        Reassign
      </Button>
      <p>
        <Tag variant="warning">Needs a person</Tag> <Tag>docs</Tag> <Tag size="xs">3</Tag>
      </p>
      <StatCard
        label="Tasks in progress"
        value="18"
        delta={{ value: '+4', polarity: 'neutral' }}
        sub="vs last week · 2 blocked"
        trend={<Sparkline values={[3, 5, 4, 8, 7, 9]} current />}
      />
      <StatCard
        label="Tokens · 7 days"
        value="12.6M"
        trend={<Meter value={63} max={100} label="Weekly budget" hideLabel />}
        sub="63% of the weekly budget"
      />
      <StatCard
        label="Waiting on your decision"
        value="3"
        trend={
          <ButtonLink href="#/inbox" size="small" variant="secondary">
            Review
          </ButtonLink>
        }
      />
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('the preference controls carry no violation, stored and controlled, before and after a press', async () => {
  function Owned() {
    const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
    return (
      <>
        <ThemeToggle value={theme} onChange={setTheme} />
        <ThemeSwitcher value={theme} onChange={setTheme} label="Theme, owned" />
      </>
    );
  }
  const { container } = render(
    <main>
      <h1>Preferences</h1>
      <ThemeToggle storageKey="axe_theme" />
      <ThemeSwitcher storageKey="axe_theme" />
      <DensitySwitcher storageKey="axe_density" />
      <Owned />
    </main>,
  );
  try {
    expect(await violations(container)).toEqual([]);
    // The toggle is renamed by a press, so the name it takes is checked too.
    for (const toggle of screen.getAllByRole('button', { name: /switch to (light|dark) mode/i })) fireEvent.click(toggle);
    expect(await violations(container)).toEqual([]);
  } finally {
    // The stored controls write the root and storage, which every later case
    // in this file shares.
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('axe_theme');
  }
});

test('the state bar and the step row carry no violation, in a tile, a list and a card', async () => {
  const crew = [
    { id: 'working', value: 4, tone: 'info', label: 'working' },
    { id: 'waiting', value: 1, tone: 'warning', label: 'waiting' },
    { id: 'stopped', value: 1, tone: 'danger', label: 'stopped' },
  ] as const;
  const turn = [
    { id: 'context', label: 'Context' },
    { id: 'execute', label: 'Execute · round 7' },
    { id: 'review', label: 'Review' },
  ];
  const { container } = render(
    <main>
      <h1>Home</h1>
      <StatCard
        label="Agents working now"
        value="4"
        unit="/ 7"
        trend={<SegmentedMeter segments={crew} total={7} remainderLabel="idle" />}
        sub="1 waiting · 1 stopped · 1 idle"
      />
      <ul>
        <li>
          Core platform
          <SegmentedMeter
            size="compact"
            segments={[
              { id: 'done', value: 38, tone: 'success', label: 'done' },
              { id: 'active', value: 12, tone: 'info', label: 'active' },
            ]}
            total={61}
            remainderLabel="to do"
          />
        </li>
      </ul>
      <section aria-label="Live now">
        <Stepper label="Turn progress" steps={turn} current="execute" pulse />
        <Stepper label="Turn 1 progress" steps={turn} current={null} />
      </section>
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('an open menu carries no violation', async () => {
  render(
    <main>
      <h1>Seats</h1>
      <Menu
        label="Actions for Software Engineer"
        items={[
          { key: 'edit', label: 'Edit', icon: <PlusGlyph />, onSelect: () => {} },
          { kind: 'separator', key: 'divider' },
          { key: 'lead', label: 'Unit lead', checked: true, onSelect: () => {} },
          { key: 'member', label: 'Member', checked: false, onSelect: () => {} },
          { key: 'delete', label: 'Delete', danger: true, disabled: true, onSelect: () => {} },
        ]}
      />
    </main>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Software Engineer' }));
  // Asserted, not assumed: a surface that never opened is a surface axe would
  // have nothing to say about, and the test would pass for the wrong reason.
  expect(screen.getByRole('menu', { name: 'Actions for Software Engineer' })).toBeTruthy();
  expect(await violations(document.body)).toEqual([]);
});

test('an open panel is a named dialog, and a menu panel is a menu', async () => {
  function Panels() {
    const [open, setOpen] = useState(true);
    return (
      <main>
        <h1>Filters</h1>
        <Popover
          label="Owner"
          open={open}
          onOpenChange={(next) => setOpen(next)}
          trigger={(_open, toggle) => (
            <button type="button" onClick={toggle}>
              Owner
            </button>
          )}
        >
          <label>
            Value
            <input />
          </label>
        </Popover>
      </main>
    );
  }
  render(<Panels />);
  await screen.findByRole('dialog', { name: 'Owner' });
  expect(await violations(document.body)).toEqual([]);
});

test('the pickers name the dialog they open', async () => {
  // The case that made this file worth writing. Both open a Popover, whose
  // default role is `dialog`, and neither passed a name until the type
  // required one.
  render(
    <main>
      <h1>Window</h1>
      <DateTimePicker value="" onChange={() => {}} />
      <TimeWindowPicker value={{ kind: 'relative', duration: '1h' }} onChange={() => {}} />
    </main>,
  );
  for (const trigger of [...screen.getAllByRole('button')]) fireEvent.click(trigger);
  // Both panels open, and each one is a dialog with a name. Asserted rather
  // than assumed: `element.click()` is not wrapped in act, so the state change
  // never flushed and this case passed over a page with no dialog on it.
  expect(screen.getAllByRole('dialog').map((panel) => panel.getAttribute('aria-label')).sort()).toEqual([
    'Date',
    'Time window',
  ]);
  expect(await violations(document.body)).toEqual([]);
});

test('a knowledge page carries no violation: its title, outline, body, a marked result and the editor', async () => {
  const { container } = render(
    <main>
      <Outline
        label="On this page"
        items={[
          { id: 'net-balances', label: 'Net balances', level: 2 },
          { id: 'ties', label: 'Ties and determinism', level: 3 },
        ]}
        activeId="net-balances"
        onSelect={() => {}}
      />
      <article>
        <DocumentTitle>Settlement algorithm</DocumentTitle>
        <Document>
          <h2 id="net-balances">Net balances</h2>
          <p>
            For each member, the balance is what they paid minus what they owe, in <code>int</code> cents.
          </p>
          <ul>
            <li>
              <input type="checkbox" checked disabled aria-label="Done" readOnly />
              <div>Every balance sums to zero.</div>
            </li>
          </ul>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroller a keyboard must be able to reach (WCAG 2.1.1) */}
          <div tabIndex={0} role="region" aria-label="Table: member balances">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ana</td>
                  <td>+54.99</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 id="ties">Ties and determinism</h3>
          <pre>
            <code>PYTHONPATH=src python3 -m unittest</code>
          </pre>
        </Document>
      </article>
      <p>
        <Highlight text="Ana pays the leftover cent" terms={['leftover', 'cent']} />
      </p>
      <MarkdownEditor value="## Net balances" onChange={() => {}} label="The page, in markdown" renderPreview={(value) => <p>{value}</p>} />
    </main>,
  );
  expect(await violations(container)).toEqual([]);
});

test('a board canvas carries no violation: its tools, a selected board with its corners, a selected note and an open tip', async () => {
  const { container } = render(
    <main>
      <h1>Launch landing page</h1>
      <div style={{ height: 600 }}>
        <CanvasBoard
          label="Launch landing page"
          boards={[
            { id: 'hero', x: 0, y: 0, w: 1440, h: 900, title: 'Hero' },
            { id: 'mobile', x: 1540, y: 0, w: 390, h: 844, title: 'Mobile' },
          ]}
          notes={[
            { id: 's1', kind: 'sticky', x: 2000, y: 0, w: 240, h: 200, text: 'Copy from marketing' },
            { id: 't1', kind: 'title', x: 0, y: -120, w: 900, h: 80, text: 'Launch' },
          ]}
          renderBoard={(b) => <p>{b.title}</p>}
          editable
          onNoteCreate={() => undefined}
          onOpen={() => {}}
        />
      </div>
    </main>,
  );
  fireEvent.focus(screen.getByRole('button', { name: 'Move Hero' }));
  fireEvent.focus(screen.getByRole('button', { name: 'Sticky note' }));
  expect(await violations(container)).toEqual([]);
  fireEvent.click(container.querySelector('[data-kind="sticky"]')!);
  expect(await violations(container)).toEqual([]);
});

test('the rich editor carries no violation: the document, a task, a callout, code, a table, the slash menu and the toolbar', async () => {
  const body = [
    '# Runbook',
    '',
    'Restart the **broker** first, then [check the status](https://example.com).',
    '',
    '- [ ] Drain the node',
    '- [x] Take a snapshot',
    '',
    '> [!WARNING]',
    '> A restart drops every open session.',
    '',
    '```sh',
    'crewlet node drain',
    '```',
    '',
    '| Step | Owner |',
    '|---|---|',
    '| Drain | Ops |',
  ].join('\n');
  const { container } = render(
    <main>
      <h1>Runbook</h1>
      <RichEditor value={body} onChange={() => {}} label="The body of Runbook" />
    </main>,
  );
  const box = await screen.findByRole('textbox', { name: 'The body of Runbook' });
  expect(await violations(container)).toEqual([]);

  // The open menus and bars are held to the same rules in the editor's own
  // suite (RichEditor.test.tsx), which can drive the document to open them.
  expect(box.getAttribute('aria-describedby')).toBeTruthy();
});
