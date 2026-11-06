import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { HashGlyph } from '@crewlethq/icons/glyphs';
import {
  Avatar,
  AvatarStack,
  BarList,
  Breadcrumb,
  ButtonLink,
  Card,
  ColorSwatch,
  FormField,
  InboxList,
  InboxRow,
  InlineRef,
  Input,
  ListInput,
  LogoSlot,
  ReactionBar,
  SheetGrid,
  StackedColumns,
  TagsInput,
  Toaster,
  ChoiceCards,
  Combobox,
  DeliveryReceipt,
  Legend,
  List,
  Meter,
  ObjectHeader,
  PersonRow,
  RoomRow,
  Select,
  Skeleton,
  Stepper,
  Tag,
} from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

/**
 * Components holding the long names, small steps and keyboard focus a real
 * company produces: a long agent title, a unit named in a sentence, a stack
 * of initials-only faces, a header fact holding a seat's full title. Every
 * story is drawn light over dark.
 */
const meta: Meta = {
  title: 'UI/Long content and focus',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

const LONG_AGENT = 'Accessibility Auditor for Screen Readers, Keyboard Navigation and Colour Contrast';
const LONG_SEAT = 'Principal Product Manager for Learner Journeys, Spaced Repetition and Phrase Discovery';
const LONG_UNIT = 'Learner Community, Content Rights and Trust and Safety Operations';

const FOLLOWERS = [
  'Senior Web and Mobile App Engineer for Accessible Study Experiences',
  'Senior Backend Engineer, Search Indexing and Account Security',
  'Senior Product Designer',
  'Quality Lead',
  'Release Manager',
  'Support Lead',
].map((name, i) => ({ id: `seat-${i}`, name, reason: 'every message', answered: i < 3 }));

/** A receipt under a message prints two names and counts the rest. */
export const DeliveryReceiptManyFollowers: Story = {
  render: () => (
    <BothThemes>
      <div style={{ maxWidth: 720 }}>
        <DeliveryReceipt recipients={FOLLOWERS} />
      </div>
    </BothThemes>
  ),
};

/** Long names shrink and cut in their own box, in both densities. */
export const PersonRowLongNames: Story = {
  render: () => (
    <BothThemes>
      <ul role="listbox" aria-label="Mention" style={{ maxWidth: 420, margin: 0, padding: 0, contain: 'inline-size' }}>
        <PersonRow as="option" density="compact" avatar={<Avatar name={LONG_AGENT} size="xs" />} name={LONG_AGENT} detail="@accessibility-auditor" />
        <PersonRow as="option" density="compact" avatar={<Avatar name="Ada Byron" kind="human" size="xs" />} name="Ada Byron" detail="@ada" />
      </ul>
      <div style={{ maxWidth: 420, contain: 'inline-size' }}>
        <PersonRow
          avatar={<Avatar name={LONG_AGENT} size="sm" />}
          name={LONG_AGENT}
          tag={<Tag size="xs">Agent</Tag>}
          detail="Reviewing the keyboard path through the study flow"
          mark="toggle"
        />
      </div>
    </BothThemes>
  ),
};

/** The smallest step keeps both initials of every stacked face clear. */
export const AvatarStackSmallestStep: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {(['xs', 'sm'] as const).map((size) => (
          <AvatarStack
            key={size}
            size={size}
            members={[
              { name: 'Odile Varga', kind: 'human' },
              { name: 'Wen Chao', kind: 'human' },
              { name: 'Bartholomew Achterberg', kind: 'human' },
              { name: 'Wanda Cole', kind: 'human' },
              { name: 'Ana Ruiz', kind: 'human' },
            ]}
          />
        ))}
      </div>
    </BothThemes>
  ),
};

/** Header facts share the row; a cut value and a cut title carry their words on hover. */
export const ObjectHeaderLongFacts: Story = {
  render: () => (
    <BothThemes>
      <ObjectHeader
        kind="Executor"
        title="Always allow update_pull_request on the code host's server, answering a call from the release seat"
        facts={[
          { label: 'Seat', value: LONG_SEAT, href: '#seat' },
          { label: 'Runs in', value: 'Sandbox' },
          { label: 'Harness', value: 'model-large-2' },
          { label: 'Launched on', value: 'Nov 06, 2026, 04:21:55' },
          { label: 'Box', value: 'box-7f3a91', token: true, href: '#box' },
        ]}
      />
    </BothThemes>
  ),
};

function ToolbarPickers() {
  const [repo, setRepo] = useState('');
  const [state, setState] = useState('open');
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Select ariaLabel="Which changes" width="auto" size="sm" options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'Every change' }]} value={state} onChange={(next) => setState(String(next))} />
      <Combobox
        label="Repositories"
        aria-label="Repository"
        placeholder="Every repository"
        width="sm"
        value={repo}
        onValueChange={setRepo}
        open={open}
        onOpenChange={setOpen}
        options={['web', 'backend', 'study-content-pipeline'].filter((name) => name.includes(repo)).map((value) => ({ value }))}
      />
      <Select ariaLabel="Moved" width="auto" size="sm" options={[{ value: 'any', label: 'Any time' }]} value="any" onChange={() => {}} />
    </div>
  );
}

