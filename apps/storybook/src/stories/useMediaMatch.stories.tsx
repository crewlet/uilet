import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMediaMatch } from '@crewlethq/ui';

/**
 * `useMediaMatch(query)`: whether a media query matches, read during render
 * and again whenever it changes. Resize the canvas across 640px, or switch the
 * system to reduced motion, to watch the answers change.
 */
function Answers() {
  const phone = useMediaMatch('(width < 640px)');
  const touch = useMediaMatch('(hover: none) and (pointer: coarse)');
  const still = useMediaMatch('(prefers-reduced-motion: reduce)');
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'max-content auto', gap: 'var(--spacing-2) var(--spacing-4)' }}>
      <dt>(width &lt; 640px)</dt>
      <dd style={{ margin: 0 }}>{phone ? 'Matches: a phone layout' : 'No match: the wide layout'}</dd>
      <dt>(hover: none) and (pointer: coarse)</dt>
      <dd style={{ margin: 0 }}>{touch ? 'Matches: touch is the primary input' : 'No match'}</dd>
      <dt>(prefers-reduced-motion: reduce)</dt>
      <dd style={{ margin: 0 }}>{still ? 'Matches' : 'No match'}</dd>
    </dl>
  );
}

const meta: Meta<typeof Answers> = {
  title: 'UI/useMediaMatch',
  component: Answers,
};

export default meta;
type Story = StoryObj<typeof Answers>;

export const LiveAnswers: Story = {};
