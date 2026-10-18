import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChangeMark } from '@crewlethq/ui';

const meta: Meta<typeof ChangeMark> = {
  title: 'UI/ChangeMark',
  component: ChangeMark,
};

export default meta;
type Story = StoryObj<typeof ChangeMark>;

const cell = { position: 'relative' as const, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: 112, height: 32, padding: '0 8px', boxSizing: 'border-box' as const, border: '1px solid var(--color-border-default)' };

/** On a cell: hover the corner for who changed it, when, and what it was. */
export const Cell: Story = {
  render: () => (
    <span style={cell}>
      7.2
      <ChangeMark by="Maya Ortiz" at="2026-10-17T10:42:00Z" previous="6.8" />
    </span>
  ),
};

/** On any element of a page, with no previous value to say. */
export const Element: Story = {
  render: () => (
    <div style={{ position: 'relative', padding: 16, border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', maxWidth: 320 }}>
      Pricing summary for Q4
      <ChangeMark by="PM" at="2026-10-17T11:05:00Z" />
    </div>
  ),
};
