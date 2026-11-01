/**
 * Who a person's message reached and who answered, under its words, and the
 * same line in the future tense over a composer: one paragraph a screen
 * reader hears at once, quiet except for a message that reached no agent.
 */
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, test } from "vitest";
import { installSheets } from "../../../../apps/ui-tests/src/cascade.js";
import { DeliveryReceipt } from "./index.js";

afterEach(cleanup);

/** What a screen reader reads: the text outside every aria-hidden subtree. */
function spoken(el: Node): string {
  if (el instanceof Element && el.getAttribute("aria-hidden") === "true")
    return "";
  if (el.nodeType === Node.TEXT_NODE) return el.textContent ?? "";
  return Array.from(el.childNodes).map(spoken).join("");
}

const text = (el: Element) => spoken(el).replace(/\s+/g, " ").trim();

test("says whom a message reached, then who answered", () => {
  const { container } = render(
    <DeliveryReceipt recipients={[{ id: "pm", name: "pm", answered: true }]} />,
  );
  const line = container.querySelector(".crewlet-delivery-receipt")!;
  // The eye reads a middle dot, a screen reader a full stop.
  expect(text(line)).toBe("Reached pm. pm answered");
  expect(
    line
      .querySelector(".crewlet-delivery-receipt__dot")!
      .getAttribute("aria-hidden"),
  ).toBe("true");
  expect(
    line.querySelector(".crewlet-delivery-receipt__dot")!.textContent,
  ).toBe("·");
});

test("groups the seats by reason, in the order the routing reached them", () => {
  render(
    <DeliveryReceipt
      recipients={[
        { id: "pm", name: "pm" },
        { id: "qa", name: "qa", reason: "every message" },
        { id: "sre", name: "sre", reason: "every message" },
      ]}
    />,
  );
  expect(screen.getByText("Reached pm; qa, sre (every message)")).toBeTruthy();
  expect(
    document.querySelector(".crewlet-delivery-receipt__answered"),
  ).toBeNull();
});

test("warns, with a mark and words, when a message reached no agent", () => {
  const { container } = render(
    <DeliveryReceipt recipients={[]} hint="This room has no agent members." />,
  );
  const line = container.querySelector(".crewlet-delivery-receipt")!;
  expect(line.classList.contains("crewlet-delivery-receipt--none")).toBe(true);
  expect(text(line)).toBe("Reached no agent. This room has no agent members.");
  expect(
    line
      .querySelector(".crewlet-delivery-receipt__mark")!
      .getAttribute("aria-hidden"),
  ).toBe("true");
});

test("speaks in the future over a composer, and announces itself when asked", () => {
  const { rerender } = render(
    <DeliveryReceipt
      tense="draft"
      announce
      recipients={[{ id: "pm", name: "pm", answered: true }]}
    />,
  );
  const line = screen.getByRole("status");
  // A draft has nobody who answered it yet, whatever a caller passed.
  expect(text(line)).toBe("Will reach pm");
  rerender(<DeliveryReceipt tense="draft" announce recipients={[]} />);
  expect(text(screen.getByRole("status"))).toBe("Will reach no agent");
});

test("is no live region in a transcript", () => {
  render(<DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} />);
  expect(screen.queryByRole("status")).toBeNull();
});

test("says when a cap left seats out", () => {
  render(<DeliveryReceipt truncated recipients={[{ id: "qa", name: "qa" }]} />);
  expect(screen.getByText("Some seats were not reached")).toBeTruthy();
});

test("takes its words from the caller", () => {
  render(
    <DeliveryReceipt
      recipients={[{ id: "pm", name: "pm", answered: true }]}
      labels={{
        reached: (who) => `Erreicht ${who}`,
        answered: (who) => `${who} hat geantwortet`,
      }}
    />,
  );
  expect(screen.getByText("Erreicht pm")).toBeTruthy();
  expect(screen.getByText("pm hat geantwortet")).toBeTruthy();
});

// Quiet: the tertiary ink at the meta step, one raised tone for no agent.
// Mutation: drop the --none rule and the mark keeps the tertiary ink.
test("sits in the tertiary ink, and marks no agent in the warning ink", () => {
  const uninstall = installSheets(
    "ChatMessage/ChatScale.css",
    "DeliveryReceipt/DeliveryReceipt.css",
  );
  try {
    const { container, rerender } = render(
      <DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} />,
    );
    const line = container.querySelector<HTMLElement>(
      ".crewlet-delivery-receipt",
    )!;
    const quiet = getComputedStyle(line).color;
    rerender(<DeliveryReceipt recipients={[]} />);
    const mark = container.querySelector<HTMLElement>(
      ".crewlet-delivery-receipt__mark",
    )!;
    expect(getComputedStyle(mark).color).not.toBe(quiet);
    expect(getComputedStyle(line).color).not.toBe(quiet);
  } finally {
    uninstall();
  }
});

test("carries no axe violation", async () => {
  const { container } = render(
    <main>
      <DeliveryReceipt
        recipients={[{ id: "pm", name: "pm", answered: true }]}
      />
      <DeliveryReceipt
        tense="draft"
        announce
        recipients={[]}
        hint="Mention an agent to ask it."
      />
    </main>,
  );
  const result = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: { "color-contrast": { enabled: false } },
    resultTypes: ["violations"],
  });
  expect(result.violations).toEqual([]);
});
