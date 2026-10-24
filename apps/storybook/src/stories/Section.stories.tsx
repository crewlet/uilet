import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, Container, Count, Eyebrow, Section, Text } from '@crewlethq/ui';

const meta: Meta<typeof Section> = {
  title: 'UI/Section',
  component: Section,
  argTypes: {
    spacing: { control: 'inline-radio', options: ['none', 'tight', 'compact', 'sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof Section>;

/**
 * THE DEFAULT: a console band, no vertical padding and one gap, because a
 * marketing band between each pair of panels puts one panel per viewport. The
 * heading takes the level where the section sits, and the card inside it goes
 * one deeper. Nothing here names a spacing.
 */
export const AConsoleBand: Story = {
  args: {
    title: 'Coding runs',
    description: 'every run in the last hour',
    actions: (
      <Button variant="secondary" size="small">
        Refresh
      </Button>
    ),
  },
  render: (args) => (
    <Section {...args}>
      <Card>
        <Card.Header>
          <Card.Title>node-a</Card.Title>
        </Card.Header>
        <Card.Body>
          <Text variant="caption">Three runs settled, one in flight.</Text>
        </Card.Body>
      </Card>
    </Section>
  ),
};

/**
 * TIGHT: one small step between each heading and what it names, for a summary
 * whose sections stand as close as a list's group headings do. A heading may
 * carry the kit's `Count` of what is under it.
 */
export const Tight: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', maxWidth: 640 }}>
      <Section spacing="tight" title="Needs a look">
        <Text variant="caption">The key Crewlet holds for GitLab expires in 3 days.</Text>
      </Section>
      <Section
        spacing="tight"
        title={
          <>
            In use <Count value={2} />
          </>
        }
      >
        <Card>
          <Card.Body>
            <Text variant="caption">Crewlet Works and Crewlet Knowledge.</Text>
          </Card.Body>
        </Card>
      </Section>
    </div>
  ),
};

/** The marketing bands, which a page that wants one asks for by name. */
export const MarketingBands: Story = {
  render: () => (
    <div>
      {(['sm', 'md', 'lg'] as const).map((spacing) => (
        <Section
          key={spacing}
          spacing={spacing}
          style={{ borderBottom: '1px solid var(--color-border-default)' }}
        >
          <Container size="lg">
            <Eyebrow variant="accent">SPACING {spacing.toUpperCase()}</Eyebrow>
            <Text as="p" tone="secondary">
              Container centres the content to a shared measure; Section owns the rhythm between
              bands.
            </Text>
          </Container>
        </Section>
      ))}
    </div>
  ),
};
