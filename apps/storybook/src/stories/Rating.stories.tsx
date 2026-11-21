import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { Rating } from '@crewlethq/ui';
import { themeScope } from '../themeScope';

/**
 * A star rating, read only: a review's stars, or an app's average to the
 * nearest half star, named by its exact figure. The stars take the text's
 * ink and the control edge, never the warning hue.
 */
const meta: Meta<typeof Rating> = {
  title: 'UI/Rating',
  component: Rating,
  args: { value: 4 },
};

export default meta;
type Story = StoryObj<typeof Rating>;

const panel: CSSProperties = {
  background: 'var(--color-surface-background)',
  color: 'var(--color-text-primary)',
  padding: 'var(--spacing-5)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
  display: 'grid',
  gap: 'var(--spacing-3)',
};

export const OneReview: Story = {};
export const Average: Story = { args: { value: 4.6, showValue: true } };

export const Scale: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ ...panel, ...themeScope(theme) }}>
          {[0, 1, 2.5, 3.7, 4.2, 5].map((value) => (
            <Rating key={value} value={value} showValue />
          ))}
          <Rating value={3} size="xs" />
          <Rating value={3} size="md" />
        </div>
      ))}
    </div>
  ),
};
