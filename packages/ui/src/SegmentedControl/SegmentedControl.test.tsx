/**
 * A setting drawn as a row of choices.
 *
 * Ported from the engine dashboard's `ui/controls.a11y.test.tsx` ("a
 * setting"), which was written for a defect nothing visible showed: the theme
 * and density controls announced themselves as TABS, so a screen reader went
 * looking for the panel each one opened and found none.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { size, themes as palettes } from '@crewlethq/tokens';
import { parseHex } from '@crewlethq/tokens/test/palette';
import { channels, installSheets, installThemed, pseudoElement, px } from '../../../../apps/ui-tests/src/cascade.js';
import { SegmentedControl } from './SegmentedControl.js';

afterEach(cleanup);

const themes = [
  { value: 'light', label: '', icon: <svg aria-hidden="true" />, title: 'Light' },
  { value: 'system', label: '', icon: <svg aria-hidden="true" />, title: 'Follow the system' },
  { value: 'dark', label: '', icon: <svg aria-hidden="true" />, title: 'Dark' },
];

test('is a radio group whose arrows select as they move', () => {
  const onValueChange = vi.fn();
  render(
    <SegmentedControl
      label="Theme"
      semantics="radio"
      value="system"
      options={themes}
      onValueChange={onValueChange}
    />,
  );
  const group = screen.getByRole('radiogroup', { name: 'Theme' });
  const radios = within(group).getAllByRole('radio');
  // Named, although their only visible content is a glyph.
  expect(screen.getByRole('radio', { name: 'Dark' })).toBe(radios[2]);
  expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
  expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
  expect(screen.queryByRole('tab')).toBeNull();

  radios[1]!.focus();
  fireEvent.keyDown(radios[1]!, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(radios[2]);
  expect(onValueChange).toHaveBeenLastCalledWith('dark');
  fireEvent.keyDown(radios[2]!, { key: 'ArrowUp' });
  expect(onValueChange).toHaveBeenLastCalledWith('system');
});

test('a screen-reader name can differ from the tooltip', () => {
  render(
    <SegmentedControl
      label="Density"
      semantics="radio"
      value="normal"
      options={[
        { value: 'compact', label: 'S', srLabel: 'Compact' },
        { value: 'normal', label: '', srLabel: 'Normal', title: 'Normal' },
      ]}
      onValueChange={() => {}}
    />,
  );
  // A label of "S" is a picture of a size, not a word: the reader hears the
  // word. An option that draws nothing takes the same name.
  expect(screen.getByRole('radio', { name: 'Compact' }).textContent).toBe('S');
  expect(screen.getByRole('radio', { name: 'Normal' })).toBeTruthy();
  expect(screen.queryByRole('radio', { name: 'S' })).toBeNull();
});

test('options with a description are card rows, and the chosen one says so', () => {
  render(
    <SegmentedControl
      label="Template"
      semantics="radio"
      value="startup"
      options={[
        { value: 'startup', label: 'Startup', description: 'One unit, three seats.' },
        { value: 'agency', label: 'Agency', description: 'A unit per client.' },
      ]}
      onValueChange={() => {}}
    />,
  );
  const chosen = screen.getByRole('radio', { name: /Startup/ });
  expect(chosen.getAttribute('aria-checked')).toBe('true');
  expect(chosen.textContent).toContain('One unit, three seats.');

  /*
   * And the row does not also wear the pill chrome. Its rules set the
   * container's background, border, padding and `width: fit-content` and each
   * option's padding, radius and active chip, at the same weight as the card
   * rules and from a stylesheet that is bundled after them, so every one of
   * them won and the cards were drawn inside a pill bar.
   */
  const row = screen.getByRole('radiogroup', { name: 'Template' });
  expect(row.classList.contains('crewlet-segmented--cards')).toBe(true);
  expect(row.classList.contains('crewlet-tabs--pill')).toBe(false);
});

