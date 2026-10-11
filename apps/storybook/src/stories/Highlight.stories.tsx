import type { Meta, StoryObj } from '@storybook/react-vite';
import { Highlight, highlightTerms } from '@crewlethq/ui';

/**
 * UI / Highlight.
 *
 * The words a search matched, marked where they stand. A term marks the start
 * of a word and never its middle ("cent" marks "cents" but not "percent"), and
 * the mark is a ground behind the text's own ink, so a marked word reads at the
 * contrast of the words beside it.
 */
const meta: Meta<typeof Highlight> = {
  title: 'UI/Highlight',
  component: Highlight,
  parameters: { layout: 'padded' },
  args: {
    text: 'No mode rounds. Every mode takes floors first and hands out the leftover cent one at a time, so the percent shares always sum to the amount.',
    terms: highlightTerms('leftover cent'),
  },
};

export default meta;
type Story = StoryObj<typeof Highlight>;

/** A result's snippet, with the query "leftover cent". */
export const Snippet: Story = {};

/** A title, where the longer of two terms that start together is marked whole. */
export const Title: Story = {
  args: { text: 'The settlement algorithm', terms: highlightTerms('settle settlement') },
};
