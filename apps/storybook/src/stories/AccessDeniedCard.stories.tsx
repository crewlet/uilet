import type { Meta, StoryObj } from '@storybook/react-vite';
import { AccessDeniedCard, ButtonLink, Stack } from '@crewlethq/ui';

const meta: Meta<typeof AccessDeniedCard> = {
  title: 'UI/AccessDeniedCard',
  component: AccessDeniedCard,
  args: { reason: 'not-found' },
  argTypes: {
    reason: { control: 'inline-radio', options: ['not-found', 'no-access', 'revoked', 'app-locked'] },
    owner: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof AccessDeniedCard>;

/**
 * The engine answers "not found" for an artifact the reader has no relation
 * to, so the card says both things that can mean, together, and never names
 * anything about the artifact.
 */
export const NotFound: Story = {
  args: { action: <ButtonLink href="#/artifacts" variant="outline">Back to artifacts</ButtonLink> },
};

/** Every reason, with the owner named where the reader may know them. */
export const Reasons: Story = {
  render: () => (
    <Stack gap={4}>
      <AccessDeniedCard reason="not-found" />
      <AccessDeniedCard reason="no-access" owner="Maya Ortiz" />
      <AccessDeniedCard reason="revoked" owner="Maya Ortiz" />
      <AccessDeniedCard reason="app-locked" />
    </Stack>
  ),
};
