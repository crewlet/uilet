import type { Meta, StoryObj } from '@storybook/react-vite';
import { CopyGlyph } from '@crewlethq/icons/glyphs';
import { Button, ButtonLink, RefusalCard } from '@crewlethq/ui';

/**
 * A request the person's own access does not allow: the action as the title,
 * Not permitted as a neutral Tag (nothing went wrong), the access it needs and
 * what the person holds, and always "Nothing changed.". The foot holds only
 * what the person can do themselves.
 */
const meta: Meta<typeof RefusalCard> = {
  title: 'UI/RefusalCard',
  component: RefusalCard,
  decorators: [(Story) => <div style={{ maxWidth: 388 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof RefusalCard>;

const actions = (
  <>
    <Button variant="secondary" size="small" leadingIcon={<CopyGlyph />}>
      Copy a request to an admin
    </Button>
    <ButtonLink href="#/docs/access" variant="ghost" size="small">
      About access
    </ButtonLink>
  </>
);

export const MissingAccess: Story = {
  args: {
    title: 'File a task',
    children: 'Filing tasks needs Tracker access, and your role includes Knowledge only. The assistant acts with your access, so it did not file the task.',
    actions,
  },
};

export const WithAHeadingSentence: Story = {
  args: {
    title: 'Pause agent',
    heading: 'You do not have permission to pause this agent.',
    children: 'Pausing an agent needs Operator access, and your role includes Tracker only.',
    actions,
  },
};

export const NotFound: Story = {
  args: { title: 'Open task', children: 'It is not there any more. Somebody may have removed or moved it.' },
};
