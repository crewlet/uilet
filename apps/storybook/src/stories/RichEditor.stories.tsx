import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, DocumentTitle, RichEditor, type RichEditorCommand } from '@crewlethq/ui';
import { FileTextGlyph } from '@crewlethq/icons/glyphs';

/**
 * UI / RichEditor.
 *
 * Markdown edited in place: the page looks the same while it is edited as
 * when it is read, because the editable element is set by `Document`. Type
 * a slash for blocks, select text for the formatting toolbar, or write the
 * Markdown itself (`# `, `- `, `1. `, `[ ] `, `> `, three backticks, `---`,
 * `**bold**`) and it becomes the block or the format it spells.
 *
 * The value stays Markdown, and a load and a save with no edit change no
 * byte of it: the panel under each story shows the body as it would be saved.
 */
const meta: Meta<typeof RichEditor> = {
  title: 'UI/RichEditor',
  component: RichEditor,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof RichEditor>;

const BODY = `Friends, roommates and travel groups pay for shared things unevenly, and **settling up** is the part nobody enjoys.

## MVP scope

- Record expenses: who paid, how much and who shared it.
- Print net balances and the *fewest payments* that settle the group.
  - Round to the cent.

1. Parse the ledger
2. Compute balances

- [x] Agree the data model
- [ ] Ship the command line

> [!TIP]
> Keep the ledger in plain text, so a person can read it without the tool.

> Every split is a fraction of one expense, never of the group's total.

\`\`\`ts
export function settle(balances: Map<string, number>): Payment[] {
  return greedy(balances);
}
\`\`\`

| Person | Paid | Owes |
|---|---:|---:|
| Ana | 120 | 40 |
| Ben | 0 | 80 |

---

Read [the design notes](https://example.com/notes) or the [runbook](#/knowledge/pages/runbook).
`;

function Editing({ initial, commands, disabled }: { initial: string; commands?: RichEditorCommand[]; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 760 }}>
      <DocumentTitle>Split modes</DocumentTitle>
      <RichEditor value={value} onChange={setValue} label="The body of Split modes" commands={commands} disabled={disabled} />
      <details>
        <summary>The body as it would be saved</summary>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{value}</pre>
      </details>
    </div>
  );
}

export const Default: Story = {
  render: () => <Editing initial={BODY} />,
};

export const Empty: Story = {
  render: () => <Editing initial="" />,
};

/** Read only, as the editor stands while a merge waits for the writer to settle it. */
export const Disabled: Story = {
  render: () => <Editing initial={BODY} disabled />,
};

const LINK_A_PAGE: RichEditorCommand = {
  key: 'link-page',
  label: 'Link to a page',
  description: 'A page of this company, by its title',
  icon: <FileTextGlyph />,
  keywords: ['page', 'wiki', 'link'],
  panel: (api) => (
    <div style={{ display: 'grid', gap: 8 }}>
      {['Runbook', 'Onboarding', 'Release process'].map((title) => (
        <Button key={title} variant="ghost" size="small" onClick={() => api.insertLink(title, `#/knowledge/pages/${title.toLowerCase().replace(/\s+/g, '-')}`)}>
          {title}
        </Button>
      ))}
    </div>
  ),
};

/** An entry of the application's own in the slash menu: type `/link`. */
export const WithACommand: Story = {
  render: () => <Editing initial={BODY} commands={[LINK_A_PAGE]} />,
};
