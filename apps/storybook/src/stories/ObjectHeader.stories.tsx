import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlugGlyph, UserGlyph } from '@crewlethq/icons/glyphs';
import { VendorMark } from '@crewlethq/icons';
import { ArtifactIcon, Button, ObjectHeader, Tag } from '@crewlethq/ui';

const meta: Meta<typeof ObjectHeader> = {
  title: 'UI/ObjectHeader',
  component: ObjectHeader,
  args: {
    kind: 'Person',
    icon: <UserGlyph size="xs" />,
    identifier: 'lee',
    title: 'Lee Park',
    status: <Tag variant="success">Active</Tag>,
    actions: (
      <>
        <Button size="small" variant="secondary">
          Change access
        </Button>
        <Button size="small" variant="ghost">
          Suspend
        </Button>
      </>
    ),
    facts: [
      { label: 'Seat', value: 'Operations lead', href: '#/agents/ops' },
      { label: 'Access', value: 'Worklet, Doclet' },
      {
        label: 'Stage',
        value: 'Active',
        setBy: { actor: 'jane.founder', ago: '2h ago', turnHref: '#/live/turns/t-1' },
      },
      { label: 'Signed in', value: '11 minutes ago', note: 'on 2 devices' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof ObjectHeader>;

/**
 * The header of an object on its page: the eyebrow says what kind of thing it
 * is and its key, the head row carries the name, its state and what the reader
 * can do, and the fact line is the object's values, scanned in a second. A
 * fact's note and who set it follow its own value.
 */
export const Page: Story = {};

/** In a peek the header is tighter, and a peek with a properties rail under it passes no facts. */
export const Peek: Story = { args: { size: 'peek', facts: undefined } };

/**
 * A token is never split, a set of chips takes two tracks, and a phrase gets
 * two lines before it is cut.
 */
export const FactKinds: Story = {
  args: {
    kind: 'Event',
    icon: undefined,
    identifier: 'evt_01HZX',
    title: 'A guard stopped the turn',
    status: <Tag variant="danger">Refused</Tag>,
    actions: undefined,
    facts: [
      { label: 'Type', value: 'turn.guard_breach', token: true },
      { label: 'Runtime', value: 'not running on this node, last seen on node-b' },
      {
        label: 'Roles',
        set: true,
        value: (
          <>
            <Tag>ingress</Tag> <Tag>seats</Tag> <Tag>workers</Tag>
          </>
        ),
      },
    ],
  },
};

/**
 * An artifact's header: its own icon word drawn as a glyph (the kind's glyph
 * when the word names nothing), and the sentence its author wrote under the
 * title.
 */
export const WithDescription: Story = {
  args: {
    kind: 'Sheet',
    icon: <ArtifactIcon icon="chart" kind="sheet" size="xs" />,
    identifier: undefined,
    title: 'Pipeline health',
    description: 'Where every open deal stands this week, and who holds the next step.',
  },
};

/**
 * WITH A MARK: the object's own mark on a plate beside the header, for an
 * integration's page. The facts line under it carries what the engine counts.
 */
export const WithMark: Story = {
  args: {
    kind: 'Integration',
    icon: <PlugGlyph size="xs" />,
    identifier: 'slack',
    mark: <VendorMark vendor="slack" size={36} />,
    title: 'Slack',
    status: <Tag variant="success">Connected</Tag>,
    description: 'Each agent posts as its own bot.',
    facts: [
      { label: 'Agents ready', value: '2 of 2' },
      { label: 'Delivered', value: '279' },
      { label: 'Last checked', value: '4m ago' },
    ],
  },
};
