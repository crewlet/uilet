import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ArtifactAccessLabel, ArtifactNameCell, PrincipalAvatar, RelativeTime, TableEntityCell } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactNameCell> = {
  title: 'UI/ArtifactNameCell',
  component: ArtifactNameCell,
};

export default meta;
type Story = StoryObj<typeof ArtifactNameCell>;

/**
 * An artifact's name in a list: the kind's glyph on its tint (the Make row's
 * tile at a list's size), the title, and under it the kind's word and what
 * it is about. The row it sits in is the link.
 */
export const Name: Story = {
  args: { kind: 'html', title: 'Pipeline health', detail: 'FairSplit CI over the last 14 days: pass rate, run volume and build time, by branch.' },
  render: (args) => (
    <div style={{ width: 420 }}>
      <ArtifactNameCell {...args} />
    </div>
  ),
};

const NOW = Date.parse('2026-10-20T12:00:00Z');

const ROWS = [
  { kind: 'doc', title: 'Architecture notes', detail: 'How the engine replicates its estate', access: 'private', owner: 'You', at: '2026-10-20T11:40:00Z', pinned: true },
  { kind: 'slides', title: 'Q4 roadmap', detail: 'The board review deck', access: 'company', owner: 'Maya Chen', at: '2026-10-19T16:00:00Z' },
  { kind: 'design', title: 'Launch landing page', detail: 'Hero, features, pricing and sign up', access: 'shared', owner: 'Miles', at: '2026-10-18T09:00:00Z' },
  { kind: 'dashboard', title: 'Delivery pulse', detail: '', access: 'company', owner: 'ops-lead', at: '2026-10-12T09:00:00Z' },
  { kind: 'html', title: 'Pipeline health', detail: 'FairSplit CI over the last 14 days', access: 'shared', owner: 'Miles', at: '2026-10-18T20:41:00Z' },
  { kind: 'sheet', title: 'Vendor scorecard with a long title that is cut at its column', detail: 'Every vendor against the five criteria', access: 'private', owner: 'You', at: '2026-09-30T09:00:00Z' },
] as const;

/**
 * THE LIST'S ROW, as the gallery composes it: the name, who can open it
 * (`ArtifactAccessLabel`), its owner (`TableEntityCell`) and when it was
 * edited. Hover a row: its ground moves and its mark's hairline takes the
 * kind's hue, and nothing lifts.
 */
export const ListRows: Story = {
  render: () => (
    <div role="table" aria-label="Artifacts" style={{ width: 960, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 8rem 11rem 7rem' }}>
      {ROWS.map((row) => (
        <div
          key={row.title}
          role="row"
          style={{ display: 'grid', gridColumn: '1 / -1', gridTemplateColumns: 'subgrid', alignItems: 'center', borderBottom: '1px solid var(--color-border-default)' }}
        >
          <span role="cell" style={{ padding: '4px 12px', minWidth: 0 }}>
            <ArtifactNameCell kind={row.kind} title={row.title} detail={row.detail} pinned={'pinned' in row} />
          </span>
          <span role="cell" style={{ padding: '4px 12px', fontSize: 'var(--font-size-compact)' }}>
            <ArtifactAccessLabel access={row.access} />
          </span>
          <span role="cell" style={{ padding: '4px 12px', fontSize: 'var(--font-size-compact)' }}>
            <TableEntityCell name={row.owner} badge={<PrincipalAvatar principal={{ id: row.owner, name: row.owner, kind: 'person' }} size="xs" />} />
          </span>
          <span role="cell" style={{ padding: '4px 12px', fontSize: 'var(--font-size-compact)', color: 'var(--color-text-tertiary)' }}>
            <RelativeTime value={row.at} now={NOW} />
          </span>
        </div>
      ))}
    </div>
  ),
};

/** Every kind's mark, as the list draws it, and a trashed one without its tint. */
export const Kinds: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, width: 360 }}>
      {ARTIFACT_KINDS.map((kind) => (
        <ArtifactNameCell key={kind} kind={kind} title={`A ${kind}`} detail="What it is about" />
      ))}
      <ArtifactNameCell kind="doc" title="In the trash" detail="Deleted for good in 30 days" trashed />
    </div>
  ),
};
