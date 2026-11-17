import type { HTMLAttributes, ReactNode } from "react";
import {
  CheckGlyph,
  CircleDashedGlyph,
  TriangleAlertGlyph,
  UsersGlyph,
} from "@crewlethq/icons/glyphs";
import { Tooltip } from "../Tooltip/index.js";
import { VisuallyHidden } from "../VisuallyHidden/index.js";
import { cx } from "../utils/cx.js";

/** One seat a message reached, or will reach. */
export interface DeliveryReceiptRecipient {
  /** A stable key for the seat: its handle. */
  id: string;
  /** How the reader knows the seat: "pm", "Product Manager". */
  name: string;
  /**
   * Why the message reached the seat, in the caller's words, noted after the
   * seats that share it: "every message". Leave it out where the reason
   * needs no note (a mention, a reply to their thread).
   */
  reason?: string | undefined;
  /** The seat has answered: it replied in the thread, or in the conversation. */
  answered?: boolean | undefined;
  /** When it answered, in the caller's words: "10:44". Read only with `answered`. */
  answeredAt?: string | undefined;
}

/**
 * `sent` is a receipt under a message that was posted; `draft` is what a post
 * will do before it is sent, over a composer.
 */
export type DeliveryReceiptTense = "sent" | "draft";

/**
 * Where a receipt stands, which its mark draws: reached and `waiting`,
 * `partly` answered, all `answered`, reached `none`, or a `draft`.
 */
export type DeliveryReceiptState = "waiting" | "partly" | "answered" | "none" | "draft";

export interface DeliveryReceiptLabels {
  /** A posted message nobody it reached has answered yet: "Reached pm and qa". */
  reached: (who: string) => string;
  /** Every seat it reached answered: "Reached pm, who answered"; "Reached pm and qa, who both answered". */
  reachedAnswered: (who: string, count: number) => string;
  /** Some of the seats answered, each named once: "pm answered, waiting on qa and sre". */
  partlyAnswered: (answered: string, waiting: string) => string;
  /** The reach of a draft: "Will reach pm". */
  reaches: (who: string) => string;
  /** A posted message that reached no agent. */
  none: string;
  /** A draft that will reach no agent. */
  noneDraft: string;
  /** The seats in one reason's group: "qa and sre", "pm, qa and sre". */
  list: (names: readonly string[]) => string;
  /** One reason's note: "(every message)". */
  reason: (words: string) => string;
  /** The groups of different reasons, joined: "pm; qa and sre (every message)". */
  groups: (groups: readonly string[]) => string;
  /** A routing cap left seats out. */
  truncated: string;
  /** The names past `max` in the tip: "4 more". */
  more: (count: number) => string;
  /** The tip's head over a receipt nobody has answered yet. */
  waitingTitle: string;
  /** The tip's head over a receipt some seats answered: "1 of 3 answered". */
  partlyTitle: (answered: number, total: number) => string;
  /** The tip's head over a receipt every seat answered: "Answered", "All 3 answered". */
  answeredTitle: (count: number) => string;
  /** The tip's row of the seats a receipt reached. */
  reachedRow: string;
  /** The tip's row of the seats that answered, and the word before each answer's time. */
  answeredRow: string;
  /** The tip's row of the seats still to answer. */
  waitingRow: string;
  /** The tip's row of when the message was sent. */
  sentRow: string;
  /** One seat that answered and when: "pm, 10:44". */
  answeredAt: (name: string, at: string) => string;
}

