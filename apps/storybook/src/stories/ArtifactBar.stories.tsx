import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  ArrowDownToLineGlyph,
  CheckGlyph,
  CopyGlyph,
  DatabaseGlyph,
  InfoGlyph,
  PencilGlyph,
  PinGlyph,
  RotateCcwClockGlyph,
  SettingsGlyph,
  Share2Glyph,
  TrashGlyph,
  UsersGlyph,
  XGlyph,
} from '@crewlethq/icons/glyphs';
import {
  ArtifactBar,
  ArtifactPanel,
  ArtifactVersionChip,
  ArtifactWorkspace,
  Button,
  EditingStatus,
  PresenceStack,
  Section,
  type ArtifactBarTool,
  type MenuEntry,
  type PresenceMember,
} from '@crewlethq/ui';

const meta: Meta<typeof ArtifactBar> = {
  title: 'UI/ArtifactBar',
  component: ArtifactBar,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ArtifactBar>;

const ROOM: PresenceMember[] = [
  { id: 's1', seat: 'maya', name: 'Maya Ortiz', kind: 'human', activity: 'editing', hue: 'purple' },
  { id: 's2', seat: 'pm', name: 'Product Manager', kind: 'agent', activity: 'viewing', hue: 'rose', character: 'gemlet' },
];

type Panel = 'details' | 'history' | 'data' | 'people' | null;

const PANEL_TITLES: Record<Exclude<Panel, null>, string> = {
  details: 'Details',
  history: 'Versions and history',
  data: 'Data',
  people: 'People here',
};

function versions(showing: number, latest: number, pick: (n: number) => void): MenuEntry[] {
  return Array.from({ length: latest }, (_, i) => latest - i).map((n) => ({
    key: `v${n}`,
    label: n === latest ? `Version ${n}, the latest` : `Version ${n}`,
    checked: n === showing,
    onSelect: () => pick(n),
  }));
}

/**
 * The bar over a deck, with every artifact's panels: press a control to open
 * its panel at the side, and narrow the canvas to see the presence stack and
 * Share's word go first, then the views and the tools fold into More.
 */
export const OverADeck: Story = {
  render: function Render() {
    const [panel, setPanel] = useState<Panel>(null);
    const [mode, setMode] = useState('');
    const [title, setTitle] = useState('Q4 roadmap');
    const [showing, setShowing] = useState(4);
    const toggle = (p: Exclude<Panel, null>) => setPanel((open) => (open === p ? null : p));
    const tools: ArtifactBarTool[] = [
      { key: 'details', label: 'Details', icon: <InfoGlyph size="sm" />, keys: ['i'], pressed: panel === 'details', onSelect: () => toggle('details') },
      { key: 'history', label: 'Versions and history', icon: <RotateCcwClockGlyph size="sm" />, keys: ['h'], pressed: panel === 'history', onSelect: () => toggle('history') },
      { key: 'data', label: 'Data', icon: <DatabaseGlyph size="sm" />, keys: ['d'], pressed: panel === 'data', onSelect: () => toggle('data') },
      { key: 'people', label: 'People here, 2 others', icon: <UsersGlyph size="sm" />, keys: ['p'], badge: 2, pressed: panel === 'people', onSelect: () => toggle('people') },
      { key: 'share', label: 'Share', icon: <Share2Glyph size="sm" />, keys: ['s'], labelled: true, onSelect: () => {} },
    ];
    const menu: MenuEntry[] = [
      { key: 'rename', label: 'Rename', icon: <PencilGlyph size="sm" />, onSelect: () => {} },
      { key: 'settings', label: 'Settings', icon: <SettingsGlyph size="sm" />, onSelect: () => {} },
      { kind: 'separator', key: 's1' },
      { key: 'print', label: 'Print or save as PDF', icon: <ArrowDownToLineGlyph size="sm" />, onSelect: () => {} },
      { key: 'copy', label: 'Copy link', icon: <CopyGlyph size="sm" />, onSelect: () => {} },
      { key: 'pin', label: 'Pin', icon: <PinGlyph size="sm" />, onSelect: () => {} },
      { kind: 'separator', key: 's2' },
      { key: 'trash', label: 'Move to the trash', icon: <TrashGlyph size="sm" />, danger: true, onSelect: () => {} },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ArtifactBar
          title={title}
          kind="slides"
          kindLabel="Slides"
          back={{ href: '#', label: 'Back to artifacts' }}
          onRename={(next) => setTitle(next)}
          version={<ArtifactVersionChip version={showing} latest={4} items={versions(showing, 4, setShowing)} />}
          modes={{
            label: 'View',
            value: mode,
            options: [
              { value: '', label: 'Edit' },
              { value: 'grid', label: 'Grid' },
              { value: 'present', label: 'Present' },
            ],
            onValueChange: setMode,
          }}
          presence={<PresenceStack members={ROOM} self size="sm" />}
          tools={tools}
          menu={menu}
        />
        <div style={{ flex: 1, minHeight: 0, display: 'grid' }}>
          <ArtifactWorkspace
            bodyLabel={title}
            panel={
              panel ? (
                <ArtifactPanel key={panel} title={PANEL_TITLES[panel]} onClose={() => setPanel(null)} size={panel === 'details' || panel === 'people' ? 'sm' : 'md'}>
                  <p style={{ margin: 0 }}>The {PANEL_TITLES[panel].toLowerCase()} of this deck.</p>
                </ArtifactPanel>
              ) : null
            }
          >
            <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%', padding: 24 }}>
              <div style={{ aspectRatio: '16 / 9', width: 'min(100%, 880px)', borderRadius: 8, background: 'var(--color-surface-inset)' }} />
            </div>
          </ArtifactWorkspace>
        </div>
      </div>
    );
  },
};

/**
 * A panel's sections head at the panel title's step, never louder than it,
 * and in the panel's width each section's sentence goes under its heading
 * while its action stays on the heading's line.
 */
export const PanelWithSections: Story = {
  render: function Render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <ArtifactBar title="Q4 roadmap" kind="slides" kindLabel="Slides" back={{ href: '#', label: 'Back to artifacts' }} />
        <div style={{ flex: 1, minHeight: 0, display: 'grid' }}>
          <ArtifactWorkspace
            bodyLabel="Q4 roadmap"
            panel={
              <ArtifactPanel title="Settings" onClose={() => {}} focusOnOpen={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <Section title="Details" description="Its name in the gallery, a tab and a link">
                    <p style={{ margin: 0 }}>Title, description and icon fields.</p>
                  </Section>
                  <Section
                    title="Version 4"
                    description="Maya Ortiz, 2h ago"
                    actions={
                      <Button size="small" variant="secondary">
                        View it
                      </Button>
                    }
                  >
                    <p style={{ margin: 0 }}>11 files, 18 KB.</p>
                  </Section>
                  <Section title="Changes" description="What was published, shared and changed, and by whom">
                    <p style={{ margin: 0 }}>The change record.</p>
                  </Section>
                </div>
              </ArtifactPanel>
            }
          >
            <div style={{ padding: 24 }} />
          </ArtifactWorkspace>
        </div>
      </div>
    );
  },
};

