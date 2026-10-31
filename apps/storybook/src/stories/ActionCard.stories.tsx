import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionCard, ActionCardRow, ArtifactKindIllustration, type ActionCardTone } from '@crewlethq/ui';

/**
 * First steps offered as pictures: tall cards on an artifact kind's colour
 * ground, the title at the top and a drawing at the foot. A new room opens
 * with a row of them until its first message. The hover is quiet (the
 * ground deepens and a small shadow lifts the card) and nothing moves.
 * Switch the theme and the palette: every ground is a measured kind colour.
 */
const meta: Meta<typeof ActionCard> = {
  title: 'UI/ActionCard',
  component: ActionCard,
};

export default meta;
type Story = StoryObj<typeof ActionCard>;

export const FirstSteps: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <ActionCardRow label="First steps for this room">
        <ActionCard tone="purple" title="Add people and agents" art={<ArtifactKindIllustration kind="design" />} onSelect={() => undefined} />
        <ActionCard tone="blue" title="Add a description" art={<ArtifactKindIllustration kind="doc" />} onSelect={() => undefined} />
        <ActionCard tone="amber" title="Start from a template" art={<ArtifactKindIllustration kind="slides" />} onSelect={() => undefined} />
      </ActionCardRow>
    </div>
  ),
};

const TONES: [ActionCardTone, Parameters<typeof ArtifactKindIllustration>[0]['kind']][] = [
  ['purple', 'design'],
  ['blue', 'doc'],
  ['amber', 'slides'],
  ['green', 'sheet'],
  ['teal', 'dashboard'],
  ['magenta', 'brand'],
  ['rose', 'html'],
];

/** Every tone, each on its kind's own ground. */
export const Tones: Story = {
  render: () => (
    <ActionCardRow label="Every tone">
      {TONES.map(([tone, kind]) => (
        <ActionCard key={tone} tone={tone} title={`A ${tone} first step`} art={<ArtifactKindIllustration kind={kind} />} onSelect={() => undefined} />
      ))}
    </ActionCardRow>
  ),
};

/** On a phone the row scrolls sideways and snaps: two cards and part of the third say there is more. */
export const Phone: Story = {
  render: () => (
    <div style={{ width: 343 }}>
      <ActionCardRow label="First steps for this room">
        <ActionCard tone="purple" title="Add people and agents" art={<ArtifactKindIllustration kind="design" />} onSelect={() => undefined} />
        <ActionCard tone="blue" title="Add a description" art={<ArtifactKindIllustration kind="doc" />} onSelect={() => undefined} />
        <ActionCard tone="amber" title="Start from a template" art={<ArtifactKindIllustration kind="slides" />} onSelect={() => undefined} />
      </ActionCardRow>
    </div>
  ),
};
