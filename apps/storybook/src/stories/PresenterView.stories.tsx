import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PresenterView, useSlideKeys } from '@crewlethq/ui';
import { STORY_SLIDES, storySlide } from '../fixtures/slides.js';

const meta: Meta<typeof PresenterView> = {
  title: 'UI/PresenterView',
  component: PresenterView,
};

export default meta;
type Story = StoryObj<typeof PresenterView>;

/** The presenter's screen: the slide, the next one, the notes and the timer. */
export const Presenting: Story = {
  render: function Render() {
    const [at, setAt] = useState(2);
    const last = STORY_SLIDES.length - 1;
    const next = () => setAt((i) => Math.min(last, i + 1));
    const previous = () => setAt((i) => Math.max(0, i - 1));
    useSlideKeys({ onNext: next, onPrevious: previous });
    const slide = STORY_SLIDES[at]!;
    const after = STORY_SLIDES[at + 1];
    return (
      <div style={{ height: '80vh' }}>
        <PresenterView
          current={storySlide(slide.id)}
          currentTitle={slide.title}
          next={after ? storySlide(after.id) : null}
          nextTitle={after?.title}
          notes={slide.notes}
          position={at + 1}
          total={last + 1}
          onNext={next}
          onPrevious={previous}
        />
      </div>
    );
  },
};
