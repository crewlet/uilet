import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronRightGlyph } from '@crewlethq/icons/glyphs';
import { ButtonLink, ResultTableCard, type ResultTableCardProps } from '@crewlethq/ui';

/**
 * A result as a table in a card: its title and window, the rows with tabular
 * figures and a total row, and a foot of utilities (the exports, fetched on
 * their press, and a way to the page the rows come from). The card is the
 * only frame. Over 20 rows, the first 10 and "Show all".
 */
const meta: Meta<typeof ResultTableCard> = {
  title: 'UI/ResultTableCard',
  component: ResultTableCard,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof ResultTableCard>;

const later = (body: string, type: string) => () =>
  new Promise<Blob>((resolve) => setTimeout(() => resolve(new Blob([body], { type })), 1200));

const spend: ResultTableCardProps = {
  title: 'Token spend by agent',
  window: 'This week, from Monday',
  headers: ['Agent', 'Tokens', 'Share'],
  align: ['start', 'end', 'end'],
  rows: [
    ['Agent SWE', '2,960,000', '38%'],
    ['Agent AI Systems Engineer', '1,650,000', '21%'],
    ['Agent Frontend SWE', '1,180,000', '15%'],
    ['Agent CTO', '860,000', '11%'],
    ['Agent PM', '630,000', '8%'],
    ['Three others', '560,000', '7%'],
  ],
  total: ['Total', '7,840,000', '100%'],
  downloads: [
    { label: 'CSV', filename: 'token-spend-this-week.csv', file: later('agent,tokens\n', 'text/csv') },
    { label: 'XLSX', filename: 'token-spend-this-week.xlsx', file: later('', 'application/octet-stream') },
  ],
  link: (
    <ButtonLink href="#/spend" variant="ghost" size="small" trailingIcon={<ChevronRightGlyph />}>
      Open in Spend
    </ButtonLink>
  ),
};

export const SpendByAgent: Story = { args: spend };

export const FortyEightRowsCollapsed: Story = {
  args: {
    ...spend,
    rows: Array.from({ length: 48 }, (_, index) => [`Agent ${index + 1}`, (48 - index) * 1000, '2%'].map(String)),
    total: undefined,
  },
};

export const Empty: Story = { args: { ...spend, rows: [], total: undefined } };

/** On a 390px phone sheet. */
export const Narrow: Story = {
  args: spend,
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};

/**
 * LONG MULTI-WORD VALUES in a 640px assistant panel: a text column breaks
 * between words and keeps each word whole, and the figures and the dates
 * stay on one line.
 */
export const LongWords: Story = {
  args: {
    title: 'Seats by role',
    window: 'As of today',
    headers: ['Agent', 'Role', 'Team', 'Tokens', 'Last run'],
    rows: [
      ['Agent PM', 'Product Manager', 'Growth and Retention', '2,960,000', 'Oct 24, 2026, 9:41 PM'],
      ['Agent SWE', 'Senior Software Engineer', 'Platform Infrastructure', '860,000', 'Oct 24, 2026, 8:02 PM'],
      ['Agent CTO', 'Chief Technology Officer', 'Leadership', '412,000', 'Oct 23, 2026, 6:15 PM'],
    ],
    align: ['start', 'start', 'start', 'end', 'end'],
  },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
};
