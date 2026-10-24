import { useId, type ReactNode } from 'react';
import { FolderGlyph } from '@crewlethq/icons/glyphs';
import { Card } from '../Card/index.js';
import { cx } from '../utils/cx.js';
import { VisuallyHidden } from '../VisuallyHidden/index.js';

/**
 * What a folder holds that the reader can open: its direct children only,
 * counted from the reader's own view of them. A folder grants nothing, so a
 * reader who can open nothing inside is told so rather than told it is empty.
 */
export interface FolderContents {
  artifacts: number;
  folders: number;
}

export interface FolderContentsLabels {
  /** "12 artifacts", "1 artifact". */
  artifacts: (count: number) => string;
  /** "2 folders", "1 folder". */
  folders: (count: number) => string;
  /** Said when the reader can open nothing inside, which is never "Empty". */
  nothing: string;
}

const CONTENTS: FolderContentsLabels = {
  artifacts: (count) => (count === 1 ? '1 artifact' : `${count} artifacts`),
  folders: (count) => (count === 1 ? '1 folder' : `${count} folders`),
  nothing: 'Nothing you can open yet',
};

/**
 * The line a folder's tile and its list row say about what is inside: "12
 * artifacts · 2 folders", one part alone when the other is none, and "Nothing
 * you can open yet" for neither.
 *
 * ONE PHRASING, EXPORTED, so the grid's tile and the list's name cell
 * (`ArtifactNameCell kind="folder"`, whose `detail` takes this) never say the
 * same count two ways.
 */
export function describeFolderContents(contents: FolderContents, labels?: Partial<FolderContentsLabels>): string {
  const text = { ...CONTENTS, ...labels };
  const parts: string[] = [];
  if (contents.artifacts > 0) parts.push(text.artifacts(contents.artifacts));
  if (contents.folders > 0) parts.push(text.folders(contents.folders));
  return parts.length > 0 ? parts.join(' · ') : text.nothing;
}

export type FolderTileSize = 'tile' | 'row';

export interface FolderTileLabels extends FolderContentsLabels {
  /** What it is, said after its name: the tile draws a folder rather than printing the word. */
  folder: string;
  /** Said when the tile is chosen, since the chosen edge is a picture of it. */
  selected: string;
}

const LABELS: FolderTileLabels = {
  ...CONTENTS,
  folder: 'Folder',
  selected: 'Selected',
};

export interface FolderTileProps {
  name: string;
  /** The folder's page. The whole tile is one real link. */
  href: string;
  /**
   * Who can see the folder, as a glyph and a short word: an
   * `ArtifactAccessLabel` with the folder's own word ("Everyone", "Only you").
   * Read as part of the tile's description.
   */
  visibility?: ReactNode;
  /** What is inside that the reader can open. Left out (still loading), no line is drawn. */
  contents?: FolderContents | undefined;
  /**
   * The tile's own controls (a More menu), drawn OUTSIDE its link at its
   * trailing edge and shown on hover and while focus is inside the tile, so a
   * keyboard reaches them after the link and they are never nested in it.
   */
  actions?: ReactNode;
  /** It is chosen (a selection the host keeps): the selected edge and fill. */
  selected?: boolean | undefined;
  /**
   * Something held over it would land in it: the drop target's edge and fill.
   * Reserved for dragging onto a folder, which the host drives.
   */
  dropTarget?: boolean | undefined;
  /**
   * `tile` is a gallery's (a grid of them, a few across); `row` is the full
   * width, 44px row a phone takes. A tile takes the row's shape on its own
   * under the phone breakpoint.
   */
  size?: FolderTileSize | undefined;
  className?: string | undefined;
  labels?: Partial<FolderTileLabels> | undefined;
}

/**
 * A folder in a gallery: the folder glyph on a neutral tint, the name on one
 * line, who can see it and what is inside, and a More menu.
 *
 * SHORTER THAN AN ARTIFACT'S CARD AND WITH NO PREVIEW, so a folder and an
 * artifact never look alike and the kind's badge keeps its meaning. The tint
 * is neutral for the same reason: a folder is not a kind.
 *
 * THE WHOLE TILE IS ONE LINK, named by the folder's name alone and described
 * by the rest, so a reader moving by link hears "Q3 launch" and then, if they
 * wait, "Folder, Everyone, 12 artifacts · 2 folders". The More menu sits
 * beside the link rather than inside it.
 *
 * ITS COUNT IS THE READER'S OWN. A folder grants nothing on what it holds, so
 * the count is of what this reader can open, and a folder holding only things
 * they cannot open says "Nothing you can open yet", never "Empty".
 */
export function FolderTile({
  name,
  href,
  visibility,
  contents,
  actions,
  selected = false,
  dropTarget = false,
  size = 'tile',
  className,
  labels,
}: FolderTileProps) {
  const text = { ...LABELS, ...labels };
  const nameId = useId();
  const factsId = useId();
  return (
    <Card
      variant="subtle"
      padding="none"
      interactive
      selected={selected}
      className={cx(
        'crewlet-folder-tile',
        `crewlet-folder-tile--${size}`,
        dropTarget && 'is-drop-target',
        actions ? 'crewlet-folder-tile--with-actions' : null,
        className,
      )}
    >
      <a href={href} className="crewlet-folder-tile__link" aria-labelledby={nameId} aria-describedby={factsId}>
        <span className="crewlet-folder-tile__glyph" aria-hidden="true">
          <FolderGlyph size={size === 'row' ? 'md' : 'lg'} />
        </span>
        <span className="crewlet-folder-tile__body">
          <span id={nameId} className="crewlet-folder-tile__name" title={name}>
            {name}
          </span>
          <span id={factsId} className="crewlet-folder-tile__facts">
            {/* THE KIND AND THE PICK ARE SAID, not drawn: the glyph and the
                chosen edge are pictures of them. */}
            <VisuallyHidden>
              {text.folder}
              {selected ? `, ${text.selected}` : ''}
              {visibility || contents ? ', ' : ''}
            </VisuallyHidden>
            {visibility ? <span className="crewlet-folder-tile__visibility">{visibility}</span> : null}
            {contents ? (
              <span className="crewlet-folder-tile__contents" title={describeFolderContents(contents, text)}>
                {visibility ? <VisuallyHidden>, </VisuallyHidden> : null}
                {describeFolderContents(contents, text)}
              </span>
            ) : null}
          </span>
        </span>
      </a>
      {actions ? <span className="crewlet-folder-tile__actions">{actions}</span> : null}
    </Card>
  );
}
