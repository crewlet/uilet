import type { Meta, StoryObj } from '@storybook/react-vite';
import { AsideLayout, Card, DescriptionList, Statement, Text } from '@crewlethq/ui';

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
