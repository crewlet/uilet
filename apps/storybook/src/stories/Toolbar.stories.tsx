import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { ChevronRightGlyph, MaximizeGlyph, MinimizeGlyph, RedoGlyph, SearchGlyph, UndoGlyph } from '@crewlethq/icons/glyphs';
import {
  Button,
  IconButton,
  Input,
  Kbd,
  Menu,
  SegmentedControl,
  Select,
  Spacer,
  Stack,
  TimeRangePicker,
  Toolbar,
  useFullscreen,
} from '@crewlethq/ui';

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
          variant={value === option ? 'secondary' : 'ghost'}
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
            <Button size="small" variant="ghost">
              Expand all
            </Button>
            <Button size="small" variant="ghost">
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
              icon={active ? <MinimizeGlyph size="sm" /> : <MaximizeGlyph size="sm" />}
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
        {/* The kit's own field at the small step, so the row's three controls
            stand at one height. */}
        <Input inputSize="sm" width="sm" aria-label="Filter by name" placeholder="Filter by name" />
        <Button size="small" variant="ghost">
          State
        </Button>
        <Button size="small" variant="ghost">
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

/**
 * One row of controls at each step: every control the kit draws in a toolbar
 * stands at that step's height and wears one edge, the field's, so no box in
 * the row reads heavier or taller than its neighbours. The last row is the
 * small step disabled and refused.
 */
function ControlRow({ size, disabled = false, error = false }: { size: 'sm' | 'md'; disabled?: boolean; error?: boolean }) {
  const [window, setWindow] = useState<'1d' | '7d' | '30d'>('7d');
  const [show, setShow] = useState('active');
  return (
    <Toolbar label={`Controls at ${size}${disabled ? ', disabled' : ''}${error ? ', refused' : ''}`} mode="group">
      <TimeRangePicker
        size={size}
        label="Window"
        value={window}
        onChange={setWindow}
        options={[
          { value: '1d', label: '1d' },
          { value: '7d', label: '7d' },
          { value: '30d', label: '30d' },
        ]}
      />
      <SegmentedControl
        size={size}
        label="Show"
        semantics="radio"
        value={show}
        onValueChange={setShow}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'all', label: 'All' },
        ]}
      />
      <Select size={size} width="auto" ariaLabel="Group by" value="due" disabled={disabled} error={error} onChange={() => {}} options={[{ value: 'due', label: 'Due' }]} />
      <Select size={size} width="auto" appearance="quiet" ariaLabel="Kind" value="any" disabled={disabled} onChange={() => {}} options={[{ value: 'any', label: 'Any kind' }]} />
      <Input
        inputSize={size}
        width="sm"
        aria-label="Search work"
        placeholder="Search work"
        disabled={disabled}
        error={error}
        leading={<SearchGlyph size="sm" />}
        trailing={<Kbd>/</Kbd>}
      />
      <Button size={size === 'sm' ? 'small' : 'medium'} variant="secondary" disabled={disabled}>
        Display
      </Button>
      <Button size={size === 'sm' ? 'small' : 'medium'} variant="ghost" disabled={disabled}>
        Filter
      </Button>
      <IconButton size={size} variant="secondary" label="Next" icon={<ChevronRightGlyph size="sm" />} disabled={disabled} />
    </Toolbar>
  );
}

export const OneRowOfControls: Story = {
  render: () => (
    <Stack gap={4}>
      <ControlRow size="sm" />
      <ControlRow size="md" />
      <ControlRow size="sm" disabled />
      <ControlRow size="sm" error />
    </Stack>
  ),
};
