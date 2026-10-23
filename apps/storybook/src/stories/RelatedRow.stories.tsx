import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, RelatedRow, Stack } from '@crewlethq/ui';
import { GaugeGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof RelatedRow> = { title: 'UI/RelatedRow', component: RelatedRow };
export default meta;
type Story = StoryObj<typeof RelatedRow>;

/** The one related place under a page's content: a quiet linked row on a card's inset, never a footnote. */
export const UnderAPage: Story = {
  render: () => (
    <Stack gap={5} style={{ maxWidth: 680 }}>
      <Card>Standing policies</Card>
      <RelatedRow
        href="#/settings/limits"
        icon={<GaugeGlyph size="sm" />}
        title="Engine limits"
        description="The caps the engine holds every turn to, in Settings › Limits."
      />
    </Stack>
  ),
};
