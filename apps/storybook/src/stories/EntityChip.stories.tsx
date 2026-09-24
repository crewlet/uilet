import type { Meta, StoryObj } from '@storybook/react-vite';
import { EntityChip } from '@crewlethq/ui';

const meta: Meta<typeof EntityChip> = {
  title: 'UI/EntityChip',
  component: EntityChip,
  args: { name: 'Carlos Diaz', href: '#/seats/carlos', kind: 'agent', size: 'sm' },
  argTypes: {
    kind: { control: 'inline-radio', options: ['agent', 'human'] },
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    href: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof EntityChip>;

export const Basic: Story = {};

/**
 * A human seat's badge is a circle where an agent's is a squircle: the engine
 * does not run it, which is structure and not status, so it is the outline
 * that says so rather than a hue.
 */
export const HumanSeat: Story = {
  args: { name: 'Ada Byron', kind: 'human' },
};

/** Without a target the chip is text: a name with its badge, and no affordance. */
export const NotALink: Story = {
  args: { href: undefined },
};

/**
 * A NAME IS NEVER DRAWN IN THE ACCENT. The accent means "where the reader is",
 * and a list where every name carries it leaves the one thing that IS their
 * position indistinguishable from the rest.
 */
export const InAList: Story = {
  render: () => (
    <ul style={{ display: 'grid', gap: 8, listStyle: 'none', margin: 0, padding: 0, maxWidth: 280 }}>
      {[
        ['Chief Executive', 'agent'],
        ['Chief Technology Officer', 'agent'],
        ['Software Engineer', 'agent'],
        ['Ada Byron', 'human'],
      ].map(([name, kind]) => (
        <li key={name}>
          <EntityChip name={name!} kind={kind as 'agent' | 'human'} href={`#/seats/${name}`} />
        </li>
      ))}
    </ul>
  ),
};

/** Long names truncate rather than wrapping the row they sit in. */
export const Truncating: Story = {
  render: () => (
    <div style={{ width: 180, border: '1px dashed var(--color-border-default)', padding: 8 }}>
      <EntityChip name="Customer Success Operations Lead" href="#/seats/cs-ops" />
    </div>
  ),
};
