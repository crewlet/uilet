import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell } from '@crewlethq/ui';

const meta: Meta<typeof AppShell> = {
  title: 'UI/AppShell',
  component: AppShell,
};

export default meta;
type Story = StoryObj<typeof AppShell>;

/*
 * The sidebar slot in real apps positions itself with `position: fixed`.
 * For the Storybook preview we cheat with absolute positioning so the
 * shell renders inside the docs frame instead of escaping it.
 */
const fixedSidebarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: 280,
  height: '100vh',
  background: 'var(--color-surface-subtle)',
  borderRight: '1px solid var(--color-border-default)',
  padding: '16px',
  boxSizing: 'border-box',
  zIndex: 30,
};

const fixedTopbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 280,
  right: 0,
  height: 64,
  background: 'var(--color-surface-subtle)',
  borderBottom: '1px solid var(--color-border-default)',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  zIndex: 20,
};

export const Basic: Story = {
  render: () => (
    <AppShell
      sidebar={<div style={fixedSidebarStyle}>Sidebar (fixed, 280px)</div>}
      topbar={<div style={fixedTopbarStyle}>Topbar (fixed, 64px)</div>}
    >
      <div style={{ padding: 24 }}>
        <h1>Main content area</h1>
        <p>
          AppShell reserves a 280px left margin and a 64px top padding on
          the content column so the fixed sidebar and topbar overlay
          without occluding content.
        </p>
        <p>This is the only scrollable region.</p>
      </div>
    </AppShell>
  ),
};

export const NoFooter: Story = {
  render: () => (
    <AppShell
      sidebar={<div style={fixedSidebarStyle}>Sidebar</div>}
      topbar={<div style={fixedTopbarStyle}>Topbar</div>}
    >
      <div style={{ padding: 24 }}>
        <p>An AppShell without a footer slot stops at the main content.</p>
      </div>
    </AppShell>
  ),
};

export const NarrowSidebar: Story = {
  render: () => (
    <AppShell
      sidebarWidth={64}
      sidebar={
        <div style={{ ...fixedSidebarStyle, width: 64, padding: 8 }}>
          icons
        </div>
      }
      topbar={
        <div style={{ ...fixedTopbarStyle, left: 64 }}>Compact shell</div>
      }
    >
      <div style={{ padding: 24 }}>
        <p>`sidebarWidth` and `topbarHeight` are configurable for compact shells.</p>
      </div>
    </AppShell>
  ),
};
