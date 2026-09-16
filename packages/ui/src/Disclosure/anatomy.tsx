import type { KeyboardEventHandler, ReactNode } from 'react';
import { KeyboardArrowDownGlyph } from '@crewlethq/icons/glyphs';
import { Count } from '../Count/index.js';
import { cx } from '../utils/cx.js';
import { headingTag, type HeadingLevel } from '../utils/headingLevel.js';

/** The level a disclosure's trigger is wrapped in, or no heading at all. */
export type DisclosureHeadingLevel = HeadingLevel | 'none';

export interface DisclosureAnatomyProps {
  open: boolean;
  onToggle: () => void;
  /** The always-visible words. */
  title: ReactNode;
  /**
   * A fact that belongs to the section, INSIDE the trigger: a duration, a
   * model name. Text only, because it is part of the button's own name.
   */
  meta?: ReactNode;
  /** How many of something the section holds. */
  count?: number | string | undefined;
  /** Sets the title in the mono face: a tool name, a config path. */
  mono?: boolean | undefined;
  /**
   * Controls that belong to the section, rendered BESIDE the trigger and
   * outside it. A button nested inside a button is not a thing, and pressing a
   * copy control must not also collapse the thing it just copied.
   */
  actions?: ReactNode;
  disabled?: boolean | undefined;
  headingLevel: DisclosureHeadingLevel;
  triggerId: string;
  panelId: string;
  /** The owning component's own class on the button, so its look can differ. */
  triggerClassName?: string | undefined;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement> | undefined;
}

/**
 * The bar every disclosure in this package is built from: a chevron, the
 * section's words, an optional fact and count inside the button, and the
 * section's own controls outside it.
 *
 * ONE IMPLEMENTATION, because `Accordion.Item` and `Disclosure` are the same
 * control with different state models: one belongs to a stack that opens one
 * item at a time, the other stands alone. Written twice, the two came to
 * disagree about where the actions go, which is the half that matters.
 */
export function DisclosureAnatomy({
  open,
  onToggle,
  title,
  meta,
  count,
  mono = false,
  actions,
  disabled = false,
  headingLevel,
  triggerId,
  panelId,
  triggerClassName,
  onKeyDown,
}: DisclosureAnatomyProps) {
  const trigger = (
    <button
      type="button"
      id={triggerId}
      className={cx('crewlet-disclosure__trigger', triggerClassName)}
      aria-expanded={open}
      aria-controls={panelId}
      disabled={disabled}
      onClick={onToggle}
      onKeyDown={onKeyDown}
    >
      <KeyboardArrowDownGlyph className="crewlet-disclosure__chevron" size="sm" />
      <span className={cx('crewlet-disclosure__title', mono && 'crewlet-disclosure__title--mono')}>{title}</span>
      {/*
        THE SPACES ARE TEXT NODES. The fact and the count are inside the
        button, so they are part of its accessible name, and a name is its
        parts concatenated with nothing put between them: the trigger was
        announced as "Slackconnected1". A whitespace-only text node between
        flex items is not laid out, so the row is unchanged, and the name no
        longer depends on how a browser happens to lay the trigger out.
      */}
      {meta === undefined ? null : <> <span className="crewlet-disclosure__meta">{meta}</span></>}
      {count === undefined ? null : <> <Count value={count} /></>}
    </button>
  );

  const Heading = headingLevel === 'none' ? null : headingTag(headingLevel);

  return (
    <div className="crewlet-disclosure__bar">
      {/*
        The heading wraps the BUTTON, never replaces it. A screen reader
        navigating by heading then finds the section, and the same element is
        still the control that opens it.
      */}
      {Heading === null ? trigger : <Heading className="crewlet-disclosure__heading">{trigger}</Heading>}
      {actions === undefined ? null : <div className="crewlet-disclosure__actions">{actions}</div>}
    </div>
  );
}
