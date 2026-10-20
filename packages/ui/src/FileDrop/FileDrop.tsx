import {
  forwardRef,
  useRef,
  useState,
  type DragEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Button, type ButtonProps } from "../Button/index.js";
import { cx } from "../utils/cx.js";

/** A file the person brought, and where it sits in what they brought. */
export interface PickedFile {
  /**
   * Its path inside what was brought, with forward slashes: the file's name
   * alone for loose files, `site/css/main.css` for a file inside a folder.
   */
  path: string;
  file: File;
}

/** The narrowest shape of the entries API a drop hands over, as the browsers ship it. */
interface DropEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file?: (ok: (file: File) => void, fail: (error: unknown) => void) => void;
  createReader?: () => {
    readEntries: (
      ok: (entries: DropEntry[]) => void,
      fail: (error: unknown) => void,
    ) => void;
  };
}

/** A path as this primitive answers one: forward slashes, no leading slash. */
function clean(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Every file under one dropped entry, depth first. */
async function walk(entry: DropEntry, out: PickedFile[]): Promise<void> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((ok, fail) => entry.file!(ok, fail));
    out.push({ path: clean(entry.fullPath || entry.name), file });
    return;
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    // A reader answers in batches (a hundred at a time in Chrome) until an empty one.
    for (;;) {
      const batch = await new Promise<DropEntry[]>((ok, fail) =>
        reader.readEntries(ok, fail),
      );
      if (batch.length === 0) break;
      for (const child of batch) await walk(child, out);
    }
  }
}

/**
 * The files a drop carries, folders walked. Read from the entries API where the
 * browser offers it (the only way a dropped folder's contents are reachable),
 * else from the drop's flat file list.
 */
export async function droppedFiles(data: DataTransfer): Promise<PickedFile[]> {
  const entries: DropEntry[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue;
    const entry = (
      item as DataTransferItem & { webkitGetAsEntry?: () => DropEntry | null }
    ).webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  if (entries.length === 0) {
    return Array.from(data.files ?? []).map((file) => ({
      path: clean(file.name),
      file,
    }));
  }
  const out: PickedFile[] = [];
  for (const entry of entries) await walk(entry, out);
  return out;
}

/** The files an input picked, under their folder path when a folder was picked. */
export function pickedFiles(list: FileList | null): PickedFile[] {
  return Array.from(list ?? []).map((file) => ({
    path: clean(
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name,
    ),
    file,
  }));
}

/** Whether a drag carries files, rather than text or a link being moved. */
function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export interface FilePickButtonProps extends Omit<
  ButtonProps,
  "onClick" | "children"
> {
  onFiles: (files: PickedFile[]) => void;
  /** File types the picker offers, as the input's `accept` takes them. */
  accept?: string | undefined;
  /** Pick a whole folder rather than files. */
  directory?: boolean;
  /** Allow more than one file. Ignored for a folder, which is always many. */
  multiple?: boolean;
  children: ReactNode;
}

/**
 * A button that opens the system's file picker: the keyboard's and the
 * screen reader's way to bring files, always offered beside a drop target.
 */
export const FilePickButton = forwardRef<
  HTMLButtonElement,
  FilePickButtonProps
>(function FilePickButton(
  { onFiles, accept, directory = false, multiple = true, children, ...rest },
  ref,
) {
  const input = useRef<HTMLInputElement>(null);
  const folder: InputHTMLAttributes<HTMLInputElement> = directory
    ? ({
        webkitdirectory: "",
        directory: "",
      } as InputHTMLAttributes<HTMLInputElement>)
    : {};
  return (
    <>
      <Button ref={ref} {...rest} onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        className="crewlet-file-drop__input"
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        multiple={directory || multiple}
        onChange={(event) => {
          const files = pickedFiles(event.currentTarget.files);
          // Cleared, so picking the same file again is a change the input reports.
          event.currentTarget.value = "";
          if (files.length > 0) onFiles(files);
        }}
        {...folder}
      />
    </>
  );
});

export interface FileDropProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onDrop" | "title"
> {
  onFiles: (files: PickedFile[]) => void;
  /**
   * The region the files may be dropped on. Without it, the primitive draws
   * its own target: a framed area holding `title`, `hint` and `actions`.
   */
  children?: ReactNode;
  /** The target's heading, and what the overlay says while files are over it. */
  title: ReactNode;
  /** One line under the title: what may be brought. */
  hint?: ReactNode;
  /** The pickers, usually one or two `FilePickButton`s. Drawn in the target. */
  actions?: ReactNode;
  disabled?: boolean;
}

/**
 * Where files are dropped: a target of its own, or any region (an editor, a
 * pane) that takes files dropped on it, with an overlay saying so while files
 * are held over it. Folders are walked.
 *
 * DROPPING IS NEVER THE ONLY WAY. A drop is a pointer gesture, so the target
 * always carries a picker (`actions`, with `FilePickButton`), and a region
 * that wraps content is expected to offer one nearby. The overlay is hidden
 * from assistive technology; the consumer announces what arrived.
 *
 * A DRAG THAT IS NOT FILES (text being moved inside an editor) passes through
 * untouched, and the overlay is counted in and out per element so a drag
 * crossing children does not flicker it.
 */
export const FileDrop = forwardRef<HTMLDivElement, FileDropProps>(
  function FileDrop(
    {
      onFiles,
      children,
      title,
      hint,
      actions,
      disabled = false,
      className,
      ...rest
    },
    ref,
  ) {
    const [over, setOver] = useState(false);
    const depth = useRef(0);
    const region = children !== undefined;

    const enter = (event: DragEvent<HTMLDivElement>) => {
      if (disabled || !carriesFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setOver(true);
    };
    const leave = (event: DragEvent<HTMLDivElement>) => {
      if (disabled || !carriesFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    const overIt = (event: DragEvent<HTMLDivElement>) => {
      if (disabled || !carriesFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    const drop = (event: DragEvent<HTMLDivElement>) => {
      if (disabled || !carriesFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setOver(false);
      void droppedFiles(event.dataTransfer).then((files) => {
        if (files.length > 0) onFiles(files);
      });
    };

    return (
      <div
        ref={ref}
        className={cx(
          "crewlet-file-drop",
          region ? "is-region" : "is-target",
          over && "is-over",
          disabled && "is-disabled",
          className,
        )}
        onDragEnter={enter}
        onDragLeave={leave}
        onDragOver={overIt}
        onDrop={drop}
        {...rest}
      >
        {region ? (
          <>
            {children}
            {over ? (
              <div className="crewlet-file-drop__overlay" aria-hidden="true">
                <span className="crewlet-file-drop__title">{title}</span>
                {hint ? (
                  <span className="crewlet-file-drop__hint">{hint}</span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <span className="crewlet-file-drop__title">{title}</span>
            {hint ? (
              <span className="crewlet-file-drop__hint">{hint}</span>
            ) : null}
            {actions ? (
              <div className="crewlet-file-drop__actions">{actions}</div>
            ) : null}
          </>
        )}
      </div>
    );
  },
);
