import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SlideGrid } from '@crewlethq/ui';
import { STORY_SLIDES, storySlide } from '../fixtures/slides.js';

const meta: Meta<typeof SlideGrid> = {
  title: 'UI/SlideGrid',
  component: SlideGrid,
};

export default meta;
type Story = StoryObj<typeof SlideGrid>;

/** Every slide by its outline's sections, numbered across the deck. */
export const BySection: Story = {
  render: function Render() {
    const [current, setCurrent] = useState('plan');
    return (
      <SlideGrid
        sections={[
          { title: 'Where we are', slides: STORY_SLIDES.slice(0, 2) },
          { title: 'What we will do', slides: STORY_SLIDES.slice(2) },
        ]}
        renderSlide={storySlide}
        onOpen={setCurrent}
        current={current}
      />
    );
  },
};
