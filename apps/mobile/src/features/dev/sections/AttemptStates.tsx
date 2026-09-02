import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import type { AttemptState } from '@/data/attempt';
import { useLangStore } from '@/data/lang';
import {
  AttemptDialogs,
  AttemptNotices,
  CallOverlay,
  lockedMessage,
  type AttemptDialogKind,
  type AttemptToast,
} from '@/features/attempt/AttemptOverlays';
import { AttemptView } from '@/features/attempt/AttemptView';
import { PaletteSheet } from '@/features/attempt/PaletteSheet';
import { counts } from '@/data/attempt.selectors';
import { Kicker, Stack, Text, type SheetHandle } from '@/ui';

import {
  DEMO_ATTEMPT,
  DEMO_ELAPSED_SEC,
  DEMO_PAPER,
  DEMO_REMAINING_SEC,
  demoAttempt,
} from './attemptDemo';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  title: 'Test attempt',
  sub: 'The prototype’s 14 states, rendered through AttemptView with the demo attempt.',
} as const;

/** The prototype's state list, in its order. */
const STATES = [
  ['progress', 'In progress (default)'],
  ['palette', 'Question palette — all states'],
  ['markedQ8', 'Answered + marked question'],
  ['revisitedQ4', 'Not answered, revisited'],
  ['locked', 'Section locked'],
  ['warn5', '5-minute warning'],
  ['warn1', 'Last-minute warning'],
  ['offline', 'Connection lost'],
  ['online', 'Back online (banner clears)'],
  ['resume', 'App backgrounded → resume'],
  ['call', 'Incoming call'],
  ['exit', 'Exit confirmation'],
  ['submit', 'Submit confirmation'],
  ['auto', 'Time up → auto-submit (queued)'],
] as const;

type StateId = (typeof STATES)[number][0];

/** Enough height to show header, question, options and footer at once. */
const FRAME_HEIGHT = 620;
/** Section index of the gated Telangana section in the free-mock pattern. */
const LOCKED_SECTION = 3;

type DemoConfig = {
  attempt: AttemptState;
  remainingSec: number;
  elapsedSec: number;
  offline: boolean;
  toast: AttemptToast | null;
  dialog: AttemptDialogKind | null;
  palette: boolean;
  call: boolean;
};

function configFor(id: StateId, lockedText: string, warn5: string, warn1: string): DemoConfig {
  const base: DemoConfig = {
    attempt: DEMO_ATTEMPT,
    remainingSec: DEMO_REMAINING_SEC,
    elapsedSec: DEMO_ELAPSED_SEC,
    offline: false,
    toast: null,
    dialog: null,
    palette: false,
    call: false,
  };
  switch (id) {
    case 'palette':
      return { ...base, palette: true };
    case 'markedQ8':
      return { ...base, attempt: demoAttempt({ current: 8 }) };
    case 'revisitedQ4':
      return { ...base, attempt: demoAttempt({ current: 4 }) };
    case 'locked':
      return { ...base, toast: { key: 'locked', text: lockedText, tone: 'hazard' } };
    case 'offline':
      return { ...base, offline: true };
    case 'warn5':
      return { ...base, remainingSec: 300, toast: { key: 'warn5', text: warn5, tone: 'hazard' } };
    case 'warn1':
      return { ...base, remainingSec: 47, toast: { key: 'warn1', text: warn1, tone: 'flag' } };
    case 'online':
      return { ...base, offline: false };
    case 'resume':
      return { ...base, dialog: 'resume' };
    case 'call':
      return { ...base, call: true };
    case 'exit':
      return { ...base, dialog: 'exit' };
    case 'submit':
      return { ...base, dialog: 'submit' };
    case 'auto':
      return { ...base, remainingSec: 0, dialog: 'auto' };
    case 'progress':
    default:
      return base;
  }
}

const noop = () => undefined;

/** Gallery section for F-09/10/11: pick a state, see the real screen render it. */
export function AttemptStates() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [id, setId] = useState<StateId>('progress');
  const sheet = useRef<SheetHandle>(null);

  const config = configFor(
    id,
    lockedMessage(t, DEMO_ATTEMPT.pattern, LOCKED_SECTION),
    t('test.warn5'),
    t('test.warn1'),
  );

  // The sheet is imperative, so the selected state has to drive it.
  const paletteOpen = config.palette;
  useEffect(() => {
    if (paletteOpen) sheet.current?.present();
    else sheet.current?.dismiss();
  }, [paletteOpen]);

  const overlay = (
    <>
      <PaletteSheet
        ref={sheet}
        attempt={config.attempt}
        onGoto={noop}
        onSubmit={() => setId('submit')}
      />
      <AttemptDialogs
        kind={config.dialog}
        counts={counts(config.attempt)}
        onDismiss={() => setId('progress')}
        onLeave={() => setId('progress')}
        onSubmit={() => setId('progress')}
        onSeeResult={() => setId('progress')}
      />
      <CallOverlay visible={config.call} onEnd={() => setId('resume')} />
    </>
  );

  return (
    <Stack gap={3} className="mt-6">
      <Kicker index="12" color="dim" uppercase>
        {DEV.title}
      </Kicker>
      <Text variant="small" color="dim">
        {DEV.sub}
      </Text>

      <Stack gap={2}>
        {STATES.map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: id === value }}
            onPress={() => setId(value)}
            testID={`attempt-state-${value}`}
            className={
              id === value
                ? 'rounded-xs border border-hivis bg-hivisTint px-3 py-2'
                : 'rounded-xs border border-line2 bg-panel4 px-3 py-2'
            }
          >
            <Text variant="small" weight="600" color={id === value ? 'hivis' : 'chalk'}>
              {label}
            </Text>
          </Pressable>
        ))}
      </Stack>

      <View
        testID="attempt-frame"
        className="overflow-hidden border border-line"
        style={{ height: FRAME_HEIGHT }}
      >
        <AttemptView
          attempt={config.attempt}
          question={DEMO_PAPER[config.attempt.current - 1]}
          remainingSec={config.remainingSec}
          elapsedSec={config.elapsedSec}
          lang={lang}
          onLangChange={setLang}
          onExit={() => setId('exit')}
          onSectionPress={noop}
          onLockedTap={() => setId('locked')}
          onAnswer={noop}
          onClear={noop}
          onToggleMark={noop}
          onPrev={noop}
          onNext={noop}
          onOpenPalette={() => setId('palette')}
          notices={<AttemptNotices offline={config.offline} toast={config.toast} />}
          overlay={overlay}
          testID="attempt-demo"
        />
      </View>
    </Stack>
  );
}
