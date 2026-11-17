/**
 * Who a person's message reached and who answered, as a mark whose facts open
 * in the kit tooltip: the mark says where it stands, the tip says who and
 * when, and the trigger's name says all of it to a screen reader.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import axe from "axe-core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CheckGlyph, CircleDashedGlyph, TriangleAlertGlyph } from "@crewlethq/icons/glyphs";
import { tabTo } from "../../../../apps/ui-tests/src/keyboard.js";
import { installSheets } from "../../../../apps/ui-tests/src/cascade.js";
import { DeliveryReceipt, type DeliveryReceiptRecipient } from "./index.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function trigger(): HTMLElement {
  return document.querySelector<HTMLElement>(".crewlet-delivery-receipt__trigger")!;
}

/** Opens the tip as a pointer resting on the mark does, and returns its lines, a row's cells joined by " | ". */
function openTip(): string[] {
  fireEvent.pointerEnter(trigger());
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
  if (!tip) throw new Error("the tip did not open");
  return [
    ...tip.querySelectorAll(
      ".crewlet-delivery-receipt__tip-head, .crewlet-delivery-receipt__tip-row, .crewlet-delivery-receipt__tip-note",
    ),
  ].map((part) =>
    part.classList.contains("crewlet-delivery-receipt__tip-row")
      ? [part.firstElementChild!.textContent, ...[...part.lastElementChild!.children].map((v) => v.textContent)].join(" | ")
      : part.textContent!,
  );
}

/** A glyph as the receipt's mark draws it, rendered on its own. */
function drawn(glyph: ReactElement): string {
  const { container, unmount } = render(glyph);
  const html = container.innerHTML;
  unmount();
  return html;
}

// EACH STATE IS ITS OWN MARK AND ITS OWN SENTENCE, every seat named once, and
// the sentence is the trigger's name. Mutation: draw the check while nobody
// has answered, or name an answered seat again among those reached.
test.each<{ state: string; recipients: DeliveryReceiptRecipient[]; said: string; mark: ReactElement }>([
  {
    state: "waiting",
    recipients: [{ id: "sre", name: "Site Reliability Engineer" }],
    said: "Reached Site Reliability Engineer",
    mark: <CircleDashedGlyph size="sm" />,
  },
  {
    state: "answered",
    recipients: [{ id: "sre", name: "Site Reliability Engineer", answered: true }],
    said: "Reached Site Reliability Engineer, who answered",
    mark: <CheckGlyph size="sm" />,
  },
  {
    state: "answered",
    recipients: [
      { id: "pm", name: "pm", answered: true },
      { id: "qa", name: "qa", answered: true },
    ],
    said: "Reached pm and qa, who both answered",
    mark: <CheckGlyph size="sm" />,
  },
  {
    state: "partly",
    recipients: [
      { id: "pm", name: "pm" },
      { id: "qa", name: "qa", answered: true },
      { id: "sre", name: "sre", reason: "every message" },
    ],
    said: "qa answered, waiting on pm; sre (every message)",
    mark: <CheckGlyph size="sm" />,
  },
  { state: "none", recipients: [], said: "Reached no agent", mark: <TriangleAlertGlyph size="sm" /> },
])("draws $state as its mark, named by its sentence: $said", ({ state, recipients, said, mark }) => {
  const { container } = render(<DeliveryReceipt recipients={recipients} />);
  const receipt = container.querySelector<HTMLElement>(".crewlet-delivery-receipt")!;
  expect(receipt.dataset.state).toBe(state);
  expect(screen.getByRole("button", { name: said })).toBe(trigger());
  const shown = receipt.querySelector(".crewlet-delivery-receipt__mark")!;
  expect(shown.getAttribute("aria-hidden")).toBe("true");
  expect(shown.innerHTML).toBe(drawn(mark));
  for (const r of recipients) expect(said.split(r.name).length - 1).toBe(1);
  // No sentence on the page: the mark, and a count while some are still to answer.
  expect(receipt.textContent).toBe(state === "partly" ? "1/3" : "");
});

test("the tip says where it stands, who answered and when, and who it is still waiting on", () => {
  render(
    <DeliveryReceipt
      sentAt="10:42"
      recipients={[
        { id: "pm", name: "pm" },
        { id: "qa", name: "qa", answered: true, answeredAt: "10:44" },
        { id: "sre", name: "sre", reason: "every message" },
      ]}
    />,
  );
  expect(openTip()).toEqual([
    "1 of 3 answered",
    "Answered | qa, 10:44",
    "Waiting on | pm; sre (every message)",
    "Sent | 10:42",
  ]);
  // The tip is for the eye; the name already says it, times included.
  const panel = document.querySelector('[role="tooltip"]')!;
  expect(panel.getAttribute("aria-hidden")).toBe("true");
  expect(trigger().getAttribute("aria-describedby") ?? "").not.toContain(panel.id);
  expect(trigger().getAttribute("aria-label")).toBe(
    "qa answered, waiting on pm; sre (every message). Answered qa, 10:44. Sent 10:42",
  );
});

test("a receipt nobody has answered yet lists whom it reached", () => {
  render(<DeliveryReceipt sentAt="10:42" recipients={[{ id: "pm", name: "pm" }, { id: "qa", name: "qa" }]} />);
  expect(openTip()).toEqual(["No answer yet", "Reached | pm and qa", "Sent | 10:42"]);
});

test("a receipt everybody answered lists each answer on its own line", () => {
  render(
    <DeliveryReceipt
      recipients={[
        { id: "pm", name: "pm", answered: true, answeredAt: "10:43" },
        { id: "qa", name: "qa", answered: true, answeredAt: "10:44" },
      ]}
    />,
  );
  expect(openTip()).toEqual(["All 2 answered", "Answered | pm, 10:43 | qa, 10:44"]);
});

