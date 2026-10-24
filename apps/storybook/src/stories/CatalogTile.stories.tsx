import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ButtonLink, CatalogTile, Count, Section, StatusDot, Tag, TileGrid } from '@crewlethq/ui';
import { ProductMark } from '@crewlethq/icons';
import { VendorMark } from '@crewlethq/icons';

const meta: Meta<typeof CatalogTile> = {
  title: 'UI/CatalogTile',
  component: CatalogTile,
};

export default meta;
type Story = StoryObj<typeof CatalogTile>;

/**
 * A catalogue in two sections on ONE grid: the built-in services over the
 * third-party apps, both `TileGrid columns={3}`, so every tile edge lines up
 * between them. A state is drawn only where it carries meaning (In use,
 * Connected, Needs attention, Coming soon); a tile not set up carries none,
 * sits on the quieter ground and keeps its mark in full colour.
 */
export const ACatalogue: Story = {
  render: () => (
    <div style={{ maxWidth: 1140, display: 'grid', gap: 'var(--spacing-7)' }}>
      <Section title="Built into Crewlet" description="Crewlet's own services, with nothing to connect.">
        <TileGrid columns={3}>
          <CatalogTile
            mark={<VendorMark vendor="crewlet" size="lg" />}
            title="Crewlet Works"
            status={<Tag size="sm" variant="success">In use</Tag>}
            description="Projects, tasks, your inbox and My work."
            meta="1 project"
            action={<ButtonLink variant="secondary" size="small" href="#/work">Open Work</ButtonLink>}
          />
          <CatalogTile
            mark={<VendorMark vendor="crewlet" size="lg" />}
            title="Crewlet Knowledge"
            status={<Tag size="sm" variant="success">In use</Tag>}
            description="Spaces and pages, agent skills and diaries."
            meta="3 spaces"
            action={<ButtonLink variant="secondary" size="small" href="#/knowledge">Open Knowledge</ButtonLink>}
          />
          <CatalogTile
            quiet
            mark={<VendorMark vendor="crewlet" size="lg" muted />}
            title="Crewlet Chat"
            status={<Tag size="sm" variant="neutral" appearance="outline">Coming soon</Tag>}
            description="Talk with your agents in Crewlet itself."
          />
        </TileGrid>
      </Section>
      <Section title="Third-party apps" description="Connect the tools the company already uses.">
        <TileGrid columns={3}>
          <CatalogTile
            mark={<VendorMark vendor="github" size="lg" />}
            title="GitHub"
            status={<Tag size="sm" variant="success">Connected</Tag>}
            description="Issues and pull requests, an app per agent."
            meta="2 agents · 14 deliveries"
            action={<Button variant="secondary" size="small">Manage</Button>}
          />
          <CatalogTile
            mark={<VendorMark vendor="slack" size="lg" />}
            title="Slack"
            status={<Tag size="sm" variant="warning">Needs attention</Tag>}
            description="The bot token was refused. Rotate it to reconnect."
            meta="1 agent · 1 refused"
            action={<Button variant="primary" size="small">Rotate</Button>}
          />
          {(['atlassian', 'datadog', 'gitlab', 'mattermost'] as const).map((vendor) => (
            <CatalogTile
              key={vendor}
              quiet
              mark={<VendorMark vendor={vendor} size="lg" />}
              title={vendor.charAt(0).toUpperCase() + vendor.slice(1)}
              description="Each agent posts as its own bot."
              action={<Button variant="secondary" size="small">Connect</Button>}
            />
          ))}
        </TileGrid>
      </Section>
    </div>
  ),
};

/**
 * THE FOLDS ARE THE GRID'S OWN WIDTH. Three tracks go straight to one (never
 * two up with a lone third), and four go to two and then one.
 */
export const Folds: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-6)' }}>
      {[
        { width: 900, columns: 3 as const },
        { width: 560, columns: 3 as const },
        { width: 800, columns: 4 as const },
      ].map(({ width, columns }) => (
        <div key={`${width}-${columns}`} style={{ width }}>
          <TileGrid columns={columns}>
            {Array.from({ length: columns === 4 ? 4 : 3 }, (_, index) => (
              <CatalogTile
                key={index}
                mark={<VendorMark vendor="gitlab" size="lg" />}
                title={`GitLab ${index + 1}`}
                description="Merge requests and code, a token per agent."
                action={<Button variant="secondary" size="small">Connect</Button>}
              />
            ))}
          </TileGrid>
        </div>
      ))}
    </div>
  ),
};

