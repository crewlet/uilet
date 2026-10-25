import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  ArtifactAccessLabel,
  ArtifactCard,
  ArtifactNameCell,
  DataGrid,
  FolderTile,
  Menu,
  describeFolderContents,
  type DataGridColumn,
} from '@crewlethq/ui';
import { EllipsisGlyph, FolderInputGlyph, PencilGlyph, TrashGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof FolderTile> = {
  title: 'UI/FolderTile',
  component: FolderTile,
};

export default meta;
type Story = StoryObj<typeof FolderTile>;

const EVERYONE = <ArtifactAccessLabel access="company" label="Everyone" />;
const ONLY_YOU = <ArtifactAccessLabel access="private" label="Only you" />;

/** The More menu a folder page draws beside a tile's link. */
function More({ name }: { name: string }) {
  return (
    <Menu
      label={`More for “${name}”`}
      icon={<EllipsisGlyph size="sm" />}
      triggerVariant="ghost"
      align="end"
      items={[
        { key: 'rename', label: 'Rename', icon: <PencilGlyph size="sm" />, onSelect: () => {} },
        { key: 'move', label: 'Move to…', icon: <FolderInputGlyph size="sm" />, onSelect: () => {} },
        { kind: 'separator', key: 'sep' },
        { key: 'remove', label: 'Remove', icon: <TrashGlyph size="sm" />, danger: true, onSelect: () => {} },
      ]}
    />
  );
}

/**
 * THE FOLDERS TAB: top-level folders four across a laptop's page, in the
 * cards' columns, shorter than an artifact's card and with no preview. Each
 * says who can see it and what the reader can open inside as one quiet run,
 * and a folder holding only things the reader cannot open says so rather than
 * calling itself empty. Where a run is too long for the tile it breaks before
 * the count, and no line opens on a dot.
 */
export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px 20px', maxWidth: 1140 }}>
      <FolderTile name="Marketing" href="#/artifacts/folders/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
      <FolderTile name="Board" href="#/artifacts/folders/2" visibility={EVERYONE} contents={{ artifacts: 0, folders: 0 }} actions={<More name="Board" />} />
      <FolderTile name="Acquisition: Halcyon" href="#/artifacts/folders/3" visibility={ONLY_YOU} contents={{ artifacts: 3, folders: 0 }} actions={<More name="Acquisition: Halcyon" />} />
      <FolderTile
        name="Customer research interviews for the payments platform migration"
        href="#/artifacts/folders/4"
        visibility={EVERYONE}
        contents={{ artifacts: 1, folders: 1 }}
        actions={<More name="Customer research interviews" />}
      />
    </div>
  ),
};

/** Three across at a 1024 page. */
export const ThreeAcross: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', maxWidth: 740 }}>
      <FolderTile name="Marketing" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
      <FolderTile name="Reports" href="#/f/2" visibility={EVERYONE} contents={{ artifacts: 40, folders: 0 }} actions={<More name="Reports" />} />
      <FolderTile name="Drafts" href="#/f/3" visibility={ONLY_YOU} contents={{ artifacts: 2, folders: 0 }} actions={<More name="Drafts" />} />
    </div>
  ),
};

/**
 * THE PHONE'S ROW, full width and 44px at least. A tile takes this shape by
 * itself under the phone breakpoint; `size="row"` asks for it anywhere. Who
 * can see the folder is its glyph here, as on a gallery card's facts, so every
 * row keeps one line of facts; the word is still read and named on hover.
 */
export const Rows: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 358 }}>
      <FolderTile size="row" name="Marketing" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
      <FolderTile size="row" name="Board" href="#/f/2" visibility={EVERYONE} contents={{ artifacts: 0, folders: 0 }} actions={<More name="Board" />} />
      <FolderTile size="row" name="Drafts" href="#/f/3" visibility={ONLY_YOU} contents={{ artifacts: 2, folders: 0 }} actions={<More name="Drafts" />} />
      <FolderTile
        size="row"
        name="Customer research interviews for the payments platform migration"
        href="#/f/4"
        visibility={EVERYONE}
        contents={{ artifacts: 128, folders: 14 }}
        actions={<More name="Customer research interviews" />}
      />
      <FolderTile size="row" name="Press" href="#/f/5" contents={{ artifacts: 4, folders: 0 }} actions={<More name="Press" />} />
    </div>
  ),
};

