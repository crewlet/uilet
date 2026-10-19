import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SlideFilmstrip, SlideStage } from '@crewlethq/ui';
import { STORY_SLIDES, storySlide } from '../fixtures/slides.js';

const meta: Meta<typeof SlideFilmstrip> = {
  title: 'UI/SlideFilmstrip',
  component: SlideFilmstrip,
};

export default meta;
type Story = StoryObj<typeof SlideFilmstrip>;

/** The editor: thumbnails beside the stage, reordered by drag or arrow keys on a handle. */
export const Editable: Story = {
  render: function Render() {
    const [slides, setSlides] = useState(STORY_SLIDES);
    const [selected, setSelected] = useState('cover');
    const current = slides.find((s) => s.id === selected)!;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '14rem 1fr', gap: 'var(--spacing-4)' }}>
        <SlideFilmstrip
          slides={slides}
          selected={selected}
          onSelect={setSelected}
          renderSlide={storySlide}
          onReorder={(ids) => setSlides(ids.map((id) => slides.find((s) => s.id === id)!))}
        />
        <SlideStage label={current.title}>{storySlide(current.id)}</SlideStage>
      </div>
    );
  },
};

/** A reader who may not edit sees no handles. */
export const ReadOnly: Story = {
  render: function Render() {
    const [selected, setSelected] = useState('agenda');
    return (
      <div style={{ width: '14rem' }}>
        <SlideFilmstrip slides={STORY_SLIDES} selected={selected} onSelect={setSelected} renderSlide={storySlide} />
      </div>
    );
  },
};
