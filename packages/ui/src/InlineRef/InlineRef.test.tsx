/** A reference inside a sentence: its mark, its words, and a link only where the address is safe. */
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import { InlineRef } from "./index.js";

afterEach(cleanup);

const here = dirname(fileURLToPath(import.meta.url));
const css = (file: string) => readFileSync(resolve(here, file), "utf8");
/** One rule's body, by its exact selector. */
const rule = (sheet: string, selector: string) => {
  const at = sheet.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return sheet.slice(at, sheet.indexOf("}", at));
};

test("a link leaving the application opens a tab, withholds the opener and says so after its words", () => {
  render(
    <p>
      Fixed in{" "}
      <InlineRef href="https://github.com/gophrase/backend/pull/14" mark={<svg data-testid="mark" />} kind="GitHub" code>
        gophrase/backend#14
      </InlineRef>
    </p>,
  );
  const link = screen.getByRole("link");
  // What a screen reader hears, in order: the app, the words, the tab. (A
  // browser keeps the space after "GitHub:", which the hidden text holds as
  // `pre`; jsdom's name computation trims it, so the order is read here.)
  expect(link.textContent).toBe("GitHub: gophrase/backend#14 (opens in a new tab)");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  expect(link.className).toContain("crewlet-inline-ref--code");
});

test("its name holds its visible words: nothing replaces them, and the mark is decoration", () => {
  render(
    <InlineRef
      href="https://gophrase.slack.com/archives/C1/p1"
      kind="Slack"
      title="https://gophrase.slack.com/archives/C1/p1"
      mark={<svg data-testid="mark" />}
    >
      Message in gophrase
    </InlineRef>,
  );
  const link = screen.getByRole("link");
  expect(link.textContent).toBe("Slack: Message in gophrase (opens in a new tab)");
  // WCAG 2.5.3: an aria-label would replace the words a voice user says.
  expect(link.getAttribute("aria-label")).toBeNull();
  expect(link.getAttribute("title")).toBe("https://gophrase.slack.com/archives/C1/p1");
  expect(screen.getByTestId("mark").parentElement?.getAttribute("aria-hidden")).toBe("true");
});

test("an app route opens in place, as the application, and says nothing of a tab", () => {
  render(
    <InlineRef href="#/worklet/GP-66" kind="Task">
      GP-66
    </InlineRef>,
  );
  const link = screen.getByRole("link");
  expect(link.textContent).toBe("Task: GP-66");
  expect(link.getAttribute("target")).toBeNull();
  expect(link.getAttribute("rel")).toBeNull();
});

