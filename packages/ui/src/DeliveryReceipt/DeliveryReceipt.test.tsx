/**
 * Who a person's message reached and who answered, under its words, and the
 * same line in the future tense over a composer: one sentence that names
 * each seat once, which the eye, a screen reader and a copy all read alike,
 * quiet except for a message that reached no agent.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

// ONE SENTENCE, EACH SEAT ONCE, IN EVERY STATE. It used to be two parts
// with a dot between them, so a seat that answered was named twice and the
// full stop only a screen reader was meant to hear came out of a copy as
// ". ·". Mutation: put the answered part back after the reach.
test.each([
  {
    state: "reached, nobody has answered yet",
    recipients: [{ id: "sre", name: "Site Reliability Engineer" }],
    said: "Reached Site Reliability Engineer",
  },
  {
    state: "reached, and it answered",
    recipients: [{ id: "sre", name: "Site Reliability Engineer", answered: true }],
    said: "Reached Site Reliability Engineer, who answered",
  },
  {
    state: "reached two, and both answered",
    recipients: [
      { id: "pm", name: "pm", answered: true },
      { id: "qa", name: "qa", answered: true },
    ],
    said: "Reached pm and qa, who both answered",
  },
  {
    state: "reached three, and all answered",
    recipients: [
      { id: "pm", name: "pm", answered: true },
      { id: "qa", name: "qa", answered: true },
      { id: "sre", name: "sre", answered: true },
    ],
    max: 3,
    said: "Reached pm, qa and sre, who all answered",
  },
  {
    state: "reached three, one answered",
    recipients: [
      { id: "pm", name: "pm" },
      { id: "qa", name: "qa", answered: true },
      { id: "sre", name: "sre", reason: "every message" },
    ],
    max: 3,
    said: "qa answered, waiting on pm; sre (every message)",
  },
  {
    state: "reached two, nobody has answered yet",
    recipients: [
      { id: "pm", name: "pm" },
      { id: "qa", name: "qa" },
    ],
    said: "Reached pm and qa",
  },
])("says it in one sentence when $state", ({ recipients, said, max }) => {
  const { container } = render(<DeliveryReceipt recipients={recipients} max={max} />);
  const line = container.querySelector(".crewlet-delivery-receipt")!;
  expect(text(line)).toBe(said);
  // What the eye reads is what a screen reader reads.
  expect(line.textContent!.replace(/\s+/g, " ").trim()).toBe(said);
  expect(line.querySelector(".crewlet-visually-hidden")).toBeNull();
  for (const r of recipients) {
    expect(said.split(r.name).length - 1).toBe(1);
  }
});

test("marks an answer with a check, hidden from a screen reader", () => {
  const { container, rerender } = render(
    <DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} />,
  );
  const line = container.querySelector(".crewlet-delivery-receipt")!;
  expect(line.querySelector(".crewlet-delivery-receipt__mark")).toBeNull();
  expect(line.classList.contains("crewlet-delivery-receipt--answered")).toBe(false);
  rerender(<DeliveryReceipt recipients={[{ id: "pm", name: "pm", answered: true }]} />);
  expect(line.classList.contains("crewlet-delivery-receipt--answered")).toBe(true);
  expect(
    line.querySelector(".crewlet-delivery-receipt__mark")!.getAttribute("aria-hidden"),
  ).toBe("true");
});

test("groups the seats by reason, in the order the routing reached them", () => {
  render(
    <DeliveryReceipt
      recipients={[
        { id: "pm", name: "pm" },
        { id: "qa", name: "qa", reason: "every message" },
        { id: "sre", name: "sre", reason: "every message" },
      ]}
      max={3}
    />,
  );
  expect(screen.getByText("Reached pm; qa and sre (every message)")).toBeTruthy();
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

test("says when a cap left seats out, as a sentence of its own", () => {
  const { container } = render(
    <DeliveryReceipt truncated recipients={[{ id: "qa", name: "qa" }]} />,
  );
  expect(text(container.querySelector(".crewlet-delivery-receipt")!)).toBe(
    "Reached qa. Some seats were not reached",
  );
});

test("takes its words from the caller", () => {
  render(
    <DeliveryReceipt
      recipients={[
        { id: "pm", name: "pm", answered: true },
        { id: "qa", name: "qa" },
      ]}
      labels={{
        partlyAnswered: (answered, waiting) => (
          <>
            {answered} hat geantwortet, {waiting} noch nicht
          </>
        ),
      }}
    />,
  );
  expect(screen.getByText("pm hat geantwortet, qa noch nicht")).toBeTruthy();
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

const FOLLOWERS = [
  "Senior Web and Mobile App Engineer",
  "Senior Backend Engineer",
  "Senior Product Designer",
  "Quality Lead",
  "Release Manager",
  "Support Lead",
].map((name, i) => ({
  id: `seat-${i}`,
  name,
  reason: "every message",
  answered: i < 3,
}));

test("prints one name of each list and counts the rest in buttons that show them all", () => {
  const { container } = render(<DeliveryReceipt recipients={FOLLOWERS} />);
  const line = container.querySelector(".crewlet-delivery-receipt")!;
  expect(text(line)).toBe(
    "Senior Web and Mobile App Engineer and 2 more answered, " +
      "waiting on Quality Lead (every message) and 2 more",
  );
  const [first, second] = screen.getAllByRole("button");
  expect(first!.textContent).toBe("and 2 more");
  expect(second!.textContent).toBe("and 2 more");
  expect(first!.getAttribute("aria-expanded")).toBe("false");

  fireEvent.click(first!);
  // Every name, each once, and one way back at the end.
  const fewer = screen.getByRole("button", { name: "Show fewer" });
  expect(fewer.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(text(line)).toBe(
    "Senior Web and Mobile App Engineer, Senior Backend Engineer and Senior Product Designer answered, " +
      "waiting on Quality Lead, Release Manager and Support Lead (every message) Show fewer",
  );

  fireEvent.click(fewer);
  expect(screen.getAllByRole("button")).toHaveLength(2);
});

test("prints a single name past the cap rather than counting it", () => {
  render(<DeliveryReceipt recipients={FOLLOWERS.slice(0, 2)} />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(
    screen.getByText(
      "Reached Senior Web and Mobile App Engineer and Senior Backend Engineer (every message), who both answered",
    ),
  ).toBeTruthy();
});

test("draws no button when every name fits under the cap", () => {
  render(<DeliveryReceipt recipients={FOLLOWERS.slice(0, 1)} />);
  expect(screen.queryByRole("button")).toBeNull();
  render(<DeliveryReceipt recipients={FOLLOWERS} max={Infinity} />);
  expect(screen.queryByRole("button")).toBeNull();
});

test("refuses a cap that is not a whole number of at least 1", () => {
  expect(() => render(<DeliveryReceipt recipients={FOLLOWERS} max={0} />)).toThrow(RangeError);
  expect(() => render(<DeliveryReceipt recipients={FOLLOWERS} max={1.5} />)).toThrow(RangeError);
});

test("a capped receipt carries no axe violation", async () => {
  const { container } = render(<DeliveryReceipt recipients={FOLLOWERS} />);
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
