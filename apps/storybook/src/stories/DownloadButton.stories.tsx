import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyButton, DownloadButton, Inline } from '@crewlethq/ui';

const CODES = ['7f3k-2m9q', 'p4xw-8n2c', 'h6tz-1r5v', 'b9qe-3j7s', 'm2ld-6y4a'].join('\n');

const meta: Meta<typeof DownloadButton> = {
  title: 'UI/DownloadButton',
  component: DownloadButton,
  args: { text: CODES, filename: 'crewlet-recovery-codes.txt' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['ghost', 'secondary', 'outline', 'primary'] },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
};

export default meta;
type Story = StoryObj<typeof DownloadButton>;

/**
 * Hand the text to the reader as a file. Once the browser takes it the label
 * says Downloading and a screen reader hears the name it was offered under:
 * an `<a download>` has no completion event, so "saved" would be a claim
 * nothing can check. A refusal holds until the next press.
 */
export const Basic: Story = {};

/**
 * Beside CopyButton, over the same text and on the same state machine, so the
 * two hold a confirmation for the same time and announce every attempt alike.
 */
export const BesideCopy: Story = {
  render: (args) => (
    <Inline gap={2}>
      <CopyButton text={CODES} label="Copy all" variant="secondary" />
      <DownloadButton {...args} variant="secondary" />
    </Inline>
  ),
};

/** Nothing to export yet: disabled, with a title that says why. */
export const NothingToExport: Story = {
  args: {
    text: '',
    filename: 'crewlet-audit.csv',
    mime: 'text/csv;charset=utf-8',
    label: 'Export CSV',
    disabled: true,
    title: 'Nothing on screen to export',
  },
};

/**
 * A file fetched on the press, such as an export the server builds: the label
 * stays with the spinner while it waits (two seconds here), then the browser
 * takes the file.
 */
export const FetchedOnThePress: Story = {
  render: () => (
    <DownloadButton
      label="CSV"
      filename="token-spend-this-week.csv"
      file={() =>
        new Promise<Blob>((resolve) =>
          setTimeout(() => resolve(new Blob(['agent,tokens\nAgent SWE,2960000\n'], { type: 'text/csv' })), 2000),
        )
      }
    />
  ),
};
