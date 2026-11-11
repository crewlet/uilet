import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, DescriptionList, PropertyList, Stack, Tag } from '@crewlethq/ui';
import { VendorMark } from '@crewlethq/icons';

const meta: Meta<typeof PropertyList> = { title: 'UI/PropertyList', component: PropertyList };
export default meta;
type Story = StoryObj<typeof PropertyList>;

const CREATE = { actor: 'agent-ceo', ago: '21h ago', turnHref: '#/live/turns/t-1' };

/**
 * A work item's rail: rows of no section, then named sections. One create set
 * three fields, so one by-line names all three under the last of them; a
 * section nobody has filled in says so in one sentence.
 */
export const BesideAnObject: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <PropertyList
        groups={[
          {
            items: [
              { label: 'Status', value: <Tag size="sm">In progress</Tag>, setBy: CREATE },
              { label: 'Priority', value: 'High', setBy: CREATE },
              { label: 'Type', value: 'Task', setBy: CREATE },
              { label: 'Assignee', value: 'ada', href: '#/company/org/seats/ada' },
            ],
          },
          {
            name: 'Plan',
            whenAllAbsent: 'Nothing scheduled: no dates, no estimate, no size.',
            items: [{ label: 'Start' }, { label: 'Due' }, { label: 'Estimate' }],
          },
          {
            name: 'Record',
            items: [
              { label: 'Created', value: 'Apr 16, 09:00' },
              { label: 'Due', setBy: { actor: 'ada', ago: '2h ago', cleared: true } },
            ],
          },
        ]}
      />
    </div>
  ),
};

/** Identifier labels in the mono face, and the sentence-case headings of a column titled that way. */
export const IdentifiersAndSentenceHeadings: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <PropertyList
        headings="sentence"
        groups={[
          {
            name: 'Environment',
            items: [
              { label: 'GITHUB_TOKEN', value: '${GH_TOKEN}', identifierLabel: true },
              { label: 'LOG_LEVEL', value: 'info', identifierLabel: true },
            ],
          },
          {
            name: 'Fields',
            items: [{ label: 'Reports to', value: 'ceo', title: 'The seat this one answers to' }],
          },
        ]}
      />
    </div>
  ),
};

/**
 * ONE TERM COLUMN FOR A PAGE. Set `--crewlet-description-list-term` once and
 * every description list and list of properties under it starts its values
 * on one line.
 */
export const OneMeasureForAPage: Story = {
  render: () => (
    <Stack gap={4} style={{ maxWidth: 560, ['--crewlet-description-list-term' as string]: '10rem' }}>
      <Card>
        <DescriptionList
          items={[
            ['Seat', 'ceo'],
            ['Model', 'claude-opus-5'],
          ]}
        />
      </Card>
      <Card>
        <PropertyList
          groups={[
            {
              name: 'Schedule',
              items: [
                { label: 'Cron', value: '0 9 * * 1-5' },
                { label: 'Next run', value: 'Tomorrow, 09:00' },
              ],
            },
          ]}
        />
      </Card>
    </Stack>
  ),
};

/**
 * Facts nobody set: what a source saw, what an agent observed (with how far it
 * is to be trusted) and what a person confirmed, each in its own words. Rows
 * share a line only when they share the source, the verb and the moment.
 */
export const SeenObservedConfirmed: Story = {
  render: () => (
    <div style={{ maxWidth: 380 }}>
      <PropertyList
        groups={[
          {
            name: 'Identity',
            items: [
              {
                label: 'Engine',
                value: 'postgres',
                setBy: { actor: 'AWS', verb: 'seen', mark: <VendorMark vendor="aws" />, ago: '4 min ago' },
              },
              {
                label: 'Version',
                value: '16.4',
                setBy: { actor: 'AWS', verb: 'seen', mark: <VendorMark vendor="aws" />, ago: '4 min ago' },
              },
              {
                label: 'Region',
                value: 'eu-west-1',
                setBy: { actor: 'ada', verb: 'confirmed', ago: '3 days ago' },
              },
            ],
          },
          {
            name: 'Details',
            items: [
              {
                label: 'Port',
                value: '5432',
                setBy: { actor: 'sre', verb: 'observed', qualifier: 'likely', turnHref: '#/live/turns/t-2' },
              },
            ],
          },
        ]}
      />
    </div>
  ),
};
