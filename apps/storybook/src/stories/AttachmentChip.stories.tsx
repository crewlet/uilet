import type { Meta, StoryObj } from '@storybook/react-vite';
import { AttachmentChip, Composer, SendButton } from '@crewlethq/ui';
import { useState } from 'react';

/**
 * A file attached to a message: a Tag whose leading mark is the file's
 * thumbnail, drawn only as an `<img>`. It shows the spinner while the file
 * uploads and the danger tone when it was refused, with the state said in
 * words after the name, and a remove control while it can still be taken off.
 */
const meta: Meta<typeof AttachmentChip> = {
  title: 'UI/AttachmentChip',
  component: AttachmentChip,
  decorators: [(Story) => <div style={{ maxWidth: 388, paddingInline: 16 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof AttachmentChip>;

const THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill-opacity="0.35"/><circle cx="12" cy="12" r="5" fill-opacity="0.08"/></svg>');

/** Every state: ready with a thumbnail, uploading, refused, and sent (no remove). */
export const EveryState: Story = {
  render: () => (
    // Centred on the row, as a composer's attachments row stands them: a sent
    // chip has no remove control and is 2px shorter than the chips that act.
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <AttachmentChip name="screenshot.png" preview={THUMB} onRemove={() => {}} />
      <AttachmentChip name="dashboard.webp" preview={THUMB} state="uploading" onRemove={() => {}} />
      <AttachmentChip name="too-large.png" state="failed" onRemove={() => {}} />
      <AttachmentChip name="sent-with-question.png" preview={THUMB} />
    </div>
  ),
};

/** In a composer's attachments row. */
export const InAComposer: Story = {
  render: function InAComposer() {
    const [value, setValue] = useState('What is wrong on this screen?');
    const [files, setFiles] = useState(['screenshot.png', 'error.png']);
    return (
      <Composer
        label="Ask the assistant"
        value={value}
        onChange={setValue}
        submitOn="enter"
        attachments={files.map((name) => (
          <AttachmentChip key={name} name={name} preview={THUMB} onRemove={() => setFiles(files.filter((f) => f !== name))} />
        ))}
        trailing={<SendButton mode="send" onPress={() => {}} />}
      />
    );
  },
};