test('a disabled option is stepped over rather than focused', () => {
  render(
    <SegmentedControl
      label="View"
      semantics="radio"
      value="chart"
      options={[
        { value: 'chart', label: 'Chart' },
        { value: 'directory', label: 'Directory', disabled: true },
        { value: 'charter', label: 'Charter' },
      ]}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio');
  radios[0]!.focus();
  fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(radios[2]);
});

test('a row whose chosen option is disabled still has a tab stop somebody can reach', () => {
  render(
    <SegmentedControl
      label="View"
      semantics="radio"
      value="chart"
      options={[
        { value: 'chart', label: 'Chart', disabled: true },
        { value: 'charter', label: 'Charter' },
      ]}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
  expect(radios.filter((radio) => radio.tabIndex === 0 && !radio.disabled)).toHaveLength(1);
  expect(radios[0]!.getAttribute('aria-checked')).toBe('true');
});

/*
 * A SINGLE-CHOICE FILTER, which is the row the finding was measured on: it is
 * not a tab row (it opens no panel) and its choice is not free (it is a URL
 * parameter, so every change re-runs the screen's query).
 */
const kinds = [
  { value: 'all', label: 'All' },
  { value: 'decision', label: 'Decision' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'fault', label: 'Fault' },
];

test('manual activation moves focus without choosing, and Enter or Space chooses', async () => {
  const user = userEvent.setup();
  const onValueChange = vi.fn();
  render(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      value="all"
      options={kinds}
      onValueChange={onValueChange}
    />,
  );
  const radios = screen.getAllByRole('radio');
  radios[0]!.focus();

  await user.keyboard('{ArrowRight}{ArrowRight}');
  expect(document.activeElement).toBe(radios[2]);
  // THE WHOLE FINDING: two moves across the row, and not one query. Under
  // automatic activation those two keystrokes are two changes, each one a
  // fetch and a re-render nobody asked for.
  expect(onValueChange).not.toHaveBeenCalled();

  await user.keyboard('{Enter}');
  expect(onValueChange.mock.calls).toEqual([['delivery']]);

  // And Space, which a real button turns into the same click.
  await user.keyboard('{ArrowRight} ');
  expect(onValueChange.mock.calls).toEqual([['delivery'], ['fault']]);
});

test('under manual activation the tab stop follows focus rather than the choice', () => {
  render(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      value="all"
      options={kinds}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
  expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1]);

  radios[0]!.focus();
  fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
  fireEvent.keyDown(radios[1]!, { key: 'ArrowRight' });

  // Nothing is chosen yet, and the row's ONE TAB STOP is where the reader is.
  expect(radios[0]!.getAttribute('aria-checked')).toBe('true');
  expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, 0, -1]);

  /*
   * Tab away and Tab back. The stop is what the second Tab lands on, so a
   * reader who arrowed two options along comes back to the option they left
   * rather than to the start of the row.
   */
  radios[2]!.blur();
  expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, 0, -1]);
});

test('a pointer press moves the manual tab stop too', () => {
  render(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      value="all"
      options={kinds}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
  // What a browser does on a press, before the click reaches the caller: a row
  // where a press and an arrow key left the stop in two places disagrees with
  // itself about where the reader is. `act` is for the render that follows the
  // focus, not for the focus: `fireEvent.focus` dispatches the event that does
  // not bubble, which is not the one React listens for.
  act(() => {
    radios[3]!.focus();
  });
  expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, -1, 0]);
});

test('automatic activation is the default, and its tab stop is still the choice', () => {
  const onValueChange = vi.fn();
  // A CONTROLLED row whose caller does not move the value, which is what tells
  // the two rules apart: under automatic the stop is the chosen option, so it
  // stays put even though focus did not.
  render(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      value="all"
      options={kinds}
      onValueChange={onValueChange}
    />,
  );
  const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
  radios[0]!.focus();
  fireEvent.keyDown(radios[0]!, { key: 'ArrowRight' });
  expect(onValueChange.mock.calls).toEqual([['decision']]);
  expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1]);
  expect(screen.getByRole('radiogroup', { name: 'Event kind' }).getAttribute('aria-describedby')).toBeNull();
});

