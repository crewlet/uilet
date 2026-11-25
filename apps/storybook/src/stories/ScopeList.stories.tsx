import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, Modal, ScopeList, type ScopeListOption } from '@crewlethq/ui';

const APPS: ScopeListOption[] = [
  { value: '6450012345', label: 'Tally', detail: 'com.example.tally', id: '6450012345' },
  { value: '6450098765', label: 'Tally Widgets', detail: 'com.example.widgets', id: '6450098765' },
];

const AD_ACCOUNTS: ScopeListOption[] = [
  'US prospecting',
  'US retargeting',
  'EU prospecting',
  'EU retargeting',
  'UK brand',
  'Canada launch',
  'Australia launch',
  'App installs, iOS',
  'App installs, Android',
  'Holiday campaign archive',
].map((label, i) => ({ value: `act_10023${i}`, label, id: `act_10023${i}` }));

/** Analytics properties in two accounts, one property name in both, and one no account holds. */
const PROPERTIES: ScopeListOption[] = [
  { value: '301234567', label: 'Tally web', id: '301234567', group: 'Tally Labs' },
  { value: '302234567', label: 'Tally app', id: '302234567', group: 'Tally Labs' },
  { value: '304234567', label: 'Ledger web', id: '304234567', group: 'Tally Labs' },
  { value: '402234567', label: 'Tally web', id: '402234567', group: 'Tally Retail' },
  { value: '403234567', label: 'Ledger app', id: '403234567', group: 'Tally Retail' },
  { value: '405234567', label: 'Tally widgets for the Lock Screen and the Home Screen', id: '405234567', group: 'Tally Retail' },
  { value: '406234567', label: 'Tally store', id: '406234567', group: 'Tally Retail' },
  { value: '900234567', label: 'Sandbox', id: '900234567' },
];

function Chooser({ options, initial, label }: { options: ScopeListOption[]; initial: string[]; label: string }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <div style={{ maxWidth: '34rem' }}>
      <ScopeList label={label} options={options} value={value} onChange={setValue} />
    </div>
  );
}

const meta: Meta<typeof ScopeList> = {
  title: 'UI/ScopeList',
  component: ScopeList,
};

export default meta;
type Story = StoryObj<typeof ScopeList>;

/** An agent's apps: the name first, the bundle ID under it and the Apple ID at the end, quiet. */
export const Apps: Story = {
  render: () => <Chooser label="Growth Marketer's apps" options={APPS} initial={['6450012345']} />,
};

/** Ten ad accounts: a search over the rows, and Choose all takes what it shows. */
export const Searched: Story = {
  render: () => <Chooser label="Growth Marketer's ad accounts" options={AD_ACCOUNTS} initial={['act_100230']} />,
};

/** An app the agent cannot be given, saying why. */
export const OneUnavailable: Story = {
  render: () => (
    <Chooser
      label="Growth Marketer's apps"
      options={[APPS[0]!, { ...APPS[1]!, disabled: true, disabledReason: 'Removed from the connected team.' }]}
      initial={[]}
    />
  ),
};

/** In the dialog an agent's apps are chosen in. */
export const InADialog: Story = {
  render: () => {
    const Dialog = () => {
      const [open, setOpen] = useState(true);
      const [value, setValue] = useState<string[]>(['6450012345']);
      return (
        <>
          <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
            Choose apps
          </Button>
          <Modal
            open={open}
            size="md"
            onClose={() => setOpen(false)}
            title="Growth Marketer's apps"
            subtitle="Crewlet refuses every call outside them."
            footer={
              <Button size="small" variant="primary" onClick={() => setOpen(false)}>
                Done
              </Button>
            }
          >
            <ScopeList label="Growth Marketer's apps" options={APPS} value={value} onChange={setValue} />
          </Modal>
        </>
      );
    };
    return <Dialog />;
  },
};

/** Properties drawn by the Analytics account that holds them, a heading over each; the search matches an account's name too. In light. */
export const GroupedLight: Story = {
  render: () => <Chooser label="Growth Marketer's properties" options={PROPERTIES} initial={['301234567']} />,
  globals: { theme: 'light' },
};

/** The same properties by account, in dark. */
export const GroupedDark: Story = {
  render: () => <Chooser label="Growth Marketer's properties" options={PROPERTIES} initial={['301234567']} />,
  globals: { theme: 'dark' },
};

/** By account on a phone: a long name wraps beside its ID, and each heading keeps the rows' inset. */
export const GroupedNarrow: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <ScopeList label="Growth Marketer's properties" options={PROPERTIES} value={['402234567']} onChange={() => {}} />
    </div>
  ),
};
