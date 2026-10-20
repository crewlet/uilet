/**
 * Source text written in place: a named textarea with its keyboard described,
 * a gutter that numbers every line, marks on the lines a checker named, Tab
 * that indents until Escape gives it back, and a line revealed on request.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import axe from "axe-core";
import { createRef, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  SOURCE_EDITOR_KEYS,
  SourceEditor,
  lineStart,
  type SourceEditorHandle,
  type SourceMark,
} from "./index.js";

afterEach(cleanup);

function Harness({
  initial = "",
  marks,
  onSubmit,
  handle,
}: {
  initial?: string;
  marks?: SourceMark[];
  onSubmit?: () => void;
  handle?: React.Ref<SourceEditorHandle>;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SourceEditor
      {...(handle ? { ref: handle } : {})}
      label="Page source"
      value={value}
      onChange={setValue}
      {...(marks ? { marks } : {})}
      {...(onSubmit ? { onSubmit } : {})}
    />
  );
}

const field = () =>
  screen.getByRole("textbox", { name: "Page source" }) as HTMLTextAreaElement;
const numbers = (container: HTMLElement) =>
  [...container.querySelectorAll(".crewlet-source-editor__number")].map(
    (n) => n.textContent,
  );

test("the field is named, described by its keys, and never wraps or corrects", () => {
  render(<Harness />);
  const el = field();
  expect(el.getAttribute("wrap")).toBe("off");
  expect(el.getAttribute("spellcheck")).toBe("false");
  expect(el.getAttribute("autocapitalize")).toBe("off");
  const described = document.getElementById(
    el.getAttribute("aria-describedby")!.split(" ")[0]!,
  );
  expect(described?.textContent).toBe(SOURCE_EDITOR_KEYS);
});

test("the gutter numbers every line and follows the text", () => {
  const { container } = render(<Harness initial={"<p>\n  one\n</p>"} />);
  expect(numbers(container)).toEqual(["1", "2", "3"]);
  fireEvent.change(field(), { target: { value: "a\nb\nc\nd" } });
  expect(numbers(container)).toEqual(["1", "2", "3", "4"]);
  expect(
    container
      .querySelector(".crewlet-source-editor__gutter")
      ?.getAttribute("aria-hidden"),
  ).toBe("true");
});

test("a mark colours its line; a refusal outranks advice and marks the field invalid", () => {
  const { container } = render(
    <Harness
      initial={"a\nb\nc"}
      marks={[
        { line: 2, tone: "warning", message: "No viewport meta" },
        { line: 2, tone: "danger", message: "A script from another origin" },
        { line: 3, tone: "warning" },
        { line: 9, tone: "danger" },
      ]}
    />,
  );
  const [, two, three] = container.querySelectorAll(
    ".crewlet-source-editor__number",
  );
  expect(two?.className).toContain("is-danger");
  expect(two?.getAttribute("title")).toBe("A script from another origin");
  expect(three?.className).toContain("is-warning");
  expect(
    container.querySelectorAll(".crewlet-source-editor__mark"),
  ).toHaveLength(2);
  expect(field().getAttribute("aria-invalid")).toBe("true");
});

test("advice alone does not mark the field invalid", () => {
  render(<Harness initial="a" marks={[{ line: 1, tone: "warning" }]} />);
  expect(field().hasAttribute("aria-invalid")).toBe(false);
});

test("Tab indents to the next stop and Shift+Tab outdents the line", () => {
  render(<Harness initial="x" />);
  const el = field();
  el.setSelectionRange(0, 0);
  fireEvent.keyDown(el, { key: "Tab" });
  expect(el.value).toBe("  x");
  el.setSelectionRange(3, 3);
  fireEvent.keyDown(el, { key: "Tab", shiftKey: true });
  expect(el.value).toBe("x");
  expect(el.selectionStart).toBe(1);
});

test("Tab over a selection indents every line it touches", () => {
  render(<Harness initial={"a\nb\nc"} />);
  const el = field();
  el.setSelectionRange(0, 3);
  fireEvent.keyDown(el, { key: "Tab" });
  expect(el.value).toBe("  a\n  b\nc");
});

test("Escape gives Tab back to the page for one press", () => {
  render(<Harness initial="x" />);
  const el = field();
  fireEvent.keyDown(el, { key: "Escape" });
  const leaving = fireEvent.keyDown(el, { key: "Tab" });
  expect(leaving).toBe(true);
  expect(el.value).toBe("x");
  el.setSelectionRange(0, 0);
  const indenting = fireEvent.keyDown(el, { key: "Tab" });
  expect(indenting).toBe(false);
  expect(el.value).toBe("  x");
});

test("Enter keeps the indent of the line it breaks", () => {
  render(<Harness initial="    <li>" />);
  const el = field();
  el.setSelectionRange(8, 8);
  fireEvent.keyDown(el, { key: "Enter" });
  expect(el.value).toBe("    <li>\n    ");
});

test("Command+Enter and Control+Enter submit", () => {
  const onSubmit = vi.fn();
  render(<Harness onSubmit={onSubmit} />);
  fireEvent.keyDown(field(), { key: "Enter", metaKey: true });
  fireEvent.keyDown(field(), { key: "Enter", ctrlKey: true });
  expect(onSubmit).toHaveBeenCalledTimes(2);
});

test("revealLine focuses the field with the caret at the line start", () => {
  const handle = createRef<SourceEditorHandle>();
  render(<Harness initial={"one\ntwo\nthree"} handle={handle} />);
  act(() => handle.current!.revealLine(3));
  expect(document.activeElement).toBe(field());
  expect(field().selectionStart).toBe(8);
});

test("lineStart counts lines from one and clamps past the end", () => {
  expect(lineStart("a\nbc\nd", 1)).toBe(0);
  expect(lineStart("a\nbc\nd", 3)).toBe(5);
  expect(lineStart("a\nbc\nd", 9)).toBe(6);
});

test("it has no detectable accessibility violations", async () => {
  const { container } = render(
    <Harness initial={"<p>hello</p>"} marks={[{ line: 1, tone: "danger" }]} />,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
