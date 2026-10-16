import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineCode, QrCode, Stack, Text } from '@crewlethq/ui';

const URI =
  'otpauth://totp/crewlet.example.com:jane.doe?algorithm=SHA1&digits=6&issuer=crewlet.example.com&period=30&secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

const meta: Meta<typeof QrCode> = {
  title: 'UI/QrCode',
  component: QrCode,
  args: { value: URI, label: 'QR code for your authenticator app' },
};

export default meta;
type Story = StoryObj<typeof QrCode>;

/**
 * Black on a white plate in every theme, with four modules of quiet zone. The
 * inks are the `color.qr` tokens, which are the same in every palette: a code
 * inverted for a dark theme is one some authenticator apps will not read.
 * Switch the Theme toolbar to see that nothing about it moves.
 */
export const Basic: Story = {};

/**
 * A code is an aid, so the value's other forms stand beside it: here the key a
 * reader types into an app on the same device.
 */
export const WithItsKey: Story = {
  render: (args) => (
    <Stack gap={3} align="start">
      <QrCode {...args} />
      <Text as="p" variant="caption" tone="secondary">
        Can&rsquo;t scan it? Open it in your app, or type this key.
      </Text>
      <InlineCode>JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP</InlineCode>
    </Stack>
  ),
};

/** A value too long for any QR code draws nothing, and its other forms carry it. */
export const TooLongToDraw: Story = {
  args: { value: 'a'.repeat(2332) },
};
