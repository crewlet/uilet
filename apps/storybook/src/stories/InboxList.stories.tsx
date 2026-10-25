import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Avatar, InboxGroup, InboxList, InboxMore, InboxRow, InboxToggle, Link } from '@crewlethq/ui';

/**
 * The inbox's column. Each row names who it is from, says in up to three
 * lines what it is, and names the task under it as a quiet link of its own.
 * The open row takes the neutral pressed fill; the snoozed and earlier rows
 * open from two quiet toggles at the end rather than from a filter bar.
 */
const meta: Meta<typeof InboxList> = {
  title: 'UI/InboxList',
  component: InboxList,
};

export default meta;
type Story = StoryObj<typeof InboxList>;

interface Item {
  key: string;
  who: string;
  kind?: 'agent' | 'human';
  qualifier?: string;
  stopped?: boolean;
  when: string;
  text: string;
  excerpt?: string;
  task?: string;
  unread?: boolean;
  actionable?: boolean;
  done?: boolean;
}

const NEEDS: Item[] = [
  {
    key: 'ask-1',
    who: 'Crewlet-PM',
    when: '38m',
    text: 'Should settlement use greedy matching only, or an exact search that minimises the number of transfers?',
    task: 'FAIR-3 Ledger and settlement',
    actionable: true,
  },
  { key: 'run-1', who: 'Crewlet-SWE', qualifier: 'coding run', when: '1h', text: 'May I delete the fixtures directory?', task: 'FAIR-7 Split rules', actionable: true },
  { key: 'seat-1', who: 'Crewlet-QA', qualifier: 'stopped', stopped: true, when: '2h', text: 'Today’s token budget is spent', task: 'FAIR-9 Regression suite', actionable: true },
];

const UPDATES: Item[] = [
  { key: 'n-1', who: 'Jane Doe', kind: 'human', when: '3h', text: 'Mentioned you', excerpt: 'Can you check the rounding on the last line?', task: 'FAIR-3 Ledger and settlement', unread: true },
  { key: 'n-2', who: 'Crewlet-SWE', when: '1d', text: 'Moved to Done', task: 'FAIR-5 Currency picker' },
];

const SNOOZED: Item[] = [{ key: 'n-3', who: 'Crewlet-PM', when: 'back 9:00', text: 'Assigned you', task: 'FAIR-11 Receipts' }];

function Row({ item, open, onOpen }: { item: Item; open: string; onOpen: (key: string) => void }) {
  return (
    <InboxRow
      title={item.who}
      qualifier={item.qualifier}
      qualifierTone={item.stopped ? 'danger' : 'default'}
      meta={item.when}
      leading={<Avatar name={item.who} kind={item.kind ?? 'agent'} size={24} decorative />}
      excerpt={item.excerpt}
      unread={item.unread}
      actionable={item.actionable}
      done={item.done}
      doneLabel="Answered"
      selected={open === item.key}
      onClick={() => onOpen(item.key)}
      aside={
        item.task ? (
          <Link href={`#/worklet/${item.task.split(' ')[0]}`} variant="quiet" size="inherit">
            {item.task}
          </Link>
        ) : undefined
      }
    >
      {item.text}
    </InboxRow>
  );
}

function Column() {
  const [open, setOpen] = useState('ask-1');
  const [snoozed, setSnoozed] = useState(false);
  const [earlier, setEarlier] = useState(false);
  return (
    <div style={{ width: 340, padding: 'var(--spacing-2)', background: 'var(--color-surface-background)' }}>
      <InboxList label="Inbox">
        <InboxGroup label="Needs you">
          {NEEDS.map((item) => (
            <Row key={item.key} item={item} open={open} onOpen={setOpen} />
          ))}
        </InboxGroup>
        <InboxGroup label="Updates">
          {UPDATES.map((item) => (
            <Row key={item.key} item={item} open={open} onOpen={setOpen} />
          ))}
        </InboxGroup>
        <InboxMore>
          <InboxToggle expanded={snoozed} onClick={() => setSnoozed((v) => !v)}>
            1 snoozed
          </InboxToggle>
          <InboxToggle expanded={earlier} onClick={() => setEarlier((v) => !v)}>
            Earlier updates
          </InboxToggle>
        </InboxMore>
        {snoozed && (
          <InboxGroup label="Snoozed" hideLabel>
            {SNOOZED.map((item) => (
              <Row key={item.key} item={item} open={open} onOpen={setOpen} />
            ))}
          </InboxGroup>
        )}
        {earlier && (
          <InboxGroup label="Earlier updates" hideLabel>
            <Row
              item={{ key: 'n-0', who: 'Crewlet-PM', when: 'Mon', text: 'Ship the export first?', done: true }}
              open={open}
              onOpen={setOpen}
            />
          </InboxGroup>
        )}
      </InboxList>
    </div>
  );
}

export const Default: Story = {
  render: () => <Column />,
};

/**
 * Nothing is cut at the edge: the name ellipsizes, the time never wraps, and
 * the words take up to three lines, even when they hold a word with no break.
 */
export const LongWords: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <InboxList label="Inbox">
        <InboxGroup label="Needs you">
          <InboxRow
            title="Crewlet-Principal-Engineer-With-A-Long-Name"
            meta="12m"
            actionable
            onClick={() => {}}
            aside={
              <Link href="#/worklet/FAIR-42" variant="quiet" size="inherit">
                FAIR-42 settlement/strategies/exact-search-with-transfer-minimisation
              </Link>
            }
          >
            Should_we_rename_the_settlement_strategy_flag_to_something_shorter_before_the_release_or_keep_it_for_compatibility
          </InboxRow>
        </InboxGroup>
      </InboxList>
    </div>
  ),
};
