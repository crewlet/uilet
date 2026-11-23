import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChangeGroups, ChangeList, type ChangeGroup, type ChangeListRow } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * Changes a subject at a time: the subject said once as a heading, its fields as rows, the old value struck and muted,
 * the new one tinted, every value on one line with its words on hover, and past three subjects the rest folded behind
 * "Show N more". Inside a dialog, pass these to `ConfirmModal`'s `changes`.
 */
const meta: Meta<typeof ChangeGroups> = {
  title: 'UI/ChangeGroups',
  component: ChangeGroups,
  decorators: [(Story) => <div style={{ maxWidth: 440 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ChangeGroups>;

const jobs = (from: string, to: string): ChangeListRow[] => [
  { kind: 'changed', label: 'Coding', from, to },
  { kind: 'changed', label: 'Reviewing and delegations', from, to },
  { kind: 'changed', label: 'Routines and evaluations', from, to },
];

const seat = (subject: string, rows: ChangeListRow[]): ChangeGroup => ({ key: subject, subject, rows });

/** One seat moved to another model: the seat once, its jobs as rows. */
export const MoveASeat: Story = {
  render: () => (
    <BothThemes>
      <ChangeGroups groups={[seat('Site Reliability Engineer', jobs('platform-sonnet-8', 'platform-opus-long-context-14'))]} />
    </BothThemes>
  ),
};

const review: ChangeGroup[] = [
  seat('Company', [{ kind: 'changed', label: 'Name', from: 'Northwind Labs', to: 'Northwind' }]),
  seat('Site Reliability Engineer', [
    { kind: 'changed', label: 'Unit', from: 'Platform', to: 'Infrastructure' },
    { kind: 'changed', label: 'GitLab access', from: 'Reporter', to: 'Developer' },
    { kind: 'added', label: 'Datadog fallback', to: '@sre-bot' },
  ]),
  seat('QA Engineer', [{ kind: 'changed', label: 'Unit', from: 'Product', to: 'Platform' }]),
  seat('Senior Product Designer', [{ kind: 'changed', label: 'Unit', from: 'Product', to: 'Design' }]),
  seat('Data Analyst', [{ kind: 'removed', label: 'Slack account', from: 'data-analyst' }]),
];

/** Five subjects: three shown, two folded and named beside "Show 2 more". */
export const ManySubjects: Story = {
  render: () => (
    <BothThemes>
      <ChangeGroups heading="What changes" groups={review} />
    </BothThemes>
  ),
};

/** Long names and labels: values cut with their words on hover; labels wrap between words. */
export const LongNames: Story = {
  render: () => (
    <BothThemes>
      <ChangeGroups
        groups={[
          seat('Senior Site Reliability Engineer, Payments Platform and Regional Failover', [
            {
              kind: 'changed',
              label: 'Coding and code review on every repository',
              from: 'platform-opus-long-context-extended-thinking-14',
              to: 'platform-sonnet-long-context-extended-thinking-preview-20',
            },
            { kind: 'added', label: 'Fallback', to: 'platform-haiku-fast-lane-with-a-very-long-name-3' },
          ]),
        ]}
      />
    </BothThemes>
  ),
};

/** A subject with many rows folds its own rows after a few. */
export const ManyRows: Story = {
  render: () => (
    <ChangeList
      subject="Site Reliability Engineer"
      truncate
      collapseAfter={3}
      rows={[...jobs('platform-sonnet-8', 'platform-sonnet-12'), ...jobs('platform-haiku-3', 'platform-haiku-4')].map((row, index) => ({
        ...row,
        label: `${row.label} ${index + 1}`,
      }))}
    />
  ),
};

/** At a phone's width: the arrow and the new value drop under the old one as a unit. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 300 }}>{Story()}</div>],
  render: () => <ChangeGroups groups={[seat('Site Reliability Engineer', jobs('platform-sonnet-8', 'platform-opus-long-context-14'))]} />,
};
