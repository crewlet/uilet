import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CREWLET_CHARACTERS,
  CREWLET_CHARACTER_GEOMETRY,
  CrewletCharacter,
  type CrewletCharacterId,
} from "@crewlethq/icons";

/**
 * The thirty Crewlet characters an agent can be drawn as, every one cut from
 * the mark's own rules: the 45 degree corner, the keyline, the visor with two
 * slits, the notched crown and the block legs.
 *
 * A character is drawn in the current text colour and framed square on what it
 * draws, so it is centred in whatever box it is given. `@crewlethq/ui`'s
 * `Avatar` draws one on a plate in an agent's hue; this catalog draws them
 * bare, at full detail and compact.
 */
const meta: Meta<typeof CrewletCharacter> = {
  title: "Icons/CrewletCharacter",
  component: CrewletCharacter,
  args: { character: "hexlet", detail: "full" },
  argTypes: {
    character: { control: "select", options: [...CREWLET_CHARACTERS] },
    detail: { control: "inline-radio", options: ["full", "compact"] },
  },
};

export default meta;
type Story = StoryObj<typeof CrewletCharacter>;

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: "var(--spacing-3)",
};
const tile: CSSProperties = {
  margin: 0,
  display: "grid",
  justifyItems: "center",
  gap: "var(--spacing-2)",
  padding: "var(--spacing-3)",
  border: "1px solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
  color: "var(--color-brand-mark)",
};

const Tile = ({
  id,
  detail,
}: {
  id: CrewletCharacterId;
  detail: "full" | "compact";
}) => (
  <figure style={tile}>
    <CrewletCharacter character={id} detail={detail} width={72} height={72} />
    <figcaption
      style={{
        textAlign: "center",
        color: "var(--color-text-secondary)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
        {CREWLET_CHARACTER_GEOMETRY[id].name}
      </div>
      {CREWLET_CHARACTER_GEOMETRY[id].shape}
    </figcaption>
  </figure>
);

export const Playground: Story = {
  render: (args) => (
    <div style={{ color: "var(--color-brand-mark)" }}>
      <CrewletCharacter {...args} width={160} height={160} />
    </div>
  ),
};

/** Every character at full detail: the keyline and the visor gap drawn. */
export const Catalog: Story = {
  render: () => (
    <div style={grid}>
      {CREWLET_CHARACTERS.map((id) => (
        <Tile key={id} id={id} detail="full" />
      ))}
    </div>
  ),
};

/** Every character compact, as an avatar under 56px draws it: no keyline, no visor gap. */
export const Compact: Story = {
  render: () => (
    <div style={grid}>
      {CREWLET_CHARACTERS.map((id) => (
        <Tile key={id} id={id} detail="compact" />
      ))}
    </div>
  ),
};
