import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContrastBadge } from '@crewlethq/ui';

const meta: Meta<typeof ContrastBadge> = {
  title: 'UI/ContrastBadge',
  component: ContrastBadge,
};

export default meta;
type Story = StoryObj<typeof ContrastBadge>;

/**
 * EVERY LEVEL A PAIR CAN REACH, in words and a glyph: AAA, AA, AA for large
 * text only, and fails. Large text and marks are held to their own floors,
 * and a pair with a colour missing is not measured. The ratio and the floors
 * are `@crewlethq/tokens`' own, and the printed ratio is cut down, never
 * rounded up past a floor the pair misses.
 */
export const Levels: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <ContrastBadge label="Text on light ground" foreground="#16131f" background="#fbfaff" />
      <ContrastBadge label="Grey text on white" foreground="#767676" background="#ffffff" />
      <ContrastBadge label="Light grey text on white" foreground="#8a8a8a" background="#ffffff" />
      <ContrastBadge label="Pale primary on light ground" foreground="#b9b4ff" background="#fbfaff" scale="large" />
      <ContrastBadge label="Logo on dark ground" foreground="#ffffff" background="#120a2b" scale="large" />
      <ContrastBadge label="Text on dark ground" foreground="#fbfaff" background="" />
    </div>
  ),
};
