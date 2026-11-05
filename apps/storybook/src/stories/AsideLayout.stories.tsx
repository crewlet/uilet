import type { Meta, StoryObj } from '@storybook/react-vite';
import { AsideLayout, Callout, Card, DescriptionList, FormField, Input, Link, Statement, Text } from '@crewlethq/ui';

const EMPTY = { title: 'Nothing written yet', description: 'What would go here, and why it matters.' };

const MAIN = (
  <>
    <Statement label="Mission" empty={EMPTY}>
      Make splitting shared expenses so easy that nobody ever has to chase a friend for money again.
    </Statement>
    <Statement label="Vision" empty={{ ...EMPTY, title: 'No vision yet' }} />
  </>
);

const ASIDE = (
  <>
    <Card>
      <Card.Header>
        <Card.Title>Company</Card.Title>
      </Card.Header>
      <DescriptionList>
        <DescriptionList.Item term="Name">Fairsplit</DescriptionList.Item>
        <DescriptionList.Item term="Clock">Europe/Berlin</DescriptionList.Item>
      </DescriptionList>
    </Card>
    <Text variant="caption">Every agent is given these, word for word, at the start of every turn.</Text>
  </>
);

const meta: Meta<typeof AsideLayout> = {
  title: 'UI/AsideLayout',
  component: AsideLayout,
  args: { asideLabel: 'About the company', aside: ASIDE, children: MAIN },
};

export default meta;
type Story = StoryObj<typeof AsideLayout>;

/** From 56rem of its own width, the aside stands beside the main column. */
export const Wide: Story = {
  render: (args) => (
    <div style={{ width: 1100 }}>
      <AsideLayout {...args} />
    </div>
  ),
};

/** Narrower, the aside follows the main column: the subject first, its facts after it. */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ width: 600 }}>
      <AsideLayout {...args} />
    </div>
  ),
};

/** A detail pane's form, long enough to scroll past a sticky aside. */
const FORM = (
  <>
    {['Connection', 'Access', 'Defaults', 'Notifications'].map((title) => (
      <Card key={title}>
        <Card.Header>
          <Card.Title>{title}</Card.Title>
        </Card.Header>
        <FormField label={`${title} setting`}>{(field) => <Input id={field.id} width="full" />}</FormField>
      </Card>
    ))}
  </>
);

/** The steps a person follows in the vendor's console, beside the form they fill. */
const STEPS = (
  <Callout variant="neutral" title="Setup steps">
    <ol style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
      <li>
        Create an API key in <Link href="https://example.com">the vendor's console</Link>.
      </li>
      <li>Grant it read access to the projects the agents work in.</li>
      <li>Paste the key here and test the connection.</li>
    </ol>
  </Callout>
);

/** A detail pane `width` px wide, in a 420px scroller so a sticky aside has room to stick. */
function pane(width: number): NonNullable<Story['render']> {
  return (args) => (
    <div style={{ width, height: 420, overflowY: 'auto' }}>
      <AsideLayout {...args} />
    </div>
  );
}

const PANE: Story['args'] = { fit: 'pane', sticky: true, asideLabel: 'Setup steps', aside: STEPS, children: FORM };

/**
 * A PANE (`fit="pane"`), in light. From 44rem of its own width the aside stands
 * beside the form, 16rem wide and 16px apart; `sticky` holds it at the top as
 * the form scrolls past.
 */
export const PaneLight: Story = { args: PANE, render: pane(880), globals: { theme: 'light' } };

/** The same pane, in dark. */
export const PaneDark: Story = { args: PANE, render: pane(880), globals: { theme: 'dark' } };

/** Under 44rem, the pane's aside follows the form and does not stick, in light. */
export const PaneNarrowLight: Story = { args: PANE, render: pane(560), globals: { theme: 'light' } };

/** The same narrow pane, in dark. */
export const PaneNarrowDark: Story = { args: PANE, render: pane(560), globals: { theme: 'dark' } };

/**
 * WITHOUT AN ASIDE the form takes the pane's whole width, in light. It stays
 * the same element as an aside comes and goes, so nothing in it is redrawn.
 */
export const WithoutAsideLight: Story = {
  args: { ...PANE, aside: undefined },
  render: pane(880),
  globals: { theme: 'light' },
};

/** The same pane without an aside, in dark. */
export const WithoutAsideDark: Story = {
  args: { ...PANE, aside: undefined },
  render: pane(880),
  globals: { theme: 'dark' },
};
