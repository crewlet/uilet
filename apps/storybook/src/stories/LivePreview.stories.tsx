import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { ArtifactKindGround, Document, LivePreview, LivePreviewBudgetProvider, PreviewScale, useLivePreview } from '@crewlethq/ui';

const meta: Meta<typeof LivePreview> = {
  title: 'UI/LivePreview',
  component: LivePreview,
};

export default meta;
type Story = StoryObj<typeof LivePreview>;

/** Content that says it has drawn as soon as it mounts. */
function Page({ title }: { title: string }) {
  const preview = useLivePreview();
  useEffect(() => preview.ready(), [preview]);
  return (
    <div style={{ padding: 40, background: 'var(--color-surface-background)', minHeight: '100%', boxSizing: 'border-box' }}>
      <Document measure="none">
        <h1>{title}</h1>
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
 * The live layer is inert and hidden from assistive technology.
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
 * THE BUDGET: twenty-four previews in a scroller with a budget of four.
 * Only the boxes near the scroller's viewport that are granted a slot draw
 * live; the rest draw the kind's stand-in, and scrolling hands the slots on.
 */
export const Budget: Story = {
  render: () => (
    <LivePreviewBudgetProvider max={4}>
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
