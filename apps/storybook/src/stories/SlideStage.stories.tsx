import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
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

/**
 * Present in the page: the stage letterboxed into the room between the show's
 * top and the foot of the view, so the slide's foot and the controls under it
 * are on screen on any window, and the whole box in full screen. The show
 * takes focus as it opens, so the arrows step slides at once.
 */
export const PresentInThePage: Story = {
  render: function Render() {
    const [at, setAt] = useState(0);
    const show = useRef<HTMLElement | null>(null);
    const fullscreen = useFullscreen(show);
    const last = STORY_SLIDES.length - 1;
    const step = (i: number) => setAt(Math.max(0, Math.min(last, i)));
    useSlideKeys({
      onNext: () => step(at + 1),
      onPrevious: () => step(at - 1),
      onFirst: () => step(0),
      onLast: () => step(last),
      onExit: fullscreen.exit,
    });
    useEffect(() => {
      show.current?.focus({ preventScroll: true });
    }, []);
    const slide = STORY_SLIDES[at]!;
    return (
      <div>
        <h2>Quarterly plan</h2>
        <p>A title and a description above the show push it down the page; the stage gives up height to stay in view.</p>
        <section
          ref={show}
          aria-label="Slide show"
          tabIndex={-1}
          style={{
            display: 'flex',
            flexDirection: 'column',
            scrollMarginBottom: 'var(--spacing-4)',
            background: 'var(--color-surface-inset)',
          }}
        >
          <SlideStage fit="view" label={`Slide ${at + 1} of ${last + 1}, ${slide.title}`}>
            {storySlide(slide.id)}
          </SlideStage>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'center', padding: 'var(--spacing-2)' }}>
            <Button size="small" variant="ghost" onClick={() => step(at - 1)}>
              Previous
            </Button>
            <span>
              {at + 1} of {last + 1}
            </span>
            <Button size="small" variant="ghost" onClick={() => step(at + 1)}>
              Next
            </Button>
            {fullscreen.supported ? (
              <Button size="small" variant="secondary" onClick={fullscreen.toggle}>
                {fullscreen.active ? 'Exit full screen' : 'Full screen'}
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    );
  },
};
