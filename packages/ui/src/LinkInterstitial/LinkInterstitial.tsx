import { Callout } from '../Callout/index.js';
import { InlineCode } from '../InlineCode/index.js';
import { ConfirmModal } from '../Modal/index.js';

export interface LinkInterstitialLabels {
  title: string;
  /** The line naming who asked. Given the source's name, or none when the caller names no source. */
  intro: (source: string | undefined) => string;
  destination: string;
  insecure: string;
  open: string;
  cancel: string;
}

const LABELS: LinkInterstitialLabels = {
  title: 'Open an external link?',
  intro: (source) =>
    source ? `${source} wants to open a page outside Crewlet. Open it only if you trust where it goes.` : 'This page wants to open a link outside Crewlet. Open it only if you trust where it goes.',
  destination: 'Destination',
  insecure: 'This link does not use a secure connection, so anyone on the network can read what you send to it.',
  open: 'Open link',
  cancel: 'Cancel',
};

/**
 * Opens a link in a new browsing context that cannot reach back.
 *
 * `noopener` severs `window.opener`, so the page that opens cannot navigate
 * the dashboard that opened it; `noreferrer` keeps the dashboard's address out
 * of the request. Exported so every place that opens an artifact's link opens
 * it the same way.
 */
export function openExternal(url: URL): void {
  window.open(url.href, '_blank', 'noopener,noreferrer');
}

export interface LinkInterstitialProps {
  /** The link a page asked to open, already checked by `externalUrl`. The dialog is open while this is set. */
  url: URL | null;
  /** Who asked, in the words the reader knows it by: the artifact's title. */
  source?: string | undefined;
  /** Asked to close, after the link was opened or when the reader declined. */
  onClose: () => void;
  /** The link was opened. */
  onOpened?: ((url: URL) => void) | undefined;
  labels?: Partial<LinkInterstitialLabels> | undefined;
}

/**
 * The stop between an artifact's link and the open web.
 *
 * AN ARTIFACT NEVER OPENS A WINDOW. Its frame has no popup token at all, so a
 * link reaches the page around it through the bridge, and this dialog names
 * the destination before anything is opened: the host in large type, because
 * the host is the claim a reader is deciding whether to trust, then the whole
 * address. The host is the ASCII form the URL parser gives, so a name drawn in
 * look-alike letters from another script shows as the `xn--` form it really
 * is.
 */
export function LinkInterstitial({ url, source, onClose, onOpened, labels }: LinkInterstitialProps) {
  const text = { ...LABELS, ...labels };
  const mail = url?.protocol === 'mailto:';
  const where = url ? (mail ? decodeURIComponent(url.pathname) : url.hostname) : '';

  return (
    <ConfirmModal
      open={url !== null}
      onClose={onClose}
      onConfirm={() => {
        if (!url) return;
        openExternal(url);
        onOpened?.(url);
        onClose();
      }}
      title={text.title}
      message={text.intro(source)}
      confirmLabel={text.open}
      cancelLabel={text.cancel}
      shape="framed"
      size="md"
    >
      {url ? (
        <div className="crewlet-link-interstitial">
          <span className="crewlet-link-interstitial__label">{text.destination}</span>
          <span className="crewlet-link-interstitial__host">{where}</span>
          <InlineCode className="crewlet-link-interstitial__href">{url.href}</InlineCode>
          {url.protocol === 'http:' ? <Callout variant="warning">{text.insecure}</Callout> : null}
        </div>
      ) : null}
    </ConfirmModal>
  );
}
