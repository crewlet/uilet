import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, LinkInterstitial } from '@crewlethq/ui';

const meta: Meta<typeof LinkInterstitial> = {
  title: 'UI/LinkInterstitial',
  component: LinkInterstitial,
};

export default meta;
type Story = StoryObj<typeof LinkInterstitial>;

function Opener({ href, source }: { href: string; source?: string }) {
  const [url, setUrl] = useState<URL | null>(null);
  return (
    <>
      <Button variant="outline" onClick={() => setUrl(new URL(href))}>
        Follow the link
      </Button>
      <LinkInterstitial url={url} source={source} onClose={() => setUrl(null)} />
    </>
  );
}

/**
 * An artifact never opens a window. Its link comes through the bridge, and
 * this dialog names the host in large type before anything is opened, then
 * opens it with `noopener` and `noreferrer`.
 */
export const Secure: Story = {
  render: () => <Opener href="https://reports.example.com/q3?tab=summary" source="Vendor scorecard" />,
};

/** A link without a secure connection says what that means. */
export const Insecure: Story = {
  render: () => <Opener href="http://intranet.example.com/wiki" source="Incident timeline" />,
};

/**
 * A host drawn in look-alike letters from another script shows as the ASCII
 * form it really is, because the URL parser gives that form.
 */
export const LookAlikeHost: Story = {
  render: () => <Opener href={'https://аpple.com/login'} source="Pricing explorer" />,
};

/** A mail link names the address. */
export const Mail: Story = {
  render: () => <Opener href="mailto:ops@example.com" />,
};
