import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Button,
  ConfirmModal,
  DescriptionList,
  InlineCode,
  Text,
  FormField,
  ResourceName,
  Select,
  type ChangeGroup,
  type ConsequenceItem,
  type SelectValue,
} from '@crewlethq/ui';
import { PlugGlyph } from '@crewlethq/icons/glyphs';

const GUIDE: { prop: string; use: string }[] = [
  { prop: 'message', use: 'The summary: who or what is affected, in one sentence.' },
  { prop: 'moveTo', use: 'A destination control, such as a "Move them to" FormField with its Select.' },
  {
    prop: 'changes',
    use: 'Before and after, a subject at a time: the subject once as a heading, its fields as rows, the old value struck, the new one tinted, long values cut with their words on hover, many subjects folded.',
  },
  {
    prop: 'consequences',
    use: 'What else happens: a choice is a checkbox with a short label and what it does under it, a fact a muted line that happens or stays. Names go in name or ResourceName. Danger only where something is destroyed; required holds the confirm button.',
  },
  { prop: 'alternative', use: 'A quieter way out on the footer start, such as "Disable instead".' },
];

const DESCRIPTION =
  'Every dialog that confirms consequences or changes is a ConfirmModal with these props, so the layout, spacing and tones come with them. A dialog with a layout of its own puts ChangeGroups and ConsequenceList inside a Modal. Never hand-build checkbox lists or before and after sentences in a dialog; the screens that produce such changes use AssignmentList. The stories open on load; Cancel or Escape closes them and the button reopens.';

const meta: Meta = {
  title: 'Patterns/Confirmation dialogs',
  parameters: { docs: { description: { component: DESCRIPTION } } },
};

export default meta;
type Story = StoryObj;

/** When to use which part. */
export const Guide: Story = {
  render: () => (
    <div style={{ maxWidth: 720, display: 'grid', gap: 'var(--spacing-3)' }}>
      <Text as="p">{DESCRIPTION}</Text>
      <DescriptionList>
        {GUIDE.map((row) => (
          <DescriptionList.Item key={row.prop} term={<InlineCode>{row.prop}</InlineCode>}>
            {row.use}
          </DescriptionList.Item>
        ))}
      </DescriptionList>
    </div>
  ),
};

function useOpen(): [boolean, (open: boolean) => void] {
  return useState(true);
}

function Reopen({ label, onOpen }: { label: string; onOpen: () => void }) {
  return <Button onClick={onOpen}>{label}</Button>;
}

function useChoice(initial: boolean): [boolean, (checked: boolean) => void] {
  return useState(initial);
}

const MODELS = [
  { value: '', label: 'Leave unset' },
  { value: 'platform-sonnet-12', label: 'platform-sonnet-12' },
  { value: 'platform-opus-long-context-14', label: 'platform-opus-long-context-14' },
];

/** Remove a model: a summary, where its seats go, then what removing it does. */
export const RemoveModel: Story = {
  render: function RemoveModelStory() {
    const [open, setOpen] = useOpen();
    const [target, setTarget] = useState<SelectValue | SelectValue[] | undefined>('');
    const [leave, setLeave] = useChoice(true);
    const [secret, setSecret] = useChoice(true);
    const consequences: ConsequenceItem[] = [
      {
        kind: 'choice',
        key: 'leave',
        label: 'Leave 9 seats with no model',
        description: 'Ask Crewlet turns off and the Advisor runs with no model until one is added.',
        tone: 'danger',
        required: true,
        checked: leave,
        onCheckedChange: setLeave,
      },
      {
        kind: 'choice',
        key: 'secret',
        label: 'Delete its secret',
        name: 'MODEL_TOKEN_TEAM_SONNET',
        description: 'Removed from the secret store with the model.',
        checked: secret,
        onCheckedChange: setSecret,
      },
      {
        kind: 'fact',
        key: 'shared',
        tone: 'kept',
        text: (
          <>
            <ResourceName>MODEL_TOKEN_SHARED</ResourceName> stays: another model still uses it.
          </>
        ),
      },
    ];
    return (
      <>
        <Reopen label="Remove model" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          destructive
          shape="framed"
          title="Remove team-sonnet"
          message={
            <>
              Used by <strong>9 seats</strong>, Ask Crewlet and the Advisor.
            </>
          }
          moveTo={
            <FormField label="Move them to">
              {({ id }) => <Select id={id} options={MODELS} value={target} onChange={setTarget} />}
            </FormField>
          }
          consequencesHeading="When you remove it"
          consequences={target === '' ? consequences : consequences.slice(1)}
          confirmLabel="Remove model"
        />
      </>
    );
  },
};

