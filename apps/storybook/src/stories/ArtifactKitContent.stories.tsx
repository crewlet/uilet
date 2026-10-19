import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
// The document baseline kit.css carries, and the kit's content stylesheet, as
// text: `?raw` gives the bytes a browser parses, so the preview below reads
// exactly the rules an artifact page links.
import baseCss from '@crewlethq/tokens/css/base?raw';
import contentCss from '../../../../packages/artifact-kit/src/content.css?raw';

/**
 * A page's own markup under the kit's content stylesheet, in a shadow root of
 * its own. The stylesheet styles element selectors, so loaded into the preview
 * itself it would restyle every other story and Storybook's own docs; in the
 * shadow root it reaches only this page. The tokens are inherited from the
 * preview's root, so the toolbar's mode, theme and density repaint it exactly
 * as `theme.js` repaints an artifact page.
 */
function ArtifactPage({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useLayoutEffect(() => {
    const element = host.current;
    if (element) setRoot(element.shadowRoot ?? element.attachShadow({ mode: 'open' }));
  }, []);
  return (
    <div ref={host}>
      {root
        ? createPortal(
            <>
              <style>{`${baseCss}\n${contentCss}\n.page { max-width: 760px; color: var(--color-text-primary); font-family: var(--font-family-sans); font-size: var(--font-size-compact); line-height: var(--font-line-height-body); }`}</style>
              <main className="page">{children}</main>
            </>,
            root,
          )
        : null}
    </div>
  );
}

const meta: Meta<typeof ArtifactPage> = {
  title: 'Artifact kit/Content stylesheet',
  component: ArtifactPage,
  parameters: {
    docs: {
      description: {
        component:
          'The opt-in `content.css` of `@crewlethq/artifact-kit`: the design system\'s look for the plain HTML an artifact page writes itself. A page links it after `kit.css` (`/_crewlet/kit/<version>/content.css`). Every rule weighs only its element, so a class of the page\'s own wins, and nothing the kit draws (a `<crewlet-sheet>`, any `crewlet-` class) or the author marks `data-crewlet-content="off"` is touched.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ArtifactPage>;

/** Running text, headings, lists, a quote, code and a rule. */
export const Reading: Story = {
  render: () => (
    <ArtifactPage>
      <h1>Quarterly vendor review</h1>
      <p>
        A paragraph with a <a href="#tables">link</a>, <strong>strong words</strong>, <em>emphasis</em>, <mark>a highlight</mark>,{' '}
        <small>small print</small>, <abbr title="Service level agreement">SLA</abbr>, <del>a removed figure</del>, inline{' '}
        <code>vendor_scorecard</code>, sample output <samp>exit 0</samp> and a shortcut <kbd>Ctrl</kbd> + <kbd>K</kbd>.
      </p>
      <p>A second paragraph, a gap below the first, as every block that follows another is.</p>
      <h2>Second level</h2>
      <h3>Third level</h3>
      <p>Body text under a heading sits closer to it than to the section above.</p>
      <h4>Fourth level</h4>
      <h5>Fifth level</h5>
      <h6>Sixth level</h6>
      <ul>
        <li>Contract renewals due in November</li>
        <li>
          Security questionnaires
          <ul>
            <li>Two returned, one outstanding</li>
          </ul>
        </li>
      </ul>
      <ol>
        <li>Collect the scorecards</li>
        <li>Publish the ranking</li>
      </ol>
      <dl>
        <dt>Owner</dt>
        <dd>Procurement, with finance as reviewer.</dd>
        <dt>Cadence</dt>
        <dd>Quarterly.</dd>
      </dl>
      <blockquote>
        <p>Our vendors are part of our product. A slow vendor is a slow feature.</p>
        <p>Head of operations</p>
      </blockquote>
      <pre>
        <code>{'const score = weights.reduce((sum, w, i) => sum + w * ratings[i], 0);\n// A long line wraps rather than pushing the page sideways: {"vendor":"Northwind","score":8.4}'}</code>
      </pre>
      <hr />
      <details>
        <summary>How the score is computed</summary>
        <p>Each rating is weighted and summed, then rounded to one decimal.</p>
      </details>
    </ArtifactPage>
  ),
};

/** A table with a caption, a head, figures aligned with `data-align` and a foot, in the element it scrolls in. */
export const Tables: Story = {
  render: () => (
    <ArtifactPage>
      <h2 id="tables">Scores</h2>
      <div>
        <table>
          <caption>Scores by vendor, third quarter</caption>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Category</th>
              <th data-align="right">Score</th>
              <th data-align="right">Spend</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Northwind Traders</td>
              <td>Logistics</td>
              <td data-align="right">8.4</td>
              <td data-align="right">€ 412,000</td>
            </tr>
            <tr>
              <td>Contoso Cloud</td>
              <td>Infrastructure</td>
              <td data-align="right">7.9</td>
              <td data-align="right">€ 1,208,500</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td />
              <td data-align="right">8.2</td>
              <td data-align="right">€ 1,620,500</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ArtifactPage>
  ),
};

/** Every form control: fields, a select and a list box, boxes and dots, a slider, a file picker and the buttons. */
export const Form: Story = {
  render: () => (
    <ArtifactPage>
      <form onSubmit={(event) => event.preventDefault()}>
        <fieldset>
          <legend>New vendor</legend>
          <label htmlFor="kit-name">Vendor name</label>
          <input id="kit-name" type="text" placeholder="Northwind Traders" />
          <label htmlFor="kit-email">Contact email</label>
          <input id="kit-email" type="email" defaultValue="ops@northwind.example" />
          <label htmlFor="kit-tier">Tier</label>
          <select id="kit-tier" defaultValue="Gold">
            <option>Gold</option>
            <option>Silver</option>
            <option>Bronze</option>
          </select>
          <label htmlFor="kit-regions">Regions</label>
          <select id="kit-regions" multiple size={3} defaultValue={['Europe']}>
            <option>Europe</option>
            <option>North America</option>
            <option>Asia Pacific</option>
          </select>
          <label htmlFor="kit-notes">Notes</label>
          <textarea id="kit-notes" placeholder="Anything the reviewers should know" />
          <label>
            <input type="checkbox" defaultChecked /> Security review passed
          </label>
          <label>
            <input type="radio" name="kit-pay" defaultChecked /> Pay monthly
          </label>
          <label>
            <input type="radio" name="kit-pay" /> Pay annually
          </label>
          <label htmlFor="kit-risk">Risk appetite</label>
          <input id="kit-risk" type="range" min={0} max={10} defaultValue={4} />
          <label htmlFor="kit-contract">Signed contract</label>
          <input id="kit-contract" type="file" />
        </fieldset>
        <p>
          Progress <progress value={64} max={100} /> and capacity <meter value={0.7}>70%</meter>.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
          <button type="submit">Add vendor</button>
          <button type="button">Save draft</button>
          <button type="reset">Reset</button>
          <button type="button" aria-pressed="true">
            Pinned
          </button>
          <button type="button" disabled>
            Archived
          </button>
        </div>
      </form>
    </ArtifactPage>
  ),
};

/** A class of the page's own outweighs every rule, and a region marked `data-crewlet-content="off"` keeps the baseline. */
export const AuthorStylesWin: Story = {
  render: () => (
    <ArtifactPage>
      <style>{`.chip { padding: 2px 10px; border: 0; border-radius: var(--radius-pill); background: var(--color-node-cyan-fill); color: var(--color-node-cyan-ink); min-height: 0; }`}</style>
      <p>
        <button className="chip" type="button">
          An author-classed chip
        </button>{' '}
        keeps its own padding, radius and fill.
      </p>
      <div data-crewlet-content="off">
        <p>This region opts out and keeps the kit&apos;s baseline.</p>
        <button type="button">Unstyled button</button>
      </div>
    </ArtifactPage>
  ),
};
