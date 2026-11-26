/**
 * Dictation's contracts: the transport that turns speech into words, the
 * microphone it listens through, and the source a `Composer` is given.
 */

/** Why a transport ended a session on its own. The words so far stay provisional. */
export type DictationErrorCode =
  /** The connection or the provider dropped. */
  | 'dropped'
  /** The provider refused the session (not set up, key refused). */
  | 'refused'
  /** The company's speech spend window is used up. */
  | 'quota'
  /** The session reached its maximum length. */
  | 'length'
  /** No speech for too long. */
  | 'silence';

/** Why capture stopped while the words wait for Accept or Cancel. */
export type DictationStopReason = DictationErrorCode | 'unplugged' | 'paused';

/** What a transport tells the composer while a session runs. */
export interface DictationTransportEvents {
  /** Replaces the provisional words of the segment being spoken. */
  partial(text: string): void;
  /** Appends a finished, punctuated segment and clears the provisional words. */
  final(text: string): void;
  /** Ends the session from the transport's side. */
  error(code: DictationErrorCode): void;
}

/**
 * Turns the microphone's audio into words: the engine relay in an
 * application, `fakeTransport` in stories and tests.
 */
export interface DictationTransport {
  /**
   * Opens a session on `deviceId` (undefined is the default device). `stream`
   * is the open microphone's audio, or null from a microphone that has none.
   */
  start(deviceId: string | undefined, events: DictationTransportEvents, stream: MediaStream | null): void | Promise<void>;
  /** The microphone changed mid-session; already recognised words are kept. */
  switchStream?(stream: MediaStream | null, deviceId: string | undefined): void;
  /** Stops listening and settles once the last final segment has arrived. */
  flush(): Promise<void>;
  /** Drops the session at once. No event follows. */
  cancel(): void;
}

/** One audio input. */
export interface DictationDevice {
  deviceId: string;
  label: string;
}

export type DictationPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** Why capture cannot work in this page at all. */
export type DictationBlock = 'insecure' | 'unsupported' | 'policy';

/** An open microphone. */
export interface DictationCapture {
  stream: MediaStream | null;
  /** The input level now, from 0 to 1. */
  level(): number;
  /** Called once if the device goes away while open. */
  onEnded(listener: () => void): void;
  /** Stops capture and releases the device. */
  stop(): void;
}

/**
 * Where audio comes from: the browser's microphone by default, a scripted one
 * in stories and tests (`fakeMicrophone`).
 */
export interface DictationMicrophone {
  /** Why capture cannot work in this page, or undefined. */
  check(): DictationBlock | undefined;
  permission(): Promise<DictationPermission>;
  onPermissionChange?(listener: (state: DictationPermission) => void): () => void;
  /** The audio inputs. Labels are blank until permission is granted. */
  devices(): Promise<DictationDevice[]>;
  onDeviceChange?(listener: () => void): () => void;
  /**
   * Opens a device. Rejects with an error named `NotAllowedError`,
   * `NotFoundError` or `NotReadableError`, as `getUserMedia` does.
   */
  open(deviceId: string | undefined): Promise<DictationCapture>;
}

/** Every word dictation says. */
export interface DictationLabels {
  dictate: string;
  resume: string;
  chooseMicrophone: string;
  cancel: string;
  accept: string;
  listening: string;
  /** The field's description and the announcement while dictating. */
  dictating: string;
  pending: string;
  cancelled: string;
  inserted: (words: number) => string;
  nothing: string;
  unsupported: string;
  insecure: string;
  policy: string;
  denied: string;
  noDevice: string;
  busy: string;
  elsewhere: (composer: string) => string;
  quiet: string;
  stopped: Record<DictationStopReason, string>;
  defaultDevice: string;
  allowToChoose: string;
  deniedHelp: string;
  gone: string;
  switched: (device: string) => string;
  level: string;
}

/** Turns a `Composer`'s dictation on. */
export interface DictationSource {
  transport: DictationTransport;
  /** The browser's microphone when left out. */
  microphone?: DictationMicrophone | undefined;
  /**
   * Dictation is not available here, and why ("Dictation is not set up for
   * this company"). The mic is drawn held with this reason.
   */
  unavailableReason?: string | undefined;
  /** For a reader who can fix it: an action at the foot of the microphone menu. */
  setup?: { label: string; onSelect: () => void } | undefined;
  labels?: Partial<DictationLabels> | undefined;
  /** Seconds of silence before the "Still listening" hint, and before capture stops. */
  silence?: { hint: number; stop: number } | undefined;
  /** The chord that starts and pauses dictation from the field, or false for none. */
  shortcut?: readonly string[] | false | undefined;
  /** A session started or ended here, so a proposal for this box can wait for it. */
  onActiveChange?: ((active: boolean) => void) | undefined;
}
