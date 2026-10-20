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
 * tile a reader cannot use stays on the row and says why.
 */
export const MakeRow: Story = {
  render: () => (
    <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16, maxWidth: 1100, margin: 0, padding: 0, listStyle: 'none' }}>
      {ORDER.map((kind) => (
        <li key={kind}>
          <ArtifactKindTile kind={kind} label={WORDS[kind]} href={`#/artifacts/new?kind=${kind}`} badge={kind === 'dashboard' ? 'New' : undefined} />
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

const HINTS = {
  doc: 'You write it',
  slides: 'You write it',
  design: 'An agent designs it',
  dashboard: 'An agent builds it',
  html: 'An agent builds it',
  sheet: 'Your team fills it in',
} as const;

/**
 * The stage: each kind's maker character presenting the kind's object on a
 * dotted canvas of the kind's colour, the org chart's own ground, with a line
 * under the name saying who makes it. Shorter than the illustration tile.
 */
export const StageRow: Story = {
  render: () => (
    <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16, maxWidth: 1100, margin: 0, padding: 0, listStyle: 'none' }}>
      {ORDER.map((kind) => (
        <li key={kind}>
          <ArtifactKindTile appearance="stage" kind={kind} label={WORDS[kind]} hint={HINTS[kind]} href={`#/artifacts/new?kind=${kind}`} />
        </li>
      ))}
    </ul>
  ),
};

/** The figures: the crew offering to help, each maker standing on its own, one pressed. */
export const FigureRow: Story = {
  render: () => (
    <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, maxWidth: 900, margin: 0, padding: 0, listStyle: 'none' }}>
      {ORDER.map((kind) => (
        <li key={kind}>
          <ArtifactKindTile appearance="figure" kind={kind} label={WORDS[kind]} hint={HINTS[kind]} selected={kind === 'dashboard'} onSelect={() => {}} />
        </li>
      ))}
    </ul>
  ),
};

/** The chips: a composer's or a toolbar's row of kinds, one chosen, each with a key. */
export const ChipRow: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {ORDER.map((kind, i) => (
        <ArtifactKindTile key={kind} appearance="chip" kind={kind} label={WORDS[kind]} shortcut={'DSGBHT'[i]} selected={kind === 'doc'} onSelect={() => {}} />
      ))}
    </div>
  ),
};

/** A preview tile frames a starting point drawn live; here the kind's ground stands in. */
export const PreviewTile: Story = {
  render: () => (
    <div style={{ width: 200 }}>
      <ArtifactKindTile appearance="preview" kind="sheet" label="Review" hint="Sheet" href="#/artifacts/new?kind=sheet&from=review" />
    </div>
  ),
};
