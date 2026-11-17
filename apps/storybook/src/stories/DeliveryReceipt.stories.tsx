import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Avatar,
  AvatarStack,
  ChatMessage,
  Composer,
  DeliveryReceipt,
  SendButton,
} from "@crewlethq/ui";
import { BothThemes } from "../BothThemes";

/**
 * Who a person's message reached and who answered, as a quiet mark in a
 * message's footer whose facts open in the kit tooltip on hover, keyboard
 * focus or a press: a dashed circle while nobody has answered, a check once
 * somebody has (with the count while others are still to answer), a warning
 * where it reached no agent. Over a composer, the same receipt in the future
 * tense says who a post will reach, drawn as their faces.
 */
const meta: Meta<typeof DeliveryReceipt> = {
  title: "UI/DeliveryReceipt",
  component: DeliveryReceipt,
};

export default meta;
type Story = StoryObj<typeof DeliveryReceipt>;

/** The room's answerer was reached and has not answered yet. */
export const Reached: Story = {
  args: { recipients: [{ id: "pm", name: "pm" }], sentAt: "10:42" },
};

/** The answerer replied in the thread. */
export const Answered: Story = {
  args: {
    recipients: [{ id: "sre", name: "Site Reliability Engineer", answered: true, answeredAt: "10:44" }],
    sentAt: "10:42",
  },
};

/** One of three answered: the check, and the count of those who have. */
export const PartlyAnswered: Story = {
  args: {
    recipients: [
      { id: "pm", name: "pm", answered: true, answeredAt: "10:43" },
      { id: "qa", name: "qa", reason: "every message" },
      { id: "sre", name: "sre", reason: "every message" },
    ],
    sentAt: "10:42",
  },
};

/** Nobody was asked: the one raised tone, with what to do about it in the tip. */
export const NoAgent: Story = {
  args: {
    recipients: [],
    hint: "This room has no agent members. Mention an agent to ask it.",
  },
};

const FOLLOWERS = [
  "Senior App Engineer",
  "Senior Backend Engineer",
  "Senior Product Designer",
  "Quality Lead",
  "Release Manager",
  "Support Lead",
  "Site Reliability Engineer",
].map((name, i) => ({
  id: `seat-${i}`,
  name,
  reason: "every message",
  answered: i === 6,
  answeredAt: i === 6 ? "10:51" : undefined,
}));

/** Every state in a message footer, in both palettes. */
export const EveryState: Story = {
  render: () => (
    <BothThemes>
      <div style={{ display: "flex", gap: "var(--spacing-5)", alignItems: "center" }}>
        <DeliveryReceipt recipients={[{ id: "pm", name: "pm" }]} sentAt="10:42" />
        <DeliveryReceipt recipients={FOLLOWERS} sentAt="10:42" />
        <DeliveryReceipt recipients={[{ id: "pm", name: "pm", answered: true, answeredAt: "10:44" }]} sentAt="10:42" />
        <DeliveryReceipt recipients={[]} hint="Mention an agent to ask it." />
      </div>
    </BothThemes>
  ),
};

/** Under a person's message, in its footer. */
export const InAMessage: Story = {
  render: () => (
    <ChatMessage
      id="m1"
      label="Ana, 10:42"
      avatar={<Avatar name="Ana" kind="human" size="md" />}
      author="Ana"
      time="10:42"
      timeTitle="Saturday, November 1, 10:42"
      footer={<DeliveryReceipt recipients={FOLLOWERS} sentAt="10:42" />}
    >
      @channel can somebody check why the release notes job failed overnight?
    </ChatMessage>
  ),
};

function DraftOverComposer() {
  const [value, setValue] = useState("");
  const named = value.includes("@pm");
  return (
    <div style={{ display: "grid", gap: "var(--spacing-1)", maxWidth: 560 }}>
      <DeliveryReceipt
        tense="draft"
        announce
        recipients={named ? [{ id: "pm", name: "Product Manager" }] : []}
        faces={named ? <AvatarStack size="xs" decorative members={[{ id: "pm", name: "Product Manager" }]} /> : undefined}
        hint={named ? undefined : "This room has no agent members. Mention an agent to ask it."}
      />
      <Composer
        appearance="chat"
        label="Message #design"
        sendHint={false}
        value={value}
        onChange={setValue}
        placeholder="Message #design (type @pm)"
        trailing={
          <SendButton
            mode="send"
            disabledReason={value.trim() === "" ? "Write a message first" : undefined}
            onPress={() => setValue("")}
          />
        }
      />
    </div>
  );
}

/** Over a composer: who the post will reach, announced politely as it changes. */
export const OverAComposer: Story = { render: () => <DraftOverComposer /> };
