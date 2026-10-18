import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import {
  applyFrameTheme,
  Button,
  FRAME_BRIDGE,
  FRAME_MESSAGE,
  Inline,
  LinkInterstitial,
  parseFrameFragment,
  readFramePortMessage,
  readFrameTheme,
  SandboxedFrame,
  Stack,
  Text,
  type FrameTheme,
  type SandboxedFrameState,
} from '@crewlethq/ui';

const meta: Meta<typeof SandboxedFrame> = {
  title: 'UI/SandboxedFrame',
  component: SandboxedFrame,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SandboxedFrame>;

const NONCE = 'storybook-demo-nonce-0001';

/**
 * The frame's document in these stories is another story: this one, loaded
 * from the Storybook's own `iframe.html`. A real engine serves each artifact
 * from an origin of its own; the Storybook has one origin, so the demo frame
 * is per artifact on it.
 */
function documentUrl(args: Record<string, string | number | boolean> = {}): string {
  const url = new URL('iframe.html', window.location.href);
  url.search = '';
  url.searchParams.set('id', 'ui-sandboxedframe--artifact-document');
  url.searchParams.set('viewMode', 'story');
  const encoded = Object.entries(args)
    .map(([key, value]) => `${key}:${typeof value === 'boolean' ? `!${value}` : value}`)
    .join(';');
  if (encoded) url.searchParams.set('args', encoded);
  return url.href;
}

interface DocumentArgs {
  silent?: boolean;
  bridgeMin?: number;
  bridgeMax?: number;
}

/**
 * THE FRAME END of the protocol, as the engine's runtime implements it: read
 * the fragment, paint in the reader's appearance, say hello to the parent,
 * take the port, and follow the theme on it. Opened on its own it has no
 * parent to greet and says so.
 */
function ArtifactDocumentPage({ silent = false, bridgeMin = FRAME_BRIDGE.min, bridgeMax = FRAME_BRIDGE.max }: DocumentArgs) {
  const [port, setPort] = useState<MessagePort | null>(null);
  const [theme, setTheme] = useState<FrameTheme | null>(null);

  useEffect(() => {
    const fragment = parseFrameFragment(window.location.hash);
    applyFrameTheme(fragment.theme);
    setTheme(fragment.theme);
    if (silent || window.parent === window || fragment.nonce === null) return undefined;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !readFramePortMessage(event.data)) return;
      const received = event.ports[0];
      if (!received) return;
      received.onmessage = (portEvent) => {
        const next = readFrameTheme(portEvent.data);
        if (!next) return;
        applyFrameTheme(next);
        setTheme(next);
      };
      setPort(received);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage(
      { type: FRAME_MESSAGE.hello, nonce: fragment.nonce, contract: '1.0.0', bridge: { min: bridgeMin, max: bridgeMax } },
      window.location.origin,
    );
    return () => window.removeEventListener('message', onMessage);
  }, [silent, bridgeMin, bridgeMax]);

  return (
    <Stack gap={3}>
      <Text variant="heading">Vendor scorecard</Text>
      <Text as="p">{port ? 'Connected to the page around this frame.' : 'Waiting for the page around this frame.'}</Text>
      {theme ? (
        <Text as="p" variant="caption">
          Theme {theme.mode}, palette {theme.palette}, density {theme.density}
        </Text>
      ) : null}
      <Inline gap={2}>
        <Button variant="outline" disabled={!port} onClick={() => port?.postMessage({ type: FRAME_MESSAGE.openLink, url: 'https://example.com/q3-report' })}>
          Open the quarterly report
        </Button>
        <Button variant="ghost" disabled={!port} onClick={() => port?.postMessage({ type: FRAME_MESSAGE.focusExit })}>
          Return focus to the page
        </Button>
      </Inline>
    </Stack>
  );
}

/**
 * The document embedded by the stories below. It is a story so the frame can
 * load it by URL, and its id (`ui-sandboxedframe--artifact-document`) is the
 * one `documentUrl` names, so its export keeps this name.
 */
