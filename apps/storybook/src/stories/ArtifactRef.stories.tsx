import type { Meta, StoryObj } from '@storybook/react-vite';
import { SquareKanbanGlyph } from '@crewlethq/icons/glyphs';
import { ArtifactRef, InlineRef, Link } from '@crewlethq/ui';

/**
 * An artifact named in a sentence or a row, drawn as a work item's key is:
 * its kind's glyph, then its title, at the text's size and in its ink.
 */
const meta: Meta<typeof ArtifactRef> = {
  title: 'UI/ArtifactRef',
  component: ArtifactRef,
  args: { kind: 'slides', title: 'Q4 roadmap', href: '#/artifacts/a1' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, fontSize: 'var(--font-size-compact)', lineHeight: 'var(--font-line-height-relaxed)' }}>
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ArtifactRef>;

export const Default: Story = {};

/** Beside a work item's key, every kind. */
export const InASentence: Story = {
  render: () => (
    <p>
      <InlineRef mark={<SquareKanbanGlyph />} kind="Task" href="#/worklet/ENG-390" code>
        ENG-390
      </InlineRef>{' '}
      ships the <ArtifactRef kind="slides" title="Q4 roadmap" href="#/artifacts/a1" />, the{' '}
      <ArtifactRef kind="doc" title="Launch plan" href="#/artifacts/a2" />, the{' '}
      <ArtifactRef kind="sheet" title="Budget 2026" href="#/artifacts/a3" />, the{' '}
      <ArtifactRef kind="design" title="Pricing page" href="#/artifacts/a4" />, the{' '}
      <ArtifactRef kind="dashboard" title="Support load" href="#/artifacts/a5" />, the{' '}
      <ArtifactRef kind="html" title="Status board" href="#/artifacts/a6" /> and the{' '}
      <ArtifactRef kind="brand" title="Company brand" href="#/artifacts/a7" />.
    </p>
  ),
};

/** A long title wraps with the sentence; its glyph and first word never part. */
export const LongTitle: Story = {
  render: () => (
    <p style={{ maxWidth: 260 }}>
      Read the{' '}
      <ArtifactRef kind="doc" title="Notes from the November planning offsite, every team's goals and the open questions" href="#/artifacts/a2" />{' '}
      first.
    </p>
  ),
};

/** In a row, quiet, as a row's task key is: inside a quiet link. */
export const InARow: Story = {
  render: () => (
    <Link href="#/artifacts/a1" variant="quiet" size="inherit">
      <ArtifactRef kind="slides" title="Q4 roadmap" />
    </Link>
  ),
};

/** Its kind is still being read: any artifact's glyph, swapped for the kind's once known. */
export const KindUnknown: Story = { args: { kind: undefined, title: 'Q4 roadmap' } };
