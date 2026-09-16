import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Combobox, FormField } from '@crewlethq/ui';

const meta: Meta<typeof Combobox> = {
  title: 'UI/Combobox',
  component: Combobox,
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const SECRETS = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'JIRA_HOST',
  'JIRA_API_TOKEN',
  'GITHUB_APP_PRIVATE_KEY',
];

/**
 * The completion the engine's config fields offer: the names of the sealed
 * entries a company holds. The list is anchored under the field, so opening
 * it moves nothing on the form.
 */
export const Secrets: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      const [open, setOpen] = useState(false);
      const offered = SECRETS.filter((name) => name.toLowerCase().includes(value.toLowerCase()));
      return (
        <div style={{ width: 420 }}>
          <FormField label="Bot token" helper="A value, or the name of a sealed entry.">
            {(field) => (
              <Combobox
                id={field.id}
                aria-describedby={field.describedBy}
                label="Secrets"
                appearance="reference"
                mono
                tabCommits
                placeholder="${SLACK_BOT_TOKEN}"
                value={value}
                onValueChange={(next) => {
                  setValue(next);
                  setOpen(true);
                }}
                options={offered.map((name) => ({ value: name }))}
                open={open}
                onOpenChange={setOpen}
                emptyMessage="Nothing matches"
              />
            )}
          </FormField>
          <p style={{ marginTop: 200, fontSize: 13 }}>
            Nothing below the field moves when the list opens.
          </p>
        </div>
      );
    }
    return <Demo />;
  },
};

/** A row can carry a second line of identity beside its name. */
export const WithHints: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState('');
      const [open, setOpen] = useState(true);
      return (
        <div style={{ width: 420 }}>
          <Combobox
            label="Seats"
            aria-label="Owner"
            placeholder="Search seats"
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setOpen(true);
            }}
            options={[
              { value: 'Software Engineer', hint: 'software-engineer' },
              { value: 'Site Reliability', hint: 'site-reliability' },
              { value: 'Designer', hint: 'designer' },
            ]}
            open={open}
            onOpenChange={setOpen}
          />
        </div>
      );
    }
    return <Demo />;
  },
};
