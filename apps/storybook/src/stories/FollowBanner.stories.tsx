import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FollowBanner } from '@crewlethq/ui';

const meta: Meta<typeof FollowBanner> = {
  title: 'UI/FollowBanner',
  component: FollowBanner,
};

export default meta;
type Story = StoryObj<typeof FollowBanner>;

/** Following somebody: Stop, or Escape from anywhere, ends it. */
export const Following: Story = {
  render: function Render() {
    const [following, setFollowing] = useState(true);
    return following ? <FollowBanner name="Maya Ortiz" onStop={() => setFollowing(false)} /> : <p>Not following anybody.</p>;
  },
};

/** The followed person left, and following stopped. */
export const FollowedPersonLeft: Story = {
  render: function Render() {
    const [shown, setShown] = useState(true);
    return shown ? <FollowBanner name="Maya" state="left" onStop={() => {}} onDismiss={() => setShown(false)} /> : <p>Dismissed.</p>;
  },
};
