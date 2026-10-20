/**
 * What a checker found: refusals before advice, each tone said in words, and
 * a row that goes somewhere is a button.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, test, vi } from "vitest";
import { FindingList, type Finding } from "./index.js";

afterEach(cleanup);

const findings: Finding[] = [
  {
    key: "w",
    tone: "warning",
    location: "index.html",
    message: "The page has no viewport meta.",
  },
  {
    key: "d",
    tone: "danger",
    location: "index.html, line 6",
    message: "A script from another origin.",
    onSelect: vi.fn(),
  },
];

test("refusals come before advice, each tone said in words", () => {
  render(<FindingList label="Problems in the page" findings={findings} />);
  const list = screen.getByRole("list", { name: "Problems in the page" });
  const items = list.querySelectorAll("li");
  expect(items[0]?.textContent).toContain(
    "Problem: A script from another origin.",
  );
  expect(items[1]?.textContent).toContain(
    "Advice: The page has no viewport meta.",
  );
});

test("a row that goes somewhere is a button, and one that does not is text", () => {
  render(<FindingList label="Problems" findings={findings} />);
  const button = screen.getByRole("button");
  expect(button.textContent).toContain("line 6");
  fireEvent.click(button);
  expect(findings[1]!.onSelect).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("button")).toHaveLength(1);
});

test("the tone words can be the consumer’s", () => {
  render(
    <FindingList
      label="Checks"
      findings={findings}
      toneLabels={{ danger: "Refused" }}
    />,
  );
  expect(screen.getByRole("button").textContent).toContain("Refused: ");
});

test("it has no detectable accessibility violations", async () => {
  const { container } = render(
    <FindingList label="Problems" findings={findings} />,
  );
  expect((await axe.run(container)).violations).toEqual([]);
});