test('a manual row whose options shrink under the stop hands it back to the chosen one', () => {
  const { rerender } = render(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      value="all"
      options={kinds}
      onValueChange={() => {}}
    />,
  );
  const radios = screen.getAllByRole('radio') as HTMLButtonElement[];
  radios[0]!.focus();
  fireEvent.keyDown(radios[0]!, { key: 'End' });
  expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, -1, 0]);

  /*
   * The row is now shorter than the option focus was on. A stop remembered
   * past the end of the row is a row Tab cannot enter at all, so the choice
   * takes it back.
   */
  rerender(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      value="all"
      options={kinds.slice(0, 2)}
      onValueChange={() => {}}
    />,
  );
  const left = screen.getAllByRole('radio') as HTMLButtonElement[];
  expect(left.map((radio) => radio.tabIndex)).toEqual([0, -1]);
});

test('a manual row says which key chooses, and the caller can word it or silence it', () => {
  const described = (row: HTMLElement) => {
    const id = row.getAttribute('aria-describedby');
    return id === null ? null : document.getElementById(id);
  };

  const { rerender } = render(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      value="all"
      options={kinds}
      onValueChange={() => {}}
    />,
  );
  const sentence = described(screen.getByRole('radiogroup'));
  // A radio group that does NOT select as it moves is the unusual one, so the
  // row is the only thing that can say which key applies.
  expect(sentence?.textContent).toMatch(/Enter or Space/);
  // Said, not drawn: the row looks exactly as it did.
  expect(sentence?.classList.contains('crewlet-visually-hidden')).toBe(true);

  rerender(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      activateHint="Press Enter to run the filter."
      value="all"
      options={kinds}
      onValueChange={() => {}}
    />,
  );
  expect(described(screen.getByRole('radiogroup'))?.textContent).toBe('Press Enter to run the filter.');

  // And nothing at all for a screen that already says it somewhere a reader
  // reaches first, rather than two sentences about one row.
  rerender(
    <SegmentedControl
      label="Event kind"
      semantics="radio"
      activate="manual"
      activateHint={null}
      value="all"
      options={kinds}
      onValueChange={() => {}}
    />,
  );
  expect(screen.getByRole('radiogroup').getAttribute('aria-describedby')).toBeNull();
  expect(document.querySelector('.crewlet-visually-hidden')).toBeNull();
});

/*
 * THE APPROVED SEGMENTED CONTROL, as the cascade paints it: a RAISED well
 * inside the default hairline, and the chip that is on the CARD's own ground
 * in the primary ink, with the others in the secondary ink on nothing at all.
 * The well used to be the translucent inset overlay, which stands almost
 * nowhere off a card, so the row had no extent and the chips floated.
 */
const ranges = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
];

test('the row is a raised well with a card chip in it, in both palettes', () => {
  const transparent = (value: string) => value === 'transparent' || /^rgba\(0, 0, 0, 0\)$/.test(value);
  for (const theme of ['dark', 'light'] as const) {
    const uninstall = installThemed(theme, 'Tabs/Tabs.css', 'SegmentedControl/SegmentedControl.css');
    const { unmount } = render(
      <SegmentedControl label="Time range" semantics="radio" value="week" options={ranges} onValueChange={() => {}} />,
    );
    const palette = palettes[theme].color;
    const well = getComputedStyle(screen.getByRole('radiogroup', { name: 'Time range' }));
    expect(channels(well.backgroundColor), `${theme}: the well`).toEqual(parseHex(palette.surface.elevated));
    expect(well.borderTopStyle, `${theme}: the well's boundary`).toBe('solid');
    expect(channels(well.borderTopColor), `${theme}: the well's boundary`).toEqual(parseHex(palette.border.default));

    const on = getComputedStyle(screen.getByRole('radio', { name: '7 days' }));
    expect(channels(on.backgroundColor), `${theme}: the chip that is on`).toEqual(parseHex(palette.surface.subtle));
    expect(channels(on.color), `${theme}: the chip that is on`).toEqual(parseHex(palette.text.primary));

    const off = getComputedStyle(screen.getByRole('radio', { name: 'Today' }));
    expect(transparent(off.backgroundColor), `${theme}: a chip that is off, ${off.backgroundColor}`).toBe(true);
    expect(channels(off.color), `${theme}: a chip that is off`).toEqual(parseHex(palette.text.secondary));
    unmount();
    uninstall();
  }
});

