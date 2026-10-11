import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Document, MarkdownEditor, markdownWords } from '@crewlethq/ui';

/**
 * UI / MarkdownEditor.
 *
 * Writing markdown: the source in a monospace field, a formatting bar that
 * writes markdown at the caret, and a Preview drawn as the reader will see it.
 * Every control is a toggle, Command or Control with B and I are bold and
 * italic, and with Enter the caller's submit.
 *
 * The preview renderer is the application's. This story draws headings, list
 * items and paragraphs only, which is enough to show the switch.
 */
const meta: Meta<typeof MarkdownEditor> = {
  title: 'UI/MarkdownEditor',
  component: MarkdownEditor,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof MarkdownEditor>;

function preview(source: string): ReactNode {
  return (
    <Document size="sm" measure="none">
      {source.split(/\n{2,}/).map((block, index) => {
        if (block.startsWith('### ')) return <h3 key={index}>{block.slice(4)}</h3>;
        if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
        if (/^[-*] /.test(block)) {
          return (
            <ul key={index}>
              {block.split('\n').map((line, at) => (
                <li key={at}>{line.replace(/^[-*] /, '')}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block}</p>;
      })}
    </Document>
  );
}

const BODY = `## Problem

Friends, roommates and travel groups pay for shared things unevenly.

## MVP scope

- Record expenses: who paid, how much and who shared it.
- Print net balances and the fewest payments that settle the group.`;

function Editing({ initial, footer }: { initial: string; footer?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      label="The page, in markdown"
      placeholder="Write in markdown. Link a page by its address so the link survives a rename."
      renderPreview={preview}
      actions={(editor) => (
        <Button size="small" variant="ghost" disabled={editor.mode !== 'write'} onClick={() => editor.insert('[Split modes](#/knowledge/pages/split-modes)')}>
          Link a page
        </Button>
      )}
      footer={
        footer ? (
          <>
            <span>{markdownWords(value)} words</span>
            <span>Markdown</span>
          </>
        ) : undefined
      }
    />
  );
}

/** A page being written, with a control of the caller's own on the bar and a footer. */
export const Writing: Story = {
  render: () => <Editing initial={BODY} footer />,
};

/** An empty body, as the composer opens on it. */
export const Empty: Story = {
  render: () => <Editing initial="" />,
};