/** Remove an MCP server: choices about its settings and secrets, and a quieter way out. */
export const RemoveMcpServer: Story = {
  render: function RemoveMcpServerStory() {
    const [open, setOpen] = useOpen();
    const [settings, setSettings] = useChoice(false);
    const [key, setKey] = useChoice(true);
    const [hook, setHook] = useChoice(true);
    return (
      <>
        <Reopen label="Remove server" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          destructive
          shape="framed"
          title="Remove linear"
          message={
            <>
              Support desk and Billing lose its <strong>6 tools</strong> on their next turn. A running turn finishes
              first, and its history goes with it.
            </>
          }
          consequencesHeading="When you remove it"
          consequences={[
            {
              kind: 'choice',
              key: 'settings',
              label: 'Clear its settings in 2 places',
              description: (
                <>
                  Support desk’s <ResourceName>mcp_env.linear</ResourceName> values and Billing’s{' '}
                  <ResourceName>mcp_limits.linear</ResourceName> limits.
                </>
              ),
              checked: settings,
              onCheckedChange: setSettings,
            },
            {
              kind: 'choice',
              key: 'key',
              label: 'Delete its secret',
              name: 'LINEAR_API_KEY',
              description: 'Only this server reads it.',
              checked: key,
              onCheckedChange: setKey,
            },
            {
              kind: 'choice',
              key: 'hook',
              label: 'Delete its secret',
              name: 'LINEAR_WEBHOOK_SECRET',
              description: 'Only this server reads it.',
              checked: hook,
              onCheckedChange: setHook,
            },
            { kind: 'fact', key: 'disable', tone: 'info', text: 'Disabling it instead keeps everything.' },
          ]}
          alternative={{ label: 'Disable instead', onSelect: () => setOpen(false) }}
          confirmLabel="Remove server"
        />
      </>
    );
  },
};

/** Disconnect an integration: one destructive choice, and what stays. */
export const DisconnectIntegration: Story = {
  render: function DisconnectIntegrationStory() {
    const [open, setOpen] = useOpen();
    const [accounts, setAccounts] = useChoice(false);
    return (
      <>
        <Reopen label="Disconnect Slack" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          destructive
          shape="framed"
          size="md"
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <PlugGlyph size="sm" aria-hidden="true" />
              Disconnect Slack
            </span>
          }
          message="Agents stop working in Slack, and its webhooks are removed."
          consequencesHeading="When you disconnect"
          consequences={[
            {
              kind: 'choice',
              key: 'accounts',
              label: 'Also remove the 4 accounts Crewlet created',
              description: 'Deletes each agent’s account.',
              tone: 'danger',
              checked: accounts,
              onCheckedChange: setAccounts,
            },
            { kind: 'fact', key: 'wrote', tone: 'kept', text: 'What they wrote stays.' },
            {
              kind: 'fact',
              key: 'given',
              tone: 'kept',
              text: 'Each agent keeps what it was given, so connecting again restores it.',
            },
          ]}
          confirmLabel="Disconnect"
        />
      </>
    );
  },
};

const MOVE: ChangeGroup[] = [
  {
    key: 'sre',
    subject: 'Site Reliability Engineer',
    rows: [
      { kind: 'changed', label: 'Coding', from: 'platform-sonnet-8', to: 'platform-opus-long-context-14' },
      {
        kind: 'changed',
        label: 'Reviewing and delegations',
        from: 'platform-sonnet-8',
        to: 'platform-opus-long-context-14',
      },
      {
        kind: 'changed',
        label: 'Routines and evaluations',
        from: 'platform-sonnet-8',
        to: 'platform-opus-long-context-14',
      },
    ],
  },
];

/** Move a seat's model: the seat once, its jobs as rows, the long model names cut with a tooltip. */
export const MoveSeatModel: Story = {
  render: function MoveSeatModelStory() {
    const [open, setOpen] = useOpen();
    return (
      <>
        <Reopen label="Move seat" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title="Move Site Reliability Engineer?"
          changes={MOVE}
          confirmLabel="Move"
        />
      </>
    );
  },
};

const seat = (subject: string, rows: ChangeGroup['rows']): ChangeGroup => ({ key: subject, subject, rows });

