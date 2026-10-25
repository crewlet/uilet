import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ValueField, type ValueFieldKind } from '@crewlethq/ui';

const meta: Meta<typeof ValueField> = {
  title: 'UI/ValueField',
  component: ValueField,
};

export default meta;
type Story = StoryObj<typeof ValueField>;

const SECRETS = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'JIRA_HOST', 'JIRA_API_TOKEN', 'GITHUB_APP_PRIVATE_KEY'];

function Controlled({
  kind,
  initial = '',
  ...rest
}: Omit<Parameters<typeof ValueField>[0], 'value' | 'onChange'> & { kind?: ValueFieldKind; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ width: 420 }}>
      <ValueField {...rest} kind={kind} value={value} onChange={setValue} />
    </div>
  );
}

/** Free text keeps its spaces. Required is the unmarked default. */
export const Text: Story = {
  render: () => <Controlled label="Display name" help="As it appears on invoices." required />,
};

/**
 * A credential is a password field. Type `$` to complete a stored entry's
 * name: a whole `${NAME}` is a name, not a credential, so it is shown.
 */
export const Secret: Story = {
  render: () => (
    <Controlled
      label="Bot token"
      kind="secret"
      references={SECRETS}
      help="A value, or the name of a stored entry such as ${SLACK_BOT_TOKEN}."
    />
  ),
};

/** The affix supplies the scheme the value is refused without, and steps aside for `http://` or a reference. */
export const Url: Story = {
  render: () => <Controlled label="Jira site" kind="url" placeholder="acme.atlassian.net" references={SECRETS} />,
};

/** One token: whitespace is dropped as it is typed or pasted. */
export const Identifier: Story = {
  render: () => <Controlled label="Organization ID" kind="id" references={SECRETS} markRequired required />,
};

/** Prose in a textarea, spell check on, no completion. */
export const Multiline: Story = {
  render: () => <Controlled label="Goal" kind="multiline" rows={4} required={false} />,
};

/** The listbox draws each choice's hint, and the chosen one's hint joins the help line. */
export const Choice: Story = {
  render: () => (
    <Controlled
      label="Deployment"
      kind="choice"
      initial="cloud"
      help="Where your instance runs."
      choices={[
        { value: 'cloud', label: 'Cloud', hint: 'Crewlet reads your sites and creates each agent’s account.' },
        { value: 'dc', label: 'Data Center', hint: 'Self-hosted. Give each product’s address and its own token.' },
      ]}
    />
  ),
};

/** The help and the error both render, and both are tied to the control. */
export const Refused: Story = {
  render: () => (
    <Controlled
      label="Jira site"
      kind="url"
      initial="https://acme"
      help="The workspace address."
      error="The site did not answer at this address."
    />
  ),
};
