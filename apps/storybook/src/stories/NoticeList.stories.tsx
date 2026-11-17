import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Callout, groupNotices, NoticeList, type NoticeEntry } from '@crewlethq/ui';

const meta: Meta<typeof NoticeList> = {
  title: 'UI/NoticeList',
  component: NoticeList,
};

export default meta;
type Story = StoryObj<typeof NoticeList>;

const open = (label: string) => (
  <Button size="small" variant="secondary">
    {label}
  </Button>
);

const SCHEDULE = {
  kind: 'schedule.frequent',
  tone: 'warning',
  title: 'Schedules run 12 or more times a day',
  detail: 'Each run starts a turn even when nothing changed. Wait for an event with a dated task, or run it less often.',
  action: open('Open Schedules'),
} as const;

const ENTRIES: NoticeEntry[] = [
  { kind: 'sandbox.direct_box', tone: 'warning', title: "Agents run on the engine's own server", detail: 'There they can read every repository and act as any agent. Run them in a container or a cloud sandbox.', action: open('Open Models') },
  { kind: 'grant.health_unheld', tone: 'warning', title: "No agent watches the engine's alarms", detail: 'An alarm reaches nobody until a person opens the dashboard. Let your operations agent read the engine’s health.', action: open('Open Structure') },
  ...['Agent CEO', 'Agent CTO', 'Agent PM', 'Developer Relations', 'Software Engineer', 'Frontend Engineer', 'AI Systems Engineer', 'Site Reliability Engineer', 'Support Engineer'].map(
    (subject): NoticeEntry => ({ kind: 'learning.auxiliary_model', tone: 'warning', subject, title: 'Learning runs on the work model', detail: 'It costs a share of each agent’s spend at that model’s price. Choose a smaller model for it.', action: open('Open Models') }),
  ),
  { ...SCHEDULE, subject: 'Site Reliability Engineer', item: 'health-check (24 a day)' },
  { ...SCHEDULE, subject: 'Site Reliability Engineer', item: 'release-window (12 a day)' },
  { ...SCHEDULE, subject: 'Site Reliability Engineer', item: 'post-release-check (12 a day)' },
  { ...SCHEDULE, subject: 'Support Engineer', item: 'inbox-sweep (48 a day)' },
];

const grouped = groupNotices(ENTRIES, { count: (s) => `${s.length} agents` });

/** Sixteen warnings from one check, said as four: one per kind, with the specifics listed. */
export const GroupedInACallout: Story = {
  render: () => (
    <Callout variant="warning" title={`${grouped.length} warnings about this setup`}>
      <NoticeList label="Warnings" notices={grouped} />
    </Callout>
  ),
};

/** One finding: the subject, the title, its items and one action. */
export const OneItem: Story = {
  render: () => (
    <Callout variant="warning" title="1 warning about this setup">
      <NoticeList notices={grouped.slice(3)} />
    </Callout>
  ),
};

/** Every tone a callout takes, each holding a list. */
export const EveryTone: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['danger', 'warning', 'info', 'success', 'neutral'] as const).map((tone) => (
        <Callout key={tone} variant={tone} title={`Two ${tone} notices`}>
          <NoticeList
            notices={[
              { key: 'a', subject: 'notes.pdf', title: 'Larger than the 25 MB limit', action: open('Choose another') },
              { key: 'b', subject: 'deck.key', title: 'Not a type the store keeps', detail: 'Export it as a PDF first.' },
            ]}
          />
        </Callout>
      ))}
    </div>
  ),
};

/** Tones mixed in one list: each row then carries its own glyph and says its tone. */
export const MixedTones: Story = {
  render: () => (
    <NoticeList
      notices={[
        { key: 'a', tone: 'danger', subject: 'GitHub', title: 'The app was uninstalled', action: open('Reconnect') },
        { key: 'b', tone: 'warning', subject: 'Linear', title: 'The token expires in 3 days', action: open('Renew') },
        { key: 'c', tone: 'info', title: 'Two agents are paused', detail: 'They take no new turns until resumed.' },
      ]}
    />
  ),
};

/** Long words wrap inside the callout, and the action moves under the text on a narrow screen. */
export const LongTextNarrow: Story = {
  render: () => (
    <div style={{ width: 340 }}>
      <Callout variant="danger" title="3 files were not added">
        <NoticeList
          notices={[
            { key: 'a', subject: 'a-very-long-file-name-that-keeps-going-for-a-while-and-never-breaks.tar.gz', title: 'Larger than the 25 MB limit', action: open('Choose another') },
            { key: 'b', subject: 'deck.key', title: 'Not a type the store keeps', detail: 'Export it as a PDF first, then add the PDF.' },
            { key: 'c', subject: 'notes.txt', title: 'Already in this folder' },
          ]}
        />
      </Callout>
    </div>
  ),
};

/** A notice the reader may put away carries an X after its action. */
export const Dismissible: Story = {
  render: () => (
    <Callout variant="info" title="Delegates decided 3 requests this week" action={open('See what')} onDismiss={() => {}}>
      Decided in your place under the company’s delegated decisions rules.
    </Callout>
  ),
};

const quiet = (label: string) => (
  <a className="t-link" href="#/settings">
    {label}
  </a>
);

const COMPACT = groupNotices(
  ENTRIES.map((entry) => ({ ...entry, action: quiet(entry.kind === 'schedule.frequent' ? 'Open Schedules' : entry.kind === 'grant.health_unheld' ? 'Open Structure' : 'Open Models') })),
  { count: (s) => `${s.length} agents` },
);

/**
 * The standing advisory a page carries: one quiet line that says how many and
 * offers a review, remembered open or closed per surface by `storageKey`.
 */
export const CompactCollapsed: Story = {
  render: () => (
    <Callout variant="warning" appearance="quiet" collapsible title={`${COMPACT.length} configuration warnings`} storageKey="storybook.notices.compact">
      <NoticeList compact label="Warnings" notices={COMPACT} />
    </Callout>
  ),
};

/** Opened: one line per warning, its title, what it applies to and its one action; the rest opens under one row at a time. */
export const CompactOpen: Story = {
  render: () => (
    <Callout variant="warning" appearance="quiet" collapsible defaultOpen title={`${COMPACT.length} configuration warnings`}>
      <NoticeList compact label="Warnings" notices={COMPACT} />
    </Callout>
  ),
};

/** Many warnings fold after five rows; a phone's width wraps long names and puts each action under its title. */
export const CompactManyNarrow: Story = {
  render: () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      key: `n${i}`,
      title: i === 0 ? 'Schedules run 12 or more times a day' : `Warning number ${i + 1}`,
      summary: i === 0 ? 'Site Reliability Engineer for the Platform Infrastructure Group' : undefined,
      detail: 'Each run starts a turn whether or not anything changed.',
      action: quiet('Open Schedules'),
    }));
    return (
      <div style={{ width: 340 }}>
        <Callout variant="warning" appearance="quiet" collapsible defaultOpen title={`${many.length} configuration warnings`}>
          <NoticeList compact notices={many} />
        </Callout>
      </div>
    );
  },
};
