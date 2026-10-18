import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, DiffList, Document, VersionCompare, type VersionCompareLens } from '@crewlethq/ui';

const meta: Meta<typeof VersionCompare> = {
  title: 'UI/VersionCompare',
  component: VersionCompare,
};

export default meta;
type Story = StoryObj<typeof VersionCompare>;

const BEFORE = ['# Release checklist', '', 'Run the migrations.', 'Tag the release.', 'Announce in the team channel.'].join('\n');
const AFTER = ['# Release checklist', '', 'Run the migrations on staging first.', 'Tag the release.', 'Post the notes.', 'Announce in the team channel.'].join('\n');

/** A page's revision against the one before it: the line diff, or the revision's full text. */
export const DocumentRevision: Story = {
  render: function Render() {
    const [lens, setLens] = useState<VersionCompareLens>('changes');
    return (
      <div style={{ maxWidth: 720 }}>
        <VersionCompare
          title="Revision 5"
          fromLabel="rev 4"
          toLabel="rev 5"
          lens={lens}
          onLensChange={setLens}
          before={BEFORE}
          after={AFTER}
          to={<Document size="sm">Run the migrations on staging first. Tag the release. Post the notes.</Document>}
          labels={{ versions: 'Full text' }}
          actions={
            <Button size="small" variant="ghost">
              Back to the page
            </Button>
          }
        />
      </div>
    );
  },
};

/**
 * Two versions of a page artifact: the files that changed, drawn by the host,
 * or both versions side by side.
 */
export const ArtifactVersions: Story = {
  render: function Render() {
    const [lens, setLens] = useState<VersionCompareLens>('changes');
    return (
      <VersionCompare
        fromLabel="Version 3"
        toLabel="Version 5"
        description="What changed between them"
        lens={lens}
        onLensChange={setLens}
        changes={
          <DiffList
            rows={[
              { kind: 'changed', path: 'index.html', from: 'text/html, 4.1 KB', to: 'text/html, 4.6 KB' },
              { kind: 'added', path: 'chart.js', to: 'text/javascript, 12 KB' },
            ]}
          />
        }
        note="Both versions show today's data: a page's data is live and is not versioned with it."
        from={<div style={{ padding: 24, border: '1px dashed currentColor' }}>Version 3 frame</div>}
        to={<div style={{ padding: 24, border: '1px dashed currentColor' }}>Version 5 frame</div>}
      />
    );
  },
};

/** Two identical texts are said in words. */
export const Identical: Story = {
  args: { fromLabel: 'rev 2', toLabel: 'rev 3', lens: 'changes', before: BEFORE, after: BEFORE },
};
