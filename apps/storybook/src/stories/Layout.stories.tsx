import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container, Section, Eyebrow } from '@crewlethq/ui';

const meta: Meta = {
  title: 'UI/Layout',
};

export default meta;
type Story = StoryObj;

const Band = ({ label }: { label: string }) => (
  <Section spacing="md" style={{ borderBottom: '1px solid var(--color-border-default)' }}>
    <Container size="lg">
      <Eyebrow variant="accent">{label}</Eyebrow>
      <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)' }}>
        Container centers the content to a shared measure; Section owns the vertical rhythm between
        bands.
      </p>
    </Container>
  </Section>
);

export const ContainerAndSection: Story = {
  render: () => (
    <div>
      <Band label="SECTION ONE" />
      <Band label="SECTION TWO" />
      <Band label="SECTION THREE" />
    </div>
  ),
};

export const ContainerSizes: Story = {
  render: () => (
    <Section spacing="sm">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Container
          key={size}
          size={size}
          style={{
            outline: '1px dashed var(--color-border-hover)',
            padding: '12px 24px',
            marginBottom: 12,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family-mono)',
            fontSize: 12,
          }}
        >
          size=&quot;{size}&quot;
        </Container>
      ))}
    </Section>
  ),
};
