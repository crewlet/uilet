import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import { Copyable, CopyButton, Text } from '@crewlethq/ui';

const meta: Meta<typeof Copyable> = {
  title: 'UI/Copyable',
  component: Copyable,
  args: {
    value: '00000000-0000-4000-8000-000000000000',
    variant: 'chip',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['chip', 'inline', 'block'] },
    monospace: { control: 'boolean' },
    truncate: { control: 'boolean' },
    truncateLength: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Copyable>;

export const Chip: Story = {};

export const Inline: Story = { args: { variant: 'inline' } };

export const Block: Story = {
  args: {
    variant: 'block',
    value: 'https://cluster-1234.crewlet.example/api',
  },
};

export const BlockMonospace: Story = {
  args: {
    variant: 'block',
    monospace: true,
    value: 'kubectl get pods --all-namespaces',
  },
};

export const TruncatedChip: Story = {
  args: {
    value: 'a-very-long-identifier-that-should-be-truncated-aggressively',
    truncate: true,
    truncateLength: 12,
  },
};

/**
 * The labelled form. The outcome is announced from a region OUTSIDE the
 * button, because an accessible name is computed from an element's contents:
 * inside it, the control was named "Copied copied to the clipboard".
 */
export const TheLabelledButton: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
      <CopyButton text={'{"turn_id":"t-1"}'} />
      <CopyButton text={'{"turn_id":"t-1"}'} variant="secondary" label="Copy the record" />
    </div>
  ),
};

/**
 * Both halves of a refusal, which is the one state a story could not reach
 * before: the clipboard works in this iframe, so the failed styling and the
 * error glyph were only ever visible to somebody reading an http origin.
 *
 * `Refusing` puts the browser into the state that origin is in — no
 * `navigator.clipboard`, an `execCommand` that answers false — and puts it
 * back when the story is left, so it touches nothing else in the Storybook.
 */
const Refusing = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const owned = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const exec = document.execCommand;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = () => false;
    return () => {
      // An own property shadowing the prototype getter: deleting it is what
      // restores the real one, and redefining is what restores an own one.
      if (owned) Object.defineProperty(navigator, 'clipboard', owned);
      else Reflect.deleteProperty(navigator, 'clipboard');
      document.execCommand = exec;
    };
  }, []);
  return children;
};

/**
 * A REFUSAL DOES NOT WANT THE SUCCESS CLOCK. Press both. The first settles
 * back to "Copy" after two seconds and is then indistinguishable from a button
 * nobody ever pressed, so the reader presses it again and learns nothing a
 * second time. The second holds what it found out.
 *
 * `failedResetMs={null}` is the recommended setting, and it is not the default
 * only because moving the default would change what every existing call site
 * draws. Its cost is that the control's accessible name stays "Copy failed",
 * which names a status rather than the action it still performs — pass a
 * number instead for a longer clock that still hands the action back.
 */
export const ARefusalAndItsClock: Story = {
  render: () => (
    <Refusing>
      <div style={{ display: 'grid', gap: 'var(--spacing-4)', justifyItems: 'start' }}>
        <Text as="p" variant="cell">
          The success clock (the default): gone in 2s.
        </Text>
        <CopyButton text="never reaches the clipboard here" />
        <Text as="p" variant="cell">
          Held until the next press.
        </Text>
        <CopyButton text="never reaches the clipboard here" failedResetMs={null} />
        <Text as="p" variant="cell">
          The chip, held the same way.
        </Text>
        <Copyable value="seat_01HZX" ariaLabel="Copy the seat id" failedResetMs={null} />
      </div>
    </Refusing>
  ),
};

/** One tab stop: the value is text, and the control is the only control. */
export const OneTabStop: Story = {
  render: () => (
    <Text as="p" variant="cell">
      Turn <Copyable value="0f8c2a11-4d1e-49f5-9b3a-2f1c7d0e5a44" ariaLabel="Copy the turn id" /> ran on
      node-a.
    </Text>
  ),
};
