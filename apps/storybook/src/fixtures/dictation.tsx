/**
 * Every dictation state, each a composer with a scripted source and a few
 * timed presses that bring it there. Shared by the Dictation stories.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Composer,
  IconButton,
  SendButton,
  fakeMicrophone,
  fakeTransport,
  webSpeechLocalTransport,
  type DictationSource,
  type FakeMicrophone,
  type FakeMicrophoneOptions,
  type FakeTransportOptions,
} from '@crewlethq/ui';
import { AtSignGlyph, FaceSlightlySmilingGlyph, PlusGlyph } from '@crewlethq/icons/glyphs';

/** A timed press: a control by its name, or something done to the microphone or the box. */
export type DictationStep =
  | { at: number; press: string }
  | { at: number; choose: string }
  | { at: number; key: 'Enter' | 'Escape' | 'shortcut' }
  | { at: number; mic: 'unplug' | 'settle' | 'allow' }
  | { at: number; box: 'close' | 'open' | 'propose' };

export interface DictationScenario {
  id: string;
  /** The state's name in the state map. */
  title: string;
  /** What the reader sees, in a line. */
  note: string;
  transport?: FakeTransportOptions;
  /** Several routes in order, in place of `transport`. */
  routes?: FakeTransportOptions[];
  mic?: FakeMicrophoneOptions;
  source?: Partial<DictationSource>;
  /** The draft already in the box, and the caret or selection in it. */
  initial?: string;
  caret?: [number, number];
  maxLength?: number;
  steps?: DictationStep[];
  /** A second composer on the page. */
  twin?: boolean;
  /** Offers a proposal that waits for the session. */
  proposal?: boolean;
  /** How long after the last step the state is settled enough to shoot. */
  settle?: number;
}

const NOT_SET_UP = 'Dictation is not set up for this company';

