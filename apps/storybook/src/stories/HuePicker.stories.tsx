import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HuePicker, type NodeHue } from "@crewlethq/ui";

/**
 * The choice of an entity's hue: the six node hues as chips, each a swatch
 * and the hue's name, because a swatch alone is a choice some readers cannot
 * make.
 */
const meta: Meta<typeof HuePicker> = {
  title: "UI/HuePicker",
  component: HuePicker,
};

export default meta;
type Story = StoryObj<typeof HuePicker>;

function Chosen() {
  const [hue, setHue] = useState<NodeHue>("cyan");
  return <HuePicker label="Color" value={hue} onValueChange={setHue} />;
}

export const Default: Story = { render: () => <Chosen /> };

/** Read only: the chosen hue is still shown, and nothing takes focus or a press. */
export const Disabled: Story = {
  render: () => <HuePicker label="Color" value="rose" onValueChange={() => {}} disabled />,
};
