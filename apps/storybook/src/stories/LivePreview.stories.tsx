import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { ArtifactKindGround, Button, Document, LivePreview, LivePreviewBudgetProvider, PreviewScale, useLivePreview } from '@crewlethq/ui';

const meta: Meta<typeof LivePreview> = {
  title: 'UI/LivePreview',
  component: LivePreview,
};

export default meta;
type Story = StoryObj<typeof LivePreview>;

/**
 * Content that says it has drawn as soon as it mounts, stamped with the
 * moment it rendered: a snapshot keeps the stamp it was taken with, so a
 * preview that rendered again would show a new one.
 */
function Page({ title }: { title: string }) {
  const preview = useLivePreview();
  const [at] = useState(() => new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  useEffect(() => preview.ready(), [preview]);
  return (
    <div style={{ padding: 40, background: 'var(--color-surface-background)', minHeight: '100%', boxSizing: 'border-box' }}>
      <Document measure="none">
        <h1>{title}</h1>
        <p>Drawn at {at}.</p>
        <p>Who answers the pager, how quickly, and what they look at first. The on-call engineer owns the incident until it is handed over in writing.</p>
        <h2>First five minutes</h2>
        <ul>
          <li>Acknowledge the page.</li>
          <li>Open the incident channel and say you are on it.</li>
          <li>Check the dashboards for the service that paged.</li>
        </ul>
      </Document>
    </div>
  );
}

const box = { width: 360, aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border-default)' } as const;

/**
 * A page laid out at 760 pixels, as it would be on its own, then scaled to a
 * 360 pixel box with a transform: the preview is the page itself, smaller.
 * It renders once, out of sight, and what it drew is kept as a still copy
 * that fades in over the stand-in; the content is then unmounted. The copy is
 * inert and hidden from assistive technology.
 */
export const ScaledPage: Story = {
  render: () => (
    <div style={box}>
      <LivePreview width={760} fallback={<ArtifactKindGround kind="doc" />} dwellMs={0}>
        <Page title="On-call handbook" />
      </LivePreview>
    </div>
  ),
};

/**
 * SNAPSHOTS: twenty-four previews in a scroller, no more than three
 * rendering at once. A box starts rendering a little before the scroller
 * shows it; once its content has drawn, it is a still copy with nothing live
 * behind it, and its render goes to the next box. Scroll down and back up:
 * every box keeps the moment it was drawn at, since nothing is ever drawn
 * twice.
 */
export const Snapshots: Story = {
  render: () => (
    <LivePreviewBudgetProvider max={3}>
      <div style={{ height: 420, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 240px)', gap: 16, padding: 4 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} style={{ ...box, width: 240 }}>
            <LivePreview width={760} fallback={<ArtifactKindGround kind="doc" />}>
              <Page title={`Runbook ${i + 1}`} />
            </LivePreview>
          </div>
        ))}
      </div>
    </LivePreviewBudgetProvider>
  ),
};

/** Hidden and shown again under the same provider and key: the same snapshot, with nothing rendered. */
function KeptByKeyDemo() {
  const [shown, setShown] = useState(true);
  return (
    <LivePreviewBudgetProvider>
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <Button size="small" variant="secondary" onClick={() => setShown((was) => !was)}>
          {shown ? 'Hide the card' : 'Show the card'}
        </Button>
        <div style={box}>
          {shown ? (
            <LivePreview width={760} fallback={<ArtifactKindGround kind="doc" />} dwellMs={0} snapshot="handbook:3">
              <Page title="On-call handbook" />
            </LivePreview>
          ) : null}
        </div>
      </div>
    </LivePreviewBudgetProvider>
  );
}

/**
 * KEPT BY KEY: a preview mounted again under the same provider and
 * `snapshot` key (a card back after a filter, or a change of shape) shows the
 * copy it already took, at once and with no fade. A provider mounted afresh
 * (the page loaded again) takes a new one.
 */
export const KeptByKey: Story = {
  render: () => <KeptByKeyDemo />,
};

/** A board of its own size (a phone screen, 390 by 844) fitted whole into a wide box, centred. */
export const ContainedBoard: Story = {
  render: () => (
    <div style={{ ...box, position: 'relative', background: 'var(--color-surface-inset)' }}>
      <PreviewScale width={390} height={844} fit="contain">
        <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-background)', padding: 24, boxSizing: 'border-box' }}>
          <Document measure="none">
            <h1>Sign in</h1>
            <p>Welcome back.</p>
          </Document>
        </div>
      </PreviewScale>
    </div>
  ),
};

/**
 * A LAPTOP'S BOARD FILLS ITS CARD (`fit="fill"`): a 16:10 board in a 16:9
 * box, centred across and held at the top, loses a sliver of its foot rather
 * than leaving an empty strip down each side. A phone's board beside it would
 * lose four fifths of itself filled, so it is contained instead.
 */
export const FilledBoard: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24 }}>
      {[
        { w: 1440, h: 900, title: 'Hero' },
        { w: 390, h: 844, title: 'Sign in' },
      ].map((board) => (
        <div key={board.title} style={{ ...box, position: 'relative', background: 'var(--color-surface-inset)' }}>
          <PreviewScale width={board.w} height={board.h} fit="fill">
            <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-background)', padding: 48, boxSizing: 'border-box', borderInline: '8px solid var(--color-border-hover)' }}>
              <Document measure="none">
                <h1>{board.title}</h1>
                <p>The board's own edges are drawn in a heavier hairline: filled, both reach the card's sides.</p>
              </Document>
            </div>
          </PreviewScale>
        </div>
      ))}
    </div>
  ),
};