export const DICTATION_SCENARIOS: readonly DictationScenario[] = [
  { id: 'idle', title: 'Idle, available', note: 'The mic and its chevron just before Send.' },
  { id: 'unsupported', title: 'Unsupported browser', note: 'Held with the reason, never hidden.', mic: { block: 'unsupported' } },
  { id: 'insecure', title: 'Not a secure context', note: 'Held: the site is on plain http.', mic: { block: 'insecure' } },
  { id: 'not-set-up', title: 'Speech not configured, member', note: 'Held with the reason, no link.', source: { unavailableReason: NOT_SET_UP }, steps: [{ at: 300, press: 'Choose a microphone' }] },
  {
    id: 'not-set-up-admin',
    title: 'Speech not configured, administrator',
    note: 'Held, and the menu offers setup.',
    source: { unavailableReason: NOT_SET_UP, setup: { label: 'Set up dictation', onSelect: () => undefined } },
    steps: [{ at: 300, press: 'Choose a microphone' }],
  },
  { id: 'not-asked', title: 'Permission not yet asked', note: 'The menu offers the default and a way to allow access.', mic: { permission: 'prompt' }, steps: [{ at: 300, press: 'Choose a microphone' }] },
  { id: 'pending', title: 'Permission prompt pending', note: 'The mic waits pressed, with a ring, in the idle row; pressing it again or Escape withdraws.', mic: { permission: 'prompt', open: 'wait' }, steps: [{ at: 300, press: 'Dictate' }] },
  { id: 'denied', title: 'Permission denied', note: 'Mic-off, held; the menu says how to allow it.', mic: { open: 'denied' }, steps: [{ at: 300, press: 'Dictate' }, { at: 700, press: 'Choose a microphone' }] },
  { id: 'policy', title: 'Blocked by policy', note: 'Held: the page does not allow the microphone.', mic: { block: 'policy' } },
  { id: 'no-device', title: 'No input device', note: 'Held until one is plugged in.', mic: { devices: [] }, steps: [{ at: 300, press: 'Choose a microphone' }] },
  { id: 'busy', title: 'Device busy', note: 'Said once; the mic comes back.', mic: { open: 'busy' }, steps: [{ at: 300, press: 'Dictate' }] },
  { id: 'menu', title: 'Choosing a device', note: 'A live level over the devices, the chosen one ticked.', steps: [{ at: 300, press: 'Choose a microphone' }] },
  { id: 'dictating', title: 'Dictating', note: 'Provisional words at the caret, a live level, Cancel and Accept.', steps: [{ at: 300, press: 'Dictate' }], settle: 2600 },
  {
    id: 'unplugged',
    title: 'Device unplugged mid-dictation',
    note: 'Capture stops; the words stay for Accept or Cancel.',
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 2300, mic: 'unplug' },
    ],
  },
  {
    id: 'switched',
    title: 'Device switched mid-dictation',
    note: 'The new device takes over in the same session.',
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 1500, press: 'Choose a microphone' },
      { at: 2100, choose: 'Wireless Headset' },
      { at: 2600, press: 'Choose a microphone' },
    ],
  },
  { id: 'dropped', title: 'Network drop', note: 'Stopped: connection lost; the words stay.', transport: { fail: { code: 'dropped', after: 12 } }, steps: [{ at: 300, press: 'Dictate' }], settle: 2800 },
  { id: 'refused', title: 'Provider refused', note: 'Stopped: the speech service refused it.', transport: { fail: { code: 'refused', after: 0 } }, steps: [{ at: 300, press: 'Dictate' }] },
  { id: 'quota', title: 'Quota reached', note: 'Paused: the spend limit is reached.', transport: { fail: { code: 'quota', after: 7 } }, steps: [{ at: 300, press: 'Dictate' }], settle: 1900 },
  {
    id: 'quiet',
    title: 'Long silence, hint',
    note: 'Still listening.',
    transport: { quietAfter: 9 },
    mic: { level: 'silent' },
    source: { silence: { hint: 1, stop: 600 } },
    steps: [{ at: 300, press: 'Dictate' }],
    settle: 3200,
  },
  {
    id: 'silence',
    title: 'Long silence, stopped',
    note: 'Capture stopped and the mic released; Accept, Cancel or resume.',
    transport: { quietAfter: 9 },
    mic: { level: 'silent' },
    source: { silence: { hint: 1, stop: 2 } },
    steps: [{ at: 300, press: 'Dictate' }],
    settle: 4200,
  },
  { id: 'length', title: 'Maximum length reached', note: 'Stopped at the limit; Accept, then dictate again.', transport: { fail: { code: 'length', after: 20 } }, steps: [{ at: 300, press: 'Dictate' }], settle: 4400 },
  {
    id: 'paused',
    title: 'Paused with the shortcut',
    note: 'The shortcut again stops capture without accepting.',
    steps: [
      { at: 300, key: 'shortcut' },
      { at: 1600, key: 'shortcut' },
    ],
  },
  {
    id: 'over-budget',
    title: 'Over the composer’s budget',
    note: 'Accept inserts as a paste would; the counter turns.',
    initial: 'Notes for Thursday:',
    maxLength: 80,
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 3200, press: 'Accept dictation' },
    ],
    settle: 600,
  },
  {
    id: 'closed',
    title: 'Navigation away',
    note: 'The box closed mid-dictation; its finished words stayed in the draft.',
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 2600, box: 'close' },
      { at: 3200, box: 'open' },
    ],
  },
  { id: 'two', title: 'Two composers on one page', note: 'The other mic is held, naming the box that is dictating.', twin: true, steps: [{ at: 300, press: 'Dictate' }], settle: 1200 },
  {
    id: 'holds-text',
    title: 'Composer already holds text',
    note: 'The words go in at the caret; the selection is replaced on Accept.',
    initial: 'Send the draft to Priya today.',
    caret: [9, 14],
    transport: { script: ['revised plan'], loop: false },
    steps: [{ at: 300, press: 'Dictate' }],
    settle: 900,
  },
  {
    id: 'proposal',
    title: 'Assistant proposes into the same box',
    note: 'The proposal waits until Accept or Cancel.',
    proposal: true,
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 1400, box: 'propose' },
    ],
  },
  {
    id: 'accepting',
    title: 'Accepting',
    note: 'The check spins while the last words arrive.',
    transport: { flushDelay: 60_000 },
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 2000, press: 'Accept dictation' },
    ],
    settle: 250,
  },
  {
    id: 'preparing',
    title: 'Preparing dictation',
    note: 'The engine loads its speech model on first use: the mic waits pressed in the idle row and the line shows progress.',
    transport: { prepare: 7000 },
    steps: [{ at: 300, press: 'Dictate' }],
    settle: 3000,
  },
  {
    id: 'starting',
    title: 'Starting',
    note: 'The microphone opens in half a second and the route answers a second later: the mic waits pressed beside Send, then the level, Cancel and Accept come in one change.',
    mic: { delay: 500 },
    transport: { connect: 1000 },
    steps: [{ at: 300, press: 'Dictate' }],
    settle: 2400,
  },
  {
    id: 'starting-cold',
    title: 'Starting, preparing first',
    note: 'The route loads its model first: the mic waits pressed beside Send and the line shows progress, then the level, Cancel and Accept come in one change.',
    mic: { delay: 500 },
    transport: { connect: 300, prepare: 3000 },
    steps: [{ at: 300, press: 'Dictate' }],
    settle: 4600,
  },
  {
    id: 'fallback',
    title: 'Engine busy, the browser takes over',
    note: 'The first route answered busy before a word; the on-device browser route took over, and the menu says the browser picks the microphone.',
    routes: [{ fail: { code: 'busy' } }, { picksDevice: true }],
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 1600, press: 'Choose a microphone' },
    ],
  },
  {
    id: 'service-busy',
    title: 'Every route busy',
    note: 'No route could take the session: said once, and the mic comes back.',
    routes: [{ fail: { code: 'busy' } }, { available: false }],
    steps: [{ at: 300, press: 'Dictate' }],
  },
  {
    id: 'no-route',
    title: 'No route in this browser',
    note: 'No route works here: said once, and the mic comes back.',
    routes: [{ available: false }],
    steps: [{ at: 300, press: 'Dictate' }],
  },
  {
    id: 'accepted',
    title: 'Accepted',
    note: 'Normal draft text, the caret after it; mic, chevron and Send are back.',
    steps: [
      { at: 300, press: 'Dictate' },
      { at: 2500, press: 'Accept dictation' },
    ],
    settle: 600,
  },
];

