import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProductMark, VendorMark } from '@crewlethq/icons';
import { ArtifactKindGlyph, Avatar, LinkCard } from '@crewlethq/ui';

/**
 * What a link points at, unfurled under its message: no box, a slim bar in
 * the status's line colour, the source app's mark and name, the title (the
 * accent ink and an underline under the pointer), a quiet line of details,
 * and the status and owner as words. Every preview is one width, so a stack
 * of them shares both edges.
 */
const meta: Meta<typeof LinkCard> = {
  title: 'UI/LinkCard',
  component: LinkCard,
  decorators: [(Story) => <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 6 }}>{Story()}</div>],
};

export default meta;
type Story = StoryObj<typeof LinkCard>;

const owner = (name: string) => ({ face: <Avatar name={name} kind="human" size={16} decorative />, name });

export const Previews: Story = {
  render: () => (
    <>
      <LinkCard
        href="#/worklet/WRK-41"
        source={{ name: 'Worklet', mark: <ProductMark product="worklet" size="xs" /> }}
        code="WRK-41"
        title="Fix the login redirect after a password reset"
        meta="Due Friday · 3 subtasks"
        status="In progress"
        statusTone="info"
        owner={owner('Miles Chen')}
      />
      <LinkCard
        href="#/doclet/release-notes"
        source={{ name: 'Doclet', mark: <ProductMark product="doclet" size="xs" /> }}
        title="October release notes"
        meta="Edited 2 hours ago"
        status="Published"
        statusTone="success"
        owner={owner('Ada Park')}
      />
      <LinkCard
        href="#/artifacts/onboarding"
        source={{ name: 'Artifacts', mark: <ArtifactKindGlyph kind="design" size="xs" /> }}
        title="Onboarding screens"
        meta="Design · 6 boards"
        status="Waiting for review"
        statusTone="warning"
      />
      <LinkCard
        href="https://github.com/crewlet/uilet/pull/212"
        external
        address="https://github.com/crewlet/uilet/pull/212"
        source={{ name: 'GitHub', mark: <VendorMark vendor="github" size={12} /> }}
        code="#212"
        title="Draw the day pill on the rule and pin it within its day"
        meta="crewlet/uilet · +214 −38"
        status="Checks failing"
        statusTone="danger"
        owner={owner('Lee Park')}
      />
    </>
  ),
};

/** A preview with no state: the bar is the quiet medium edge and the dot is gone. */
export const Neutral: Story = {
  render: () => (
    <LinkCard href="#/doclet/handbook" source={{ name: 'Doclet', mark: <ProductMark product="doclet" size="xs" /> }} title="Engineering handbook" meta="12 pages" />
  ),
};

/**
 * An address `safeHref` refuses (a `javascript:` link typed into a message)
 * is drawn as words with no link in it.
 */
export const Inert: Story = {
  render: () => (
    <LinkCard
      href="javascript:alert(1)"
      source={{ name: 'Worklet', mark: <ProductMark product="worklet" size="xs" /> }}
      code="WRK-9"
      title="A link that is never followed"
      meta="Shown, not linked"
    />
  ),
};
