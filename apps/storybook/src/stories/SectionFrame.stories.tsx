import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Card, SectionFrame, SidebarNav } from '@crewlethq/ui';
import { CoinsGlyph, KeyGlyph, ServerGlyph, UsersGlyph } from '@crewlethq/icons/glyphs';

const meta: Meta<typeof SectionFrame> = {
  title: 'UI/SectionFrame',
  component: SectionFrame,
  argTypes: { folded: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof SectionFrame>;

const SECTIONS = [
  { group: 'Runtime', key: 'secrets', label: 'Secrets', icon: <KeyGlyph size="sm" /> },
  { group: 'Spend', key: 'spend', label: 'Token spend', icon: <CoinsGlyph size="sm" /> },
  { group: 'Access', key: 'people', label: 'People', icon: <UsersGlyph size="sm" /> },
  { group: 'Engine', key: 'nodes', label: 'Nodes', icon: <ServerGlyph size="sm" /> },
];

/**
 * Settings' sections beside the section. `folded` is the application's
 * decision (where the section would be too narrow beside the column): the
 * column then becomes one row naming the section, which unfolds the list and
 * folds again on a pick. The Engine group is closed to this reader, so its key
 * is drawn once, on the group.
 */
function Settings({ folded }: { folded?: boolean }) {
  const [at, setAt] = useState('people');
  const current = SECTIONS.find((s) => s.key === at);
  const groups = [...new Set(SECTIONS.map((s) => s.group))];
  return (
    <div style={{ height: 480, border: '1px solid var(--color-border-default)', containerType: 'size', overflow: 'auto' }}>
      <SectionFrame columnWidth="236px" folded={folded}>
        <SectionFrame.Nav
          scope="Settings"
          current={current && { label: current.label, icon: current.icon }}
          location={`#${at}`}
        >
          {groups.map((group) => (
            <SidebarNav.Group key={group} label={group} locked={group === 'Engine' ? 'Needs Admin access' : undefined}>
              {SECTIONS.filter((s) => s.group === group).map((s) => (
                <SidebarNav.Item
                  key={s.key}
                  label={s.label}
                  icon={s.icon}
                  href={`#${s.key}`}
                  current={s.key === at}
                  locked={group === 'Engine' ? 'Needs Admin access' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setAt(s.key);
                  }}
                />
              ))}
            </SidebarNav.Group>
          ))}
        </SectionFrame.Nav>
        <SectionFrame.Body>
          <Card>
            <Card.Header>{current?.label ?? 'Settings'}</Card.Header>
            <Card.Body>The section the reader is on.</Card.Body>
          </Card>
        </SectionFrame.Body>
      </SectionFrame>
    </div>
  );
}

export const BesideTheSection: Story = { render: () => <Settings /> };

export const FoldedToAPicker: Story = { render: () => <Settings folded /> };
