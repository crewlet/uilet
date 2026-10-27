/** A record inside a sentence: a chip named by its key and its name, opening a named peek. */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { RecordChip, RecordChipList } from "./index.js";

afterEach(cleanup);

test("is a button named by the key it shows and the record's name", () => {
  render(
    <p>
      <RecordChip
        code="GOP-11"
        title="Android 12 crash when lesson audio starts"
      />{" "}
      asks to hold the beta.
    </p>,
  );
  const chip = screen.getByRole("button", {
    name: "GOP-11, Android 12 crash when lesson audio starts",
  });
  expect(chip.textContent).toBe("GOP-11");
  expect(chip.getAttribute("aria-expanded")).toBe("false");
});

test("a chip whose label is the name is named once", () => {
  render(<RecordChip label="QA" title="QA" />);
  expect(screen.getByRole("button", { name: "QA" })).toBeTruthy();
});

test("opens a peek dialog named after the record, with its facts and its way there", () => {
  render(
    <RecordChip
      code="GOP-11"
      title="Android 12 crash when lesson audio starts"
      meta="Task · In progress"
      actions={<a href="#/work/GOP-11">Open task</a>}
    >
      <p>Assigned to Senior SWE, Mobile.</p>
    </RecordChip>,
  );
  fireEvent.click(screen.getByRole("button", { name: /GOP-11/ }));
  const peek = screen.getByRole("dialog", {
    name: "GOP-11 Android 12 crash when lesson audio starts",
  });
  expect(peek.textContent).toContain("Task · In progress");
  expect(peek.textContent).toContain("Assigned to Senior SWE, Mobile.");
  expect(
    screen.getByRole("link", { name: "Open task" }).getAttribute("href"),
  ).toBe("#/work/GOP-11");
});

test("Escape closes the peek and hands focus back to the chip", async () => {
  render(
    <RecordChip
      code="GOP-11"
      title="Android 12 crash"
      actions={<a href="#/worklet/GOP-11">Open task</a>}
    />,
  );
  const chip = screen.getByRole("button", { name: /GOP-11/ });
  chip.focus();
  fireEvent.click(chip);
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(chip));
});

test("an Also read line is a list named by its lead, one item per chip", () => {
  render(
    <RecordChipList label="Also read">
      <RecordChip key="a" code="GOP-2" title="Daily lesson flow" />
      <RecordChip key="b" label="QA" title="QA" />
    </RecordChipList>,
  );
  const list = screen.getByRole("list", { name: "Also read" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(
    within(list).getByRole("button", { name: "GOP-2, Daily lesson flow" }),
  ).toBeTruthy();
});

test("an Also read line with nothing in it draws nothing", () => {
  const { container } = render(
    <RecordChipList label="Also read">{[]}</RecordChipList>,
  );
  expect(container.innerHTML).toBe("");
});

test("opening the peek moves focus into it", async () => {
  render(
    <RecordChip
      code="GOP-11"
      title="Android 12 crash"
      actions={<a href="#/worklet/GOP-11">Open task</a>}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /GOP-11/ }));
  const peek = screen.getByRole("dialog");
  await waitFor(() => expect(peek.contains(document.activeElement)).toBe(true));
});

test("a press outside closes the peek", async () => {
  render(
    <div>
      <p data-testid="outside">Elsewhere in the answer.</p>
      <RecordChip code="GOP-11" title="Android 12 crash" />
    </div>,
  );
  fireEvent.click(screen.getByRole("button", { name: /GOP-11/ }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  const outside = screen.getByTestId("outside");
  fireEvent.pointerDown(outside);
  fireEvent.mouseDown(outside);
  fireEvent.click(outside);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("a label chip carries its whole text as its title, a key chip none", () => {
  render(
    <p>
      <RecordChip
        label="Decisions waiting on you this week"
        title="Decisions waiting on you this week"
      />
      <RecordChip code="GOP-11" title="Android 12 crash" />
    </p>,
  );
  expect(
    screen
      .getByRole("button", { name: "Decisions waiting on you this week" })
      .getAttribute("title"),
  ).toBe("Decisions waiting on you this week");
  expect(
    screen.getByRole("button", { name: /GOP-11/ }).hasAttribute("title"),
  ).toBe(false);
});

test("a label chip is named by its label alone, even where the label says more than the record's name", () => {
  render(
    <RecordChip
      label="Decisions waiting on you (8)"
      title="Decisions waiting on you"
    />,
  );
  expect(screen.getByRole("button").getAttribute("aria-label")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Decisions waiting on you (8)" }),
  ).toBeTruthy();
});