/** A reader who may only view: the title is text, and the tools they hold are all there is. */
export const ReadOnly: Story = {
  args: {
    title: 'Launch review',
    kind: 'sheet',
    kindLabel: 'Sheet',
    back: { href: '#', label: 'Back to artifacts' },
    version: undefined,
    tools: [
      { key: 'details', label: 'Details', icon: <InfoGlyph size="sm" />, keys: ['i'], onSelect: () => {} },
      { key: 'data', label: 'Data', icon: <DatabaseGlyph size="sm" />, keys: ['d'], onSelect: () => {} },
      { key: 'share', label: 'Share', icon: <Share2Glyph size="sm" />, labelled: true, disabledReason: 'Only its owner and editors share it.', onSelect: () => {} },
    ],
    menu: [{ key: 'copy', label: 'Copy link', icon: <CopyGlyph size="sm" />, onSelect: () => {} }],
  },
};

/** A doc while it is edited: the editor's state said before its Cancel and its primary Save. */
export const EditingADoc: Story = {
  args: {
    title: 'Q4 launch plan',
    kind: 'doc',
    kindLabel: 'Doc',
    back: { href: '#', label: 'Back to artifacts' },
    status: <EditingStatus dirty />,
    kindTools: [
      { key: 'cancel', label: 'Cancel', icon: <XGlyph size="sm" />, labelled: true, onSelect: () => {} },
      { key: 'save', label: 'Save', icon: <CheckGlyph size="sm" />, labelled: true, emphasis: 'primary', onSelect: () => {} },
    ],
    tools: [
      { key: 'details', label: 'Details', icon: <InfoGlyph size="sm" />, keys: ['i'], onSelect: () => {} },
      { key: 'share', label: 'Share', icon: <Share2Glyph size="sm" />, labelled: true, onSelect: () => {} },
    ],
  },
};

/**
 * The same bar where room is short (a small laptop's bar beside the rail): the
 * unsaved state folds to its accent dot, still read by a screen reader, so the
 * title keeps its words rather than being cut to two.
 */
export const EditingADocNarrow: Story = {
  args: { ...EditingADoc.args, title: 'Architecture notes for the 1.0 release' },
  decorators: [
    (Story) => (
      <div style={{ width: 760 }}>
        <Story />
      </div>
    ),
  ],
};

/** An older version on show: the chip takes the accent and says which of how many. */
export const OlderVersion: Story = {
  args: {
    title: 'Architecture notes',
    kind: 'doc',
    kindLabel: 'Doc',
    back: { href: '#', label: 'Back to artifacts' },
    version: <ArtifactVersionChip version={2} latest={5} items={versions(2, 5, () => {})} />,
    tools: [{ key: 'history', label: 'Versions and history', icon: <RotateCcwClockGlyph size="sm" />, keys: ['h'], pressed: true, onSelect: () => {} }],
  },
};

/** The title is still being read. */
export const Pending: Story = {
  args: { title: '', kind: 'html', kindLabel: 'Page', pending: true, back: { href: '#', label: 'Back to artifacts' } },
};

/**
 * A panel whose foot sticks to its bottom edge while a long form scrolls
 * under it: the foot offsets itself by the body's published inset
 * (`--crewlet-artifact-panel-inset`), so no band of the form shows below it.
 */
export const PanelWithStickyFoot: Story = {
  render: () => (
    <div style={{ height: 560, display: 'grid' }}>
      <ArtifactWorkspace
        bodyLabel="Launch review"
        panel={
          <ArtifactPanel title="Data" onClose={() => {}} size="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 24 }, (_, i) => (
                <p key={i} style={{ margin: 0 }}>
                  Column {i + 1}
                </p>
              ))}
              <div
                style={{
                  position: 'sticky',
                  bottom: 'calc(-1 * var(--crewlet-artifact-panel-inset))',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: 'var(--spacing-3) 0 var(--crewlet-artifact-panel-inset)',
                  borderTop: '1px solid var(--color-border-default)',
                  background: 'var(--color-surface-background)',
                }}
              >
                <Button size="small" variant="ghost">
                  Discard changes
                </Button>
                <Button size="small" variant="primary">
                  Save schema
                </Button>
              </div>
            </div>
          </ArtifactPanel>
        }
      >
        <div style={{ padding: 24 }} />
      </ArtifactWorkspace>
    </div>
  ),
};
