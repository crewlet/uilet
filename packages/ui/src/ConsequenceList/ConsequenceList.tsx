import { useId, type ReactNode } from 'react';
import { ArrowRightGlyph, InfoGlyph, LockGlyph, TriangleAlertGlyph } from '@crewlethq/icons/glyphs';
import { Checkbox } from '../Checkbox/index.js';
import { Eyebrow } from '../Eyebrow/index.js';
import { InlineCode } from '../InlineCode/index.js';
import { cx } from '../utils/cx.js';
import { titleWhenCut } from '../utils/titleIfCut.js';

/**
 * A choice the reader makes about a consequence: a checkbox with a short label
 * and, under it, what ticking it does.
 */
export interface ConsequenceChoice {
  kind: 'choice';
  /** Stable within the list. */
  key: string;
  /** Short and imperative: "Delete its secret", "Leave 9 seats with no model". */
  label: ReactNode;
  /** A resource or secret the label names, drawn as a code chip after the label. */
  name?: string | undefined;
  /** What ticking it does, when the label alone does not say. */
  description?: ReactNode;
  /** `danger` only where ticking it destroys something. */
  tone?: 'default' | 'danger' | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  /**
   * The confirmation waits for this box: an acknowledgement. `ConfirmModal`
   * keeps its confirm button unavailable until every required choice is ticked.
   */
  required?: boolean | undefined;
}

/**
 * What a fact is about, which picks its glyph: `kept` stays (a lock), `follows` happens as a result (an arrow),
 * `info` notes how things are, `warning` needs dealing with elsewhere, `danger` is destroyed with no choice, `plain` has none.
 */
export type ConsequenceFactTone = 'kept' | 'follows' | 'info' | 'warning' | 'danger' | 'plain';

/** Something that simply happens or stays: a muted line, no control. */
export interface ConsequenceFact {
  kind: 'fact';
  key: string;
  text: ReactNode;
  tone?: ConsequenceFactTone | undefined;
  /** A glyph of the caller's own in place of the tone's. */
  icon?: ReactNode;
}

export type ConsequenceItem = ConsequenceChoice | ConsequenceFact;

export interface ConsequenceListProps {
  items: readonly ConsequenceItem[];
  /** The group's eyebrow: "When you remove it", "What follows". */
  heading?: ReactNode;
  /** A rule above the group, setting it apart from the summary over it, as `ConfirmModal` draws one. */
  divided?: boolean | undefined;
  className?: string | undefined;
}

const FACT_GLYPHS: Record<Exclude<ConsequenceFactTone, 'plain'>, typeof LockGlyph> = {
  kept: LockGlyph,
  follows: ArrowRightGlyph,
  info: InfoGlyph,
  warning: TriangleAlertGlyph,
  danger: TriangleAlertGlyph,
};

/**
 * A resource, secret or setting named inside a consequence: a code chip on one
 * line that ends in an ellipsis when it cannot fit, with its whole name on
 * hover. Use it inside a description or a fact instead of a hand-made `code`.
 */
export function ResourceName({ children, className }: { children: string; className?: string | undefined }) {
  return (
    <InlineCode truncate className={cx('crewlet-resource-name', className)} onMouseEnter={titleWhenCut}>
      {children}
    </InlineCode>
  );
}

/**
 * What confirming will do: typed choices (a checkbox, a short label, what it does) and facts (a muted line whose
 * glyph sits where a box would), all on the labels' edge, so every confirmation spaces and tones them alike.
 */
export function ConsequenceList({ items, heading, divided = false, className }: ConsequenceListProps) {
  const headingId = useId();
  const named = heading !== undefined && heading !== null;
  return (
    <div
      role="group"
      aria-labelledby={named ? headingId : undefined}
      className={cx('crewlet-consequence-list', divided && 'crewlet-consequence-list--divided', className)}
    >
      {named ? (
        <Eyebrow as="div" id={headingId} className="crewlet-consequence-list__heading">
          {heading}
        </Eyebrow>
      ) : null}
      {items.map((item) =>
        item.kind === 'choice' ? (
          <Checkbox
            key={item.key}
            className="crewlet-consequence-list__choice"
            checked={item.checked}
            onCheckedChange={item.onCheckedChange}
            disabled={item.disabled}
            tone={item.tone === 'danger' ? 'danger' : 'default'}
            label={
              item.name === undefined ? (
                item.label
              ) : (
                <>
                  {item.label} <ResourceName>{item.name}</ResourceName>
                </>
              )
            }
            description={item.description}
          />
        ) : (
          <Fact key={item.key} fact={item} />
        ),
      )}
    </div>
  );
}

function Fact({ fact }: { fact: ConsequenceFact }) {
  const tone = fact.tone ?? 'plain';
  const Glyph = tone === 'plain' ? null : FACT_GLYPHS[tone];
  const glyph = fact.icon ?? (Glyph ? <Glyph size="sm" /> : null);
  return (
    <p className={cx('crewlet-consequence-list__fact', `crewlet-consequence-list__fact--${tone}`)}>
      <span className="crewlet-consequence-list__mark" aria-hidden="true">
        {glyph}
      </span>
      <span className="crewlet-consequence-list__text">{fact.text}</span>
    </p>
  );
}

/** Whether every required choice is ticked: what a confirm button waits for. */
export function consequencesAnswered(items: readonly ConsequenceItem[] | undefined): boolean {
  return (items ?? []).every((item) => item.kind !== 'choice' || !item.required || item.checked);
}
