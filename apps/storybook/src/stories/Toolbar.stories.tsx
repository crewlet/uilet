import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { FullscreenExitGlyph, FullscreenGlyph, RedoGlyph, UndoGlyph } from '@crewlethq/icons/glyphs';
import { Button, IconButton, Menu, Spacer, Stack, Toolbar, useFullscreen } from '@crewlethq/ui';

const meta: Meta<typeof Toolbar> = {
  title: 'UI/Toolbar',
  component: Toolbar,
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

/** A segmented group of the shape a toolbar holds: one stop, its own options. */
function Segmented({ label, options }: { label: string; options: string[] }) {
  const [value, setValue] = useState(options[0]);
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', gap: 2 }}>
      {options.map((option) => (
        <Button
          key={option}
          role="radio"
          size="small"
          variant={value === option ? 'secondary' : 'tertiary'}
          aria-checked={value === option}
          tabIndex={value === option ? 0 : -1}
          onClick={() => setValue(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

/**
 * The builder's own row: one tab stop, arrows between the controls, and the
 * wide half folded into a menu below the shell breakpoint.
 */
export const BuilderToolbar: Story = {
  render: function BuilderToolbarStory() {
    const canvas = useRef<HTMLDivElement>(null);
    const { supported, active, toggle } = useFullscreen(canvas);
    return (
      <div ref={canvas} style={{ background: 'var(--color-surface-background)', padding: 'var(--spacing-4)' }}>
        <Toolbar label="Organization builder">
          <Segmented label="Builder view" options={['Canvas', 'Outline']} />
          <Toolbar.Wide>
            <IconButton label="Undo" size="sm" icon={<UndoGlyph size="sm" />} />
            <IconButton label="Redo" size="sm" icon={<RedoGlyph size="sm" />} />
            <Button size="small" variant="tertiary">
              Expand all
            </Button>
            <Button size="small" variant="tertiary">
              Collapse all
            </Button>
          </Toolbar.Wide>
          <Toolbar.Overflow>
            <Menu
              label="More builder actions"
              items={[
                { key: 'undo', label: 'Undo', onSelect: () => {} },
                { key: 'redo', label: 'Redo', onSelect: () => {} },
                { key: 'expand', label: 'Expand all', onSelect: () => {} },
                { key: 'collapse', label: 'Collapse all', onSelect: () => {} },
              ]}
            />
          </Toolbar.Overflow>
          <Spacer />
          {supported ? (
            <IconButton
              label={active ? 'Leave fullscreen' : 'Fullscreen'}
              size="sm"
              icon={active ? <FullscreenExitGlyph size="sm" /> : <FullscreenGlyph size="sm" />}
              onClick={toggle}
            />
          ) : null}
          <Button size="small">Review and save</Button>
        </Toolbar>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Tab reaches the row once. The arrows walk it, Home and End jump to the ends, and the view
          group keeps its own options until its last one.
        </p>
      </div>
    );
  },
};

/** A filter bar: group mode, because a text field never gives the arrows back. */
export const StickyFilters: Story = {
  render: () => (
    <Stack gap={0}>
      <Toolbar label="Filters" mode="group" sticky>
        <input aria-label="Filter by name" placeholder="Filter by name" />
        <Button size="small" variant="tertiary">
          State
        </Button>
        <Button size="small" variant="tertiary">
          Unit
        </Button>
      </Toolbar>
      {Array.from({ length: 24 }, (_, row) => (
        <p key={row} style={{ color: 'var(--color-text-secondary)' }}>
          Row {row + 1}
        </p>
      ))}
    </Stack>
  ),
};