/** "pm", "pm and qa", "pm, qa and sre". */
function andList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const DELIVERY_RECEIPT_LABELS: DeliveryReceiptLabels = {
  reached: (who) => `Reached ${who}`,
  reachedAnswered: (who, count) =>
    `Reached ${who}, who ${count === 2 ? "both " : count > 2 ? "all " : ""}answered`,
  partlyAnswered: (answered, waiting) => `${answered} answered, waiting on ${waiting}`,
  reaches: (who) => `Will reach ${who}`,
  none: "Reached no agent",
  noneDraft: "Will reach no agent",
  list: andList,
  reason: (words) => `(${words})`,
  groups: (groups) => groups.join("; "),
  truncated: "Some seats were not reached",
  more: (count) => `${count} more`,
  waitingTitle: "No answer yet",
  partlyTitle: (answered, total) => `${answered} of ${total} answered`,
  answeredTitle: (count) => (count === 1 ? "Answered" : `All ${count} answered`),
  reachedRow: "Reached",
  answeredRow: "Answered",
  waitingRow: "Waiting on",
  sentRow: "Sent",
  answeredAt: (name, at) => `${name}, ${at}`,
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
  /** When a sent message was posted, in the caller's words: "10:42". */
  sentAt?: string | undefined;
  /**
   * What to do about a receipt that reached no agent, after its words:
   * "This room has no agent members. Mention one to ask it."
   */
  hint?: string | undefined;
  /**
   * The faces of the seats a draft reaches (a decorative `AvatarStack`),
   * drawn in place of its mark.
   */
  faces?: ReactNode;
  /**
   * Whether the receipt is its own polite live region (false by default). A
   * composer's draft receipt that changes as a mention is typed passes true;
   * a receipt in a transcript does not, or it would talk over the conversation.
   */
  announce?: boolean | undefined;
  /**
   * How many names each list in the tip shows before counting the rest: 4 by
   * default, a whole number of at least 1, or Infinity. One name past the cap
   * is shown, as it costs no more room than "1 more". The receipt's
   * accessible name always carries every one.
   */
  max?: number | undefined;
  labels?: Partial<DeliveryReceiptLabels> | undefined;
}

/** One list of seats as words: grouped by reason in routing order, past `cap` counted. */
function seats(
  list: readonly DeliveryReceiptRecipient[],
  withReasons: boolean,
  cap: number,
  labels: DeliveryReceiptLabels,
): string {
  const shown = list.length > cap + 1 ? list.slice(0, cap) : list;
  const hidden = list.length - shown.length;
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
  return labels.groups(
    order.map((key, index) => {
      const names = [...(byReason.get(key) ?? [])];
      if (hidden > 0 && index === order.length - 1) names.push(labels.more(hidden));
      const joined = labels.list(names);
      return key ? `${joined} ${labels.reason(key)}` : joined;
    }),
  );
}

/**
 * Who a person's message reached, and who answered, as a quiet MARK whose
 * facts open in a kit Tooltip on hover, keyboard focus or a press: a dashed
 * circle while nobody has answered, a check once somebody has (with the count
 * while others are still to answer), and a warning where it reached no agent.
 * Over a composer the same receipt, in the future tense, says who a post WILL
 * reach, drawn as their faces where the caller has them.
 *
 * THE WORDS ARE THE NAME. The trigger's accessible name is the receipt in
 * full, every seat named once, so a screen reader hears what the tip shows
 * without opening it; the tip lays the same facts out for the eye and is
 * hidden from assistive technology (`describes={false}`).
 *
 * QUIET BY DESIGN. It sits at the meta step in the tertiary ink, an answer
 * lifts it to the secondary ink, and the one raised tone is the warning on a
 * message that reached no agent. Colour is never alone: each state has its
 * own mark and its own words.
 */
