import { useState, type HTMLAttributes, type ReactNode } from "react";
import { CheckGlyph, TriangleAlertGlyph } from "@crewlethq/icons/glyphs";
import { cx } from "../utils/cx.js";

/** One seat a message reached, or will reach. */
export interface DeliveryReceiptRecipient {
  /** A stable key for the seat: its handle. */
  id: string;
  /** How the reader knows the seat: "pm", "Product Manager". */
  name: string;
  /**
   * Why the message reached the seat, in the caller's words, drawn in
   * brackets after the seats that share it: "every message". Leave it out
   * where the reason needs no note (a mention, a reply to their thread).
   */
  reason?: string | undefined;
  /** The seat has answered: it replied in the thread, or in the conversation. */
  answered?: boolean | undefined;
}

/**
 * `sent` is a receipt under a message that was posted ("Reached pm"); `draft`
 * is the composer's word on what a post will do before it is sent ("Will
 * reach pm").
 */
export type DeliveryReceiptTense = "sent" | "draft";

export interface DeliveryReceiptLabels {
  /** A posted message nobody it reached has answered yet: "Reached pm and qa". */
  reached: (who: ReactNode) => ReactNode;
  /**
   * A posted message every seat it reached has answered, how many they are
   * given: "Reached pm, who answered"; "Reached pm and qa, who both answered".
   */
  reachedAnswered: (who: ReactNode, count: number) => ReactNode;
  /**
   * A posted message some of the seats it reached have answered, each seat
   * named once: "pm answered, waiting on qa and sre".
   */
  partlyAnswered: (answered: ReactNode, waiting: ReactNode) => ReactNode;
  /** The reach of a draft: "Will reach pm". */
  reaches: (who: ReactNode) => ReactNode;
  /** A posted message that reached no agent. */
  none: string;
  /** A draft that will reach no agent. */
  noneDraft: string;
  /** The seats in one reason's group, every one printed: "qa and sre", "pm, qa and sre". */
  list: (names: readonly string[]) => string;
  /** One reason's note: "(every message)". */
  reason: (words: string) => string;
  /** The groups of different reasons, joined: "pm; qa and sre (every message)". */
  groups: (groups: readonly string[]) => string;
  /** A routing cap left seats out: a sentence after the receipt's own. */
  truncated: string;
  /** The names past `max`, as the button that shows them: "and 4 more". */
  more: (count: number) => string;
  /** The same button once every name is shown. */
  fewer: string;
}

/** "pm", "pm and qa", "pm, qa and sre". */
function andList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const DELIVERY_RECEIPT_LABELS: DeliveryReceiptLabels = {
  reached: (who) => <>Reached {who}</>,
  reachedAnswered: (who, count) => (
    <>
      Reached {who}, who {count === 2 ? "both " : count > 2 ? "all " : ""}answered
    </>
  ),
  partlyAnswered: (answered, waiting) => (
    <>
      {answered} answered, waiting on {waiting}
    </>
  ),
  reaches: (who) => <>Will reach {who}</>,
  none: "Reached no agent",
  noneDraft: "Will reach no agent",
  list: andList,
  reason: (words) => `(${words})`,
  groups: (groups) => groups.join("; "),
  truncated: "Some seats were not reached",
  more: (count) => `and ${count} more`,
  fewer: "Show fewer",
};

export interface DeliveryReceiptProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "role" | "children"
> {
  /** The seats, in the order the routing reached them. Empty is "no agent". */
  recipients: readonly DeliveryReceiptRecipient[];
  /** `sent` (the default) under a message, `draft` over a composer. */
  tense?: DeliveryReceiptTense | undefined;
  /**
   * A routing cap left seats out (a whole-room address in a very large
   * room), so the list is not everybody the message named.
   */
  truncated?: boolean | undefined;
  /**
   * A short sentence after a "no agent" line, saying why or what to do:
   * "This room has no agent members. Mention one to ask it."
   */
  hint?: ReactNode;
  /**
   * Whether the line is its own polite live region (false by default). A
   * composer's draft line that changes as a mention is typed is announced
   * by passing true; a receipt in a transcript is not, since a log that
   * announced every receipt would talk over the conversation.
   */
  announce?: boolean | undefined;
  /**
   * How many names each list in the sentence prints before the rest are
   * counted in a button that shows them all. 1 by default; a whole number of
   * at least 1, or Infinity for every name. A single name past the cap is
   * printed rather than counted, as it costs no more room than "and 1 more".
   */
  max?: number | undefined;
  labels?: Partial<DeliveryReceiptLabels> | undefined;
}

