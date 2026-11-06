import type { Meta, StoryObj } from '@storybook/react-vite';
import { EntityChip } from '@crewlethq/ui';
import { BothThemes } from '../BothThemes';

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

/**
 * Who a seat reports to, as a table value draws it: the smallest badge at the
 * cell's 11px, an agent drawn as its character in its hue (`character`,
 * `hue`), and a person by their initials, or their picture (`src`). The name
 * keeps one line and is cut with an ellipsis in a narrow cell.
 */
export const WithAFace: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: 'grid', gap: 'var(--spacing-2)', width: 160, fontSize: 'var(--font-size-2xs)' }}>
        <EntityChip name="Product Lead" href="#/seats/product-lead" size="xs" character="hexlet" hue="purple" />
        <EntityChip name="Release Manager" href="#/seats/release-manager" size="xs" character="prismlet" hue="cyan" />
        <EntityChip name="Avery Stone" kind="human" href="#/seats/avery" size="xs" />
        <EntityChip name="Chief Executive Officer of Operations" href="#/seats/ceo" size="xs" character="crewlet" />
      </div>
    </BothThemes>
  ),
};
