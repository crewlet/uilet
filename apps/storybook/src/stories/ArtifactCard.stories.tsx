import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ArtifactCard, ArtifactCardSkeleton, ArtifactKindGround, AutoGrid, DashboardCover, Document, LivePreview, Menu, useLivePreview } from '@crewlethq/ui';
import { useEffect } from 'react';
import { CopyGlyph, EllipsisGlyph, PencilGlyph, PinGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';

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
 * A gallery's cards. The whole card is one link named by its title; the facts
 * are its description, read as "Edited 4m ago by Maya". A missing preview is
 * the kind's drawing on its tinted ground, never a screenshot.
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
      {/* A BOARD WHOSE FIGURES THE GALLERY DOES NOT HOLD: each row says what
          it measures and the dataset it cites, the label at the card's width. */}
      <ArtifactCard
        title="Delivery pulse"
        kind="dashboard"
        href="#/artifacts/6"
        owner={CTO}
        updatedAt={NOW - 2 * 86_400_000}
        now={NOW}
        preview={
          <DashboardCover
            stats={[
              { label: 'Open work items', source: 'Open work' },
              { label: 'Tokens, last 7 days', source: 'Token spend' },
              { label: 'Deploys this week', source: 'Deploys' },
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

/**
 * A task's rail, 280px wide: a long title is cut on one line inside the card,
 * and a change the owner made names them once.
 */
export const CompactInARail: Story = {
  render: () => (
    <ul style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 4, width: 280, margin: 0, padding: 0, listStyle: 'none' }}>
      <li>
        <ArtifactCard
          title="Launch checklist for the October release, with every gate the review asked for"
          kind="html"
          href="#/artifacts/3"
          owner={MAYA}
          updatedAt={NOW - 26_000}
          updatedBy={MAYA.name}
          version={1}
          size="compact"
          now={NOW}
        />
      </li>
      <li>
        <ArtifactCard title="Launch notes" kind="doc" href="#/artifacts/4" owner={MAYA} updatedAt={NOW - 3_600_000} updatedBy="PM" version={4} size="compact" now={NOW} />
      </li>
    </ul>
  ),
};

/** Every kind with no preview: the drawing, the badge and the word each kind is drawn with until it has one. */
export const Kinds: Story = {
  render: () => (
    <AutoGrid min="sm" gap={3}>
      {ARTIFACT_KINDS.map((kind) => (
        <ArtifactCard key={kind} title={`Untitled ${kind}`} kind={kind} href={`#/artifacts/${kind}`} updatedAt={NOW - 3_600_000} now={NOW} />
      ))}
    </AutoGrid>
  ),
};

/** A More menu as a gallery draws one beside a card's link. */
function More({ title }: { title: string }) {
  return (
    <Menu
      label={`More for “${title}”`}
      icon={<EllipsisGlyph size="sm" />}
      triggerVariant="ghost"
      align="end"
      items={[
        { key: 'pin', label: 'Pin to your sidebar', icon: <PinGlyph size="sm" />, onSelect: () => {} },
        { key: 'copy', label: 'Copy link', icon: <CopyGlyph size="sm" />, onSelect: () => {} },
        { key: 'rename', label: 'Rename', icon: <PencilGlyph size="sm" />, onSelect: () => {} },
        { kind: 'separator', key: 'sep' },
        { key: 'trash', label: 'Move to the trash', icon: <TrashGlyph size="sm" />, danger: true, onSelect: () => {} },
      ]}
    />
  );
}

/** A doc's opening, drawn live and small, as a gallery's preview draws one. */
function Opening() {
  const preview = useLivePreview();
  useEffect(() => preview.ready(), [preview]);
  return (
    <div style={{ padding: 40, background: 'var(--color-surface-background)', minHeight: '100%', boxSizing: 'border-box' }}>
      <Document measure="none">
        <h1>Incident runbook</h1>
        <p>Who answers the pager, how quickly, and what they look at first.</p>
        <h2>First five minutes</h2>
        <p>Acknowledge the page, open the incident channel and say you are on it.</p>
      </Document>
    </div>
  );
}

/**
 * THE GALLERY CARD as the Artifacts page draws it: a live preview of the
 * artifact's own content, the kind's badge over the preview's foot, the title
 * on one line, who can open it (a lock, people, the company) and when it was
 * edited, and a More menu beside the link, shown on hover and focus.
 */
export const GalleryCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24, maxWidth: 1120 }}>
      <ArtifactCard
        title="Incident runbook"
        kind="doc"
        href="#/artifacts/1"
        updatedAt={NOW - 20 * 3_600_000}
        access="private"
        now={NOW}
        actions={<More title="Incident runbook" />}
        preview={
          <LivePreview width={600} fallback={<ArtifactKindGround kind="doc" />} dwellMs={0}>
            <Opening />
          </LivePreview>
        }
      />
      <ArtifactCard title="Vendor scorecard" kind="sheet" href="#/artifacts/2" owner={MAYA} updatedAt={NOW - 26 * 3_600_000} access="shared" pinned now={NOW} actions={<More title="Vendor scorecard" />} />
      <ArtifactCard title="Company handbook" kind="slides" href="#/artifacts/3" owner={CTO} updatedAt={NOW - 3 * 86_400_000} access="company" now={NOW} actions={<More title="Company handbook" />} />
    </div>
  ),
};

/** A card in the trash: its preview faded, so the trash's grid reads as put away. */
export const Trashed: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <ArtifactCard title="Old pricing page" kind="html" href="#/artifacts/9" updatedAt={NOW - 5 * 86_400_000} access="private" trashed now={NOW} />
    </div>
  ),
};

/** The placeholder a gallery draws while its listing loads: the card's own shape. */
export const Skeleton: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24, maxWidth: 1120 }}>
      <ArtifactCardSkeleton />
      <ArtifactCardSkeleton />
      <ArtifactCardSkeleton />
    </div>
  ),
};

/**
 * The tile: the gallery card a step smaller, four across a laptop's page,
 * its badge the kind's glyph in its ink, as on every card.
 */
export const TileCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20, maxWidth: 1120 }}>
      {ARTIFACT_KINDS.slice(0, 4).map((kind, i) => (
        <ArtifactCard
          key={kind}
          title={['Settlement page', 'Incident runbook', 'Company handbook', 'Mobile companion'][i]!}
          kind={kind}
          href={`#/artifacts/${i}`}
          owner={i % 2 ? MAYA : CTO}
          updatedAt={NOW - (i + 1) * 3_600_000}
          access="shared"
          now={NOW}
          size="tile"
          actions={<More title="Tile" />}
        />
      ))}
    </div>
  ),
};
