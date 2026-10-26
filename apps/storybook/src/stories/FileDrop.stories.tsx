import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FileDrop, FilePickButton, Textarea, type PickedFile } from "@crewlethq/ui";

/**
 * Where files are dropped: a target of its own with its pickers, or a region
 * (an editor, a pane) that takes files dropped on it. Folders are walked, and
 * a picker is always the keyboard's way in.
 */
const meta: Meta<typeof FileDrop> = {
  title: "UI/FileDrop",
  component: FileDrop,
};

export default meta;
type Story = StoryObj<typeof FileDrop>;

function Picked({ files }: { files: PickedFile[] }) {
  if (files.length === 0) return null;
  return (
    <ul style={{ margin: "12px 0 0", fontSize: 13 }}>
      {files.map((f) => (
        <li key={f.path}>
          {f.path} ({f.file.size.toLocaleString()} bytes)
        </li>
      ))}
    </ul>
  );
}

function TargetDemo() {
  const [files, setFiles] = useState<PickedFile[]>([]);
  return (
    <div style={{ maxWidth: 520 }}>
      <FileDrop
        title="Drop an HTML file or a folder"
        hint="Pages, stylesheets, scripts and pictures, up to 25 files"
        onFiles={setFiles}
        actions={
          <>
            <FilePickButton
              size="small"
              variant="secondary"
              accept=".html,.htm,.css,.js,.mjs,.json,.svg,.png,.jpg,.jpeg,.gif,.webp"
              onFiles={setFiles}
            >
              Choose files
            </FilePickButton>
            <FilePickButton
              size="small"
              variant="ghost"
              directory
              onFiles={setFiles}
            >
              Choose a folder
            </FilePickButton>
          </>
        }
      />
      <Picked files={files} />
    </div>
  );
}

export const Target: Story = { render: () => <TargetDemo /> };

/** A region: nothing is drawn until files are held over it. */
function RegionDemo() {
  const [files, setFiles] = useState<PickedFile[]>([]);
  return (
    <div style={{ maxWidth: 520 }}>
      <FileDrop
        title="Drop to replace the source"
        hint="An .html file, or a folder holding index.html"
        onFiles={setFiles}
      >
        {/* The package's own field, so the region is shown over a real
            editor rather than a native box with its text against the edge. */}
        <Textarea aria-label="Source" rows={8} defaultValue="<!doctype html>" />
      </FileDrop>
      <Picked files={files} />
    </div>
  );
}

export const Region: Story = { render: () => <RegionDemo /> };

export const Disabled: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <FileDrop
        title="Drop an HTML file or a folder"
        hint="You cannot make artifacts in this company"
        disabled
        onFiles={() => {}}
        actions={
          <FilePickButton
            size="small"
            variant="secondary"
            disabled
            onFiles={() => {}}
          >
            Choose files
          </FilePickButton>
        }
      />
    </div>
  ),
};
