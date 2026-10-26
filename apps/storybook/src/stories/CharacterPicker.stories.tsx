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

/*
 * At the width a seat editor gives the grid, as the story below does: the
 * six columns share whatever width they are handed, and across the whole
 * canvas they stood 160px apart, a spacing no surface draws the grid at.
 */
export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Chosen />
    </div>
  ),
};

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