export const ArtifactDocument: StoryObj<DocumentArgs> = {
  args: { silent: false, bridgeMin: FRAME_BRIDGE.min, bridgeMax: FRAME_BRIDGE.max },
  render: (args) => <ArtifactDocumentPage {...args} />,
};

const THEMES: FrameTheme[] = [
  { mode: 'dark', palette: 'crewlet', density: 'normal' },
  { mode: 'light', palette: 'crewlet', density: 'normal' },
  { mode: 'dark', palette: 'dusk', density: 'compact' },
];

/**
 * The handshake, the live theme and an external link. Switch the theme and the
 * frame repaints over its port without reloading; ask the page for a link and
 * the interstitial names the destination before anything is opened.
 */
export const Ready: Story = {
  render: function Render() {
    const [theme, setTheme] = useState<FrameTheme>(THEMES[0] as FrameTheme);
    const [state, setState] = useState<SandboxedFrameState>('loading');
    const [link, setLink] = useState<URL | null>(null);
    return (
      <Stack gap={3}>
        <Inline gap={2}>
          {THEMES.map((option) => (
            <Button key={`${option.mode}-${option.palette}`} size="small" variant="outline" pressed={option === theme} onClick={() => setTheme(option)}>
              {option.mode}, {option.palette}, {option.density}
            </Button>
          ))}
        </Inline>
        <Text variant="caption">Frame state: {state}</Text>
        <div style={{ height: 320 }}>
          <SandboxedFrame
            src={documentUrl()}
            origin={window.location.origin}
            mode="per_artifact"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Vendor scorecard"
            theme={theme}
            nonce={NONCE}
            onStateChange={setState}
            onOpenLink={setLink}
          />
        </div>
        <LinkInterstitial url={link} source="Vendor scorecard" onClose={() => setLink(null)} />
      </Stack>
    );
  },
};

/** Until the document says hello, the frame shows a placeholder sized to it and says what is loading. */
export const Loading: Story = {
  render: () => (
    <div style={{ height: 280 }}>
      <SandboxedFrame
        src={documentUrl({ silent: true })}
        origin={window.location.origin}
        mode="per_artifact"
        sandbox="allow-scripts allow-same-origin"
        title="Vendor scorecard"
        theme={THEMES[0] as FrameTheme}
        nonce={NONCE}
        helloTimeoutMs={3_600_000}
      />
    </div>
  ),
};

/** A document that never says hello is torn down, and the reader is offered a reload. */
export const Failed: Story = {
  render: function Render() {
    const [attempt, setAttempt] = useState(0);
    return (
      <div style={{ height: 280 }}>
        <SandboxedFrame
          key={attempt}
          src={documentUrl({ silent: true })}
          origin={window.location.origin}
          mode="per_artifact"
          sandbox="allow-scripts allow-same-origin"
          title="Vendor scorecard"
          theme={THEMES[0] as FrameTheme}
          nonce={NONCE}
          helloTimeoutMs={1500}
          onReload={() => setAttempt((count) => count + 1)}
        />
      </div>
    );
  },
};

/** A policy the host never sets, here a popup token, is refused before anything is mounted. */
export const Refused: Story = {
  render: () => (
    <div style={{ height: 200 }}>
      <SandboxedFrame
        src={documentUrl()}
        origin={window.location.origin}
        mode="per_artifact"
        sandbox="allow-scripts allow-popups"
        title="Vendor scorecard"
        theme={THEMES[0] as FrameTheme}
        nonce={NONCE}
      />
    </div>
  ),
};

/** A runtime that speaks no bridge version this host does is told the dashboard needs updating. */
export const Outdated: Story = {
  render: () => (
    <div style={{ height: 200 }}>
      <SandboxedFrame
        src={documentUrl({ bridgeMin: 7, bridgeMax: 9 })}
        origin={window.location.origin}
        mode="per_artifact"
        sandbox="allow-scripts allow-same-origin"
        title="Vendor scorecard"
        theme={THEMES[0] as FrameTheme}
        nonce={NONCE}
      />
    </div>
  ),
};
