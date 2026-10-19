import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArtifactCard, AutoGrid, DocCover, SheetCover } from '@crewlethq/ui';

const meta: Meta<typeof DocCover> = {
  title: 'UI/ArtifactCover',
  component: DocCover,
};

export default meta;
type Story = StoryObj<typeof DocCover>;

const NOW = Date.parse('2026-10-17T12:00:00Z');

/**
 * The covers a gallery draws natively, on the cards they belong to: a doc's
 * opening as a small page, a sheet's first columns and rows. Never a
 * screenshot; a kind with no cover keeps its glyph.
 */
export const OnCards: Story = {
  render: () => (
    <AutoGrid min="md" gap={3}>
      <ArtifactCard
        title="On-call handbook"
        kind="doc"
        href="#/artifacts/1"
        updatedAt={NOW - 3_600_000}
        now={NOW}
        preview={
          <DocCover>
            <h1>On-call handbook</h1>
            <p>Read this before your first shift. It says who to page, when to escalate and how to hand over.</p>
            <h2>Paging</h2>
            <p>Page the escalation lead within ten minutes of an alert you cannot clear.</p>
          </DocCover>
        }
      />
      <ArtifactCard
        title="Vendor scorecard"
        kind="sheet"
        href="#/artifacts/2"
        updatedAt={NOW - 60_000}
        now={NOW}
        preview={
          <SheetCover
            columns={['Vendor', 'Owner', 'Status', 'Score']}
            rows={[
              ['Acme', 'Maya', 'Approved', '92'],
              ['Globex', 'Jane', 'In review', '78'],
              ['Initech', 'Sam', 'Blocked', '41'],
            ]}
          />
        }
      />
      <ArtifactCard title="Pricing explorer" kind="html" href="#/artifacts/3" updatedAt={NOW - 86_400_000} now={NOW} />
    </AutoGrid>
  ),
};
