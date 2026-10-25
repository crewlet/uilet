import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { FileTextGlyph, ImageGlyph } from '@crewlethq/icons/glyphs';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/** One file in a list. */
export interface FileListItem {
  /** What tells two files apart, unique within the list. */
  id: string;
  /** The file's name, as it will be saved. */
  name: string;
  /** What the file is, in words: "PNG image", "CSV file". */
  type: string;
  /** How large it is, already formatted: "120 KB". */
  size: string;
  /**
   * The address of an image to preview it from, or nothing for no preview.
   *
   * DRAWN ONLY AS AN `<img>`. An image element renders a picture and runs no
   * script, so a preview of an SVG that carries one is still only a picture.
   * The primitive never draws a file's markup inline and never embeds it in
   * a frame or an object. A preview that fails to load falls back to the
   * file's mark.
   */
  preview?: string | undefined;
  /** The file's control at the row's end, usually a `DownloadButton`. */
  action?: ReactNode;
}

export interface FileListProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  files: readonly FileListItem[];
  /** Names the list for a screen reader: "Files". REQUIRED, since a list of files has no heading of its own. */
  label: string;
}

/** A file's row: its mark, its name over its type and size, its action, and the preview under them. */
function FileRow({ file }: { file: FileListItem }) {
  const [broken, setBroken] = useState(false);
  const preview = file.preview !== undefined && file.preview !== '' && !broken ? file.preview : undefined;
  return (
    <li className="crewlet-file-list__file">
      <div className="crewlet-file-list__row">
        <span className="crewlet-file-list__mark" aria-hidden="true">
          {file.preview === undefined ? <FileTextGlyph size="sm" /> : <ImageGlyph size="sm" />}
        </span>
        <span className="crewlet-file-list__text">
          <span className="crewlet-file-list__name" title={file.name}>
            {file.name}
          </span>
          <span className="crewlet-file-list__meta">
            {file.type}
            <VisuallyHidden>,</VisuallyHidden>
            <span aria-hidden="true"> · </span>
            {file.size}
          </span>
        </span>
        {file.action === undefined || file.action === null ? null : (
          <span className="crewlet-file-list__action">{file.action}</span>
        )}
      </div>
      {preview === undefined ? null : (
        <div className="crewlet-file-list__preview">
          <img
            src={preview}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setBroken(true)}
          />
        </div>
      )}
    </li>
  );
}

/**
 * Files handed to the reader: each with its name, what it is, how large it is
 * and its download, and an image with a preview under its row.
 *
 * A PREVIEW IS ONLY EVER A PICTURE. It is an `<img>` with no alternative text
 * of its own (the row's name already names it) and no referrer, so an SVG
 * delivered by a run is drawn without running anything it carries, and a
 * file's markup never reaches the page as markup.
 *
 * AN UNORDERED LIST named by `label`, one item per file, so a reader hears how
 * many there are before the first.
 */
export function FileList({ files, label, className, ...rest }: FileListProps) {
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.id)) throw new RangeError(`FileList file ids must be unique; "${file.id}" is used twice`);
    seen.add(file.id);
  }
  return (
    /* The role is restated for WebKit, which drops it from a list with no markers. */
    /* eslint-disable-next-line jsx-a11y/no-redundant-roles */
    <ul {...rest} role="list" aria-label={label} className={cx('crewlet-file-list', className)}>
      {files.map((file) => (
        <FileRow key={file.id} file={file} />
      ))}
    </ul>
  );
}
