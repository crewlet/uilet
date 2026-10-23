import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, PageNote, Stack } from '@crewlethq/ui';

const meta: Meta<typeof PageNote> = { title: 'UI/PageNote', component: PageNote };
export default meta;
type Story = StoryObj<typeof PageNote>;

/** A screen's one quiet sentence over its content, in the column's own rhythm. */
export const OverAPage: Story = {
  render: () => (
    <Stack gap={5} style={{ maxWidth: 960 }}>
      <PageNote>
        The caps the engine holds every turn, delegation and wake-up to. Read only here: each is a key of the company
        document, named under the cap.
      </PageNote>
      <Card>Content</Card>
    </Stack>
  ),
};
