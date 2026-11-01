import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Avatar,
  ChatMessage,
  Composer,
  DeliveryReceipt,
  SendButton,
} from "@crewlethq/ui";

/**
 * Who a person's message reached and who answered, in a message's footer:
 * "Reached pm", then "pm answered"; "Reached qa, sre (every message)";
 * "Reached no agent". Over a composer, the same line in the future tense says
 * who a post will reach before it is sent, and warns when it will reach no
 * agent.
 */
const meta: Meta<typeof DeliveryReceipt> = {
  title: "UI/DeliveryReceipt",
  component: DeliveryReceipt,
};

export default meta;
type Story = StoryObj<typeof DeliveryReceipt>;

/** The room's answerer was reached and has not answered yet. */
export const Reached: Story = {
  args: { recipients: [{ id: "pm", name: "pm" }] },
};

/** The answerer replied in the thread. */
export const Answered: Story = {
  args: { recipients: [{ id: "pm", name: "pm", answered: true }] },
};

/** Two seats that follow the room in full, beside one that was mentioned. */
export const ByReason: Story = {
  args: {
    recipients: [
      { id: "pm", name: "pm", answered: true },
      { id: "qa", name: "qa", reason: "every message" },
      { id: "sre", name: "sre", reason: "every message" },
    ],
  },
};

/** Nobody was asked: the one raised tone, with what to do about it. */
export const NoAgent: Story = {
  args: {
    recipients: [],
    hint: "This room has no agent members. Mention an agent to ask it.",
  },
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
      footer={
        <DeliveryReceipt
          recipients={[{ id: "pm", name: "pm", answered: true }]}
        />
      }
    >
      Can somebody check why the release notes job failed overnight?
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
        recipients={named ? [{ id: "pm", name: "pm" }] : []}
        hint={
          named
            ? undefined
            : "This room has no agent members. Mention an agent to ask it."
        }
      />
      <Composer
        appearance="chat"
        label="Message #design"
        submitOn="enter"
        value={value}
        onChange={setValue}
        placeholder="Message #design (type @pm)"
        trailing={
          <SendButton
            mode="send"
            disabledReason={
              value.trim() === "" ? "Write a message first" : undefined
            }
            onPress={() => setValue("")}
          />
        }
      />
    </div>
  );
}

/** Over a composer: who the post will reach, announced politely as it changes. */
export const OverAComposer: Story = { render: () => <DraftOverComposer /> };