/**
 * COMPACT: a summary of what is already in use, about half the comfortable
 * tile's height. The mark, the name, its state, its fact and the one action
 * share the header line, and the sentence is one line under it, cut to fit
 * with the whole of it in its title. Two to a row under a heading and its
 * count, as the engine's Integrations home draws them.
 */
export const Compact: Story = {
  render: () => (
    <div style={{ maxWidth: 1040 }}>
      <Section
        title={
          <>
            In use <Count value={4} />
          </>
        }
      >
        <TileGrid as="ul" columns={2}>
          <CatalogTile
            as="li"
            density="compact"
            mark={<ProductMark product="works" size={20} />}
            title="Crewlet Works"
            status={<Tag size="sm" variant="success">In use</Tag>}
            description="Projects, tasks, your inbox and My work."
            action={<ButtonLink variant="secondary" size="small" href="#works">Open</ButtonLink>}
          />
          <CatalogTile
            as="li"
            density="compact"
            mark={<ProductMark product="knowledge" size={20} />}
            title="Crewlet Knowledge"
            status={<Tag size="sm" variant="success">In use</Tag>}
            description="Spaces and pages, agent skills and diaries."
            action={<ButtonLink variant="secondary" size="small" href="#knowledge">Open</ButtonLink>}
          />
          <CatalogTile
            as="li"
            density="compact"
            mark={<VendorMark vendor="datadog" size={20} />}
            title="Datadog"
            status={<StatusDot tone="success">Connected</StatusDot>}
            description="Monitors alert the seats their tags name, with a company-wide fallback."
            meta="Last delivery 4m ago"
            action={<ButtonLink variant="secondary" size="small" href="#datadog">Open</ButtonLink>}
          />
          <CatalogTile
            as="li"
            density="compact"
            mark={<VendorMark vendor="gitlab" size={20} />}
            title="GitLab"
            status={<StatusDot tone="warning">Needs attention</StatusDot>}
            description="Merge requests and code, a token per agent."
            meta="1 of 2 agents ready"
            action={<ButtonLink variant="secondary" size="small" href="#gitlab">Replace key</ButtonLink>}
          />
        </TileGrid>
      </Section>
    </div>
  ),
};

/**
 * The same four at a laptop's content width (845px, a 1024px window beside
 * the rail): two tracks would be 415px, narrower than a compact header's
 * one line, so the grid folds to one track and every name stands whole.
 */
export const CompactFolds: Story = {
  render: () => (
    <div style={{ width: 845 }}>
      <TileGrid as="ul" columns={2}>
        <CatalogTile
          as="li"
          density="compact"
          mark={<ProductMark product="works" size={20} />}
          title="Crewlet Works"
          status={<Tag size="sm" variant="success">In use</Tag>}
          description="Projects, tasks, your inbox and My work."
          action={<ButtonLink variant="secondary" size="small" href="#works">Open</ButtonLink>}
        />
        <CatalogTile
          as="li"
          density="compact"
          mark={<ProductMark product="knowledge" size={20} />}
          title="Crewlet Knowledge"
          status={<Tag size="sm" variant="success">In use</Tag>}
          description="Spaces and pages, agent skills and diaries."
          action={<ButtonLink variant="secondary" size="small" href="#knowledge">Open</ButtonLink>}
        />
        <CatalogTile
          as="li"
          density="compact"
          mark={<VendorMark vendor="datadog" size={20} />}
          title="Datadog"
          status={<StatusDot tone="success">Connected</StatusDot>}
          description="Monitors alert the seats their tags name, with a company-wide fallback."
          meta="Last delivery 4m ago"
          action={<ButtonLink variant="secondary" size="small" href="#datadog">Open</ButtonLink>}
        />
        <CatalogTile
          as="li"
          density="compact"
          mark={<VendorMark vendor="gitlab" size={20} />}
          title="GitLab"
          status={<StatusDot tone="warning">Needs attention</StatusDot>}
          description="Merge requests and code, a token per agent."
          meta="1 of 2 agents ready"
          action={<ButtonLink variant="secondary" size="small" href="#gitlab">Replace key</ButtonLink>}
        />
      </TileGrid>
    </div>
  ),
};
