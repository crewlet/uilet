/** The browser's microphone: `getUserMedia`, and the level from an `AnalyserNode`. */

import { browserBlock } from './slot.js';
import type { DictationCapture, DictationDevice, DictationMicrophone, DictationPermission } from './types.js';

const QUERY = { name: 'microphone' as PermissionName };

/** A level from 0 to 1, and the device's release, over an open stream. */
export function captureOf(stream: MediaStream): DictationCapture {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(analyser);
  // A context made after an await may start suspended; the press that opened it allows a resume.
  void context.resume().catch(() => undefined);
  const data = new Float32Array(analyser.fftSize);
  const track = stream.getAudioTracks()[0];
  return {
    stream,
    level() {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (const sample of data) sum += sample * sample;
      // Speech at arm's length is an RMS near 0.05 to 0.2; scaled so it fills most of the bar.
      return Math.min(1, Math.sqrt(sum / data.length) * 5);
    },
    onEnded(listener) {
      track?.addEventListener('ended', listener, { once: true });
    },
    stop() {
      for (const each of stream.getTracks()) each.stop();
      void context.close().catch(() => undefined);
    },
  };
}

export function browserMicrophone(): DictationMicrophone {
  return {
    check: browserBlock,
    async permission(): Promise<DictationPermission> {
      try {
        return (await navigator.permissions.query(QUERY)).state;
      } catch {
        // Not every browser knows the microphone permission by name.
        return 'unknown';
      }
    },
    onPermissionChange(listener) {
      let status: PermissionStatus | null = null;
      let gone = false;
      navigator.permissions
        ?.query(QUERY)
        .then((answer) => {
          if (gone) return;
          status = answer;
          answer.onchange = () => listener(answer.state);
        })
        .catch(() => undefined);
      return () => {
        gone = true;
        if (status) status.onchange = null;
      };
    },
    async devices(): Promise<DictationDevice[]> {
      const all = await navigator.mediaDevices.enumerateDevices();
      return all.filter((d) => d.kind === 'audioinput').map((d) => ({ deviceId: d.deviceId, label: d.label }));
    },
    onDeviceChange(listener) {
      navigator.mediaDevices.addEventListener('devicechange', listener);
      return () => navigator.mediaDevices.removeEventListener('devicechange', listener);
    },
    async open(deviceId) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      return captureOf(stream);
    },
  };
}
