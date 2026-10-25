import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import {
  BrandSample,
  Breadcrumb,
  Button,
  ColorField,
  ContrastBadge,
  EditingStatus,
  FormField,
  Input,
  LogoSlot,
  SegmentedControl,
  SetupWizard,
  Textarea,
  TypeSpecimen,
  contrastRatio,
  countCharacters,
  formatContrastRatio,
  type BrandSampleKind,
  type BrandSampleMode,
  type StepperStep,
} from "@crewlethq/ui";
import { WCAG_CONTRAST, nearestContrastShade } from "@crewlethq/tokens";

const meta: Meta<typeof SetupWizard> = {
  title: "UI/SetupWizard",
  component: SetupWizard,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof SetupWizard>;

/** The two narrower shapes: a 1024px window beside the application's rail, and a phone. */
const WIDTHS = {
  laptop: {
    name: "A 1024px window beside the rail",
    styles: { width: "780px", height: "900px" },
    type: "desktop",
  },
  phone: {
    name: "A phone",
    styles: { width: "390px", height: "844px" },
    type: "mobile",
  },
} as const;

type StepId =
  | "identity"
  | "logos"
  | "colours"
  | "typography"
  | "voice"
  | "review";

const ORDER: StepId[] = [
  "identity",
  "logos",
  "colours",
  "typography",
  "voice",
  "review",
];

const TITLES: Record<
  StepId,
  { label: string; description: string; lead: string; optional?: boolean }
> = {
  identity: {
    label: "Identity",
    description: "Name and tagline",
    lead: "This is how agents name the company in what they make.",
  },
  logos: {
    label: "Logos",
    description: "Light, dark and mark",
    lead: "Agents place these in doc headers, slides and pages. Each slot says where it appears.",
  },
  colours: {
    label: "Colours",
    description: "Primary, text and grounds",
    lead: "Agents use these colours for links, buttons, headings and grounds in every artifact.",
  },
  typography: {
    label: "Typography",
    description: "Heading and body",
    lead: "The faces agents set headings and body text in. Crewlet’s faces are used until you choose.",
    optional: true,
  },
  voice: {
    label: "Voice",
    description: "How agents write",
    lead: "Agents read this when they write an artifact.",
    optional: true,
  },
  review: {
    label: "Review",
    description: "Check and adopt",
    lead: "Check what is set, what uses Crewlet’s default, and what is missing, then adopt it.",
  },
};

/** The page's ground, as the engine's default light ground: story data, not a token. */
const LIGHT_GROUND = "#f6f7fb";

function Page({
  start = "identity",
  reached: initialReached,
}: {
  start?: StepId;
  reached?: StepId;
}) {
  const [current, setCurrent] = useState<StepId>(start);
  const [reached, setReached] = useState<StepId>(initialReached ?? start);
  const [name, setName] = useState("Crewlet");
  const [tagline, setTagline] = useState("A company of agents that ships.");
  const [primary, setPrimary] = useState("#00baba");
  const [text, setText] = useState("#121625");
  const [voice, setVoice] = useState("Plain, warm and exact. Short sentences.");
  const [kind, setKind] = useState<BrandSampleKind>("doc");
  const [mode, setMode] = useState<BrandSampleMode>("light");
  const [savedAt, setSavedAt] = useState<number>(() => Date.now() - 2 * 60_000);

  const index = ORDER.indexOf(current);
  const primaryRatio = contrastRatio(primary, LIGHT_GROUND) ?? 0;
  const primaryLow = primaryRatio < WCAG_CONTRAST.aa;
  const suggestion = primaryLow
    ? nearestContrastShade(primary, LIGHT_GROUND, WCAG_CONTRAST.aa)
    : null;

  const steps: StepperStep[] = ORDER.map((id) => ({
    id,
    label: TITLES[id].label,
    description: TITLES[id].description,
    status:
      id === "colours" && primaryLow && ORDER.indexOf(reached) >= 2
        ? "attention"
        : TITLES[id].optional
          ? "optional"
          : undefined,
  }));

  const go = (id: StepId) => {
    setCurrent(id);
    if (ORDER.indexOf(id) > ORDER.indexOf(reached)) setReached(id);
    setSavedAt(Date.now());
  };

  const preview = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <SegmentedControl<BrandSampleKind>
          semantics="radio"
          label="What the preview shows"
          size="sm"
          value={kind}
          onValueChange={setKind}
          options={[
            { value: "doc", label: "Doc" },
            { value: "slide", label: "Slide" },
          ]}
        />
        <SegmentedControl<BrandSampleMode>
          semantics="radio"
          label="Mode"
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>
      <BrandSample
        kind={kind}
        mode={mode}
        name={name}
        colors={{ primary, text, light_ground: LIGHT_GROUND }}
      />
    </>
  );

  const content: Record<StepId, ReactNode> = {
    identity: (
      <>
        <FormField label="Company name" required>
          {(field) => (
            <Input
              id={field.id}
              aria-describedby={field.describedBy}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Tagline"
          helper="One line agents may place under the name."
          limit={{ length: countCharacters(tagline), max: 140 }}
        >
          {(field) => (
            <Input
              id={field.id}
              aria-describedby={field.describedBy}
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
            />
          )}
        </FormField>
      </>
    ),
    logos: (
      <>
        <LogoSlot
          label="Primary logo"
          description="On light grounds: doc headers, light slides and pages"
          ground="light"
          alt={`${name} logo`}
        />
        <LogoSlot
          label="For dark grounds"
          description="Dark slides and dark mode. Recommended."
          ground="dark"
          alt={`${name} logo on dark`}
          emptyNote="Add a version for dark grounds. Until then the primary logo is drawn on a light plate."
        />
        <LogoSlot
          label="Mark"
          description="Square: chips, slide corners and the brand chip. Recommended."
          ground="light"
          shape="square"
          alt={`${name} mark`}
        />
      </>
    ),
    colours: (
      <>
        <ColorField
          label="Primary"
          helper="Links, buttons and accents"
          required
          value={primary}
          onChange={setPrimary}
        />
        <ColorField
          label="Text"
          helper="Body text on the light ground"
          required
          value={text}
          onChange={setText}
        />
        <div style={{ display: "grid", gap: 8 }}>
          <ContrastBadge
            label="Text on light ground"
            foreground={text}
            background={LIGHT_GROUND}
          />
          <ContrastBadge
            label="Primary on light ground"
            foreground={primary}
            background={LIGHT_GROUND}
            advisory
          />
          {suggestion ? (
            <div>
              <Button
                size="small"
                variant="outline"
                onClick={() => setPrimary(suggestion)}
              >
                {`Use ${suggestion} (${formatContrastRatio(contrastRatio(suggestion, LIGHT_GROUND) ?? 0)}:1)`}
              </Button>
            </div>
          ) : null}
        </div>
      </>
    ),
    typography: (
      <>
        <TypeSpecimen
          label="Heading"
          family="Geist"
          fontFamily="var(--font-family-sans)"
          weight="semibold"
          detail="Crewlet’s face"
        />
        <TypeSpecimen
          label="Body"
          family="Geist"
          fontFamily="var(--font-family-sans)"
          detail="Crewlet’s face"
        />
      </>
    ),
    voice: (
      <FormField
        label="Summary"
        helper="To shape every message agents write, add a standing policy in Principles."
        limit={{ length: countCharacters(voice), max: 300 }}
      >
        {(field) => (
          <Textarea
            id={field.id}
            aria-describedby={field.describedBy}
            rows={3}
            value={voice}
            onChange={(event) => setVoice(event.target.value)}
          />
        )}
      </FormField>
    ),
    review: (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            gap: "8px 16px",
            margin: 0,
          }}
        >
          <dt>Name</dt>
          <dd style={{ margin: 0 }}>{name}</dd>
          <dt>Logos</dt>
          <dd style={{ margin: 0 }}>Missing: the primary logo</dd>
          <dt>Colours</dt>
          <dd style={{ margin: 0 }}>
            {primaryLow
              ? "Primary is low on light grounds"
              : "Every pair clears its floor"}
          </dd>
          <dt>Typography</dt>
          <dd style={{ margin: 0 }}>Uses Crewlet’s default</dd>
        </dl>
        <div style={{ display: "grid", gap: 12 }}>{preview}</div>
      </div>
    ),
  };

  const optional = TITLES[current].optional === true;

  return (
    <div style={{ padding: 20 }}>
      <SetupWizard
        title="Set up your brand"
        trail={
          <Breadcrumb
            crumbs={[
              { label: "Company", href: "#company" },
              { label: "Brand", href: "#brand" },
            ]}
            current="Set up"
          />
        }
        status={
          <EditingStatus
            dirty={false}
            savedAt={savedAt}
            labels={{ editing: "Draft" }}
          />
        }
        footerStart={<Button variant="ghost">Exit</Button>}
        steps={steps}
        current={current}
        reached={reached}
        onSelect={(id) => go(id as StepId)}
        stepsLabel="Setup steps"
        heading={TITLES[current].label}
        lead={TITLES[current].lead}
        wide={current === "review"}
        aside={current === "review" ? undefined : preview}
        asideLabel={current === "review" ? undefined : "Preview of your draft"}
        footer={
          current === "review" ? (
            <>
              <Button variant="secondary">Save as draft</Button>
              <Button variant="primary">Adopt as the company brand</Button>
            </>
          ) : (
            <>
              {index > 0 ? (
                <Button variant="ghost" onClick={() => go(ORDER[index - 1]!)}>
                  Back
                </Button>
              ) : null}
              {optional ? (
                <Button
                  variant="secondary"
                  onClick={() => go(ORDER[index + 1]!)}
                >
                  Skip for now
                </Button>
              ) : null}
              <Button variant="primary" onClick={() => go(ORDER[index + 1]!)}>
                Continue
              </Button>
            </>
          )
        }
      >
        {content[current]}
      </SetupWizard>
    </div>
  );
}

