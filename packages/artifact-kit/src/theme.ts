/*
 * The artifact kit's theme bootstrap: loaded first and blocking, before any
 * stylesheet paints, so an artifact never shows a frame in the wrong palette.
 *
 * It does two things and nothing else:
 *
 *   1. Reads the reader's appearance from the frame URL's fragment, where the
 *      host put it, and writes `data-theme`, `data-palette` and
 *      `data-density` on `<html>` the way the dashboard writes its own.
 *   2. Once the host transfers the bridge port, follows the reader's
 *      appearance on it, so a change in the dashboard repaints the artifact
 *      without a reload.
 *
 * Every value is checked against the allowed ones before it is written: the
 * fragment is a string anybody can edit, and the attribute is read by a
 * selector. It listens on the port beside the runtime rather than instead of
 * it, through `addEventListener`, so neither takes the other's messages.
 *
 * The protocol is `@crewlethq/ui`'s, imported rather than restated, so the
 * frame end and the host end cannot drift.
 */

import { applyFrameTheme, parseFrameFragment, readFramePortMessage, readFrameTheme } from '@crewlethq/ui/FrameProtocol';

applyFrameTheme(parseFrameFragment(window.location.hash).theme);

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window.parent || window.parent === window || !readFramePortMessage(event.data)) return;
  const port = event.ports[0];
  if (!port) return;
  port.addEventListener('message', (portEvent: MessageEvent) => {
    const theme = readFrameTheme(portEvent.data);
    if (theme) applyFrameTheme(theme);
  });
  port.start();
});
