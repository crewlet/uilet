import type { Meta, StoryObj } from '@storybook/react-vite';
import { DocumentDiff, DocumentDiffAdded as Added, DocumentDiffRemoved as Removed, type DocumentDiffBlock } from '@crewlethq/ui';

/**
 * A save to a page, drawn as the page reads: rendered blocks, the changed
 * words marked in place, whole blocks added or removed marked at the edge,
 * and unchanged stretches folded to a count. No hue: strike, underline and
 * a surface step.
 */
const meta: Meta<typeof DocumentDiff> = {
  title: 'UI/DocumentDiff',
  component: DocumentDiff,
  decorators: [(Story) => <div style={{ maxWidth: 720 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof DocumentDiff>;

const edited: DocumentDiffBlock[] = [
  { change: 'skipped', count: 3 },
  {
    change: 'changed',
    content: (
      <p>
        The onboarding flow ships to every workspace on <Removed>Monday</Removed>
        <Added>Tuesday, after the accessibility review</Added>. Read the <a href="#spec">flow spec</a> before you change a
        step.
      </p>
    ),
  },
  {
    change: 'changed',
    content: (
      <ul>
        <li>
          Owner: <Removed>Design</Removed>
          <Added>Product design</Added>
        </li>
      </ul>
    ),
  },
  { change: 'skipped', count: 5 },
];

/** A few words changed in two blocks: only those words are marked. */
export const WordsEdited: Story = { args: { blocks: edited } };

/** A new section: its heading and paragraphs raised and marked `+`. */
export const SectionAdded: Story = {
  args: {
    blocks: [
      { change: 'same', content: <p>Every screen is checked at a phone's width and a desk's.</p> },
      { change: 'added', content: <h3>Pricing</h3> },
      { change: 'added', content: <p>Seats are billed monthly. A seat added mid-month is billed for the days left.</p> },
    ],
  },
};

/** A section deleted: its heading and its first paragraph struck, the rest counted. */
export const SectionRemoved: Story = {
  args: {
    blocks: [
      { change: 'removed', content: <h3>Legacy importer</h3> },
      { change: 'removed', content: <p>The CSV importer reads the old export format, one row a record.</p> },
      { change: 'skipped', count: 4, of: 'removed' },
    ],
  },
};

/** A phone's width: marks wrap with the words, and keep their ground on every line. */
export const Narrow: Story = {
  args: { blocks: edited },
  decorators: [(Story) => <div style={{ maxWidth: 320 }}>{Story()}</div>],
};
