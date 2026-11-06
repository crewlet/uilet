import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { HashGlyph } from '@crewlethq/icons/glyphs';
import {
  Avatar,
  AvatarStack,
  BarList,
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
      <ul role="listbox" aria-label="Mention" style={{ maxWidth: 420, margin: 0, padding: 0 }}>
        <PersonRow as="option" density="compact" avatar={<Avatar name={LONG_AGENT} size="xs" />} name={LONG_AGENT} detail="@accessibility-auditor" />
        <PersonRow as="option" density="compact" avatar={<Avatar name="Ada Byron" kind="human" size="xs" />} name="Ada Byron" detail="@ada" />
      </ul>
      <div style={{ maxWidth: 420 }}>
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
      <div style={{ maxWidth: 360, display: 'grid', gap: 16 }}>
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
