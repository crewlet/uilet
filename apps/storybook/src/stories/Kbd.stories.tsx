import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, Kbd, Text } from '@crewlethq/ui';

const meta: Meta<typeof Kbd> = {
  title: 'UI/Kbd',
  component: Kbd,
  args: { children: 'Enter' },
  argTypes: { subtle: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Basic: Story = {};
export const Subtle: Story = { args: { subtle: true } };
/**
 * A whole shortcut. `Mod` is Command on an Apple platform and Control
 * everywhere else, so one hint is right on both, and the caps are hidden from
 * assistive technology in favour of one sentence: a screen reader handed the
 * glyphs reads "place of interest sign K", which names nothing anybody
 * presses.
 */
export const Shortcut: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
      <span style={{ display: 'inline-flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
        <span style={{ color: 'var(--color-text-tertiary)' }}>On an Apple platform</span>
        <Kbd keys={['Mod', 'k']} apple />
        <Kbd keys={['Mod', 'Shift', 'z']} apple />
        <Kbd keys={['Alt', 'Backspace']} apple />
      </span>
      <span style={{ display: 'inline-flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
        <span style={{ color: 'var(--color-text-tertiary)' }}>Everywhere else</span>
        <Kbd keys={['Mod', 'k']} apple={false} />
        <Kbd keys={['Mod', 'Shift', 'z']} apple={false} />
        <Kbd keys={['Alt', 'Backspace']} apple={false} />
      </span>
    </div>
  ),
};

/** One key, for a hint that sits inside a field. */
export const OneKey: Story = {
  render: () => <Kbd subtle>Enter</Kbd>,
};

/**
 * The cap on the ground it is actually drawn on. It is the inset well at the
 * tertiary ink, the same chip an identifier takes, so a shortcut hint in a
 * menu row and a `${'{'}VAR{'}'}` in a sentence beside it read as one family.
 *
 * Switch the Theme toolbar to see both palettes.
 */
export const OnItsOwnGround: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <Card.Header>
        <Card.Title>Shortcuts</Card.Title>
      </Card.Header>
      <Card.Body>
        {[
          ['Open the command palette', ['Mod', 'k']] as const,
          ['Undo the last change', ['Mod', 'z']] as const,
          ['Close this panel', ['Escape']] as const,
        ].map(([what, keys]) => (
          <div key={what} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <Text variant="cell" style={{ flex: 1 }}>
              {what}
            </Text>
            <Kbd keys={keys} />
          </div>
        ))}
      </Card.Body>
    </Card>
  ),
};
