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
 * THE FOLDERS TAB: top-level folders four across a laptop's page, shorter than
 * an artifact's card and with no preview. Each says who can see it and what
 * the reader can open inside, and a folder holding only things the reader
 * cannot open says so rather than calling itself empty.
 */
export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, maxWidth: 1140 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, maxWidth: 820 }}>
      <FolderTile name="Marketing" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
      <FolderTile name="Reports" href="#/f/2" visibility={EVERYONE} contents={{ artifacts: 40, folders: 0 }} actions={<More name="Reports" />} />
      <FolderTile name="Drafts" href="#/f/3" visibility={ONLY_YOU} contents={{ artifacts: 2, folders: 0 }} actions={<More name="Drafts" />} />
    </div>
  ),
};

/**
 * THE PHONE'S ROW, full width at 44px. A tile takes this shape by itself under
 * the phone breakpoint; `size="row"` asks for it anywhere.
 */
export const Rows: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8, maxWidth: 390 }}>
      <FolderTile size="row" name="Marketing" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
      <FolderTile size="row" name="Board" href="#/f/2" visibility={EVERYONE} contents={{ artifacts: 0, folders: 0 }} actions={<More name="Board" />} />
      <FolderTile size="row" name="Drafts" href="#/f/3" visibility={ONLY_YOU} contents={{ artifacts: 2, folders: 0 }} actions={<More name="Drafts" />} />
    </div>
  ),
};

/**
 * THE RESERVED STATES: chosen (the selected edge over the selected fill) and a
 * drop target (the accent edge over the accent's soft fill, as a file drop
 * target draws it). Dragging onto a folder is the host's to drive.
 */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, maxWidth: 900 }}>
      <FolderTile name="At rest" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 4, folders: 0 }} />
      <FolderTile name="Chosen" href="#/f/2" visibility={EVERYONE} contents={{ artifacts: 4, folders: 0 }} selected />
      <FolderTile name="Drop target" href="#/f/3" visibility={EVERYONE} contents={{ artifacts: 4, folders: 0 }} dropTarget />
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
 * its artifacts, so a folder's name is set as a card's title (the card title
 * step and weight) and its two facts as a card's facts (the card meta step),
 * on one line height. The grid follows the page: four across, three at a
 * 1024 page, and one column of rows on a phone.
 */
export const BesideArtifacts: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, maxWidth: 1140 }}>
      <FolderTile name="Marketing" href="#/f/1" visibility={EVERYONE} contents={{ artifacts: 12, folders: 2 }} actions={<More name="Marketing" />} />
      <FolderTile name="Drafts" href="#/f/3" visibility={ONLY_YOU} contents={{ artifacts: 2, folders: 0 }} actions={<More name="Drafts" />} />
      <ArtifactCard title="Vendor scorecard" kind="sheet" href="#/a/1" updatedAt={NOW - 4 * 60_000} updatedBy="Maya" project="OPS" now={NOW} />
      <ArtifactCard title="Incident runbook" kind="doc" href="#/a/3" updatedAt={NOW - 86_400_000} now={NOW} />
    </div>
  ),
};
