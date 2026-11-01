import type { HTMLAttributes, ReactNode } from "react";
import { CheckGlyph, TriangleAlertGlyph } from "@crewlethq/icons/glyphs";
import { cx } from "../utils/cx.js";
import { VisuallyHidden } from "../VisuallyHidden/index.js";

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
  /** The reach of a posted message: "Reached pm; qa, sre (every message)". */
  reached: (who: string) => string;
  /** The reach of a draft: "Will reach pm". */
  reaches: (who: string) => string;
  /** A posted message that reached no agent. */
  none: string;
  /** A draft that will reach no agent. */
  noneDraft: string;
  /** The seats that answered: "pm answered". */
  answered: (who: string) => string;
  /** The seats in one reason's group: "qa, sre". */
  list: (names: readonly string[]) => string;
  /** One reason's note: "(every message)". */
  reason: (words: string) => string;
  /** The groups of different reasons, joined: "pm; qa, sre (every message)". */
  groups: (groups: readonly string[]) => string;
  /** A routing cap left seats out. */
  truncated: string;
}

export const DELIVERY_RECEIPT_LABELS: DeliveryReceiptLabels = {
  reached: (who) => `Reached ${who}`,
  reaches: (who) => `Will reach ${who}`,
  none: "Reached no agent",
  noneDraft: "Will reach no agent",
  answered: (who) => `${who} answered`,
  list: (names) => names.join(", "),
  reason: (words) => `(${words})`,
  groups: (groups) => groups.join("; "),
  truncated: "Some seats were not reached",
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
  labels?: Partial<DeliveryReceiptLabels> | undefined;
}

/** The reach sentence: the seats grouped by reason, in the order first met. */
function reachOf(
  recipients: readonly DeliveryReceiptRecipient[],
  labels: DeliveryReceiptLabels,
): string {
  const order: string[] = [];
  const byReason = new Map<string, string[]>();
  for (const r of recipients) {
    const key = r.reason ?? "";
    const names = byReason.get(key);
    if (names) {
      names.push(r.name);
    } else {
      order.push(key);
      byReason.set(key, [r.name]);
    }
  }
  return labels.groups(
    order.map((key) => {
      const list = labels.list(byReason.get(key) ?? []);
      return key ? `${list} ${labels.reason(key)}` : list;
    }),
  );
}

/**
 * Who a person's message reached, and who answered: "Reached pm", then "pm
 * answered"; "Reached qa, sre (every message)"; "Reached no agent". Over a
 * composer, the same line in the future tense says who a post WILL reach
 * before it is sent.
 *
 * QUIET BY DESIGN. It sits in a message's footer at the compact step in the
 * tertiary ink, because it is a fact a person checks rather than reads: the
 * one tone it raises is the warning on a message that reached no agent, the
 * case where a person would otherwise wait for an answer nobody was asked
 * for. Colour is never alone: the mark and the words say it.
 *
 * ONE STOP TO A SCREEN READER: the parts are spans in one paragraph, so a
 * reader moving through the log hears "Reached pm. pm answered" at once. The
 * middle dot the eye reads between the parts is hidden from it, and a full
 * stop only it hears stands in its place; the marks are hidden too.
 */
export function DeliveryReceipt({
  recipients,
  tense = "sent",
  truncated = false,
  hint,
  announce = false,
  labels: overrides,
  className,
  ...rest
}: DeliveryReceiptProps) {
  const labels = overrides
    ? { ...DELIVERY_RECEIPT_LABELS, ...overrides }
    : DELIVERY_RECEIPT_LABELS;
  const none = recipients.length === 0;
  const answered =
    tense === "sent"
      ? recipients.filter((r) => r.answered).map((r) => r.name)
      : [];
  const reach = none
    ? tense === "draft"
      ? labels.noneDraft
      : labels.none
    : (tense === "draft" ? labels.reaches : labels.reached)(
        reachOf(recipients, labels),
      );
  const parts: {
    key: string;
    className?: string;
    mark?: ReactNode;
    words: ReactNode;
  }[] = [
    {
      key: "reach",
      mark: none ? <TriangleAlertGlyph size="xs" /> : undefined,
      words: reach,
    },
  ];
  if (truncated && !none)
    parts.push({ key: "truncated", words: labels.truncated });
  if (answered.length > 0) {
    parts.push({
      key: "answered",
      className: "crewlet-delivery-receipt__answered",
      mark: <CheckGlyph size="xs" />,
      words: labels.answered(labels.list(answered)),
    });
  }
  if (none && hint)
    parts.push({
      key: "hint",
      className: "crewlet-delivery-receipt__hint",
      words: hint,
    });
  return (
    <p
      {...rest}
      role={announce ? "status" : undefined}
      data-tense={tense}
      className={cx(
        "crewlet-delivery-receipt",
        none && "crewlet-delivery-receipt--none",
        className,
      )}
    >
      {parts.map((part, i) => (
        <span
          key={part.key}
          className={cx("crewlet-delivery-receipt__part", part.className)}
        >
          {i > 0 ? (
            <span className="crewlet-delivery-receipt__dot" aria-hidden="true">
              ·
            </span>
          ) : null}
          {part.mark ? (
            <span className="crewlet-delivery-receipt__mark" aria-hidden="true">
              {part.mark}
            </span>
          ) : null}
          <span>{part.words}</span>
          {i < parts.length - 1 ? <VisuallyHidden>. </VisuallyHidden> : null}
        </span>
      ))}
    </p>
  );
}