test("an address no browser should follow is drawn as words, never as a link", () => {
  for (const href of ["javascript:alert(1)", " java\tscript:alert(1)", "data:text/html,x", "vbscript:x"]) {
    const { container, unmount } = render(<InlineRef href={href}>gophrase/backend#14</InlineRef>);
    expect(container.querySelector("a"), href).toBeNull();
    expect(container.textContent).toBe("gophrase/backend#14");
    unmount();
  }
});

test("the mark never parts from the first word, and a phrase wraps after it", () => {
  const { container } = render(
    <InlineRef href="https://x.atlassian.net/wiki/p" mark={<svg />} wrap>
      the brand token specification
    </InlineRef>,
  );
  const head = container.querySelector(".crewlet-inline-ref__head")!;
  expect(head.querySelector(".crewlet-inline-ref__mark")).not.toBeNull();
  expect(head.querySelector(".crewlet-inline-ref__text")?.textContent).toBe("the");
  expect(container.querySelector("a")?.className).toContain("crewlet-inline-ref--wrap");
  // A token that is not a phrase is one head, whole.
  const token = render(<InlineRef mark={<svg />}>gophrase/backend#14</InlineRef>).container;
  expect(token.querySelector(".crewlet-inline-ref__head .crewlet-inline-ref__text")?.textContent).toBe(
    "gophrase/backend#14",
  );
  // The rules that make it so: the head never breaks, and a token never does.
  const sheet = css("InlineRef.css");
  expect(rule(sheet, ".crewlet-inline-ref__head")).toContain("white-space: nowrap");
  expect(rule(sheet, ".crewlet-inline-ref")).toContain("white-space: nowrap");
});

test("a copy carries the words alone: the mark, the face and what only a screen reader hears are left out", () => {
  const sheet = css("InlineRef.css");
  expect(rule(sheet, ".crewlet-inline-ref__mark")).toContain("user-select: none");
  expect(rule(sheet, ".crewlet-inline-ref__said")).toContain("user-select: none");
});

test("a reference reads in the ink around it unless it is a link, and its code at InlineCode's size", () => {
  const sheet = css("InlineRef.css");
  expect(rule(sheet, ".crewlet-inline-ref")).toContain("color: inherit");
  const size = (from: string) => /--crewlet-inline-code-size:\s*([^;]+);/.exec(from)?.[1];
  expect(size(sheet)).toBe(size(css("../InlineCode/InlineCode.css")));
  expect(rule(sheet, ".crewlet-inline-ref--code .crewlet-inline-ref__text")).toContain(
    "font-size: var(--crewlet-inline-code-size)",
  );
});

test("every mark stands in one square centred on the line, its drawing a block filling it", () => {
  const sheet = css("InlineRef.css");
  const mark = rule(sheet, ".crewlet-inline-ref__mark");
  expect(mark).toContain("display: inline-block");
  const box = rule(sheet, ".crewlet-inline-ref__mark--glyph");
  expect(box).toContain("width: 0.85em");
  expect(box).toContain("height: 0.85em");
  expect(rule(sheet, ".crewlet-inline-ref .crewlet-inline-ref__mark--glyph > *")).toContain(
    "display: block",
  );
});

// NO CLIP ON A GLYPH'S SQUARE, AND A DRAWING THAT IS A BLOCK WHATEVER IT IS. A
// vendor mark draws itself `inline-block` at one class, which at one class of
// ours won by coming later: the square then held a line box, its baseline
// came from the drawing, and only a clip kept it in place, which cut the
// GitHub mark's right edge. With the drawing a block the square holds no line
// box and its baseline is its bottom edge, clip or not (measured in Chromium
// at 13 to 16px: every mark's centre unchanged to a thousandth of a pixel).
//
// Mutation: put the clip back on the glyph's square, or the drawing rule
// back at one class, and this fails.
test("a glyph's square clips nothing, and its drawing outranks the drawing's own display", () => {
  const sheet = css("InlineRef.css");
  for (const selector of [".crewlet-inline-ref__mark", ".crewlet-inline-ref__mark--glyph"]) {
    expect(rule(sheet, selector), selector).not.toMatch(/overflow/);
  }
  // A FACE IS INLINE, and keeps the clip that bottoms its baseline.
  expect(rule(sheet, ".crewlet-inline-ref__mark--face")).toContain("overflow: hidden");
  const classes = (selector: string) => (selector.match(/\.[\w-]+/g) ?? []).length;
  const ours = ".crewlet-inline-ref .crewlet-inline-ref__mark--glyph > *";
  const theirs = /(^|\n)(\.crewlet-vendor-mark) \{[^}]*display:\s*inline-block/.exec(
    css("../../../icons/src/VendorMark.css"),
  );
  expect(theirs, "VendorMark.css draws the mark inline-block").not.toBeNull();
  expect(classes(ours)).toBeGreaterThan(classes(theirs![2]!));
});

// A SMALLER MARK, CLOSER TO ITS WORDS, ON THE SAME CENTRE: shrinking the square
// from its bottom edge would sink every mark below the words it stood beside,
// so its centre stays 0.375em above the baseline, where the full-size square's
// was. Measured in Chromium at 12, 14 and 22px: every mark's centre within a
// quarter pixel of the words' and no line box taller.
// A MARK STANDS A LITTLE LOWER THAN THE MIDDLE OF A CAPITAL, at the middle of
// the lower-case words its references are mostly written in: its centre 0.275em
// above the baseline, a tenth of an em below the 0.375em it stood at, one to
// two pixels at the dashboard's 13 to 16px.
test("a mark stands 0.15em from its words, centred 0.275em above the baseline", () => {
  const sheet = css("InlineRef.css");
  expect(rule(sheet, ".crewlet-inline-ref__mark")).toContain("margin-inline-end: 0.15em");
  const box = rule(sheet, ".crewlet-inline-ref__mark--glyph");
  const em = (prop: string) => Number(new RegExp(`${prop}:\\s*(-?[\\d.]+)em`).exec(box)?.[1]);
  expect(em("vertical-align") + em("height") / 2).toBeCloseTo(0.275, 5);
});
