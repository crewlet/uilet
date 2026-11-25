import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AGENT_IDENTITY_STATES,
  AgentIdentity,
  ButtonLink,
  DescriptionList,
  type AgentIdentityProblem,
  type AgentIdentityState,
} from '@crewlethq/ui';

const meta: Meta<typeof AgentIdentity> = {
  title: 'UI/AgentIdentity',
  component: AgentIdentity,
  args: {
    vendor: 'Apple',
    agent: 'Growth Marketer',
    state: 'none',
    summary:
      "Needs you: set up Growth Marketer's own key so Apple records its actions. Until then Apple sees the company's team keys.",
    onSetUp: () => {},
  },
  argTypes: {
    state: { control: 'select', options: AGENT_IDENTITY_STATES },
  },
};

export default meta;
type Story = StoryObj<typeof AgentIdentity>;

/** What the box says in each state, in App Store Connect's words. */
const APPLE: Record<AgentIdentityState, { summary: string; problem?: AgentIdentityProblem }> = {
  company: {
    summary:
      "Needs you: set up Growth Marketer's own key so Apple records its actions. Until then Apple sees the company's team keys.",
  },
  none: {
    summary:
      "Needs you: set up Growth Marketer's own key so Apple records its actions. Until then Apple sees the company's team keys.",
  },
  preparing: { summary: 'Crewlet made crewlet-growth. Apple takes a moment before it can be used.' },
  checking: { summary: 'Reading the key handed in.' },
  ready: { summary: 'crewlet-growth · App Manager · checked 4 minutes ago' },
  unchecked: { summary: 'crewlet-growth · works · Apple shows its role to nobody Crewlet signs in as' },
  wrong_role: {
    summary:
      "Needs you: set up Growth Marketer's own key so Apple records its actions. Until then Apple sees the company's team keys.",
    problem: { title: 'Wrong role', body: 'It holds Marketing; Growth Marketer needs App Manager. Crewlet kept nothing.' },
  },
  wrong_team: {
    summary:
      "Needs you: set up Growth Marketer's own key so Apple records its actions. Until then Apple sees the company's team keys.",
    problem: { title: 'Wrong team', body: 'It belongs to Example Labs; Crewlet is connected to Example Apps. Crewlet kept nothing.' },
  },
  refused: {
    summary: 'crewlet-growth · App Manager · checked 12 minutes ago',
    problem: {
      title: 'Apple refused it',
      body: "Key 7KQ4M2ZX9P was revoked. Growth Marketer's calls stop until it has a new key or uses the company's.",
    },
  },
  replacing: {
    summary: 'crewlet-growth · App Manager · checked 4 minutes ago',
    problem: {
      title: 'Revoke the old key at Apple',
      body: 'Growth Marketer now uses key 3HN8RT6YQ1. Revoke 7KQ4M2ZX9P; Crewlet confirms once Apple refuses it.',
      action: (
        <ButtonLink size="small" variant="secondary" href="https://appstoreconnect.apple.com/access/integrations/api" external>
          Open Team Keys
        </ButtonLink>
      ),
    },
  },
};

/** Before set-up: Needs you, and the one primary action at the top right. */
export const NotSetUp: Story = {};

/** Every state, as an App Store Connect agent's box heads with it; on this per-agent vendor the company's identity asks for set-up too. */
export const EveryState: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)', maxWidth: '52rem' }}>
      {AGENT_IDENTITY_STATES.map((state) => (
        <AgentIdentity key={state} {...args} state={state} {...APPLE[state]} onUseCompany={() => {}} />
      ))}
    </div>
  ),
};

/** The agent's own key checked: Replace identity, quiet. */
export const Ready: Story = { args: { state: 'ready', ...APPLE.ready } };

/** Apple refused the agent's key: its calls stop, and the company's is offered for now. */
export const Refused: Story = { args: { state: 'refused', ...APPLE.refused, onUseCompany: () => {} } };

/** A vendor with no identity per agent: the company's is the finished state, with nothing to set up. */
export const CompanyOnly: Story = {
  args: {
    vendor: 'Apple Ads',
    state: 'company',
    perAgent: false,
    summary: 'Apple Ads offers no identity per agent: Crewlet calls as the company and logs which agent acted.',
  },
};

/** A Google identity Crewlet made, not added at the product yet. */
export const GooglePlayNotAdded: Story = {
  args: {
    vendor: 'Google Play',
    state: 'none',
    summary:
      "Needs you: add Growth Marketer's Google identity at Google Play so Google Play records its actions. Until then its calls there are refused.",
  },
};

/** Heading an agent's box on an access table, over the box's details. */
export const InAnAgentsBox: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--spacing-3)',
        maxWidth: '52rem',
        padding: 'var(--spacing-4)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <AgentIdentity {...args} />
      <DescriptionList
        items={[
          ['Level on its apps', 'Operate'],
          ['Credential', "The company's"],
          ['Sync', 'Checked 4 minutes ago, last applied yesterday'],
        ]}
      />
    </div>
  ),
};

/** On a phone: the label and chip wrap, and the action keeps the top right. */
export const Narrow: Story = {
  args: { state: 'refused', ...APPLE.refused, onUseCompany: () => {} },
  render: (args) => (
    <div style={{ width: 320 }}>
      <AgentIdentity {...args} />
    </div>
  ),
};

/** A Google identity Crewlet just made: Google Analytics finds it in about a minute, so nothing needs a person. */
const GA_PREPARING = {
  vendor: 'Google Analytics',
  state: 'preparing',
  summary: 'crewlet-growth-3fa91c@example-identity.iam.gserviceaccount.com · made a moment ago',
  problem: {
    title: 'Ready to add in about a minute',
    body: 'Google takes about a minute before Google Analytics can find a new identity. Nothing to do until then.',
  },
} satisfies Partial<Parameters<typeof AgentIdentity>[0]>;

/** The identity reads each property, but Google Analytics shows roles only to an administrator, so its role is unread. */
const GA_UNCHECKED = {
  vendor: 'Google Analytics',
  state: 'unchecked',
  summary: 'crewlet-growth-3fa91c@example-identity.iam.gserviceaccount.com · reads 3 of 3 properties',
  problem: {
    title: 'Role not checked',
    body: 'Google Analytics shows a role only to an administrator of the property. Sign in as one to have Crewlet check it.',
  },
} satisfies Partial<Parameters<typeof AgentIdentity>[0]>;

/** Getting ready, in light: an info chip and an info note, no action, and the row does not read Needs you. */
export const PreparingLight: Story = { args: GA_PREPARING, globals: { theme: 'light' } };

/** Getting ready, in dark. */
export const PreparingDark: Story = { args: GA_PREPARING, globals: { theme: 'dark' } };

/** The role not checked, in light: the identity works, so Replace identity stays quiet and nothing reads Needs you. */
export const UncheckedLight: Story = { args: GA_UNCHECKED, globals: { theme: 'light' } };

/** The role not checked, in dark. */
export const UncheckedDark: Story = { args: GA_UNCHECKED, globals: { theme: 'dark' } };
