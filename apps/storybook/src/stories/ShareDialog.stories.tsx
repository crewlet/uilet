import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import {
  Button,
  PrincipalPicker,
  ShareDialog,
  type CompanyAccess,
  type PrincipalOption,
  type ShareableRole,
  type ShareAudienceRow,
} from '@crewlethq/ui';

const meta: Meta<typeof ShareDialog> = {
  title: 'UI/ShareDialog',
  component: ShareDialog,
};

export default meta;
type Story = StoryObj<typeof ShareDialog>;

const MAYA: ShareAudienceRow = { id: 'owner', principal: { id: 'maya', kind: 'person', name: 'Maya Ortiz' }, role: 'owner', self: true };
const START: ShareAudienceRow[] = [
  MAYA,
  { id: 's1', principal: { id: 'pm', kind: 'agent', name: '@pm', detail: 'Product', character: 'gemlet', hue: 'rose' }, role: 'contributor' },
  { id: 's2', principal: { id: 'ops', kind: 'team', name: 'Operations', detail: '6 people, 4 agents' }, role: 'commenter' },
  { id: 'e1', principal: { id: 'lee', kind: 'person', name: 'Lee Park' }, role: 'commenter', via: 'Through Operations' },
];

const DIRECTORY: PrincipalOption[] = [
  { id: 'jane', kind: 'person', name: 'Jane Founder', detail: 'Platform' },
  { id: 'cto', kind: 'agent', name: '@cto', detail: 'Engineering', character: 'hexlet', hue: 'amber' },
  { id: 'eng', kind: 'team', name: 'Engineering', detail: '3 people, 9 agents' },
];

/**
 * The owner's view. Every change is asked of the engine and the row says it is
 * saving until the engine answers; here the answer comes after a moment, and
 * a change to the agent's row is refused to show where a refusal is said.
 */
export const Owner: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    const [audience, setAudience] = useState(START);
    const [company, setCompany] = useState<CompanyAccess>('none');
    const [query, setQuery] = useState('');
    const options = useMemo(
      () =>
        DIRECTORY.filter(
          (option) => option.name.toLowerCase().includes(query.trim().toLowerCase()) && !audience.some((row) => row.principal.id === option.id),
        ),
      [audience, query],
    );

    const settle = (id: string, next: Partial<ShareAudienceRow> | null) =>
      setTimeout(
        () => setAudience((rows) => (next === null ? rows.filter((row) => row.id !== id) : rows.map((row) => (row.id === id ? { ...row, ...next, pending: false } : row)))),
        700,
      );

    const change = (row: ShareAudienceRow, role: ShareableRole) => {
      setAudience((rows) => rows.map((each) => (each.id === row.id ? { ...each, pending: true, refusal: undefined } : each)));
      if (row.principal.kind === 'agent' && role === 'editor') settle(row.id, { refusal: 'Only a person can let an agent publish over somebody else’s work.' });
      else settle(row.id, { role });
    };

    return (
      <>
        <Button onClick={() => setOpen(true)}>Share</Button>
        <ShareDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Vendor scorecard"
          picker={({ role }) => (
            <PrincipalPicker
              query={query}
              onQueryChange={setQuery}
              options={options}
              label="Add people, agents or teams"
              placeholder="Add people, agents or teams"
              onPick={(principal) => {
                const id = `s-${principal.id}`;
                setAudience((rows) => [...rows, { id, principal, role, pending: true }]);
                settle(id, {});
              }}
            />
          )}
          audience={audience}
          onRoleChange={change}
          onRemove={(row) => {
            setAudience((rows) => rows.map((each) => (each.id === row.id ? { ...each, pending: true } : each)));
            settle(row.id, null);
          }}
          companyName="Acme"
          companyAccess={company}
          onCompanyAccessChange={setCompany}
          link="https://acme.example.com/#/artifacts/7b0c"
        />
      </>
    );
  },
};

/**
 * A reader who cannot share still sees who can open it, with the reason in
 * place of every control: a write is never hidden, and neither is the
 * audience.
 */
export const ReadOnly: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Share</Button>
        <ShareDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Vendor scorecard"
          audience={START}
          companyName="Acme"
          companyAccess="viewer"
          readOnly={{ reason: 'You can see who has access. Ask the owner to share it.' }}
          link="https://acme.example.com/#/artifacts/7b0c"
        />
      </>
    );
  },
};

/**
 * A share an earlier build stored that reaches nobody (a sign-in named as a
 * seat) is listed with why, reads "No access", and offers Remove alone, so
 * its owner takes it away rather than it lingering out of sight.
 */
export const ShareThatReachesNobody: Story = {
  render: function Render() {
    const [audience, setAudience] = useState<ShareAudienceRow[]>([
      ...START,
      {
        id: 'seat:token:maya',
        principal: { id: 'token:maya', kind: 'person', name: 'maya (API token)' },
        role: 'viewer',
        invalid: 'token:maya is a sign-in, not a seat. Remove it and share with their seat.',
      },
    ]);
    return (
      <ShareDialog
        open
        onClose={() => {}}
        title="Vendor scorecard"
        audience={audience}
        onRoleChange={() => {}}
        onRemove={(row) => setAudience((was) => was.filter((r) => r.id !== row.id))}
        companyName="Acme"
        companyAccess="none"
        onCompanyAccessChange={() => {}}
        link="https://acme.example.com/#/artifacts/7b0c"
      />
    );
  },
};

/** An administrator managing an artifact they hold no relation to is told why they can. */
export const AdministratorClamp: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Share</Button>
        <ShareDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Vendor scorecard"
          note="You can manage this because you are an administrator."
          audience={START.map((row) => ({ ...row, self: false }))}
          onRoleChange={() => {}}
          onRemove={() => {}}
          companyName="Acme"
          companyAccess="none"
          onCompanyAccessChange={() => {}}
        />
      </>
    );
  },
};
