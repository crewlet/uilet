import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { Button, SlideStage, useFullscreen, useSlideKeys } from '@crewlethq/ui';
import { STORY_SLIDES, storySlide } from '../fixtures/slides.js';

const meta: Meta<typeof SlideStage> = {
  title: 'UI/SlideStage',
  component: SlideStage,
};

export default meta;
type Story = StoryObj<typeof SlideStage>;

/** As wide as its column, 16:9: the editor's stage or a thumbnail. */
export const FitsTheWidth: Story = {
  render: () => (
    <div style={{ maxWidth: '48rem' }}>
      <SlideStage label="Slide 3 of 5, The plan">{storySlide('plan')}</SlideStage>
    </div>
  ),
};

/** Present: as large as fits both ways, letterboxed, the show keys moving it. */
export const Present: Story = {
  render: function Render() {
    const [at, setAt] = useState(0);
    const box = useRef<HTMLDivElement | null>(null);
    const fullscreen = useFullscreen(box);
    const last = STORY_SLIDES.length - 1;
    useSlideKeys({
      onNext: () => setAt((i) => Math.min(last, i + 1)),
      onPrevious: () => setAt((i) => Math.max(0, i - 1)),
      onFirst: () => setAt(0),
      onLast: () => setAt(last),
      onExit: fullscreen.exit,
    });
    const slide = STORY_SLIDES[at]!;
    return (
      <div>
        {fullscreen.supported ? <Button onClick={fullscreen.enter}>Present full screen</Button> : null}
        <div ref={box} style={{ height: '60vh', marginTop: 'var(--spacing-3)' }}>
          <SlideStage fit="contain" label={`Slide ${at + 1} of ${last + 1}, ${slide.title}`}>
            {storySlide(slide.id)}
          </SlideStage>
        </div>
      </div>
    );
  },
};
