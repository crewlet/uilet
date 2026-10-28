import type { Meta, StoryObj } from '@storybook/react-vite';
import { VendorMark } from '@crewlethq/icons';
import { GlobeGlyph, SquareKanbanGlyph } from '@crewlethq/icons/glyphs';
import { Avatar, ChoiceButtons, ColorChip, InlineCode, InlineRef } from '@crewlethq/ui';

/**
 * A reference named inside a sentence, drawn with the mark that says what it
 * is: a link into a third-party app, a work item's key, a seat, a colour. Its
 * name is its words, with what the mark means read before them; the mark and
 * the first word never part at a line's end.
 */
const meta: Meta<typeof InlineRef> = {
  title: 'UI/InlineRef',
  component: InlineRef,
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 560,
          fontSize: 'var(--font-size-compact)',
          lineHeight: 'var(--font-line-height-relaxed)',
        }}
      >
        {Story()}
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InlineRef>;

const pr = (
  <InlineRef
    href="https://github.com/gophrase/backend/pull/14"
    kind="GitHub"
    title="https://github.com/gophrase/backend/pull/14"
    mark={<VendorMark vendor="github" />}
    code
  >
    gophrase/backend#14
  </InlineRef>
);

const commit = (
  <InlineRef
    href="https://github.com/gophrase/backend/commit/b5362d2"
    kind="GitHub"
    title="https://github.com/gophrase/backend/commit/b5362d2"
    mark={<VendorMark vendor="github" />}
    code
  >
    b5362d2
  </InlineRef>
);

const swatch = (hex: string) => (
  <InlineRef kind="Colour" mark={<ColorChip value={hex} size="text" shape="square" />}>
    {hex}
  </InlineRef>
);

const codeSwatch = (hex: string) => (
  <InlineCode whole>
    <ColorChip value={hex} size="text" shape="square" /> {hex}
  </InlineCode>
);

/** The Inbox's reading pane: the words an agent wrote, with what each reference is said before it is read. */
export const InASentence: Story = {
  render: () => (
    <>
      <p>
        The lesson player still ships {codeSwatch('#debe42')} as its accent. Design wants {codeSwatch('#ffe100')} for
        contrast on the dark ground, and the token change is ready in PR {pr} at {commit}.
      </p>
      <p>
        Screenshots are on{' '}
        <InlineRef
          href="https://github.com/gophrase/web/pull/31"
          kind="GitHub"
          mark={<VendorMark vendor="github" />}
          code
        >
          gophrase/web#31
        </InlineRef>
        , and{' '}
        <InlineRef
          href="#/company/org/seats/design-lead"
          kind="Agent"
          markShape="face"
          mark={<Avatar name="Design Lead" kind="agent" size="text" decorative />}
        >
          @design-lead
        </InlineRef>{' '}
        posted the comparison in{' '}
        <InlineRef
          href="https://gophrase.slack.com/archives/C07LQ2V4K/p1729950000123456"
          kind="Slack"
          mark={<VendorMark vendor="slack" />}
        >
          Message in gophrase
        </InlineRef>{' '}
        and{' '}
        <InlineRef
          href="https://chat.example.com/gophrase/channels/design-review"
          kind="Mattermost"
          mark={<VendorMark vendor="mattermost" />}
        >
          ~design-review
        </InlineRef>
        . The spec is{' '}
        <InlineRef
          href="https://gophrase.atlassian.net/wiki/spaces/DES/pages/131073/Brand+tokens"
          kind="Confluence"
          mark={<VendorMark vendor="atlassian" />}
          wrap
        >
          Brand tokens
        </InlineRef>
        ; the work is tracked in{' '}
        <InlineRef href="#/worklet/GP-66" kind="Task" mark={<SquareKanbanGlyph />} code>
          GP-66
        </InlineRef>
        .
      </p>
    </>
  ),
};

/**
 * The extremes a swatch's edge has to hold on either ground: white and the
 * accent yellow on the light theme, black and near-black on the dark one.
 * Switch the theme in the toolbar to see both; the edge is the control
 * border, which clears 3:1 on both grounds.
 */
export const SwatchExtremes: Story = {
  render: () => (
    <p>
      {swatch('#ffffff')}, {swatch('#ffe100')}, {swatch('#000000')} and {swatch('#0b0b0f')}, in words; and in code{' '}
      {codeSwatch('#ffffff')} {codeSwatch('#ffe100')} {codeSwatch('#000000')} {codeSwatch('#0b0b0f')}.
    </p>
  ),
};

/** An address of nobody the host knows: a globe and its host and path. */
export const AnyOtherAddress: Story = {
  render: () => (
    <p>
      The load test report is at{' '}
      <InlineRef
        href="https://grafana.example.com/d/api-latency"
        title="https://grafana.example.com/d/api-latency"
        mark={<GlobeGlyph />}
      >
        grafana.example.com/d/api-latency
      </InlineRef>
      .
    </p>
  ),
};

/** Words, never a link: no address, or one no browser should follow. The mark still says what it is. */
export const NotALink: Story = {
  render: () => (
    <p>
      Filed as{' '}
      <InlineRef kind="GitLab" mark={<VendorMark vendor="gitlab" />} code>
        group/app!7
      </InlineRef>{' '}
      with no GitLab configured, and{' '}
      <InlineRef href="javascript:alert(1)" kind="GitHub" mark={<VendorMark vendor="github" />} code>
        gophrase/backend#14
      </InlineRef>{' '}
      handed an unsafe address.
    </p>
  ),
};

/**
 * A phrase that wraps like its sentence, its mark kept with its first word, at
 * the widths that once left a mark alone at a line's end (326 to 346px and
 * 506px).
 */
export const ALabelledLinkAtNarrowWidths: Story = {
  render: () => (
    <>
      {[326, 336, 346, 506].map((width) => (
        <div key={width} style={{ maxWidth: width, marginBlockEnd: 'var(--spacing-4)' }}>
          <p>
            {`${width}px.`} The lesson player palette follows the spec in{' '}
            <InlineRef
              href="https://gophrase.atlassian.net/wiki/spaces/DES/pages/131073/Brand+tokens"
              kind="Confluence"
              mark={<VendorMark vendor="atlassian" />}
              wrap
            >
              Brand tokens for the lesson player
            </InlineRef>{' '}
            before anybody answers.
          </p>
        </div>
      ))}
    </>
  ),
};

/**
 * Inside a control: a choice's label carries its swatches, and nothing in it
 * is a link. On the recommended option's accent fill a swatch's edge and a
 * mark take the label's own ink, so a swatch close to the accent and a
 * near-black one both keep their boundary.
 */
export const InAChoice: Story = {
  render: () => (
    <ChoiceButtons
      label="Answers"
      recommended="ship"
      onChoose={() => {}}
      options={[
        { value: 'ship', label: <>Ship {swatch('#725be6')} over {swatch('#0b0b0f')}</> },
        {
          value: 'keep',
          label: <>Keep {swatch('#debe42')}</>,
          detail: (
            <>
              Leaves{' '}
              <InlineRef kind="GitHub" mark={<VendorMark vendor="github" />} code>
                gophrase/backend#14
              </InlineRef>{' '}
              unmerged
            </>
          ),
        },
      ]}
    />
  ),
};
