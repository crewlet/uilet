import type { Meta, StoryObj } from '@storybook/react-vite';
import { SlideCompare, VersionCompare, type SlideCompareRow } from '@crewlethq/ui';
import { STORY_SLIDES, storySlide } from '../fixtures/slides.js';

const meta: Meta<typeof SlideCompare> = {
  title: 'UI/SlideCompare',
  component: SlideCompare,
};

export default meta;
type Story = StoryObj<typeof SlideCompare>;

const ROWS: SlideCompareRow[] = [
  { key: 'cover', title: 'Quarterly plan', change: 'unchanged', fromPosition: 1, toPosition: 1, from: storySlide('cover'), to: storySlide('cover') },
  { key: 'plan', title: 'The plan', change: 'changed', fromPosition: 3, toPosition: 2, moved: true, from: storySlide('plan'), to: storySlide('plan') },
  { key: 'agenda', title: 'Agenda', change: 'unchanged', fromPosition: 2, toPosition: 3, moved: true, from: storySlide('agenda'), to: storySlide('agenda') },
  { key: 'numbers', title: 'Numbers', change: 'added', toPosition: 4, to: storySlide('numbers') },
  { key: 'thanks', title: STORY_SLIDES[4]!.title, change: 'removed', fromPosition: 4, from: storySlide('thanks') },
];

/** Two versions of a deck, slide by slide, inside a version comparison's By slide lens. */
export const BySlide: Story = {
  render: () => (
    <VersionCompare
      fromLabel="Version 3"
      toLabel="Version 4"
      lens="versions"
      onLensChange={() => {}}
      changes={<p>The files lens.</p>}
      versions={<SlideCompare rows={ROWS} fromLabel="Version 3" toLabel="Version 4" />}
      labels={{ changes: 'Files', versions: 'By slide' }}
    />
  ),
};
