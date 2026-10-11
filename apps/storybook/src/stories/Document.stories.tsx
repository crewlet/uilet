import type { Meta, StoryObj } from '@storybook/react-vite';
import { Document, DocumentTitle } from '@crewlethq/ui';

/**
 * UI / Document.
 *
 * Rendered markdown, set as a document. The parser is the application's: it
 * emits plain semantic elements and this draws them, so every size here is a
 * step on the type ramp. A task item is recognised by the checkbox it starts
 * with and a wide table by the element it scrolls in, so a renderer gets both
 * by emitting the markup it would emit anyway.
 */
const meta: Meta<typeof Document> = {
  title: 'UI/Document',
  component: Document,
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['md', 'sm'] },
    measure: { control: 'inline-radio', options: ['normal', 'none'] },
  },
};

export default meta;
type Story = StoryObj<typeof Document>;

function Body() {
  return (
    <>
      <p>
        How FairSplit turns a group&apos;s expenses into the fewest payments that settle everyone, and why the MVP uses a
        greedy pass rather than the <a href="#exact">exact minimum</a>.
      </p>
      <h2 id="net-balances">Net balances</h2>
      <p>
        For each member, the balance is what they paid minus what they owe. Balances are <code>int</code> cents and
        always sum to zero, which the ledger asserts after every expense.
      </p>
      <h3 id="greedy">Greedy simplification</h3>
      <ol>
        <li>Sort debtors and creditors by the size of their balance, largest first.</li>
        <li>The largest debtor pays the largest creditor the smaller of the two amounts.</li>
        <li>Remove whoever reaches zero and repeat until every balance is zero.</li>
      </ol>
      <ul>
        <li>
          <input type="checkbox" checked disabled aria-label="Done" readOnly />
          <div>Balances sum to zero after every expense.</div>
        </li>
        <li>
          <input type="checkbox" disabled aria-label="Not done" readOnly />
          <div>Exact minimum settlement, if Miles approves it in FAIR-1.</div>
        </li>
      </ul>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroller a keyboard must be able to reach (WCAG 2.1.1) */}
      <div tabIndex={0} role="region" aria-label="Table: worked example">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ana</td>
              <td>+54.99</td>
            </tr>
            <tr>
              <td>Ben</td>
              <td>-24.99</td>
            </tr>
          </tbody>
        </table>
      </div>
      <blockquote>Settlement: Cy pays Ana $30.00, then Ben pays Ana $24.99.</blockquote>
      <pre>
        <code>PYTHONPATH=src python3 -m unittest discover -s tests -v</code>
      </pre>
      <hr />
      <p>
        <strong>Complexity.</strong> Sorting dominates: O(n log n) for n members.
      </p>
    </>
  );
}

/** A page read on its own: its title above, and the body on the reading measure. */
export const Page: Story = {
  render: (args) => (
    <article>
      <DocumentTitle>Settlement algorithm</DocumentTitle>
      <div style={{ height: 'var(--spacing-5)' }} />
      <Document {...args}>
        <Body />
      </Document>
    </article>
  ),
};

/** Read beside other things: a comment, a preview in a side pane, a result's peek. */
export const Small: Story = {
  args: { size: 'sm' },
  render: (args) => (
    <Document {...args}>
      <Body />
    </Document>
  ),
};
