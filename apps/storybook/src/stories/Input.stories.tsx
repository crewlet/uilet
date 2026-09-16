import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Button,
  FormField,
  FormRow,
  FormSection,
  Input,
  InputAffix,
  Kbd,
  Label,
  ReadOnlyField,
  Textarea,
} from '@crewlethq/ui';
import { SearchGlyph } from '@crewlethq/icons/glyphs';

/**
 * The form row, in the register the product reads it in.
 *
 * A LABEL IS A MICRO-LABEL: 11px, medium, opened up and uppercased, on the
 * tertiary step, so the column of labels is taken in one pass and the eye
 * stops at the values. A field is a single line inset by one scale step,
 * exactly a control step tall, so it lines up with the button and the select
 * beside it at every density. Switch the theme and the density in the toolbar
 * above: nothing here carries a number of its own.
 */
const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

const column: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  maxWidth: 520,
};

/*
 * Every field is NAMED, and none of them by its placeholder. A placeholder is
 * the example of the shape a value takes and it is gone the moment somebody
 * types, so a field named by one is a field with no name for the reader who
 * needs it most. The reference box here had none at all, which axe found on
 * the first run over this story.
 */
export const Sizes: Story = {
  render: () => (
    <div style={column}>
      <Input aria-label="Medium field" placeholder="Medium, the form step" />
      <Input inputSize="sm" aria-label="Small field" placeholder="Small, the toolbar step" />
      <Input appearance="reference" aria-label="Secret reference" defaultValue="${SLACK_BOT_TOKEN}" />
      <Input appearance="command" aria-label="Command palette search" placeholder="Search anything" />
    </div>
  ),
};

export const Widths: Story = {
  render: () => (
    <div style={column}>
      <Input width="xs" placeholder="xs, a filter" />
      <Input width="sm" placeholder="sm, a search box" />
      <Input width="md" placeholder="md, a form field" />
      <Input width="lg" placeholder="lg" />
    </div>
  ),
};

export const Slots: Story = {
  render: () => (
    <div style={column}>
      <Input type="search" leading={<SearchGlyph />} placeholder="Search seats" aria-label="Search seats" />
      <Input trailing={<Kbd subtle>Enter</Kbd>} placeholder="Add a responsibility" aria-label="Add" />
      <FormField label="Site" helper="Where the engine reaches your instance." describedBy="story-affix">
        {(field) => (
          <Input
            id={field.id}
            aria-describedby={field.describedBy}
            leading={<InputAffix id="story-affix" text="https://" />}
            placeholder="acme.atlassian.net"
          />
        )}
      </FormField>
    </div>
  ),
};

/**
 * The case the family exists for: a refusal does not take the line that says
 * what a valid value looks like away with it.
 */
export const HelpBesideError: Story = {
  render: () => (
    <div style={column}>
      <FormField
        label="Workspace"
        required
        helper="The subdomain, not the whole address."
        error="That workspace does not exist."
      >
        {(field) => (
          <Input
            id={field.id}
            aria-describedby={field.describedBy}
            aria-required={field.required}
            error={field.invalid}
            defaultValue="https://acme.slack.com"
          />
        )}
      </FormField>
    </div>
  ),
};

export const Sections: Story = {
  render: () => {
    function Demo() {
      const [name, setName] = useState('Software Engineer');
      return (
        <div style={{ ...column, maxWidth: 640 }}>
          <FormSection title="Identity" hint="What this seat is called everywhere it appears.">
            <FormRow columns={2}>
              <FormField label="Name" required>
                {(field) => (
                  <Input
                    id={field.id}
                    aria-required={field.required}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                )}
              </FormField>
              <ReadOnlyField
                label="Handle"
                value="software-engineer"
                reason="Derived from the name."
                mono
              />
            </FormRow>
            <FormField label="Backstory" optional labelAction={<Button size="small" variant="tertiary">Generate</Button>}>
              {(field) => <Textarea id={field.id} rows={3} placeholder="A few sentences." />}
            </FormField>
          </FormSection>
          <FormSection title="Schedule" hint="When the seat wakes up on its own." divided>
            <FormField as="fieldset" label="Windows" helper="Every window is in the company's time zone.">
              <Label as="span">Nothing scheduled yet.</Label>
            </FormField>
          </FormSection>
        </div>
      );
    }
    return <Demo />;
  },
};
