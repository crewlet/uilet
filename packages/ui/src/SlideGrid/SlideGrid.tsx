import type { ReactNode } from 'react';
import { EyeOffGlyph } from '@crewlethq/icons/glyphs';
import { SlideStage } from '../SlideStage/index.js';
import { cx } from '../utils/cx.js';
import type { FilmstripSlide } from '../SlideFilmstrip/index.js';

/** A run of the deck's outline and the slides it holds, in order. */
export interface SlideGridSection {
  /** The section's sentence; empty for slides before the first section. */
  title: string;
  slides: readonly FilmstripSlide[];
}

export interface SlideGridLabels {
  slide: (position: number, title: string) => string;
  hidden: string;
  untitled: string;
}

const LABELS: SlideGridLabels = {
  slide: (position, title) => `Slide ${position}, ${title}`,
  hidden: 'Hidden when presenting',
  untitled: 'Untitled',
};

export interface SlideGridProps {
  sections: readonly SlideGridSection[];
  renderSlide: (id: string) => ReactNode;
  /** Open a slide: the editor's stage, or Present from it. */
  onOpen: (id: string) => void;
  /** The slide to mark as current, if any. */
  current?: string | undefined;
  className?: string | undefined;
  labels?: Partial<SlideGridLabels> | undefined;
}

/**
 * Every slide of a deck at once, laid out by its outline's sections: the view
 * for finding a slide, checking the rhythm of a deck, or reviewing it whole.
 *
 * NUMBERED ACROSS THE DECK, not within a section, since a presenter says
 * "slide 7" whatever section it sits in. Each card is a button naming its
 * slide, so the grid is a list of choices to a screen reader.
 */
export function SlideGrid({ sections, renderSlide, onOpen, current, className, labels }: SlideGridProps) {
  const text = { ...LABELS, ...labels };
  let n = 0;
  return (
    <div className={cx('crewlet-slide-grid', className)}>
      {sections.map((section, s) => (
        <section key={`${s}:${section.title}`} className="crewlet-slide-grid__section">
          {section.title ? <h3 className="crewlet-slide-grid__heading">{section.title}</h3> : null}
          <ol className="crewlet-slide-grid__list">
            {section.slides.map((slide) => {
              n += 1;
              const name = text.slide(n, slide.title || text.untitled);
              return (
                <li key={slide.id} className="crewlet-slide-grid__item">
                  <button
                    type="button"
                    className="crewlet-slide-grid__card"
                    aria-label={slide.hidden ? `${name}, ${text.hidden}` : name}
                    aria-current={slide.id === current ? 'true' : undefined}
                    data-hidden={slide.hidden ? 'true' : undefined}
                    onClick={() => onOpen(slide.id)}
                  >
                    <SlideStage label={name} framed>
                      {renderSlide(slide.id)}
                    </SlideStage>
                    <span className="crewlet-slide-grid__caption">
                      <span className="crewlet-slide-grid__number">{n}</span>
                      <span className="crewlet-slide-grid__title">{slide.title || text.untitled}</span>
                      {slide.hidden ? <EyeOffGlyph size="sm" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
