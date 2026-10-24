import type { Meta, StoryObj } from '@storybook/react-vite';
import { ARTIFACT_KINDS, ArtifactCard, ArtifactCardSkeleton, ArtifactKindGround, AutoGrid, DashboardCover, Document, LivePreview, Menu, useLivePreview } from '@crewlethq/ui';
import { useEffect, useState } from 'react';
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

/** A doc's opening, drawn once and small and kept as a snapshot, as a gallery's preview draws one. */
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
 * THE GALLERY CARD as the Artifacts page draws it: a snapshot of the
 * artifact's own content, drawn once when the card first comes near, the kind's badge over the preview's foot, the title
 * on one line, who can open it (a lock, people, the company) and when it was
 * edited, and a More menu beside the link, shown on hover and focus. Four
 * across a laptop's page, as the gallery lays them out; hover is a border and
 * hairline shadow step, and nothing moves.
 */
export const GalleryCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '24px 20px', maxWidth: 1140 }}>
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
 * PICKED FOR A BULK ACTION: a selectable card carries a box in the preview's
 * top corner, shown on hover and focus and always once it is picked. With the
 * gallery choosing (`selecting`), every box shows and a press anywhere on a
 * card ticks it rather than opening it; the More menu stays a menu.
 */
export const Selectable: Story = {
  render: function Render() {
    const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(['2']));
    const [selecting, setSelecting] = useState(false);
    const pick = (id: string, on: boolean) => {
      const next = new Set(picked);
      if (on) next.add(id);
      else next.delete(id);
      setPicked(next);
    };
    const cards = [
      { id: '1', title: 'Incident runbook', kind: 'doc' as const },
      { id: '2', title: 'Vendor scorecard', kind: 'sheet' as const },
      { id: '3', title: 'Pricing explorer', kind: 'html' as const },
    ];
    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 900 }}>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
          <input type="checkbox" checked={selecting} onChange={(event) => setSelecting(event.target.checked)} />
          The gallery is choosing
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px 20px' }}>
          {cards.map((card) => (
            <ArtifactCard
              key={card.id}
              title={card.title}
              kind={card.kind}
              href={`#/artifacts/${card.id}`}
              owner={MAYA}
              updatedAt={NOW - 3_600_000}
              access="company"
              now={NOW}
              selectable
              selecting={selecting || picked.size > 0}
              selected={picked.has(card.id)}
              onSelectedChange={(on) => pick(card.id, on)}
              actions={<More title={card.title} />}
            />
          ))}
        </div>
      </div>
    );
  },
};