test("keyboard focus opens the tip at once, and a press pins it for touch", () => {
  render(<DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} />);
  tabTo(trigger());
  expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
  fireEvent.blur(trigger());
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(document.querySelector('[role="tooltip"]')).toBeNull();
  fireEvent.pointerDown(trigger());
  expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
});

const FOLLOWERS = [
  "Senior Web and Mobile App Engineer",
  "Senior Backend Engineer",
  "Senior Product Designer",
  "Quality Lead",
  "Release Manager",
  "Support Lead",
  "Site Reliability Engineer",
].map((name, i) => ({ id: `seat-${i}`, name, reason: "every message" }));

test("the tip counts the names past the cap, and the name keeps every one", () => {
  render(<DeliveryReceipt recipients={FOLLOWERS} max={3} />);
  expect(openTip()[1]).toBe(
    "Reached | Senior Web and Mobile App Engineer, Senior Backend Engineer, Senior Product Designer and 4 more (every message)",
  );
  for (const seat of FOLLOWERS) expect(trigger().getAttribute("aria-label")).toContain(seat.name);
});

test("a single name past the cap is shown rather than counted", () => {
  render(<DeliveryReceipt recipients={FOLLOWERS.slice(0, 4)} max={3} />);
  expect(openTip()[1]).not.toContain("more");
});

// Quiet, with one raised tone. Mutation: drop the --none rule.
test("warns in the warning ink, with what to do, when a message reached no agent", () => {
  const uninstall = installSheets("ChatMessage/ChatScale.css", "DeliveryReceipt/DeliveryReceipt.css");
  try {
    const { container, rerender } = render(<DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} />);
    const quiet = getComputedStyle(container.querySelector(".crewlet-delivery-receipt__mark")!).color;
    rerender(<DeliveryReceipt recipients={[]} hint="This room has no agent members." />);
    expect(getComputedStyle(container.querySelector(".crewlet-delivery-receipt__mark")!).color).not.toBe(quiet);
    expect(trigger().getAttribute("aria-label")).toBe("Reached no agent. This room has no agent members.");
    expect(openTip()).toEqual(["Reached no agent", "This room has no agent members."]);
  } finally {
    uninstall();
  }
});

test("over a composer it speaks in the future, announces itself, and draws the faces it is given", () => {
  const { rerender, container } = render(
    <DeliveryReceipt
      tense="draft"
      announce
      faces={<span className="faces">PM</span>}
      recipients={[{ id: "pm", name: "pm", answered: true }]}
    />,
  );
  // A draft has nobody who answered it yet, whatever a caller passed.
  expect(screen.getByRole("status").textContent).toBe("Will reach pm");
  expect(trigger().getAttribute("aria-label")).toBe("Will reach pm");
  expect(container.querySelector(".crewlet-delivery-receipt__faces .faces")).not.toBeNull();
  expect(container.querySelector(".crewlet-delivery-receipt__mark")).toBeNull();
  expect(openTip()).toEqual(["Will reach pm"]);
  rerender(<DeliveryReceipt tense="draft" announce recipients={[]} hint="Mention an agent to ask it." />);
  expect(screen.getByRole("status").textContent).toBe("Will reach no agent. Mention an agent to ask it.");
  expect(container.querySelector(".crewlet-delivery-receipt__faces")).toBeNull();
});

test("is no live region in a transcript", () => {
  render(<DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} />);
  expect(screen.queryByRole("status")).toBeNull();
});

test("says when a cap left seats out", () => {
  render(<DeliveryReceipt truncated recipients={[{ id: "qa", name: "qa" }]} />);
  expect(trigger().getAttribute("aria-label")).toBe("Reached qa. Some seats were not reached");
  expect(openTip()).toContain("Some seats were not reached");
});

test("takes its words from the caller", () => {
  render(
    <DeliveryReceipt
      recipients={[
        { id: "pm", name: "pm", answered: true },
        { id: "qa", name: "qa" },
      ]}
      labels={{
        partlyAnswered: (answered, waiting) => `${answered} hat geantwortet, ${waiting} noch nicht`,
        partlyTitle: (answered, total) => `${answered} von ${total}`,
      }}
    />,
  );
  expect(screen.getByRole("button", { name: "pm hat geantwortet, qa noch nicht" })).toBeTruthy();
  expect(openTip()[0]).toBe("1 von 2");
});

test("refuses a cap that is not a whole number of at least 1", () => {
  expect(() => render(<DeliveryReceipt recipients={FOLLOWERS} max={0} />)).toThrow(RangeError);
  expect(() => render(<DeliveryReceipt recipients={FOLLOWERS} max={1.5} />)).toThrow(RangeError);
});

test("carries no axe violation, open or shut", async () => {
  vi.useRealTimers();
  const { container } = render(
    <main>
      <DeliveryReceipt recipients={[{ id: "pm", name: "pm", answered: true }]} sentAt="10:42" />
      <DeliveryReceipt tense="draft" announce recipients={[]} hint="Mention an agent to ask it." />
      <DeliveryReceipt recipients={FOLLOWERS} />
    </main>,
  );
  const run = () =>
    axe.run(document.body, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      rules: { "color-contrast": { enabled: false } },
      resultTypes: ["violations"],
    });
  expect((await run()).violations).toEqual([]);
  tabTo(container.querySelector<HTMLElement>(".crewlet-delivery-receipt__trigger")!);
  expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
  expect((await run()).violations).toEqual([]);
});