/**
 * LONG NAMES AND NARROW TILES: the name is cut to one line and offered whole
 * on hover, and the facts are never cut. At two hundred pixels the run breaks
 * between who can see the folder and the count, which moves as one; a count
 * too long even for its own line ends that line on its dot, never opens one.
 */
export const LongAndNarrow: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 200px)', gap: 16 }}>
      <FolderTile
        name="Customer research interviews for the payments platform migration"
        href="#/f/1"
        visibility={EVERYONE}
        contents={{ artifacts: 1, folders: 1 }}
        actions={<More name="Customer research interviews" />}
      />
      <FolderTile name="Acquisition: Halcyon" href="#/f/2" visibility={ONLY_YOU} contents={{ artifacts: 0, folders: 0 }} actions={<More name="Acquisition: Halcyon" />} />
      <FolderTile name="Archive" href="#/f/3" visibility={EVERYONE} contents={{ artifacts: 1248, folders: 312 }} actions={<More name="Archive" />} />
    </div>
  ),
};

/**
 * EVERY STATE: at rest, chosen (the selected edge over the selected fill),
 * a drop target (the accent edge over the accent's soft fill, the glyph in
 * the accent, as a file drop target draws it), and a subfolder, which says
 * nothing of who sees it and opens its run on the count. Hover is the gallery
 * card's (the hairline darkens and a hairline shadow settles), focus the
 * card's ring, and a state keeps its edge under the pointer. Dragging onto a
 * folder is the host's to drive.
 */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px 20px', maxWidth: 1140 }}>
      <FolderTile name="At rest" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 4, folders: 0 }} actions={<More name="At rest" />} />
      <FolderTile name="Chosen" href="#/f/2" visibility={EVERYONE} contents={{ artifacts: 4, folders: 0 }} actions={<More name="Chosen" />} selected />
      <FolderTile name="Drop target" href="#/f/3" visibility={EVERYONE} contents={{ artifacts: 4, folders: 0 }} actions={<More name="Drop target" />} dropTarget />
      <FolderTile name="Subfolder" href="#/f/4" contents={{ artifacts: 2, folders: 1 }} actions={<More name="Subfolder" />} />
    </div>
  ),
};

interface Entry {
  id: string;
  kind: 'folder' | 'doc' | 'sheet';
  title: string;
  detail: string;
}

const ENTRIES: Entry[] = [
  { id: 'f1', kind: 'folder', title: 'Press', detail: describeFolderContents({ artifacts: 4, folders: 0 }) },
  { id: 'f2', kind: 'folder', title: 'Assets', detail: describeFolderContents({ artifacts: 0, folders: 0 }) },
  { id: 'a1', kind: 'doc', title: 'Launch plan', detail: 'What ships on the 14th and who signs it off' },
  { id: 'a2', kind: 'sheet', title: 'Launch budget', detail: '' },
];

const LIST: DataGridColumn<Entry>[] = [
  { key: 'name', header: 'Name', floor: '14rem', cell: (e) => <ArtifactNameCell kind={e.kind} title={e.title} detail={e.detail} /> },
];

/**
 * THE LIST SHAPE: a folder's rows come first in the same grid, named by the
 * folder glyph on a neutral tint and the word "Folder" over what is inside,
 * the same phrasing the tile uses.
 */
export const InTheList: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <DataGrid rows={ENTRIES} columns={LIST} rowKey={(e: Entry) => e.id} rowHref={(e: Entry) => `#/${e.id}`} aria-label="Q3 launch" />
    </div>
  ),
};

const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);

/**
 * IN STEP WITH THE CARDS BESIDE THEM: a folder page draws its folders above
 * its artifacts in the cards' own columns, so a tile's edges line up with the
 * card's under it. A folder's name is set as a card's title and its facts as
 * a card's facts, at the card's inset, with the card's hover.
 */
export const BesideArtifacts: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1140 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px 20px' }}>
        <FolderTile name="Marketing" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
        <FolderTile name="Drafts" href="#/f/3" visibility={ONLY_YOU} contents={{ artifacts: 2, folders: 0 }} actions={<More name="Drafts" />} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '24px 20px' }}>
        <ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a/1" updatedAt={NOW - 4 * 60_000} updatedBy="Maya" project="OPS" now={NOW} />
        <ArtifactCard title="Incident runbook" kind="doc" href="#/a/3" updatedAt={NOW - 86_400_000} now={NOW} />
      </div>
    </div>
  ),
};
