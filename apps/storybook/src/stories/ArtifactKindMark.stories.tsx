import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ARTIFACT_KIND_CHARACTERS, ArtifactKindMark } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactKindMark> = {
  title: 'UI/ArtifactKindMark',
  component: ArtifactKindMark,
};

export default meta;
type Story = StoryObj<typeof ArtifactKindMark>;

/**
 * Every kind's glyph on its plate, at every step: the same drawing in the same
 * ink a card's badge, a list row and the sidebar carry, so a kind marked on a
 * chip or a template reads as the kind it is everywhere else.
 */
export const Glyphs: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {ARTIFACT_KINDS.map((kind) => (
            <ArtifactKindMark key={kind} kind={kind} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * Every kind's maker, for a Make tile's art: a page for a doc, a wide screen
 * for slides, a prism for a design, a gauge for a dashboard, a chip for a page
 * of code and a stack of rows for a sheet.
 */
export const Makers: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {ARTIFACT_KINDS.map((kind) => (
        <figure key={kind} style={{ margin: 0, textAlign: 'center' }}>
          <ArtifactKindMark kind={kind} art="character" size="xl" surface="bare" />
          <figcaption style={{ fontSize: 12 }}>{ARTIFACT_KIND_CHARACTERS[kind]}</figcaption>
        </figure>
      ))}
    </div>
  ),
};
