import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CrewletCharacterId } from "@crewlethq/icons/characters";
import {
  Avatar,
  CharacterPicker,
  FormField,
  HuePicker,
  type NodeHue,
} from "@crewlethq/ui";

/**
 * The choice of an agent's Crewlet character, previewed in its hue. A radio
 * group laid out in rows of six: Left and Right walk the characters, Up and
 * Down move a row, and the chosen badge carries the kit's selected ring.
 */
const meta: Meta<typeof CharacterPicker> = {
  title: "UI/CharacterPicker",
  component: CharacterPicker,
};

export default meta;
type Story = StoryObj<typeof CharacterPicker>;

function Chosen() {
  const [character, setCharacter] = useState<CrewletCharacterId>("hexlet");
  return (
    <CharacterPicker
      label="Character"
      value={character}
      hue="cyan"
      onValueChange={setCharacter}
    />
  );
}

export const Default: Story = { render: () => <Chosen /> };

function Editor() {
  const [character, setCharacter] = useState<CrewletCharacterId>("chatlet");
  const [hue, setHue] = useState<NodeHue>("rose");
  return (
    <div style={{ display: "grid", gap: "var(--spacing-4)", maxWidth: 420 }}>
      <Avatar name="Support Lead" character={character} hue={hue} size={96} />
      <FormField label="Character" as="fieldset">
        <CharacterPicker
          label="Character"
          value={character}
          hue={hue}
          onValueChange={setCharacter}
        />
      </FormField>
      <FormField label="Color" as="fieldset">
        <HuePicker label="Color" value={hue} onValueChange={setHue} />
      </FormField>
    </div>
  );
}

/** The two pickers as a seat editor composes them, with the badge they make. */
export const SeatEditor: Story = { render: () => <Editor /> };
