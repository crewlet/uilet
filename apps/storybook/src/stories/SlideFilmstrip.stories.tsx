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

/** A row under the stage, where the stage takes the whole width: a phone. */
export const Horizontal: Story = {
  render: function Render() {
    const [slides, setSlides] = useState(STORY_SLIDES);
    const [selected, setSelected] = useState('cover');
    const current = slides.find((s) => s.id === selected)!;
    return (
      <div style={{ display: 'grid', gap: 'var(--spacing-3)', maxWidth: '24rem' }}>
        <SlideStage label={current.title} framed>
          {storySlide(current.id)}
        </SlideStage>
        <SlideFilmstrip
          orientation="horizontal"
          slides={slides}
          selected={selected}
          onSelect={setSelected}
          renderSlide={storySlide}
          onReorder={(ids) => setSlides(ids.map((id) => slides.find((s) => s.id === id)!))}
        />
      </div>
    );
  },
};

/** Opened on the last slide of a long deck: the strip scrolls itself to it, and nothing else moves. */
export const KeepsTheSlideInView: Story = {
  render: function Render() {
    const many = Array.from({ length: 6 }, (_, n) => STORY_SLIDES.map((s) => ({ ...s, id: `${s.id}-${n}` }))).flat();
    const [selected, setSelected] = useState(many[many.length - 1]!.id);
    return (
      <div style={{ width: '14rem', height: '24rem', display: 'grid' }}>
        <SlideFilmstrip
          slides={many}
          selected={selected}
          onSelect={setSelected}
          renderSlide={(id) => storySlide(id.replace(/-\d+$/, ''))}
        />
      </div>
    );
  },
};
