import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, DottedGround } from '@crewlethq/ui';

const meta: Meta<typeof DottedGround> = {
  title: 'UI/DottedGround',
  component: DottedGround,
};

export default meta;
type Story = StoryObj<typeof DottedGround>;

/** The canvas's own ground, holding a page being written, as a sheet of paper on a desk. */
export const Plain: Story = {
  render: () => (
    <DottedGround shape="inset" style={{ padding: 32 }}>
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: 32,
          background: 'var(--color-surface-background)',
          borderRadius: 12,
          border: '1px solid var(--color-border-default)',
        }}
      >
        A page set on the workshop's ground.
      </div>
    </DottedGround>
  ),
};

/** Each kind's ground: its line for the dots, over its fill. */
export const Kinds: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 220px)',
        gap: 16,
      }}
    >
      {ARTIFACT_KINDS.map((kind) => (
        <DottedGround key={kind} kind={kind} shape="inset" style={{ height: 120 }} />
      ))}
    </div>
  ),
};