/**
 * THE BRAND SETUP, as the dashboard walks it. The header carries the trail,
 * the draft's status and Exit; the rail is a vertical `Stepper` whose visited
 * steps are buttons; the content is one column with a lead sentence; the
 * preview holds in view beside it; and the footer holds Back, Skip for now on
 * an optional step, and Continue at the bottom of the view.
 *
 * Narrow the canvas to see the three shapes: under 70rem of the wizard's own
 * width the preview moves under the content, and under the phone breakpoint
 * the rail becomes a row of steps under "Step 3 of 6 · Colours" and the
 * preview folds into a disclosure.
 */
export const BrandSetup: Story = {
  render: () => <Page />,
};

/**
 * ON COLOURS WITH A LOW PAIR. The primary, #00baba, reads 2.33:1 on the light
 * ground: an advisory pair, so it reads "Low" in the warning tone, the step
 * says "Needs attention" in the rail, and Continue stays open. The suggestion
 * is `nearestContrastShade` from `@crewlethq/tokens`: the same teal, darker,
 * at the first shade that clears 4.5:1.
 */
export const LowContrast: Story = {
  render: () => <Page start="colours" reached="voice" />,
};

/** THE LAST STEP: a summary, and Save as draft beside Adopt as the company brand. */
export const Review: Story = {
  render: () => <Page start="review" />,
};

/** UNDER 70REM OF ITS OWN WIDTH, as in a 1024px window beside the rail: the preview moves under the content. */
export const Narrower: Story = {
  parameters: { viewport: { options: WIDTHS } },
  globals: { viewport: { value: "laptop" } },
  render: () => <Page start="colours" reached="voice" />,
};

/**
 * ON A PHONE the rail is a row of steps under "Step 3 of 6 · Colours", the
 * preview folds into a disclosure, and the actions hold above the safe area.
 */
export const Phone: Story = {
  parameters: { viewport: { options: WIDTHS } },
  globals: { viewport: { value: "phone" } },
  render: () => <Page start="colours" reached="voice" />,
};
