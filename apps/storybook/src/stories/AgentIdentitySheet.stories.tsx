import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  AgentIdentitySheet,
  Button,
  Callout,
  DescriptionList,
  type AgentIdentitySheetProps,
  type AgentIdentityVerdict,
  VendorText,
} from '@crewlethq/ui';

/** Opens the sheet over the story, and a button to open it again once closed. */
function Opened(props: AgentIdentitySheetProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button size="small" variant="primary" onClick={() => setOpen(true)}>
        Set up identity
      </Button>
      <AgentIdentitySheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const answer =
  (verdict: AgentIdentityVerdict, ms = 1200) =>
  () =>
    new Promise<AgentIdentityVerdict>((ok) => setTimeout(() => ok(verdict), ms));

const WORKS: AgentIdentityVerdict = {
  ok: true,
  view: (
    <Callout variant="success" title="Works. Crewlet keeps it.">
      Growth Marketer now calls Apple with crewlet-growth, App Manager. Apple records its submissions under this key.
    </Callout>
  ),
};

const WRONG_ROLE: AgentIdentityVerdict = {
  ok: false,
  failedAt: 'role',
  view: (
    <>
      <Callout variant="danger" title="Apple answered, but with the wrong role. Crewlet kept nothing.">
        Make another key with App Manager access and choose it here, or lower Growth Marketer to Read. A key&apos;s access
        cannot be changed, so revoke this one at Apple.
      </Callout>
      <DescriptionList
        items={[
          ['It holds', 'Marketing'],
          ['Growth Marketer needs', 'App Manager'],
        ]}
      />
    </>
  ),
};

const UNSIGNED_AGREEMENT: AgentIdentityVerdict = {
  ok: false,
  failedAt: 'sign',
  steps: {
    sign: { note: 'Apple refuses every API call for this team until its Account Holder accepts the latest agreement.' },
  },
  view: (
    <Callout variant="danger" title="Apple refused the check. Crewlet kept nothing.">
      Sign in to App Store Connect as the Account Holder, accept the agreement shown on the home page or under Business,
      then check again.
    </Callout>
  ),
};

const APPLE: AgentIdentitySheetProps = {
  open: true,
  onClose: () => {},
  agent: 'Growth Marketer',
  vendor: 'Apple',
  why: 'Apple then records its submissions under its own key, and you can revoke it alone.',
  steps: [
    { text: <VendorText parts={[{ text: 'Open ' }, { ui: ['Users and Access', 'Integrations', 'Team Keys'], url: 'https://appstoreconnect.apple.com/access/integrations/api' }, { text: '.' }]} /> },
    { text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Generate API Key'] }, { text: ', or ' }, { ui: ['+'] }, { text: ' if the team already has keys.' }]} /> },
    {
      text: 'Name:',
      copy: { label: "key's name", value: 'crewlet-growth', rule: 'Lowercase letters, digits and hyphens, at most 30.' },
    },
    { text: <VendorText parts={[{ ui: ['Access'] }, { text: ': ' }, { ui: ['App Manager'] }, { text: '. Never ' }, { ui: ['Admin'] }, { text: '.' }]} /> },
    { text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Generate'] }, { text: '.' }]} /> },
    { text: <VendorText parts={[{ text: "On the new key's row, press " }, { ui: ['Download API Key'] }, { text: '. Apple offers the file once.' }]} /> },
  ],
  note: "Only the Account Holder or an Admin can make team keys. A key reaches every app of the team; Crewlet keeps the agent to its own.",
  handIn: {
    kind: 'file',
    accept: '.p8',
    hint: 'The file Apple offered: AuthKey_<Key ID>.p8',
    field: { label: 'Key ID', fromName: /^AuthKey_([A-Z0-9]{10})\.p8$/ },
  },
  reads: [
    { id: 'sign', label: "Sign in with the key and the team's issuer" },
    { id: 'alive', label: 'Make a read every role may make' },
    { id: 'role', label: 'Read its role from seven reads' },
    { id: 'apps', label: "Read the agent's apps" },
  ],
  onCheck: answer(WORKS),
};

const META: AgentIdentitySheetProps = {
  ...APPLE,
  vendor: 'Meta',
  why: "Meta's activity history then names the agent, and its token can be cut off alone.",
  steps: [
    { text: <VendorText parts={[{ text: 'Open ' }, { ui: ['Business settings', 'Users', 'System users'], url: 'https://business.facebook.com/settings/system-users' }, { text: '.' }]} /> },
    { text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Add'] }, { text: '.' }]} /> },
    {
      text: 'System user name:',
      copy: { label: "system user's name", value: 'crewlet-growth', rule: 'Lowercase letters, digits and hyphens, at most 30.' },
    },
    { text: <VendorText parts={[{ ui: ['Role'] }, { text: ': ' }, { ui: ['Employee'] }, { text: '. Never ' }, { ui: ['Admin'] }, { text: '.' }]} /> },
    { text: <VendorText parts={[{ ui: ['Assign assets'] }, { text: ': the ad accounts, with ' }, { ui: ['Manage campaigns'] }, { text: ' and ' }, { ui: ['View performance'] }, { text: '.' }]} /> },
    { text: <VendorText parts={[{ ui: ['Generate new token'] }, { text: ', with ' }, { ui: ['ads_management'] }, { text: ' and ' }, { ui: ['ads_read'] }, { text: ', and copy it.' }]} /> },
  ],
  note: 'Meta allows 10 system users per business at Full access, 1 at Limited.',
  make: {
    title: 'Crewlet can make it for you',
    body: 'With the company’s admin token, Crewlet makes crewlet-growth an Employee system user, gives it the agent’s ad accounts with Manage campaigns and View performance, and mints a 60-day token it renews. 3 of 10 system users used.',
    reads: [
      { id: 'make', label: 'Make the system user' },
      { id: 'assign', label: 'Assign the ad accounts' },
      { id: 'mint', label: 'Mint its token' },
    ],
  },
  handIn: { kind: 'token', label: 'System user token', hint: 'Meta shows it once. Crewlet seals it and never shows it again.' },
  reads: [
    { id: 'me', label: 'Read who the token is' },
    { id: 'debug', label: 'Read its app, scopes and expiry' },
    { id: 'tasks', label: "Read its tasks on the agent's ad accounts" },
  ],
};

const meta: Meta<typeof AgentIdentitySheet> = {
  title: 'UI/AgentIdentitySheet',
  component: AgentIdentitySheet,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AgentIdentitySheet>;

/** App Store Connect: six steps in Apple's labels, Team Keys linked on the step that names it, the key's name to copy, and the file to bring back. */
export const AppStoreConnect: Story = { render: () => <Opened {...APPLE} /> };

/** Back here: the file Apple gave, its key ID read from the name. */
export const BackHere: Story = { render: () => <Opened {...APPLE} startAt="back" /> };

/** Back here with a second value under the key ID, typed and optional: the team's vendor number, digits. */
export const BackHereWithDetail: Story = {
  render: () => (
    <Opened
      {...APPLE}
      startAt="back"
      handIn={{
        kind: 'file',
        accept: '.p8',
        hint: 'The file Apple offered: AuthKey_<Key ID>.p8',
        field: { label: 'Key ID', fromName: /^AuthKey_([A-Z0-9]{10})\.p8$/ },
        detail: {
          label: 'Vendor number',
          hint: 'Only for a Sales key: digits, on Payments and Financial Reports.',
          inputMode: 'numeric',
        },
      }}
    />
  ),
};

/** A new key for an agent that holds one. */
export const Replacing: Story = { render: () => <Opened {...APPLE} replacing /> };

/** Meta: Crewlet can make it with the company's admin token; the steps by hand fold under the button. */
export const MetaMakeItForMe: Story = { render: () => <Opened {...META} /> };

/** Meta at its limit: the button says why not, and the steps by hand stand open. */
export const MetaAtTheLimit: Story = {
  render: () => (
    <Opened
      {...META}
      make={{
        ...META.make!,
        body: 'With the company’s admin token. 10 of 10 system users used.',
        disabledReason: 'Meta has no room for another system user: 10 of 10 are used.',
      }}
      caution={
        <Callout variant="warning" title="No room at Meta">
          Growth Marketer stays on the company&apos;s system user until one is freed.
        </Callout>
      }
    />
  ),
};

/** Google Play: a person adds the agent's Google identity at the product, and brings nothing back. */
export const GooglePlayInvited: Story = {
  render: () => (
    <Opened
      {...APPLE}
      vendor="Google Play"
      why="Google Play then records what the agent does under its own Google identity."
      steps={[
        { text: <VendorText parts={[{ text: 'Open ' }, { ui: ['Users and permissions'], url: 'https://play.google.com/console/users-and-permissions' }, { text: ', then press ' }, { ui: ['Invite new users'] }, { text: '.' }]} /> },
        {
          text: 'Email address:',
          copy: {
            label: "Google identity's email",
            value: 'crewlet-growth-3fa91c@example-identity.iam.gserviceaccount.com',
            rule: "Google's rule: lowercase letters, digits and hyphens, 6 to 30.",
          },
        },
        { text: <VendorText parts={[{ ui: ['App permissions'] }, { text: ': add the agent’s apps, with ' }, { ui: ['View app information'] }, { text: ' and ' }, { ui: ['Reply to reviews'] }, { text: '.' }]} /> },
        { text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Invite user'] }, { text: '. Google can take up to 48 hours to apply it.' }]} /> },
      ]}
      note="Only an Admin of the developer account can invite users."
      handIn={{ kind: 'nothing', text: 'Nothing to bring back: Crewlet checks that the identity was added.' }}
      reads={[
        { id: 'mint', label: 'Sign in as the identity' },
        { id: 'apps', label: "Read each of the agent's apps" },
      ]}
    />
  ),
};

/** Expo: the robot's token, pasted. */
export const ExpoToken: Story = {
  render: () => (
    <Opened
      {...APPLE}
      vendor="Expo"
      why="Expo then records the agent's builds and submissions under its own robot."
      steps={[
        { text: <VendorText parts={[{ text: 'Open ' }, { ui: ['Access tokens', 'Robots'], url: 'https://expo.dev/settings/access-tokens' }, { text: '.' }]} /> },
        { text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Create robot'] }, { text: '.' }]} />, copy: { label: "robot's name", value: 'crewlet-growth' } },
        { text: <VendorText parts={[{ ui: ['Role'] }, { text: ': ' }, { ui: ['Developer'] }, { text: '.' }]} /> },
        { text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Create token'] }, { text: ', and copy it.' }]} /> },
      ]}
      note={undefined}
      handIn={{ kind: 'token', label: 'Robot token', hint: 'Expo shows it once.' }}
      reads={[
        { id: 'who', label: 'Read who the token is' },
        { id: 'role', label: 'Read its role' },
      ]}
    />
  ),
};

/** Presses Next, then Check, on a sheet with nothing to bring back. */
async function runCheck() {
  const press = async (name: string) => {
    for (let i = 0; i < 20; i++) {
      const found = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
        (b) => b.textContent === name,
      );
      if (found) {
        found.click();
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await press('Next');
  await press('Check');
}

const INVITED: AgentIdentitySheetProps = {
  ...APPLE,
  handIn: { kind: 'nothing', text: 'Nothing to bring back: Crewlet reads the key it already holds.' },
};

/** The check under way: nothing is said done before it answers. */
export const Checking: Story = {
  render: () => <Opened {...INVITED} onCheck={() => new Promise(() => {})} />,
  play: runCheck,
};

/** The check answered: every read done, and Done. */
export const Works: Story = {
  render: () => <Opened {...INVITED} onCheck={answer(WORKS, 300)} />,
  play: runCheck,
};

/** The check stopped at the role: the read marked, the rest unmade, and Try again. */
export const WrongRole: Story = {
  render: () => <Opened {...INVITED} onCheck={answer(WRONG_ROLE, 300)} />,
  play: runCheck,
};

/** Apple refused at the first read: that read says why, and the rest did not run. */
export const RefusedAtSignIn: Story = {
  render: () => <Opened {...INVITED} onCheck={answer(UNSIGNED_AGREEMENT, 300)} />,
  play: runCheck,
};

/** The check did not finish: the error said, Crewlet kept nothing. */
export const DidNotFinish: Story = {
  render: () => <Opened {...INVITED} onCheck={() => Promise.reject(new Error('The engine did not answer in time.'))} />,
  play: runCheck,
};

/** A page no step names keeps its button under the steps. */
export const PageNoStepNames: Story = {
  render: () => (
    <Opened
      {...APPLE}
      steps={[{ text: <VendorText parts={[{ text: 'Press ' }, { ui: ['Generate'] }, { text: '.' }]} /> }]}
      link={{ label: 'Open Team Keys', href: 'https://appstoreconnect.apple.com/access/integrations/api' }}
    />
  ),
};
