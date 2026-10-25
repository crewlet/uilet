import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Announcer, Button, ListInput, withDraft } from '@crewlethq/ui';

const meta: Meta<typeof ListInput> = {
  title: 'UI/ListInput',
  component: ListInput,
};

export default meta;
type Story = StoryObj<typeof ListInput>;

/**
 * The order is the meaning: the first policy is read first. Enter in the new
 * box appends, Enter in an item moves on, Alt+Arrow reorders, and every
 * change is announced.
 */
export const Goals: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['Ship the beta', 'Hire two engineers']);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput
            label="Goals"
            itemName="goal"
            value={value}
            onChange={setValue}
            helper="The first goal is the one the unit reads first."
            placeholder="Add a goal"
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/** Items that are paragraphs, where Shift+Enter is a newline. */
export const Multiline: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState([
        'Never merge to main without a review from somebody outside the change.',
      ]);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput
            multiline
            label="Policies"
            itemName="policy"
            value={value}
            onChange={setValue}
            placeholder="Add a policy"
          />
        </div>
      );
    }
    return <Demo />;
  },
};

export const WithError: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['']);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput
            label="Responsibilities"
            itemName="responsibility"
            value={value}
            onChange={setValue}
            helper="One sentence each."
            error="A responsibility cannot be empty."
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * A company's standing policies as the Principles page edits them: one line
 * each, wrapped so a long one reads whole; each row dragged by its grip as
 * well as moved by Alt+Arrow and the buttons; a limit on how many there are
 * and how long each may be; a refusal said under the one item it is about;
 * and the legend hidden, as under the card's own title, with the add
 * control beside the box.
 */
export const Policies: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState([
        'Every amount is exact to the cent. Round only when a person reads it.',
        'Ask before deleting anything a customer wrote.',
        'Never move money without a second agent checking the amount and the recipient.',
      ]);
      return (
        <div style={{ width: 640 }}>
          <Announcer />
          <ListInput
            reorderByDrag
            hideLabel
            maxItems={5}
            maxLength={120}
            label="Standing policies"
            itemName="policy"
            value={value}
            onChange={setValue}
            placeholder="Add a policy"
            itemError={(_, text) =>
              value.filter((other) => other.trim() === text.trim()).length > 1 ? 'This policy is listed twice.' : undefined
            }
          />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * Removing a policy leaves its place with Undo, and the focus on Undo, until
 * the list next changes. The legend is hidden, as inside a card whose title
 * already names the list.
 */
export const UndoARemoval: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['Ask first.', 'Every amount is exact to the cent.', 'Name the source.']);
      return (
        <div style={{ width: 560 }}>
          <Announcer />
          <ListInput multiline undoRemove hideLabel label="Standing policies" itemName="policy" value={value} onChange={setValue} />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * A typed policy survives Save: the owner holds the new-item box's text
 * (`draft`), counts it as unsaved, and saves it with `withDraft`, so text
 * typed and not yet added is never dropped.
 */
export const ATypedPolicySurvivesSave: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState(['Ask first.']);
      const [draft, setDraft] = useState('Name the source of every figure.');
      const [saved, setSaved] = useState<string[] | null>(null);
      return (
        <form
          style={{ width: 560, display: 'grid', gap: 12 }}
          onSubmit={(event) => {
            event.preventDefault();
            const next = withDraft(value, draft);
            setValue(next);
            setDraft('');
            setSaved(next);
          }}
        >
          <Announcer />
          <ListInput multiline label="Standing policies" itemName="policy" value={value} onChange={setValue} draft={draft} onDraftChange={setDraft} />
          <div>
            <Button type="submit" size="small">
              Save
            </Button>
          </div>
          {saved ? <output>Saved {saved.length} policies.</output> : null}
        </form>
      );
    }
    return <Demo />;
  },
};

/**
 * The same list in a phone's card (340px): under 28rem of the list's own
 * width each row gives its words the row, and its buttons stand on a line
 * under them, so a policy wraps at the card's width rather than at twenty
 * characters.
 */
export const PoliciesOnAPhone: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState([
        'Every amount is exact to the cent. Round only when a person reads it.',
        'Ask before deleting anything a customer wrote.',
        'Never move money without a second agent checking the amount and the recipient.',
      ]);
      return (
        <div style={{ width: 340 }}>
          <Announcer />
          <ListInput reorderByDrag hideLabel undoRemove label="Standing policies" itemName="policy" value={value} onChange={setValue} />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * AT THE MOST IT MAY HOLD. With `maxItems` the help line ends in how many the
 * list holds of it ("5 of 5"), and once full the box gives way to one plain
 * sentence: "That's the most. Remove one to add another." Two lists stacked
 * full width, as the brand's voice is written.
 */
export const AtTheMost: Story = {
  render: () => {
    function Demo() {
      const [like, setLike] = useState(['Plain words.', 'Short sentences.', 'Say what changed.', 'Lead with the answer.', 'Name the owner.']);
      const [avoid, setAvoid] = useState(['Jargon.']);
      return (
        <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
          <Announcer />
          <ListInput label="Write like this" itemName="line" optional maxItems={5} value={like} onChange={setLike} helper="Short lines agents copy the tone of." />
          <ListInput label="Avoid" itemName="line" optional maxItems={5} value={avoid} onChange={setAvoid} placeholder="Add a line to avoid" />
        </div>
      );
    }
    return <Demo />;
  },
};
