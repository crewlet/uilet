/**
 * A small deck for the slide stories: five slides drawn at the stage's own
 * 1920 by 1080 size, the way a native deck renderer hands them over.
 */

import type { CSSProperties, ReactNode } from 'react';

export interface StorySlide {
  id: string;
  title: string;
  notes: string;
  hidden?: boolean;
}

export const STORY_SLIDES: StorySlide[] = [
  { id: 'cover', title: 'Quarterly plan', notes: 'Welcome everyone. This covers the next quarter.' },
  { id: 'agenda', title: 'Agenda', notes: 'Three parts, about ten minutes each.' },
  { id: 'plan', title: 'The plan', notes: 'Take the questions first, then show the two cards.' },
  { id: 'numbers', title: 'Numbers', notes: '' },
  { id: 'thanks', title: 'Thank you', notes: 'Close on the ask.', hidden: true },
];

const page: CSSProperties = {
  width: 1920,
  height: 1080,
  boxSizing: 'border-box',
  padding: 128,
  display: 'flex',
  flexDirection: 'column',
  gap: 48,
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-display)',
};

/** One slide of the story deck, drawn at its own size. */
export function storySlide(id: string): ReactNode {
  const slide = STORY_SLIDES.find((s) => s.id === id);
  const cover = id === 'cover' || id === 'thanks';
  return (
    <div style={{ ...page, justifyContent: cover ? 'center' : 'flex-start' }}>
      <h1 style={{ margin: 0, fontSize: cover ? 120 : 72, lineHeight: 1.1 }}>{slide?.title}</h1>
      {cover ? null : (
        <p style={{ margin: 0, fontSize: 40, color: 'var(--color-text-secondary)' }}>
          A slide is laid out once at 1920 by 1080 and scaled to wherever it is shown.
        </p>
      )}
    </div>
  );
}