/*
 * A ROW OF SEPARATE CHIPS, the console's row of unit types: no well, a row
 * that wraps, each chip on the raised ground a chip with no edge takes, and
 * the chosen one FILLED with the accent.
 */
const types = [
  { value: 'department', label: 'Department' },
  { value: 'team', label: 'Team' },
  { value: 'custom', label: 'Custom' },
];

test('the chips layout is separate raised chips that wrap, the chosen one filled with the accent', () => {
  const transparent = (value: string) => value === 'transparent' || /^rgba\(0, 0, 0, 0\)$/.test(value);
  for (const theme of ['dark', 'light'] as const) {
    const uninstall = installThemed(theme, 'Tabs/Tabs.css', 'SegmentedControl/SegmentedControl.css');
    const { unmount } = render(
      <SegmentedControl
        label="Unit type"
        semantics="radio"
        layout="chips"
        value="team"
        options={types}
        onValueChange={() => {}}
      />,
    );
    const palette = palettes[theme].color;
    const group = screen.getByRole('radiogroup', { name: 'Unit type' });
    expect(group.className, theme).toContain('crewlet-segmented--chips');
    expect(group.className, theme).not.toContain('crewlet-tabs--pill');
    const row = getComputedStyle(group);
    expect(row.flexWrap, `${theme}: the row wraps`).toBe('wrap');
    expect(transparent(row.backgroundColor), `${theme}: no well`).toBe(true);

    // The chip's drawing is its band (the ::before), behind the label: the
    // button around it is the target and paints nothing of its own.
    const onChip = screen.getByRole('radio', { name: 'Team' });
    const on = getComputedStyle(pseudoElement(onChip, 'before'));
    expect(channels(on.backgroundColor), `${theme}: the chip that is on`).toEqual(parseHex(palette.brand.accent));
    expect(channels(getComputedStyle(onChip).color), `${theme}: its word`).toEqual(parseHex(palette.text.onAccent));
    expect(transparent(getComputedStyle(onChip).backgroundColor), `${theme}: the target paints nothing`).toBe(true);

    const offChip = screen.getByRole('radio', { name: 'Department' });
    const off = getComputedStyle(pseudoElement(offChip, 'before'));
    expect(channels(off.backgroundColor), `${theme}: a chip that is off`).toEqual(parseHex(palette.surface.elevated));
    expect(channels(getComputedStyle(offChip).color), `${theme}: its word`).toEqual(parseHex(palette.text.secondary));
    unmount();
    uninstall();
  }
});

/*
 * SMALL, AS THE CONSOLE'S CHIPS ARE: the 11px face, at the pointer-target
 * floor and no taller. At the small control step a row of ten read as a second
 * row of buttons under the field's label.
 */
