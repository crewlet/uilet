import type { Meta, StoryObj } from '@storybook/react-vite';
import { DownloadButton, FileList, StatusCard } from '@crewlethq/ui';

/**
 * Files handed to the reader: each with its name, what it is, how large it is
 * and its download. An image gets a preview under its row, drawn only as an
 * `<img>`, so an SVG's script never runs; any other file shows its mark alone.
 */
const meta: Meta<typeof FileList> = {
  title: 'UI/FileList',
  component: FileList,
  decorators: [(Story) => <div style={{ maxWidth: 388, paddingInline: 16 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof FileList>;

const CHART =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 320 160"><rect width="320" height="160" fill-opacity="0.08"/><rect x="30" y="60" width="40" height="80" fill-opacity="0.45"/><rect x="100" y="30" width="40" height="110" fill-opacity="0.45"/><rect x="170" y="90" width="40" height="50" fill-opacity="0.45"/><rect x="240" y="50" width="40" height="90" fill-opacity="0.45"/></svg>',
  );

const download = (name: string, body: string) => <DownloadButton filename={name} text={body} aria-label={`Download ${name}`} />;

/** A run's delivered files, in the card a conversation draws them in. */
export const Delivered: Story = {
  render: () => (
    <StatusCard title="Files" subtitle="3 files">
      <FileList
        label="Files"
        files={[
          { id: 'csv', name: 'spend-by-agent.csv', type: 'CSV file', size: '2.1 KB', action: download('spend-by-agent.csv', 'agent,tokens') },
          { id: 'svg', name: 'spend-chart.svg', type: 'SVG image', size: '1.4 KB', preview: CHART, action: download('spend-chart.svg', '') },
          { id: 'md', name: 'summary.md', type: 'Markdown file', size: '900 B', action: download('summary.md', '# Summary') },
        ]}
      />
    </StatusCard>
  ),
};
