import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ArtifactKindGround, ArtifactKindIllustration, ArtifactKindTile } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactKindIllustration> = {
  title: 'UI/ArtifactKindIllustration',
  component: ArtifactKindIllustration,
};

export default meta;
type Story = StoryObj<typeof ArtifactKindIllustration>;

const WORDS = { doc: 'Docs', slides: 'Slides', design: 'Design', dashboard: 'Dashboard', html: 'HTML', sheet: 'Sheet' } as const;
const ORDER = ['doc', 'slides', 'design', 'dashboard', 'html', 'sheet'] as const;

/**
 * Every kind's drawing on its tinted ground: a page of prose, a slide, a phone
 * screen, a board of bars, a window of code and a grid of cells, each in the
 * kind's own token (`--color-artifact-kind-*`). Switch the theme to see each
 * repainted; nothing here holds a colour of its own.
 */
export const Grounds: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 220px)', gap: 16 }}>
      {ARTIFACT_KINDS.map((kind) => (
        <div key={kind} style={{ aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden' }}>
          <ArtifactKindGround kind={kind} />
        </div>
      ))}
    </div>
  ),
};

/** The drawings alone, at a glyph's size and at a tile's, so each reads at both. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {[48, 96, 160].map((width) => (
        <div key={width} style={{ display: 'flex', gap: 16 }}>
          {ARTIFACT_KINDS.map((kind) => (
            <div key={kind} style={{ width, aspectRatio: '4 / 3' }}>
              <ArtifactKindIllustration kind={kind} />
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * The gallery's Make something new row: one tile per kind, each one link
 * named by the kind's name. A tag is for a kind that is genuinely new, and a
 * tile a reader cannot use stays on the row and says why. Hover steps the
 * frame's border; the drawing inside stays still.
 */
export const MakeRow: Story = {
  render: () => (
    <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16, maxWidth: 1100, margin: 0, padding: 0, listStyle: 'none' }}>
      {ORDER.map((kind) => (
        <li key={kind}>
          <ArtifactKindTile kind={kind} label={WORDS[kind]} href={`#/artifacts/new/${kind}`} badge={kind === 'dashboard' ? 'New' : undefined} />
        </li>
      ))}
    </ul>
  ),
};

/** A tile this reader cannot use: still focusable, and its reason is read with it. */
export const Disabled: Story = {
  render: () => (
    <div style={{ width: 180 }}>
      <ArtifactKindTile kind="sheet" label="Sheet" disabledReason="Starting an artifact needs the Artifacts app. Ask an administrator for it." />
    </div>
  ),
};