/**
 * Who a person's message reached, and who answered, as ONE SENTENCE that
 * names each seat once: "Reached pm"; "Reached pm, who answered"; "Reached pm
 * and qa, who both answered"; "pm answered, waiting on qa and sre"; "Reached
 * no agent". Over a composer, the same line in the future tense says who a
 * post WILL reach before it is sent.
 *
 * ONE SENTENCE, NOT TWO PARTS. It used to say whom the message reached and
 * then, after a dot, who answered, so every seat that answered was named
 * twice ("Reached pm · pm answered"), and the full stop a screen reader was
 * given in place of the dot turned up beside it in a copy (". ·"). What the
 * eye reads is now exactly what a screen reader reads and what a copy
 * carries, real punctuation included.
 *
 * QUIET BY DESIGN. It sits in a message's footer at the compact step in the
 * tertiary ink, because it is a fact a person checks rather than reads: an
 * answer lifts it to the secondary ink with a check, and the one tone it
 * raises is the warning on a message that reached no agent, the case where a
 * person would otherwise wait for an answer nobody was asked for. Colour is
 * never alone: the mark and the words say it, and the marks are hidden from
 * a screen reader, which has the words.
 */
export function DeliveryReceipt({
  recipients,
  tense = "sent",
  truncated = false,
  hint,
  announce = false,
  max = 1,
  labels: overrides,
  className,
  ...rest
}: DeliveryReceiptProps) {
  if (max !== Infinity && (!Number.isInteger(max) || max < 1)) {
    throw new RangeError(
      `DeliveryReceipt max must be a whole number of at least 1; it was ${max}`,
    );
  }
  const [expanded, setExpanded] = useState(false);
  const labels = overrides
    ? { ...DELIVERY_RECEIPT_LABELS, ...overrides }
    : DELIVERY_RECEIPT_LABELS;
  const cap = expanded ? Infinity : max;
  const none = recipients.length === 0;
  // A draft has nobody who answered it yet, whatever a caller passed.
  const answered =
    tense === "sent" ? recipients.filter((r) => r.answered) : [];
  const waiting =
    tense === "sent" ? recipients.filter((r) => !r.answered) : recipients;

  // The names past the cap are a button rather than a tooltip, so a keyboard
  // and a touch reader can open the whole list in place. One state opens
  // every list in the sentence.
  let capped = false;
  const toggle = (count: number) => (
    <button
      type="button"
      className="crewlet-delivery-receipt__more"
      aria-expanded={expanded}
      onClick={() => setExpanded((was) => !was)}
    >
      {expanded ? labels.fewer : labels.more(count)}
    </button>
  );
  // One list of seats in the sentence: grouped by reason in the order the
  // routing reached them, its names past the cap counted in the button.
  const seats = (
    list: readonly DeliveryReceiptRecipient[],
    withReasons: boolean,
  ): ReactNode => {
    const shown = list.length > cap + 1 ? list.slice(0, cap) : list;
    const hidden = list.length - shown.length;
    if (hidden > 0) capped = true;
    const order: string[] = [];
    const byReason = new Map<string, string[]>();
    for (const r of shown) {
      const key = withReasons ? (r.reason ?? "") : "";
      const names = byReason.get(key);
      if (names) names.push(r.name);
      else {
        order.push(key);
        byReason.set(key, [r.name]);
      }
    }
    const words = labels.groups(
      order.map((key) => {
        const names = byReason.get(key) ?? [];
        // A list the button continues is printed with commas, so the
        // button's "and 4 more" closes it.
        const joined = hidden > 0 ? names.join(", ") : labels.list(names);
        return key ? `${joined} ${labels.reason(key)}` : joined;
      }),
    );
    return hidden > 0 ? (
      <>
        {words} {toggle(hidden)}
      </>
    ) : (
      words
    );
  };

  let sentence: ReactNode;
  if (none) sentence = tense === "draft" ? labels.noneDraft : labels.none;
  else if (tense === "draft") sentence = labels.reaches(seats(recipients, true));
  else if (answered.length === 0) sentence = labels.reached(seats(recipients, true));
  else if (waiting.length === 0)
    sentence = labels.reachedAnswered(seats(recipients, true), answered.length);
  else sentence = labels.partlyAnswered(seats(answered, false), seats(waiting, true));
  // Opened, every list shows every name and no "and N more" is left to close
  // it again, so "Show fewer" stands once, at the end of the sentence.
  const fewer = expanded && !capped ? toggle(0) : null;

  // The sentences after the receipt's own, each after a real full stop.
  const after: { key: string; className?: string; words: ReactNode }[] = [];
  if (truncated && !none) after.push({ key: "truncated", words: labels.truncated });
  if (none && hint)
    after.push({ key: "hint", className: "crewlet-delivery-receipt__hint", words: hint });

  const mark = none ? (
    <TriangleAlertGlyph size="xs" />
  ) : answered.length > 0 ? (
    <CheckGlyph size="xs" />
  ) : null;
  return (
    <p
      {...rest}
      role={announce ? "status" : undefined}
      data-tense={tense}
      className={cx(
        "crewlet-delivery-receipt",
        none && "crewlet-delivery-receipt--none",
        answered.length > 0 && "crewlet-delivery-receipt--answered",
        className,
      )}
    >
      {mark ? (
        <span className="crewlet-delivery-receipt__mark" aria-hidden="true">
          {mark}
        </span>
      ) : null}
      <span className="crewlet-delivery-receipt__words">
        {sentence}
        {fewer ? <> {fewer}</> : null}
        {after.map((part) => (
          <span key={part.key} className={part.className}>
            {". "}
            {part.words}
          </span>
        ))}
      </span>
    </p>
  );
}
