import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import {
  Button,
  SourceEditor,
  type SourceEditorHandle,
  type SourceMark,
} from "@crewlethq/ui";

/**
 * Source text written in place: a monospaced field with a line gutter, and the
 * lines a checker named marked in the gutter and behind the text. Tab indents;
 * Escape, then Tab, leaves the field.
 */
const meta: Meta<typeof SourceEditor> = {
  title: "UI/SourceEditor",
  component: SourceEditor,
};

export default meta;
type Story = StoryObj<typeof SourceEditor>;

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Offsite venue poll</title>
    <script src="https://example.com/poll.js"></script>
  </head>
  <body>
    <h1>Where should we go?</h1>
    <ul id="options"></ul>
    <script>
      localStorage.setItem("voted", "yes");
    </script>
  </body>
</html>`;

const MARKS: SourceMark[] = [
  {
    line: 6,
    tone: "danger",
    message: "A script from another origin that is not on the allowlist",
  },
  {
    line: 12,
    tone: "warning",
    message: "Browser storage keeps state for one viewer only",
  },
];

function Editor({ initial = PAGE, marks = [] as SourceMark[] }) {
  const [text, setText] = useState(initial);
  const editor = useRef<SourceEditorHandle>(null);
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
      <SourceEditor
        ref={editor}
        label="Page source"
        value={text}
        onChange={setText}
        marks={marks}
        rows={16}
      />
      {marks.length > 0 ? (
        <div style={{ display: "flex", gap: 8 }}>
          {marks.map((m) => (
            <Button
              key={m.line}
              size="small"
              variant="secondary"
              onClick={() => editor.current?.revealLine(m.line)}
            >
              Go to line {m.line}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const Default: Story = { render: () => <Editor /> };

/** A refusal and a piece of advice, each on its line; the buttons reveal them. */
export const WithFindings: Story = { render: () => <Editor marks={MARKS} /> };

export const Empty: Story = { render: () => <Editor initial="" /> };

/** Filling a fixed-height pane: the field scrolls and the gutter follows it. */
function Tall() {
  const [text, setText] = useState(
    Array.from({ length: 80 }, (_, i) => `<p>Line ${i + 1}</p>`).join("\n"),
  );
  return (
    <div style={{ height: 320, maxWidth: 720 }}>
      <SourceEditor
        label="Page source"
        value={text}
        onChange={setText}
        fill
        marks={[{ line: 40, tone: "danger" }]}
      />
    </div>
  );
}

export const Fill: Story = { render: () => <Tall /> };
