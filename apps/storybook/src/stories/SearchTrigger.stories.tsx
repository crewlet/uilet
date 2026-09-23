import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Kbd, SearchTrigger, Stack, useShortcut } from '@crewlethq/ui';

const meta: Meta<typeof SearchTrigger> = {
  title: 'UI/SearchTrigger',
  component: SearchTrigger,
  args: {
    label: 'Ask or jump to…',
    shortcut: <Kbd keys={['Mod', 'k']} />,
    keyshortcuts: 'Control+K Meta+K /',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['rail', 'toolbar'] },
  },
};

export default meta;
type Story = StoryObj<typeof SearchTrigger>;

/*
 * The rail's field, as the approved design draws it: the width of the
 * sidebar, on the frame, in the sheet's ground. It keeps its words at every
 * width, because under the shell breakpoint the rail is a drawer as wide as
 * it ever was.
 */
export const InTheRail: Story = {
  render: (args) => (
    <div
      style={{
        width: 'var(--size-shell-rail)',
        padding: '12px 10px 12px 12px',
        boxSizing: 'border-box',
        background: 'var(--color-surface-frame)',
      }}
    >
      <SearchTrigger {...args} />
    </div>
  ),
};

export const WithoutAShortcut: Story = {
  ...InTheRail,
  args: { shortcut: undefined, keyshortcuts: undefined },
};

/*
 * A screen's own search, in its bar on the sheet: the card's ground at the
 * height of the buttons beside it. It opens the same palette, scoped to the
 * screen, and it is the form that folds to its glyph where the room runs out.
 */
export const InAToolbar: Story = {
  args: { variant: 'toolbar', label: 'Search ENG', shortcut: <Kbd>/</Kbd>, keyshortcuts: '/' },
  render: (args) => (
    <div style={{ padding: 16, background: 'var(--color-surface-background)' }}>
      <SearchTrigger {...args} />
    </div>
  ),
};

/*
 * The toolbar's narrow form. It switches on the FRAME's width rather than
 * this box's, so the label and the hint go only once the preview pane itself
 * is under the shell breakpoint; the name stays on the button at every width.
 */
export const InANarrowBar: Story = {
  args: { variant: 'toolbar' },
  render: (args) => (
    <div style={{ width: 280 }}>
      <SearchTrigger {...args} />
    </div>
  ),
};

/**
 * The pair as a shell wires it: the trigger opens search, and the same
 * shortcut opens it from the page. The bare slash is deliberately not bound to
 * a field, so typing in the box below never opens anything.
 */
export const WithItsShortcut: Story = {
  render: function WithItsShortcutStory(args) {
    const [opened, setOpened] = useState(0);
    useShortcut({ keys: [{ key: 'k', mod: true }, '/'], onKey: () => setOpened((count) => count + 1) });
    return (
      <Stack gap={3} align="start">
        <div style={{ width: 'var(--size-shell-rail)' }}>
          <SearchTrigger {...args} onClick={() => setOpened((count) => count + 1)} />
        </div>
        <input aria-label="A field that takes a slash" placeholder="Type a slash here" />
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Search was asked for {opened} times.</p>
      </Stack>
    );
  },
};
