import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ArtifactKindGlyph } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactKindGlyph> = {
  title: 'UI/ArtifactKindGlyph',
  component: ArtifactKindGlyph,
  args: { kind: 'sheet', size: 'md' },
  argTypes: {
    kind: { control: 'select', options: ARTIFACT_KINDS },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof ArtifactKindGlyph>;

/** One kind's glyph, the way a sidebar's pin or a palette's hit draws it. */
export const Default: Story = {};

/**
 * Every kind at each glyph step, in the engine's order (`ARTIFACT_KINDS`).
 * The glyph takes the text colour it is set in, so it reads in every theme.
 */
export const EveryKind: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {ARTIFACT_KINDS.map((kind) => (
            <span key={kind} title={kind} style={{ display: 'inline-flex' }}>
              <ArtifactKindGlyph kind={kind} size={size} />
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
};