/** A small picker in a wrapping toolbar takes its step, not the whole row. */
export const ComboboxInAToolbar: Story = {
  render: () => (
    <BothThemes>
      <ToolbarPickers />
    </BothThemes>
  ),
};

/** A compact meter in a column sized to its content keeps a readable width. */
export const MeterInAShrinkColumn: Story = {
  render: () => (
    <BothThemes>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {[5, 2, 0].map((met) => (
            <tr key={met}>
              <td style={{ paddingRight: 16 }}>web!{met + 1}</td>
              <td style={{ width: '1%' }}>
                <Meter label="Readiness" value={met} max={6} size="compact" hideLabel />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </BothThemes>
  ),
};

function WizardStart() {
  const [harness, setHarness] = useState('harness-a');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
      <Stepper
        label="Add a model"
        orientation="vertical"
        current="name"
        onSelect={() => {}}
        steps={[
          { id: 'name', label: 'Name and harness' },
          { id: 'method', label: 'Method' },
          { id: 'model', label: 'Model' },
        ]}
      />
      <ChoiceCards
        label="Harness"
        value={harness}
        onChange={setHarness}
        options={[
          { value: 'harness-a', label: 'Harness A', description: 'A coding harness.' },
          { value: 'harness-b', label: 'Harness B', description: 'A coding harness.' },
        ]}
      />
    </div>
  );
}

/** Tab onto the current step and the chosen card: focus shows on both. */
export const FocusOnCurrentAndChosen: Story = {
  render: () => (
    <BothThemes>
      <WizardStart />
    </BothThemes>
  ),
};

/** On a phone a long room name wraps beside its mark. */
export const RoomRowLongNameNarrow: Story = {
  render: () => (
    <BothThemes>
      <div style={{ width: 340 }}>
        <List aria-label="Rooms">
          <RoomRow href="#r1" mark={<HashGlyph size="sm" />} name="rights-holder-requests-and-takedowns" tags={<Tag size="xs">Joined</Tag>} topic="Takedown requests from rights holders" />
          <RoomRow href="#r2" mark={<HashGlyph size="sm" />} name="release-coordination-autumn-study-streaks-web-ios-android" />
        </List>
      </div>
    </BothThemes>
  ),
};

/** A cut team or seat name carries its whole words on hover. */
export const ChartLabelsLong: Story = {
  render: () => (
    <BothThemes>
      {/* Sized by the panel, as a page section is, not by its longest label. */}
      <div style={{ maxWidth: 360, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, contain: 'inline-size' }}>
        <BarList
          data={[
            { id: 'a', label: LONG_UNIT, value: 4120 },
            { id: 'b', label: 'Product, Design and Engineering for Web, iOS and Android', value: 2900 },
          ]}
        />
        <Legend
          items={[
            { id: 'a', label: 'Community Moderator and Learner Support Lead', value: '412k' },
            { id: 'b', label: 'Senior Backend Engineer', value: '96k' },
          ]}
        />
      </div>
    </BothThemes>
  ),
};

/** The loading wave moves on the compositor. */
export const SkeletonWave: Story = {
  render: () => (
    <BothThemes>
      <Skeleton variant="box" height={64} />
    </BothThemes>
  ),
};

/* ---- pass two ----------------------------------------------------------- */

const VIEWBOX_ONLY_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 75"><rect width="300" height="75" rx="12" fill="#735af2"/><text x="150" y="48" font-family="sans-serif" font-size="32" fill="white" text-anchor="middle">Marrow</text></svg>',
)}`;

/** A logo with a viewBox and no width or height is drawn at the slot's band, not 0 x 0. */
export const LogoWithNoSizeOfItsOwn: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <LogoSlot label="Primary" ground="light" src={VIEWBOX_ONLY_LOGO} alt="Marrow logo" />
        <LogoSlot label="For dark grounds" ground="dark" src={VIEWBOX_ONLY_LOGO} alt="Marrow logo on dark" />
      </div>
    </BothThemes>
  ),
};

const SHEET_COLUMNS = [
  { field: 'vendor', label: 'Vendor', type: 'text' as const, frozen: true },
  { field: 'owner', label: 'Owner', type: 'person' as const },
  {
    field: 'status',
    label: 'Status',
    type: 'status' as const,
    options: [
      { id: 'todo', label: 'To do', category: 'todo' as const },
      { id: 'review', label: 'Review', category: 'in_progress' as const },
      { id: 'done', label: 'Done', category: 'done' as const },
    ],
  },
];
const SHEET_PEOPLE = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, name: `Person ${i + 1}`, kind: 'human' as const }));

/** A three-row sheet: a cell's choice list opens over the window, not clipped by the grid. */
export const ShortSheetChoiceList: Story = {
  render: () => (
    <BothThemes>
      <SheetGrid
        label="Tracker"
        columns={SHEET_COLUMNS}
        rows={[
          { id: 'r1', values: { vendor: 'Acme', owner: 'p1', status: 'todo' } },
          { id: 'r2', values: { vendor: 'Globex', owner: null, status: 'review' } },
          { id: 'r3', values: { vendor: 'Initech', owner: 'p3', status: null } },
        ]}
        people={SHEET_PEOPLE}
        onEdit={() => {}}
      />
    </BothThemes>
  ),
};

/** A long parent gives way before the page: the page crumb keeps its words. */
export const BreadcrumbLongParent: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'flex', maxWidth: 360, contain: 'inline-size' }}>
        <Breadcrumb
          crumbs={[
            { label: 'Company', href: '#company' },
            { label: LONG_UNIT, href: '#unit' },
            { label: 'Principal Product Manager' },
          ]}
        />
      </div>
    </BothThemes>
  ),
};

/** Held fields say why; a field's refused value draws its control's error edge. */
export const HeldAndRefusedFields: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 16, maxWidth: 360 }}>
        <Select ariaLabel="Repositories" options={[{ value: 'all', label: 'All repositories' }]} value="all" disabledReason="Turn the agent on to choose its repositories." />
        <FormField label="Daily token ceiling" optional error="Use a whole number.">
          {(field) => <Input id={field.id} aria-describedby={field.describedBy} value="4OO" onChange={() => {}} />}
        </FormField>
        <TagsInput label="Repositories" aria-label="Repositories" value={[]} onChange={() => {}} placeholder="All installed repositories in the organisation" />
      </div>
    </BothThemes>
  ),
};

/** Sized placeholders keep the layout still. */
export const SkeletonSized: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <Skeleton width={180} height={16} />
        <Skeleton variant="box" width="60%" height={16} />
      </div>
    </BothThemes>
  ),
};

/** An address wraps after its host; a row says where it happened on its own line. */
export const AddressesAndPlaces: Story = {
  render: () => (
    <BothThemes>
      <div style={{ maxWidth: 340, display: 'grid', gap: 16 }}>
        <p style={{ margin: 0 }}>
          See{' '}
          <InlineRef href="https://example.com/release-notes/autumn/study-streaks/web-ios-android/2026-11-06" mark={<HashGlyph size="sm" />} wrap>
            https://example.com/release-notes/autumn/study-streaks/web-ios-android/2026-11-06
          </InlineRef>
        </p>
        <InboxList label="Activity">
          <InboxRow title="Bartholomew Achterberg-Oyelaran" qualifier="replied to a thread" where="in #release-coordination-autumn-study-streaks" meta="4m" onClick={() => {}}>
            The build is green again.
          </InboxRow>
        </InboxList>
      </div>
    </BothThemes>
  ),
};

/** Long toasts stop at two lines; a button link keeps its ink on hover. */
export const ToastsAndButtonLinks: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="crewlet-document">
          <ButtonLink href="#install" variant="primary">
            Install on the code host
          </ButtonLink>
        </div>
        <Toaster
          toasts={[{ id: 1, variant: 'success', message: `Saved "${LONG_SEAT}" to the board and told the seats that follow it` }]}
          onDismiss={() => {}}
        />
      </div>
    </BothThemes>
  ),
};

/** A count's scale steps in whole units; stored shortcodes draw as glyphs. */
export const CountsAndReactions: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
        <StackedColumns
          label="Turns per day"
          series={[{ id: 'turns', name: 'Turns' }]}
          buckets={[0, 1, 0, 1, 1].map((turns, i) => ({ t: Date.UTC(2026, 10, i + 1), values: { turns } }))}
          formatScale={(value) => String(Math.round(value))}
        />
        <ReactionBar
          reactions={[
            { emoji: ':eyes:', count: 2, mine: true },
            { emoji: ':+1:', count: 1, mine: false },
            { emoji: ':sparkles:', count: 1, mine: false },
          ]}
          onToggle={() => {}}
        />
      </div>
    </BothThemes>
  ),
};

/** Narrow cards and lists: a cut title on hover, a lone remove button on its line, swatch edges. */
export const NarrowCardsListsSwatches: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 16, maxWidth: 340, contain: 'inline-size' }}>
        <Card>
          <Card.Header>
            <Card.Title truncate>Scratch repositories and commit identity</Card.Title>
          </Card.Header>
        </Card>
        <ListInput label="Goals" itemName="goal" value={['Ship the autumn study streaks on every platform', 'Answer every rights holder within a day']} onChange={() => {}} />
        <div style={{ display: 'flex', gap: 12 }}>
          <ColorSwatch name="Text" value="#111827" />
          <ColorSwatch name="Light ground" value="#ffffff" />
        </div>
      </div>
    </BothThemes>
  ),
};
