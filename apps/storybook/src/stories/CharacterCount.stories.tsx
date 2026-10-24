import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Announcer, CharacterCount, FormField, Textarea, countCharacters } from '@crewlethq/ui';

/**
 * UI / CharacterCount.
 *
 * How much of a limit a text has used: quiet within it, the warning ink from
 * nine tenths of the way, the danger ink past it. A soft limit: nothing is
 * cut, and the count says by how much the text is over.
 */
const meta: Meta<typeof CharacterCount> = {
  title: 'UI/CharacterCount',
  component: CharacterCount,
  parameters: { layout: 'padded' },
  args: { length: 120, max: 500, announce: false },
};

export default meta;
type Story = StoryObj<typeof CharacterCount>;

export const Within: Story = {};

export const Near: Story = { args: { length: 470 } };

export const Over: Story = { args: { length: 512 } };

/** On a field, through `FormField`'s `limit`: at the end of the help line, and part of the field's description. */
export const OnAField: Story = {
  render: () => {
    function Demo() {
      const [text, setText] = useState(
        'Make splitting shared expenses so easy that nobody ever has to chase a friend for money again.',
      );
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <FormField
            label="Mission"
            helper="One sentence on what the company is for."
            limit={{ length: countCharacters(text), max: 120 }}
          >
            {(field) => (
              <Textarea
                id={field.id}
                aria-describedby={field.describedBy}
                error={field.invalid}
                autoResize
                rows={2}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            )}
          </FormField>
        </div>
      );
    }
    return <Demo />;
  },
};