export type DictationLayout = 'chat' | 'inline';

export interface DictationStageProps {
  scenario: DictationScenario;
  layout: DictationLayout;
  /** The real microphone with the scripted words, so the level follows a voice. */
  live?: boolean;
  /** The browser's own on-device recognition instead of the scripted words. */
  device?: boolean;
  /** Runs the scenario's presses; off for a box to try by hand. */
  autoplay?: boolean;
  /** Called once the last step has run and the state has settled. */
  onSettled?: () => void;
}

const LABELS: Record<DictationLayout, { label: string; placeholder: string }> = {
  chat: { label: 'Message', placeholder: 'Message #launch-review' },
  inline: { label: 'Ask Crewlet', placeholder: 'Ask about this page' },
};

function find(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[aria-label="${name}"]`);
}

/** One composer (two with `twin`) in a scenario's state. */
export function DictationStage({ scenario, layout, live = false, device = false, autoplay = true, onSettled }: DictationStageProps) {
  const [value, setValue] = useState(scenario.initial ?? '');
  const [twin, setTwin] = useState('');
  const [open, setOpen] = useState(true);
  const [waiting, setWaiting] = useState<string | null>(null);
  const active = useRef(false);
  const queued = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const mic = useRef<FakeMicrophone | null>(null);

  const source = useMemo<DictationSource>(() => {
    const fake = fakeMicrophone(scenario.mic);
    mic.current = fake;
    return {
      transport: device ? webSpeechLocalTransport() : scenario.routes ? scenario.routes.map(fakeTransport) : fakeTransport(scenario.transport),
      microphone: live || device ? undefined : fake,
      onActiveChange: (now) => {
        active.current = now;
        if (!now && queued.current) {
          setValue((was) => `${was}${was ? ' ' : ''}${queued.current}`);
          queued.current = null;
          setWaiting(null);
        }
      },
      ...scenario.source,
    };
  }, [scenario, live, device]);

  useEffect(() => {
    const field = root.current?.querySelector('textarea');
    if (scenario.caret && field) {
      field.focus();
      field.setSelectionRange(...scenario.caret);
    }
    if (!autoplay) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const steps = scenario.steps ?? [];
    for (const step of steps) {
      timers.push(
        setTimeout(() => {
          const here = root.current;
          if (!here) return;
          if ('press' in step) {
            const control = find(here, step.press);
            // On a phone the chevron folds into the mic, whose Down arrow opens the menu.
            if (control && control.offsetParent === null && step.press === 'Choose a microphone') {
              find(here, 'Dictate')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
            } else control?.click();
          }
          else if ('choose' in step) {
            const row = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"],[role="menuitem"]')].find((r) => r.textContent === step.choose);
            row?.click();
          } else if ('key' in step) {
            const target = here.querySelector('textarea');
            const init =
              step.key === 'shortcut'
                ? { key: ' ', code: 'Space', shiftKey: true, ctrlKey: !/mac/i.test(navigator.platform), metaKey: /mac/i.test(navigator.platform) }
                : { key: step.key };
            target?.dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true }));
          } else if ('mic' in step) {
            if (step.mic === 'unplug') mic.current?.unplug();
            if (step.mic === 'settle') mic.current?.settle();
          } else if (step.box === 'close') setOpen(false);
          else if (step.box === 'open') setOpen(true);
          else if (step.box === 'propose') {
            const proposal = 'Draft: thanks all, see you Thursday.';
            if (active.current) {
              queued.current = proposal;
              setWaiting('A proposed draft waits until dictation ends.');
            } else setValue((was) => `${was}${was ? ' ' : ''}${proposal}`);
          }
        }, step.at),
      );
    }
    const last = steps.reduce((max, step) => Math.max(max, step.at), 0);
    timers.push(setTimeout(() => onSettled?.(), last + (scenario.settle ?? 700)));
    return () => timers.forEach(clearTimeout);
  }, [scenario, autoplay, onSettled]);

  const { label, placeholder } = LABELS[layout];
  const box = (name: string, text: string, set: (v: string) => void) =>
    layout === 'chat' ? (
      <Composer
        key={name}
        appearance="chat"
        rows={1}
        label={name}
        placeholder={placeholder}
        value={text}
        onChange={set}
        onSubmit={() => set('')}
        maxLength={scenario.maxLength}
        dictation={source}
        tools={
          <>
            <IconButton label="Attach" icon={<PlusGlyph />} size="sm" />
            <IconButton label="Emoji" icon={<FaceSlightlySmilingGlyph />} size="sm" />
            <IconButton label="Mention someone" icon={<AtSignGlyph />} size="sm" />
          </>
        }
        actions={<SendButton mode="send" disabledReason={text.trim() === '' ? 'Write a message first' : undefined} onPress={() => set('')} />}
      />
    ) : (
      <Composer
        key={name}
        label={name}
        placeholder={placeholder}
        value={text}
        onChange={set}
        onSubmit={() => set('')}
        maxLength={scenario.maxLength}
        dictation={source}
        sendHint={false}
        trailing={<SendButton mode="send" disabledReason={text.trim() === '' ? 'Type a question first' : undefined} onPress={() => set('')} />}
      />
    );

  return (
    <div ref={root} className="dictation-stage" data-layout={layout}>
      {scenario.twin ? box('Reply in the thread', twin, setTwin) : null}
      {open ? box(label, value, setValue) : <p className="dictation-stage__closed">The box is closed. Its draft: “{value}”</p>}
      {waiting ? <p className="dictation-stage__waiting">{waiting}</p> : null}
    </div>
  );
}
