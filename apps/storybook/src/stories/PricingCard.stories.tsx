import type { Meta, StoryObj } from '@storybook/react-vite';
import { PricingCard, Button } from '@crewlethq/ui';
import { TagGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof PricingCard> = {
  title: 'UI/PricingCard',
  component: PricingCard,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PricingCard>;

/*
 * Every plan, price and allowance below is illustrative. The stories show
 * the card's states and slots, not a real price list.
 */
const BasicCard = ({ selected = false, pending = false, unavailable = false, disabled = false, note = 'One workspace with the essentials.' }) => (
  <PricingCard
    selected={selected}
    pending={pending}
    unavailable={unavailable}
    disabled={disabled}
    style={{ width: 280 }}
  >
    <PricingCard.Header>
      <PricingCard.Name>Basic</PricingCard.Name>
      <PricingCard.Tag variant="neutral">EXAMPLE</PricingCard.Tag>
    </PricingCard.Header>
    <PricingCard.Price>
      <PricingCard.Amount>$10</PricingCard.Amount>
      <PricingCard.Cadence>/mo</PricingCard.Cadence>
    </PricingCard.Price>
    <PricingCard.Body>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
        {note}
      </p>
    </PricingCard.Body>
  </PricingCard>
);

export const Default: Story = {
  render: () => <BasicCard />,
};

export const Selected: Story = {
  render: () => <BasicCard selected />,
};

export const Disabled: Story = {
  render: () => <BasicCard disabled />,
};

/**
 * Shown but not selectable right now. The card states the reason in its
 * own content, because the dimmed surface alone does not explain it.
 */
export const Unavailable: Story = {
  render: () => <BasicCard unavailable note="Not available in your region yet." />,
};

export const Pending: Story = {
  render: () => (
    <PricingCard pending style={{ width: 280 }}>
      <PricingCard.Header>
        <PricingCard.Name>Basic</PricingCard.Name>
        <PricingCard.Tag variant="pending">Pending change</PricingCard.Tag>
      </PricingCard.Header>
      <PricingCard.Price>
        <PricingCard.Amount>$10</PricingCard.Amount>
        <PricingCard.Cadence>/mo</PricingCard.Cadence>
      </PricingCard.Price>
      <PricingCard.Body>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          Takes effect at the next renewal.
        </p>
      </PricingCard.Body>
    </PricingCard>
  ),
};

export const Discounted: Story = {
  render: () => (
    <PricingCard selected style={{ width: 280 }}>
      <PricingCard.Header>
        <PricingCard.Name>Standard</PricingCard.Name>
        <PricingCard.Tag variant="top">MOST POPULAR</PricingCard.Tag>
      </PricingCard.Header>
      <PricingCard.Price>
        <PricingCard.Amount strike>$50</PricingCard.Amount>
        <PricingCard.Amount discounted>$45</PricingCard.Amount>
        <PricingCard.Cadence>/mo</PricingCard.Cadence>
        <PricingCard.PriceNote>
          <TagGlyph size="sm" />
          Save $5 (10% off)
        </PricingCard.PriceNote>
      </PricingCard.Price>
      <PricingCard.Body>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          For teams that share several workspaces.
        </p>
      </PricingCard.Body>
    </PricingCard>
  ),
};

export const Grid: Story = {
  render: () => (
    <div style={{ width: 'min(1080px, calc(100vw - 64px))' }}>
      <PricingCard.Grid>
        <PricingCard>
          <PricingCard.Header>
            <PricingCard.Name>Basic</PricingCard.Name>
            <PricingCard.Tag variant="neutral">EXAMPLE</PricingCard.Tag>
          </PricingCard.Header>
          <PricingCard.Price>
            <PricingCard.Amount>$10</PricingCard.Amount>
            <PricingCard.Cadence>/mo</PricingCard.Cadence>
          </PricingCard.Price>
          <PricingCard.Body>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>1 workspace.</p>
          </PricingCard.Body>
        </PricingCard>

        <PricingCard selected>
          <PricingCard.Header>
            <PricingCard.Name>Standard</PricingCard.Name>
            <PricingCard.Tag variant="top">POPULAR</PricingCard.Tag>
          </PricingCard.Header>
          <PricingCard.Price>
            <PricingCard.Amount strike>$50</PricingCard.Amount>
            <PricingCard.Amount discounted>$45</PricingCard.Amount>
            <PricingCard.Cadence>/mo</PricingCard.Cadence>
            <PricingCard.PriceNote>
              <TagGlyph size="sm" />
              Save $5 (10% off)
            </PricingCard.PriceNote>
          </PricingCard.Price>
          <PricingCard.Body>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Up to 5 workspaces.</p>
          </PricingCard.Body>
        </PricingCard>

        <PricingCard>
          <PricingCard.Header>
            <PricingCard.Name>Premium</PricingCard.Name>
          </PricingCard.Header>
          <PricingCard.Price>
            <PricingCard.Amount>$100</PricingCard.Amount>
            <PricingCard.Cadence>/mo</PricingCard.Cadence>
          </PricingCard.Price>
          <PricingCard.Body>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Unlimited workspaces.</p>
          </PricingCard.Body>
        </PricingCard>

        <PricingCard unavailable>
          <PricingCard.Header>
            <PricingCard.Name>Premium Annual</PricingCard.Name>
            <PricingCard.Tag variant="save">SAVE 20%</PricingCard.Tag>
          </PricingCard.Header>
          <PricingCard.Price>
            <PricingCard.Amount>$80</PricingCard.Amount>
            <PricingCard.Cadence>/mo, billed yearly</PricingCard.Cadence>
          </PricingCard.Price>
          <PricingCard.Body>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Not available in your region yet.</p>
          </PricingCard.Body>
        </PricingCard>
      </PricingCard.Grid>
    </div>
  ),
};

export const StaticDisplay: Story = {
  render: () => (
    <PricingCard interactive={false} style={{ width: 280 }}>
      <PricingCard.Header>
        <PricingCard.Name>Standard</PricingCard.Name>
      </PricingCard.Header>
      <PricingCard.Price>
        <PricingCard.Amount>$5</PricingCard.Amount>
        <PricingCard.Cadence>/user / mo</PricingCard.Cadence>
      </PricingCard.Price>
      <PricingCard.Body>
        <ul style={{ paddingLeft: 18, margin: 0, color: 'var(--color-text-secondary)' }}>
          <li>Up to 5 workspaces</li>
          <li>Shared templates</li>
          <li>Email support</li>
        </ul>
      </PricingCard.Body>
      <PricingCard.Footer>
        <Button variant="primary" size="medium" style={{ width: '100%' }}>Choose Standard</Button>
      </PricingCard.Footer>
    </PricingCard>
  ),
};