test('a chip is drawn smaller than the target floor and hit at it, in the micro face', () => {
  const uninstall = installThemed('dark', 'Tabs/Tabs.css', 'SegmentedControl/SegmentedControl.css');
  render(
    <SegmentedControl
      label="Unit type"
      semantics="radio"
      layout="chips"
      value="team"
      options={types}
      onValueChange={() => {}}
    />,
  );
  const chip = screen.getByRole('radio', { name: 'Team' });
  // HIT at the floor...
  expect(px(chip, 'min-height')).toBe(24);
  expect(getComputedStyle(chip).fontSize).toBe('11px');
  // ...and DRAWN as a band half a step in from it, top and bottom.
  const band = getComputedStyle(pseudoElement(chip, 'before'));
  expect(band.position).toBe('absolute');
  expect(band.pointerEvents).toBe('none');
  // jsdom folds no calc() that still holds a variable, so the band's inset is
  // read from the rule: half of what the floor stands over the drawing.
  const sheet = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SegmentedControl.css'), 'utf8');
  const drawing = /\.crewlet-segmented--chips \.crewlet-segmented__option::before\s*\{([^}]*)\}/.exec(sheet)?.[1] ?? '';
  expect(drawing).toContain('inset: calc((var(--size-target-min) - var(--crewlet-segmented-chip-height)) / 2) 0');
  expect(sheet).toContain('--crewlet-segmented-chip-height: calc(var(--size-target-min) - var(--spacing-1))');
  // Rows meet at their targets, so their drawings stand a whole step apart.
  const row = /\.crewlet-tabs\.crewlet-segmented--chips\s*\{([^}]*)\}/.exec(sheet)?.[1] ?? '';
  expect(row).toContain('gap: 0 var(--spacing-1)');
  uninstall();
});

/*
 * WHAT COMPLETES THE LAST CHOICE IS IN THE ROW AND OUT OF THE ARROWS: a box a
 * "Custom" chip asks for wraps with the chips, and a caret moves inside it
 * rather than the arrow keys walking the options from it.
 */
test('a trailing field sits in the row after the options, and the arrows never land in it', () => {
  const onValueChange = vi.fn();
  render(
    <SegmentedControl
      label="Unit type"
      semantics="radio"
      layout="chips"
      value="custom"
      options={types}
      onValueChange={onValueChange}
      trailing={<input aria-label="Custom type" defaultValue="tribe" />}
    />,
  );
  const group = screen.getByRole('radiogroup', { name: 'Unit type' });
  const field = within(group).getByRole('textbox', { name: 'Custom type' });
  expect(group.lastElementChild?.contains(field)).toBe(true);
  // From the last option the arrow wraps to the first, past the field.
  const last = screen.getByRole('radio', { name: 'Custom' });
  last.focus();
  fireEvent.keyDown(last, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Department' }));
  // And an arrow pressed in the field is the field's own.
  onValueChange.mockClear();
  field.focus();
  fireEvent.keyDown(field, { key: 'ArrowLeft' });
  expect(document.activeElement).toBe(field);
  expect(onValueChange).not.toHaveBeenCalled();
});

test('the well stands exactly at the control step, so it lines up with the button beside it', () => {
  /*
   * A chip, the well's inset above and below it and its boundary above and
   * below that: 24 + 2 + 2 + 1 + 1 is the 30px medium control step, the height
   * of every button, icon button and field on the same line. The chip and the
   * inset are read from the cascade. The boundary is read from the rule, since
   * jsdom answers no border width it was given.
   */
  const uninstall = installSheets('Tabs/Tabs.css', 'SegmentedControl/SegmentedControl.css');
  try {
    render(<SegmentedControl label="Time range" semantics="radio" value="week" options={ranges} onValueChange={() => {}} />);
    const well = screen.getByRole('radiogroup', { name: 'Time range' });
    const chip = screen.getByRole('radio', { name: '7 days' });
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../Tabs/Tabs.css'), 'utf8');
    const boundary = /\.crewlet-tabs--pill\s*\{[^}]*border:\s*(\d+)px solid/.exec(css)?.[1];
    expect(boundary).toBe('1');
    const row = px(chip, 'min-height') + px(well, 'padding-top') + px(well, 'padding-bottom') + 2 * Number(boundary);
    expect(px(chip, 'min-height')).toBe(24);
    expect(row).toBe(Number.parseFloat(size.control.md));
    expect(row).toBe(30);
  } finally {
    uninstall();
  }
});
