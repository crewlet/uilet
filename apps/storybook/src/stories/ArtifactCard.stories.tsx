import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ArtifactCard, AutoGrid, DashboardCover } from '@crewlethq/ui';

const meta: Meta<typeof ArtifactCard> = {
  title: 'UI/ArtifactCard',
  component: ArtifactCard,
};

export default meta;
type Story = StoryObj<typeof ArtifactCard>;

const NOW = Date.parse('2026-10-17T12:00:00Z');
const MAYA = { id: 'maya', kind: 'person' as const, name: 'Maya Ortiz' };
const CTO = { id: 'cto', kind: 'agent' as const, name: '@cto', character: 'hexlet' as const, hue: 'amber' as const };

/**
 * A gallery's cards shape. The whole card is one link named by its title; the
 * facts are its description, read as "Updated 4m ago by Maya". A missing
 * preview is the kind's glyph, never a screenshot.
 */
export const Gallery: Story = {
  render: () => (
    <AutoGrid min="md" gap={3}>
      <ArtifactCard
        title="Vendor scorecard"
        kind="sheet"
        href="#/artifacts/1"
        owner={MAYA}
        updatedAt={NOW - 4 * 60_000}
        updatedBy="Maya"
        project="OPS"
        changes={14}
        presence={[
          { name: 'Maya Ortiz', kind: 'human' },
          { name: 'Jane Founder', kind: 'human' },
        ]}
        now={NOW}
      />
      <ArtifactCard title="Pricing explorer" kind="html" href="#/artifacts/2" owner={CTO} updatedAt={NOW - 12 * 60_000} project="GTM" version={3} pinned now={NOW} />
      <ArtifactCard title="Incident runbook" kind="doc" href="#/artifacts/3" owner={MAYA} updatedAt={NOW - 86_400_000} now={NOW} />
      {/* THE READER'S OWN, so no owner is named, and a long title cut to one
          line with the whole of it offered to a pointer. */}
      <ArtifactCard
        title="Integration requirements review for the payments platform migration"
        kind="sheet"
        href="#/artifacts/5"
        updatedAt={NOW - 2 * 3_600_000}
        updatedBy="Maya"
        version={4}
        now={NOW}
      />
      <ArtifactCard
        title="Delivery board"
        kind="dashboard"
        href="#/artifacts/4"
        owner={CTO}
        updatedAt={NOW - 30 * 60_000}
        version={2}
        now={NOW}
        preview={
          <DashboardCover
            stats={[
              { label: 'Open tasks', value: '12' },
              { label: 'Spend today', value: '$4.20' },
              { label: 'Agents working', source: 'Agent status' },
            ]}
          />
        }
      />
    </AutoGrid>
  ),
};

/** The row a task's rail, a narrow column or a phone draws: the kind's glyph in place of the preview. */
export const Compact: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
      <ArtifactCard title="Vendor scorecard" kind="sheet" href="#/artifacts/1" owner={MAYA} updatedAt={NOW - 4 * 60_000} changes={2} size="compact" now={NOW} />
      <ArtifactCard title="Pricing explorer" kind="html" href="#/artifacts/2" owner={CTO} updatedAt={NOW - 3_600_000} version={3} size="compact" now={NOW} />
    </div>
  ),
};

/** Every kind with no preview: the glyph and the label each kind is drawn with until it has a cover. */
export const Kinds: Story = {
  render: () => (
    <AutoGrid min="sm" gap={3}>
      {ARTIFACT_KINDS.map((kind) => (
        <ArtifactCard key={kind} title={`Untitled ${kind}`} kind={kind} href={`#/artifacts/${kind}`} updatedAt={NOW - 3_600_000} now={NOW} />
      ))}
    </AutoGrid>
  ),
};
