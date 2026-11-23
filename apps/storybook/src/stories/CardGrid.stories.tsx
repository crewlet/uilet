import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardGrid, DescriptionList, Text } from '@crewlethq/ui';

const meta: Meta<typeof CardGrid> = {
  title: 'UI/CardGrid',
  component: CardGrid,
  args: { columns: 2, min: 'lg' },
};

export default meta;
type Story = StoryObj<typeof CardGrid>;

const SignIn = ({ footer = false }: { footer?: boolean }) => (
  <Card padding="none">
    <Card.Header actions={<Button size="small" variant="secondary">Renew token</Button>}>
      <Card.Title>Sign-in</Card.Title>
    </Card.Header>
    <Card.Body>
      <DescriptionList
        dense
        items={[
          ['Method', 'Subscription token'],
          ['Secret', 'CLAUDE_CODE_OAUTH_TOKEN'],
          ['Value', 'sk-ant-oat01-...ugAA'],
          ['Stored', 'Nov 23, 2026'],
          ['Expires', 'Nov 23, 2027'],
        ]}
      />
      <Text as="p" variant="caption" tone="tertiary">
        A token made on your own computer, for your own subscription. The value is never shown again.
      </Text>
    </Card.Body>
    {footer ? (
      <Card.Footer>
        <Button size="small" variant="ghost">
          Remove
        </Button>
      </Card.Footer>
    ) : null}
  </Card>
);

const Answers = ({ footer = false }: { footer?: boolean }) => (
  <Card padding="none">
    <Card.Header actions={<Button size="small" variant="secondary">Test now</Button>}>
      <Card.Title>Answers</Card.Title>
    </Card.Header>
    <Card.Body>
      <DescriptionList dense items={[['Last answered', '13s ago']]} />
    </Card.Body>
    {footer ? (
      <Card.Footer>
        <Button size="small" variant="secondary">
          Test now
        </Button>
      </Card.Footer>
    ) : null}
  </Card>
);

/** The short card ends where the tall one does, with no hole under it. */
export const ShortBesideTall: Story = {
  render: (args) => (
    <CardGrid {...args}>
      <SignIn />
      <Answers />
    </CardGrid>
  ),
};

/** Each footer stays at its card's foot, so the actions of one row line up. */
export const WithActions: Story = {
  render: (args) => (
    <CardGrid {...args}>
      <SignIn footer />
      <Answers footer />
    </CardGrid>
  ),
};

/** A card with nothing in its body yet, and a card of raw children, still fill the row. */
export const EmptyBody: Story = {
  args: { columns: 3, min: 'md' },
  render: (args) => (
    <CardGrid {...args}>
      <SignIn />
      <Card padding="none">
        <Card.Header>
          <Card.Title>Usage</Card.Title>
        </Card.Header>
        <Card.Body />
      </Card>
      <Card>No calls this week.</Card>
    </CardGrid>
  ),
};

/** A card wrapped in a focus target (a deep link's landing) fills its cell as well. */
export const Wrapped: Story = {
  render: (args) => (
    <CardGrid {...args}>
      <section tabIndex={-1} aria-label="Sign-in">
        <SignIn />
      </section>
      <Answers />
    </CardGrid>
  ),
};

/** Narrower than two cards at `min`, one card per row, each its own height. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 360 }}>{Story()}</div>],
  render: (args) => (
    <CardGrid {...args}>
      <SignIn footer />
      <Answers footer />
    </CardGrid>
  ),
};
