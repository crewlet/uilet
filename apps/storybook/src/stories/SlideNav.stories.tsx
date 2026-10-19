import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MaximizeGlyph } from '@crewlethq/icons/glyphs';
import { IconButton, SlideNav, SlideStage } from '@crewlethq/ui';
import { STORY_SLIDES, storySlide } from '../fixtures/slides.js';

const meta: Meta<typeof SlideNav> = {
  title: 'UI/SlideNav',
  component: SlideNav,
};

export default meta;
type Story = StoryObj<typeof SlideNav>;

/** On the page, under a show: Previous and Next stop at the ends, saying why. */
export const OnThePage: Story = {
  render: function Render() {
    const [at, setAt] = useState(0);
    const last = STORY_SLIDES.length - 1;
    return (
      <SlideNav
        position={at + 1}
        total={last + 1}
        onPrevious={() => setAt((i) => Math.max(0, i - 1))}
        onNext={() => setAt((i) => Math.min(last, i + 1))}
      >
        <IconButton label="Full screen" icon={<MaximizeGlyph />} variant="ghost" size="sm" />
      </SlideNav>
    );
  },
};

/** Over a slide shown full screen: a pill in the projection's fixed colours, readable over any slide. */
export const OverAProjectedSlide: Story = {
  render: function Render() {
    const [at, setAt] = useState(1);
    const last = STORY_SLIDES.length - 1;
    const slide = STORY_SLIDES[at]!;
    return (
      <div style={{ position: 'relative', maxWidth: '48rem', background: 'var(--color-projection-letterbox)' }}>
        <SlideStage label={slide.title}>{storySlide(slide.id)}</SlideStage>
        <div style={{ position: 'absolute', insetInline: 0, bottom: 'var(--spacing-4)', display: 'flex', justifyContent: 'center' }}>
          <SlideNav
            tone="projection"
            position={at + 1}
            total={last + 1}
            onPrevious={() => setAt((i) => Math.max(0, i - 1))}
            onNext={() => setAt((i) => Math.min(last, i + 1))}
          >
            <IconButton label="Exit full screen" icon={<MaximizeGlyph />} variant="ghost" size="sm" />
          </SlideNav>
        </div>
      </div>
    );
  },
};

/** A deck of one: both controls are off. */
export const OneSlide: Story = {
  args: { position: 1, total: 1, onPrevious: () => {}, onNext: () => {} },
};
