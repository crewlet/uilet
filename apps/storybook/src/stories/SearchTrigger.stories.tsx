import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Kbd, SearchTrigger, Stack, useShortcut } from '@crewlethq/ui';

const meta: Meta<typeof SearchTrigger> = {
  title: 'UI/SearchTrigger',
  component: SearchTrigger,
  args: {
    shortcut: <Kbd keys={['Mod', 'k']} subtle />,
    keyshortcuts: 'Control+K Meta+K /',
  },
};

export default meta;
type Story = StoryObj<typeof SearchTrigger>;

export const Basic: Story = {};

export const WithoutAShortcut: Story = { args: { shortcut: undefined, keyshortcuts: undefined } };

/*
 * The narrow form. It switches on the FRAME's width rather than this box's, so
 * the label and the hint go only once the preview pane itself is under the
 * shell breakpoint; the name stays on the button at every width.
 */
export const InANarrowBar: Story = {
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
        <SearchTrigger {...args} onClick={() => setOpened((count) => count + 1)} />
        <input aria-label="A field that takes a slash" placeholder="Type a slash here" />
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Search was asked for {opened} times.</p>
      </Stack>
    );
  },
};
