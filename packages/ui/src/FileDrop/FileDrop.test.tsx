/**
 * Where files are dropped: a picker always beside the target, files and
 * walked folders answered with their paths, a drag that is not files left
 * alone, and an overlay over a region only while files are held over it.
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axe from "axe-core";
import { afterEach, expect, test, vi } from "vitest";
import {
  FileDrop,
  FilePickButton,
  droppedFiles,
  pickedFiles,
  type PickedFile,
} from "./index.js";

afterEach(cleanup);

const file = (name: string, text = "x") =>
  new File([text], name, { type: "text/plain" });

/** A drop's data the way a browser without the entries API hands it over. */
function flat(...files: File[]): DataTransfer {
  return { types: ["Files"], files, items: [] } as unknown as DataTransfer;
}

/** A folder as the entries API presents it, read in two batches. */
function folderDrop(): DataTransfer {
  const leaf = (path: string) => ({
    isFile: true,
    isDirectory: false,
    name: path.split("/").pop()!,
    fullPath: `/${path}`,
    file: (ok: (f: File) => void) => ok(file(path.split("/").pop()!)),
  });
  const css = {
    isFile: false,
    isDirectory: true,
    name: "css",
    fullPath: "/site/css",
    createReader: reader([[leaf("site/css/main.css")]]),
  };
  const site = {
    isFile: false,
    isDirectory: true,
    name: "site",
    fullPath: "/site",
    createReader: reader([[leaf("site/index.html")], [css]]),
  };
  return {
    types: ["Files"],
    files: [],
    items: [{ kind: "file", webkitGetAsEntry: () => site }],
  } as unknown as DataTransfer;
}

function reader(batches: unknown[][]) {
  return () => {
    const left = [...batches, []];
    return {
      readEntries: (ok: (e: unknown[]) => void) => ok(left.shift() ?? []),
    };
  };
}

test("a flat drop answers each file under its name", async () => {
  const out = await droppedFiles(flat(file("index.html"), file("app.js")));
  expect(out.map((f) => f.path)).toEqual(["index.html", "app.js"]);
});

test("a dropped folder is walked, every batch, with its paths", async () => {
  const out = await droppedFiles(folderDrop());
  expect(out.map((f) => f.path)).toEqual([
    "site/index.html",
    "site/css/main.css",
  ]);
});

test("a picked folder keeps each file’s relative path", () => {
  const f = file("main.css");
  Object.defineProperty(f, "webkitRelativePath", {
    value: "site/css/main.css",
  });
  expect(pickedFiles([f] as unknown as FileList).map((p) => p.path)).toEqual([
    "site/css/main.css",
  ]);
});

test("the target draws its title, hint and picker, and a drop calls onFiles", async () => {
  const onFiles = vi.fn<(files: PickedFile[]) => void>();
  const { container } = render(
    <FileDrop
      title="Drop an HTML file or a folder"
      hint="Pages, stylesheets, scripts and pictures"
      onFiles={onFiles}
      actions={
        <FilePickButton size="small" onFiles={onFiles}>
          Choose files
        </FilePickButton>
      }
    />,
  );
  expect(screen.getByText("Drop an HTML file or a folder")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Choose files" })).toBeTruthy();
  const target = container.firstElementChild as HTMLElement;
  fireEvent.drop(target, { dataTransfer: flat(file("index.html")) });
  await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
  expect(onFiles.mock.calls[0]![0].map((f) => f.path)).toEqual(["index.html"]);
});

test("a region shows its overlay only while files are held over it", () => {
  const { container } = render(
    <FileDrop title="Drop to replace the source" onFiles={() => {}}>
      <textarea aria-label="Source" />
    </FileDrop>,
  );
  const region = container.firstElementChild as HTMLElement;
  expect(container.querySelector(".crewlet-file-drop__overlay")).toBeNull();
  fireEvent.dragEnter(region, { dataTransfer: { types: ["text/plain"] } });
  expect(container.querySelector(".crewlet-file-drop__overlay")).toBeNull();
  fireEvent.dragEnter(region, { dataTransfer: { types: ["Files"] } });
  fireEvent.dragEnter(screen.getByLabelText("Source"), {
    dataTransfer: { types: ["Files"] },
  });
  fireEvent.dragLeave(screen.getByLabelText("Source"), {
    dataTransfer: { types: ["Files"] },
  });
  expect(
    container
      .querySelector(".crewlet-file-drop__overlay")
      ?.getAttribute("aria-hidden"),
  ).toBe("true");
  fireEvent.dragLeave(region, { dataTransfer: { types: ["Files"] } });
  expect(container.querySelector(".crewlet-file-drop__overlay")).toBeNull();
});

test("a disabled target takes no drop", () => {
  const onFiles = vi.fn();
  const { container } = render(
    <FileDrop title="Drop files" onFiles={onFiles} disabled />,
  );
  fireEvent.drop(container.firstElementChild as HTMLElement, {
    dataTransfer: flat(file("a.html")),
  });
  expect(onFiles).not.toHaveBeenCalled();
});

test("the picker hands over what the input picked, and picking again works", () => {
  const onFiles = vi.fn();
  const { container } = render(
    <FilePickButton onFiles={onFiles} accept=".html">
      Choose files
    </FilePickButton>,
  );
  const input = container.querySelector("input[type=file]") as HTMLInputElement;
  expect(input.getAttribute("accept")).toBe(".html");
  expect(input.tabIndex).toBe(-1);
  fireEvent.change(input, { target: { files: [file("index.html")] } });
  expect(onFiles.mock.calls[0]![0].map((f: PickedFile) => f.path)).toEqual([
    "index.html",
  ]);
});

test("a folder picker asks the input for a directory", () => {
  const { container } = render(
    <FilePickButton onFiles={() => {}} directory>
      Choose a folder
    </FilePickButton>,
  );
  expect(
    container
      .querySelector("input[type=file]")
      ?.hasAttribute("webkitdirectory"),
  ).toBe(true);
});

test("it has no detectable accessibility violations", async () => {
  const { container } = render(
    <FileDrop
      title="Drop an HTML file or a folder"
      onFiles={() => {}}
      actions={<FilePickButton onFiles={() => {}}>Choose files</FilePickButton>}
    />,
  );
  const results = await axe.run(container);
  expect(results.violations).toEqual([]);
});