export function DeliveryReceipt({
  recipients,
  tense = "sent",
  truncated = false,
  sentAt,
  hint,
  faces,
  announce = false,
  max = 4,
  labels: overrides,
  className,
  ...rest
}: DeliveryReceiptProps) {
  if (max !== Infinity && (!Number.isInteger(max) || max < 1)) {
    throw new RangeError(
      `DeliveryReceipt max must be a whole number of at least 1; it was ${max}`,
    );
  }
  const labels = overrides
    ? { ...DELIVERY_RECEIPT_LABELS, ...overrides }
    : DELIVERY_RECEIPT_LABELS;
  // A draft has nobody who answered it yet, whatever a caller passed.
  const answered = tense === "sent" ? recipients.filter((r) => r.answered) : [];
  const waiting = tense === "sent" ? recipients.filter((r) => !r.answered) : recipients;
  const state: DeliveryReceiptState =
    recipients.length === 0
      ? "none"
      : tense === "draft"
        ? "draft"
        : answered.length === 0
          ? "waiting"
          : waiting.length === 0
            ? "answered"
            : "partly";

  // The sentence names every seat: nothing expands a capped list in a name.
  const every = (list: readonly DeliveryReceiptRecipient[], withReasons: boolean) =>
    seats(list, withReasons, Infinity, labels);
  const capped = (list: readonly DeliveryReceiptRecipient[], withReasons: boolean) =>
    seats(list, withReasons, max, labels);
  const sentence = {
    none: tense === "draft" ? labels.noneDraft : labels.none,
    draft: labels.reaches(every(recipients, true)),
    waiting: labels.reached(every(recipients, true)),
    answered: labels.reachedAnswered(every(recipients, true), answered.length),
    partly: labels.partlyAnswered(every(answered, false), every(waiting, true)),
  }[state];

  // THE TIP: a head saying where it stands, then one row a fact.
  const head = {
    none: sentence,
    draft: labels.reaches(capped(recipients, true)),
    waiting: labels.waitingTitle,
    answered: labels.answeredTitle(answered.length),
    partly: labels.partlyTitle(answered.length, recipients.length),
  }[state];
  const answers = (() => {
    const shown = answered.length > max + 1 ? answered.slice(0, max) : answered;
    const lines = shown.map((r) => (r.answeredAt ? labels.answeredAt(r.name, r.answeredAt) : r.name));
    if (shown.length < answered.length) lines.push(labels.more(answered.length - shown.length));
    return lines;
  })();
  const rows: { key: string; values: string[] }[] = [];
  if (state === "waiting") rows.push({ key: labels.reachedRow, values: [capped(recipients, true)] });
  if (state === "partly" || state === "answered") rows.push({ key: labels.answeredRow, values: answers });
  if (state === "partly") rows.push({ key: labels.waitingRow, values: [capped(waiting, true)] });
  if (tense === "sent" && sentAt) rows.push({ key: labels.sentRow, values: [sentAt] });
  const notes: string[] = [];
  if (truncated && state !== "none") notes.push(labels.truncated);
  if (state === "none" && hint) notes.push(hint);

  // What a screen reader is told: the sentence, then each fact the tip adds to it.
  const said = [
    sentence,
    ...answered
      .filter((r) => r.answeredAt)
      .map((r) => `${labels.answeredRow} ${labels.answeredAt(r.name, r.answeredAt!)}`),
    ...(tense === "sent" && sentAt ? [`${labels.sentRow} ${sentAt}`] : []),
    ...notes,
  ].join(". ");

  const tip = (
    <span className="crewlet-delivery-receipt__tip">
      <span className="crewlet-delivery-receipt__tip-head">{head}</span>
      {rows.length > 0 ? (
        <span className="crewlet-delivery-receipt__tip-facts">
          {rows.map((row) => (
            <span key={row.key} className="crewlet-delivery-receipt__tip-row">
              <span className="crewlet-delivery-receipt__tip-key">{row.key}</span>
              <span className="crewlet-delivery-receipt__tip-values">
                {row.values.map((value, i) => (
                  <span key={i}>{value}</span>
                ))}
              </span>
            </span>
          ))}
        </span>
      ) : null}
      {notes.map((note) => (
        <span key={note} className="crewlet-delivery-receipt__tip-note">
          {note}
        </span>
      ))}
    </span>
  );

  const drawnFaces = state === "draft" && faces !== undefined && faces !== null;
  const mark = {
    none: <TriangleAlertGlyph size="sm" />,
    draft: drawnFaces ? null : <UsersGlyph size="sm" />,
    waiting: <CircleDashedGlyph size="sm" />,
    answered: <CheckGlyph size="sm" />,
    partly: <CheckGlyph size="sm" />,
  }[state];

  return (
    <span
      {...rest}
      data-tense={tense}
      data-state={state}
      className={cx(
        "crewlet-delivery-receipt",
        `crewlet-delivery-receipt--${state}`,
        className,
      )}
    >
      <Tooltip content={tip} describes={false} pressOpens align="start">
        <button type="button" className="crewlet-delivery-receipt__trigger" aria-label={said}>
          {drawnFaces ? (
            <span className="crewlet-delivery-receipt__faces" aria-hidden="true">
              {faces}
            </span>
          ) : null}
          {mark ? (
            <span className="crewlet-delivery-receipt__mark" aria-hidden="true">
              {mark}
            </span>
          ) : null}
          {state === "partly" ? (
            <span className="crewlet-delivery-receipt__count" aria-hidden="true">
              {answered.length}/{recipients.length}
            </span>
          ) : null}
        </button>
      </Tooltip>
      {announce ? (
        <span role="status">
          <VisuallyHidden>{said}</VisuallyHidden>
        </span>
      ) : null}
    </span>
  );
}