const REVIEW: ChangeGroup[] = [
  seat('Company', [{ kind: 'changed', label: 'Name', from: 'Northwind Labs', to: 'Northwind' }]),
  seat('Site Reliability Engineer', [
    { kind: 'changed', label: 'Unit', from: 'Platform', to: 'Infrastructure' },
    { kind: 'changed', label: 'GitLab access', from: 'Reporter', to: 'Developer' },
    { kind: 'changed', label: 'Datadog fallback', from: '@oncall-bot', to: '@sre-bot' },
  ]),
  seat('QA Engineer', [{ kind: 'changed', label: 'Unit', from: 'Product', to: 'Platform' }]),
  seat('Senior Product Designer', [{ kind: 'changed', label: 'Unit', from: 'Product', to: 'Design' }]),
  seat('Data Analyst', [{ kind: 'removed', label: 'Slack account', from: 'data-analyst' }]),
];

/** Review and save: several subjects (the rest folded), what follows, and an acknowledgement. */
export const ReviewAndSave: Story = {
  render: function ReviewAndSaveStory() {
    const [open, setOpen] = useOpen();
    const [ack, setAck] = useChoice(false);
    return (
      <>
        <Reopen label="Review and save" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          shape="framed"
          size="md"
          title="Review and save"
          changes={REVIEW}
          consequencesHeading="What follows"
          consequences={[
            { kind: 'fact', key: 'onboard', tone: 'follows', text: 'Every seat is onboarded again under the new company name.' },
            { kind: 'fact', key: 'reports', tone: 'follows', text: 'Site Reliability Engineer now reports to Head of Infrastructure.' },
            { kind: 'fact', key: 'slack', tone: 'warning', text: 'Data Analyst’s Slack account stays behind; remove it at Slack.' },
            {
              kind: 'choice',
              key: 'ack',
              label: 'I understand what renaming the company does',
              description: 'Seats see the new name from their next turn.',
              tone: 'danger',
              required: true,
              checked: ack,
              onCheckedChange: setAck,
            },
          ]}
          confirmLabel="Save"
        />
      </>
    );
  },
};

const LONG: ChangeGroup[] = [
  {
    key: 'long',
    subject: 'Senior Site Reliability Engineer, Payments Platform and Regional Failover',
    rows: [
      {
        kind: 'changed',
        label: 'Coding and code review on every repository',
        from: 'platform-opus-long-context-extended-thinking-14',
        to: 'platform-sonnet-long-context-extended-thinking-preview-20',
      },
      { kind: 'added', label: 'Fallback', to: 'platform-haiku-fast-lane-with-a-very-long-name-3' },
      { kind: 'removed', label: 'Pinned', from: 'platform-opus-legacy-long-context-9' },
    ],
  },
];

/** Long names: values end in an ellipsis with their words on hover, never breaking mid-word. */
export const LongNames: Story = {
  render: function LongNamesStory() {
    const [open, setOpen] = useOpen();
    const [secret, setSecret] = useChoice(true);
    return (
      <>
        <Reopen label="Open" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          destructive
          shape="framed"
          title="Remove platform-opus-long-context-extended-thinking-14"
          message="Used by 1 seat."
          changes={LONG}
          consequencesHeading="When you remove it"
          consequences={[
            {
              kind: 'choice',
              key: 'secret',
              label: 'Delete its secret',
              name: 'MODEL_TOKEN_PLATFORM_OPUS_LONG_CONTEXT_EXTENDED_THINKING_FOURTEEN',
              description: 'Removed from the secret store with the model.',
              checked: secret,
              onCheckedChange: setSecret,
            },
          ]}
          confirmLabel="Remove model"
        />
      </>
    );
  },
};

const MANY: ChangeGroup[] = Array.from({ length: 12 }, (_, index) =>
  seat(`Seat ${index + 1}`, [
    { kind: 'changed', label: 'Coding', from: 'platform-sonnet-8', to: 'platform-sonnet-12' },
    { kind: 'changed', label: 'Reviewing', from: 'platform-sonnet-8', to: 'platform-sonnet-12' },
  ]),
);

/** Many subjects: three shown, the rest folded behind "Show 9 more" with their names beside it. */
export const ManyRows: Story = {
  render: function ManyRowsStory() {
    const [open, setOpen] = useOpen();
    return (
      <>
        <Reopen label="Open" onOpen={() => setOpen(true)} />
        <ConfirmModal
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          shape="framed"
          title="Move 12 seats to platform-sonnet-12?"
          changes={MANY}
          confirmLabel="Move"
        />
      </>
    );
  },
};
