import type { Meta, StoryObj } from '@storybook/react-vite';
import { List, ListItem, StepLink, Text, VendorText, VendorUI } from '@crewlethq/ui';

const meta: Meta<typeof VendorText> = {
  title: 'UI/VendorText',
  component: VendorText,
};

export default meta;
type Story = StoryObj<typeof VendorText>;

const KEYS = 'https://appstoreconnect.apple.com/access/integrations/api';

/** A vendor's steps: each UI name set apart, a menu path with its levels, and the page linked on the step that names it. */
export const Steps: Story = {
  render: () => (
    <List variant="numbered">
      <ListItem>
        <VendorText
          parts={[{ text: 'Open ' }, { ui: ['Users and Access', 'Integrations', 'Team Keys'], url: KEYS }, { text: '.' }]}
        />
      </ListItem>
      <ListItem>
        <VendorText
          parts={[
            { text: 'Press ' },
            { ui: ['Generate API Key'] },
            { text: ', or ' },
            { ui: ['+'] },
            { text: ' if the team already has keys.' },
          ]}
        />
      </ListItem>
      <ListItem>
        <VendorText
          parts={[{ ui: ['Access'] }, { text: ': ' }, { ui: ['App Manager'] }, { text: '. Never ' }, { ui: ['Admin'] }, { text: '.' }]}
        />
      </ListItem>
      <ListItem>
        <VendorText
          parts={[
            { text: "On the new key's row, press " },
            { ui: ['Download API Key'] },
            { text: '. Apple offers the file once.' },
          ]}
        />
      </ListItem>
    </List>
  ),
};

/** The two primitives on their own: a name, a menu path, a step link, and a linked path. */
export const Primitives: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
      <Text as="p">
        Press <VendorUI path="Generate API Key" />.
      </Text>
      <Text as="p">
        Open <VendorUI path={['Business settings', 'Users', 'System users']} />.
      </Text>
      <Text as="p">
        Create it on your <StepLink href="https://id.atlassian.com/manage-profile/security/api-tokens">API tokens page</StepLink>.
      </Text>
      <Text as="p">
        Open{' '}
        <StepLink href={KEYS}>
          <VendorUI path={['Users and Access', 'Integrations', 'Team Keys']} />
        </StepLink>
        .
      </Text>
    </div>
  ),
};

/** In a narrow column, a long path wraps inside its frame. */
export const Narrow: Story = {
  render: () => (
    <div style={{ maxWidth: 220 }}>
      <Text as="p">
        <VendorText
          parts={[
            { text: 'Open ' },
            { ui: ['Users and Access', 'Integrations', 'Team Keys'], url: KEYS },
            { text: ', then press ' },
            { ui: ['Generate API Key'] },
            { text: '.' },
          ]}
        />
      </Text>
    </div>
  ),
};
