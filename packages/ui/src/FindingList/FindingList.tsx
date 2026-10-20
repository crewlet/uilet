import type { ReactNode } from "react";
import { CircleAlertGlyph, TriangleAlertGlyph } from "@crewlethq/icons/glyphs";
import { cx } from "../utils/cx.js";
import { VisuallyHidden } from "../VisuallyHidden/index.js";

/** How a finding reads: something that refuses, or advice. */
export type FindingTone = "danger" | "warning";

/** One thing a checker found. */
export interface Finding {
  /** Stable identity within the list. */
  key: string;
  tone: FindingTone;
  /** Where it is, as a reader names it: `index.html, line 6`. */
  location?: ReactNode;
  /** What is wrong, as a sentence. */
  message: ReactNode;
  /**
   * Take the reader to it (an editor's line). With it the row is a button;
   * without it, text.
   */
  onSelect?: (() => void) | undefined;
}

export interface FindingListProps {
  findings: readonly Finding[];
  /** Names the list for a screen reader: "Problems in the page". */
  label: string;
  /** What each tone is called to a screen reader, before the message. */
  toneLabels?: Partial<Record<FindingTone, string>> | undefined;
  className?: string | undefined;
}

const TONE_LABELS: Record<FindingTone, string> = {
  danger: "Problem",
  warning: "Advice",
};

/**
 * What a checker found, one row each: its tone's glyph in its ink, where it is
 * and what is wrong. Refusals first, then advice, each in the order given.
 *
 * A ROW THAT GOES SOMEWHERE IS A BUTTON, so a keyboard walks the findings with
 * Tab and Enter takes it to the line, as a pointer does. The tone is said in
 * words before the message, since a glyph's colour is not a word.
 */
export function FindingList({
  findings,
  label,
  toneLabels,
  className,
}: FindingListProps) {
  const words = { ...TONE_LABELS, ...toneLabels };
  const ordered = [
    ...findings.filter((f) => f.tone === "danger"),
    ...findings.filter((f) => f.tone === "warning"),
  ];
  return (
    <ul className={cx("crewlet-finding-list", className)} aria-label={label}>
      {ordered.map((f) => {
        const body = (
          <>
            <span
              className={cx("crewlet-finding-list__glyph", `is-${f.tone}`)}
              aria-hidden="true"
            >
              {f.tone === "danger" ? (
                <CircleAlertGlyph size="sm" />
              ) : (
                <TriangleAlertGlyph size="sm" />
              )}
            </span>
            <span className="crewlet-finding-list__text">
              {f.location ? (
                <span className="crewlet-finding-list__location">
                  {f.location}
                </span>
              ) : null}
              <span className="crewlet-finding-list__message">
                <VisuallyHidden>{`${words[f.tone]}: `}</VisuallyHidden>
                {f.message}
              </span>
            </span>
          </>
        );
        return (
          <li key={f.key} className="crewlet-finding-list__item">
            {f.onSelect ? (
              <button
                type="button"
                className="crewlet-finding-list__row"
                onClick={f.onSelect}
              >
                {body}
              </button>
            ) : (
              <div className="crewlet-finding-list__row">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
