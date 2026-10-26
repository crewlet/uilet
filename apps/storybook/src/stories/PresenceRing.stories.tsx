import type { Meta, StoryObj } from '@storybook/react-vite';
import { NODE_HUES, PresenceRing } from '@crewlethq/ui';

const meta: Meta<typeof PresenceRing> = {
  title: 'UI/PresenceRing',
  component: PresenceRing,
};

export default meta;
type Story = StoryObj<typeof PresenceRing>;

const box = { display: 'inline-flex', padding: '8px 12px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)' };

/** Every hue, in the current theme. Switch the theme in the toolbar for light, dark and every palette. */
export const AllHues: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {NODE_HUES.map((hue) => (
        <PresenceRing key={hue} hue={hue} style={box}>
          {hue}
        </PresenceRing>
      ))}
    </div>
  ),
};

/** An idle collaborator's ring is dashed. */
export const Idle: Story = {
  render: () => (
    <PresenceRing hue="cyan" state="idle" style={box}>
      Globex
    </PresenceRing>
  ),
};

/** Rings nested one inside another, inset further each time, never doubling an edge. */
export const Stacked: Story = {
  render: () => (
    // The outer corner is the inner box's plus the padding and hairline
    // between them, so the two boxes (and the rings drawn in them) run
    // concentric rather than the inner corners bulging toward the outer ring.
    <PresenceRing hue="rose" style={{ ...box, padding: 4, borderRadius: 'calc(var(--radius-sm) + 5px)' }}>
      <PresenceRing hue="green" inset={3} style={box}>
        Two collaborators
      </PresenceRing>
    </PresenceRing>
  ),
};

/** On a cell-sized box, as the sheet draws it. */
export const OnACell: Story = {
  render: () => (
    <PresenceRing hue="amber" style={{ ...box, width: 112, height: 32, boxSizing: 'border-box', alignItems: 'center', justifyContent: 'flex-end' }}>
      6.8
    </PresenceRing>
  ),
};
