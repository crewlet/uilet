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
  Button,
  ButtonLink,
  Count,
  DateTimePicker,
  EmptyValue,
  IconButton,
  Menu,
  Popover,
  StatusDot,
  TimeWindowPicker,
  VisuallyHidden,
} from '@crewlethq/ui';
import { AddGlyph, CloseGlyph } from '@crewlethq/icons/glyphs';

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

test('the buttons, the marks and the hidden text carry no violation', async () => {
  const { container } = render(
    <main>
      <h1>Seats</h1>
      <Button variant="primary">Save</Button>
      <Button variant="danger" leadingIcon={<AddGlyph />}>
        Delete
      </Button>
      <Button loading>Saving</Button>
      <Button disabledReason="Nothing has changed">Review and save</Button>
      <ButtonLink href="https://example.com" external>
        Documentation
      </ButtonLink>
      <IconButton label="Close" icon={<CloseGlyph />} />
      <IconButton label="Pin" icon={<AddGlyph />} pressed />
      <p>
        Open incidents <Count value={3} label="open incidents" />
      </p>
      <p>
        <StatusDot tone="danger" /> Broken
      </p>
      <p>
        Cost <EmptyValue />
      </p>
      <VisuallyHidden>Loaded</VisuallyHidden>
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
          { key: 'edit', label: 'Edit', icon: <AddGlyph />, onSelect: () => {} },
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
