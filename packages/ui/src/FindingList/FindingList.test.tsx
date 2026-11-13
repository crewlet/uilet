/**
 * What a checker found: refusals before advice, each tone said in words, and
 * a row that goes somewhere is a button.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

test("a compact list sets its rows a small step apart, a static row on the list's edge", () => {
  const { container, rerender } = render(
    <FindingList label="Problems" findings={findings} />,
  );
  const list = () => container.querySelector(".crewlet-finding-list")!;
  expect(list().className).not.toContain("crewlet-finding-list--compact");
  rerender(
    <FindingList label="Problems" findings={findings} density="compact" />,
  );
  expect(list().className).toContain("crewlet-finding-list--compact");
  const css = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "FindingList.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, " ");
  const rows =
    /\.crewlet-finding-list--compact \.crewlet-finding-list__row\s*\{([^}]*)\}/.exec(
      css,
    )?.[1] ?? "";
  expect(rows).toMatch(/padding-block:\s*var\(--spacing-1\)/);
  // Only a row that goes nowhere gives up its sides: a button keeps its hover ground.
  const still =
    /\.crewlet-finding-list--compact div\.crewlet-finding-list__row\s*\{([^}]*)\}/.exec(
      css,
    )?.[1] ?? "";
  expect(still).toMatch(/padding-inline:\s*0/);
  // Its words take the size and leading of the passage it stands in.
  const message =
    /\.crewlet-finding-list--compact \.crewlet-finding-list__message\s*\{([^}]*)\}/.exec(
      css,
    )?.[1] ?? "";
  expect(message).toMatch(/font-size:\s*inherit/);
  expect(message).toMatch(/line-height:\s*inherit/);
});

test("it has no detectable accessibility violations", async () => {
  const { container } = render(
    <FindingList label="Problems" findings={findings} />,
  );
  expect((await axe.run(container)).violations).toEqual([]);
});
