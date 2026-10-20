import type { Meta, StoryObj } from "@storybook/react-vite";
import { FindingList } from "@crewlethq/ui";

/**
 * What a checker found: refusals first, then advice, each with where it is.
 * A row with `onSelect` is a button that takes the reader there.
 */
const meta: Meta<typeof FindingList> = {
  title: "UI/FindingList",
  component: FindingList,
};

export default meta;
type Story = StoryObj<typeof FindingList>;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <FindingList
        label="Problems in the page"
        findings={[
          {
            key: "1",
            tone: "danger",
            location: "index.html, line 6",
            message:
              "The script loads https://example.com/poll.js, another origin. Load it from an allowlisted CDN at an exact version, or upload it with the page.",
            onSelect: () => {},
          },
          {
            key: "2",
            tone: "danger",
            location: "index.html, line 14",
            message: "The form posts to another origin.",
            onSelect: () => {},
          },
          {
            key: "3",
            tone: "warning",
            location: "index.html",
            message:
              "The page has no viewport meta, so it renders at desktop width on a phone.",
          },
        ]}
      />
    </div>
  ),
};

export const AdviceOnly: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <FindingList
        label="Advice for the page"
        findings={[
          {
            key: "1",
            tone: "warning",
            location: "app.js, line 3",
            message:
              "Browser storage keeps state for one viewer on one device. Use the page’s own state instead.",
            onSelect: () => {},
          },
        ]}
      />
    </div>
  ),
};
