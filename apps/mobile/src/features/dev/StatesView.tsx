import { LANGS, type Lang } from '@tslprb/i18n';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { LoginView } from '@/features/auth/LoginView';
import { OtpView } from '@/features/auth/OtpView';
import { AttemptStates } from '@/features/dev/sections/AttemptStates';
import { EligibilityStates } from '@/features/dev/sections/EligibilityStates';
import { LibraryStates } from '@/features/dev/sections/LibraryStates';
import { NewsStates } from '@/features/dev/sections/NewsStates';
import { PaperStates } from '@/features/dev/sections/PaperStates';
import { PatternStates } from '@/features/dev/sections/PatternStates';
import { ResultStates } from '@/features/dev/sections/ResultStates';
import { ShellStates } from '@/features/dev/sections/ShellStates';
import { StudyStates } from '@/features/dev/sections/StudyStates';
import { CategoryView } from '@/features/onboarding/CategoryView';
import { PostView } from '@/features/onboarding/PostView';
import {
  Banner,
  Brand,
  Button,
  Card,
  Chip,
  Dialog,
  Keypad,
  Kicker,
  OtpCells,
  PaletteCell,
  PhoneField,
  ProgressRail,
  Rail,
  Row,
  Screen,
  SegmentedChips,
  Sheet,
  Stack,
  Text,
  Toast,
  type ButtonVariant,
  type ChipTone,
  type SheetHandle,
} from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  title: 'Design system — states',
  sub: 'Every primitive in every state. Switch language to inspect the Telugu face.',
  text: 'Text',
  buttons: 'Buttons',
  cards: 'Cards',
  chips: 'Chips',
  dialog: 'Dialog',
  toasts: 'Toast + Banner',
  sheet: 'Sheet',
  sheetOpen: 'Open sheet',
  dialogOpen: 'Open dialog — accent (asks)',
  dialogDanger: 'Open dialog — danger (reports)',
  sheetBody: 'Sheet body — surface, 3 px gold edge, warm scrim.',
  entry: 'Keypad + PhoneField + OTP',
  progress: 'ProgressRail 40 % · danger 100 %',
  palette: 'PaletteCell',
  brand: 'Brand — lockup 28 / 40, splash 160',
  rail: 'Rail',
  railCritical: 'critical (pulse)',
  auth: 'Auth & onboarding',
  login: 'LoginView — filled + error toast',
  otp: 'OtpView — partial code, resend ready, dev code hint',
  post: 'PostView — step 1/2, SI chosen',
  category: 'CategoryView — step 2/2, BC chosen',
  disabled: 'disabled',
  selected: 'selected',
  active: 'active',
  filled: 'filled',
  empty: 'empty',
} as const;

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'accent'];
const TONES: ChipTone[] = ['accent', 'danger', 'ok'];
const TEXT_VARIANTS = [
  'kicker',
  'caption',
  'small',
  'body',
  'bodyLg',
  'question',
  'subtitle',
  'title',
  'titleLg',
  'display',
] as const;

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="ink3" uppercase>
        {title}
      </Kicker>
      {children}
    </Stack>
  );
}

/** Dev frame: every screen is `flex-1`, so a preview inside this scroll needs a bounded height. */
const PREVIEW_H = 560;

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Label>{label}</Label>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: PREVIEW_H }}>
        {children}
      </View>
    </Stack>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="caption" color="ink3">
      {children}
    </Text>
  );
}

export function StatesView() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [phone, setPhone] = useState('');
  // `null` = closed. Both tones have a frame: `danger` is worn by the auto-submit report and
  // by Profile's delete-account confirmation, and until fix wave 1 it had no gallery at all.
  const [dialogTone, setDialogTone] = useState<'accent' | 'danger' | null>(null);
  const sheet = useRef<SheetHandle>(null);

  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));

  const close = () => setDialogTone(null);
  const dialog = (
    <>
      <Dialog
        visible={dialogTone === 'accent'}
        tone="accent"
        kicker={t('test.submitKicker')}
        title={t('test.submitTitle')}
        body={t('test.submitBody')}
        stats={[
          { num: 31, label: t('test.answered') },
          { num: 6, label: t('test.notAnswered') },
          { num: 3, label: t('test.marked') },
        ]}
        primary={{ label: t('test.submitYes'), onPress: close }}
        secondary={{ label: t('test.submitNo'), onPress: close }}
        testID="dialog"
      />
      <Dialog
        visible={dialogTone === 'danger'}
        tone="danger"
        kicker={t('profile.deleteAccount')}
        title={t('profile.deleteTitle')}
        body={t('profile.deleteConfirm')}
        primary={{ label: t('profile.deleteYes'), onPress: close }}
        secondary={{ label: t('common.cancel'), onPress: close }}
        testID="dialog-danger"
      />
    </>
  );

  return (
    <Screen scroll padded overlay={dialog} testID="states-screen">
      <Row testID="states-header" align="center" justify="between" className="mt-4">
        <Brand testID="states-brand" />
        <SegmentedChips
          value={lang}
          onChange={setLang}
          options={langOptions}
          testID="lang-switcher"
        />
      </Row>
      <Text variant="title" weight="600" className="mt-3">
        {DEV.title}
      </Text>
      <Text variant="small" color="ink3" className="mt-2">
        {DEV.sub}
      </Text>

      <Section index="01" title={DEV.text}>
        {TEXT_VARIANTS.map((v) => (
          <Text
            key={v}
            variant={v}
            weight={v === 'kicker' ? '700' : '400'}
            color={v === 'kicker' ? 'ink3' : 'ink'}
            tracking={v === 'kicker' ? 'kicker' : undefined}
          >
            {v} · {t('auth.loginTitle')}
          </Text>
        ))}
      </Section>

      <Section index="02" title={DEV.buttons}>
        {VARIANTS.map((v) => (
          <Stack key={v} gap={2}>
            <Label>{v}</Label>
            <Row gap={2} wrap>
              <Button variant={v} label={t('common.continue')} className="flex-1" />
              <Button variant={v} size="lg" label={t('common.continue')} className="flex-1" />
            </Row>
            <Row gap={2} wrap>
              <Button
                variant={v}
                label={`${t('common.continue')} · ${DEV.disabled}`}
                disabled
                className="flex-1"
              />
              {v === 'accent' && (
                <Button variant={v} active label={t('test.markedShort')} className="flex-1" />
              )}
            </Row>
          </Stack>
        ))}
      </Section>

      <Section index="03" title={DEV.cards}>
        <Card title={t('onboarding.pcTitle')} subtitle={t('onboarding.pcSub')} onPress={() => {}} />
        <Card
          title={t('onboarding.siTitle')}
          subtitle={t('onboarding.siSub')}
          selected
          onPress={() => {}}
        />
        <Row gap={2}>
          <Card
            size="md"
            title={t('onboarding.cats.oc')}
            subtitle={`${t('onboarding.catQual')} 40%`}
            className="flex-1"
            onPress={() => {}}
          />
          <Card
            size="md"
            title={t('onboarding.cats.bc')}
            subtitle={`${t('onboarding.catQual')} 35%`}
            selected
            className="flex-1"
            onPress={() => {}}
          />
        </Row>
      </Section>

      <Section index="04" title={DEV.chips}>
        <Row gap={2} wrap>
          {TONES.map((tone) => (
            <Chip key={tone} label={tone} tone={tone} active onPress={() => {}} />
          ))}
          <Chip label={t('common.free')} onPress={() => {}} />
          <Chip label={t('common.locked')} muted onPress={() => {}} />
          <Chip label={t('common.locked')} disabled />
        </Row>
        <Row gap={2} wrap align="center">
          <Chip label="sm 34" active size="sm" />
          <Chip label="md 40" active size="md" />
          <Chip label="lg 48" active size="lg" />
          <Chip label={t('result.qualified')} active shape="pill" size="md" />
          <Chip label={t('common.free')} shape="pill" size="md" onPress={() => {}} />
          <Chip label={t('common.sampleData')} tone="label" />
        </Row>
      </Section>

      <Section index="05" title={DEV.dialog}>
        <Stack gap={2}>
          <Button
            variant="secondary"
            label={DEV.dialogOpen}
            onPress={() => setDialogTone('accent')}
            testID="dialog-toggle"
          />
          <Button
            variant="secondary"
            label={DEV.dialogDanger}
            onPress={() => setDialogTone('danger')}
            testID="dialog-danger-toggle"
          />
        </Stack>
      </Section>

      <Section index="06" title={DEV.toasts}>
        <Toast text={t('test.warn5')} tone="accent" />
        <Toast text={t('test.warn1')} tone="danger" />
        <Toast text={t('library.lockedToast')} tone="info" />
        <Banner />
      </Section>

      <Section index="07" title={DEV.sheet}>
        <Button
          variant="secondary"
          label={DEV.sheetOpen}
          onPress={() => sheet.current?.present()}
        />
        <Sheet ref={sheet} title={t('test.palette')}>
          <View className="px-3 pb-6">
            <Text variant="body" color="ink2">
              {DEV.sheetBody}
            </Text>
          </View>
        </Sheet>
      </Section>

      <Section index="08" title={DEV.entry}>
        <Label>{DEV.empty}</Label>
        <PhoneField value="" />
        <Label>{DEV.filled}</Label>
        <PhoneField value="9000012345" />
        <PhoneField value={phone} testID="phone-live" />
        <Keypad
          onKey={(k) => setPhone((p) => (p.length < 10 ? p + k : p))}
          onDelete={() => setPhone((p) => p.slice(0, -1))}
        />
        <Button size="lg" label={t('common.continue')} disabled={phone.length < 10} />
        <OtpCells value="123" />
      </Section>

      <Section index="09" title={DEV.progress}>
        <ProgressRail fraction={0.4} />
        <ProgressRail fraction={1} ticks={5} tone="danger" />
      </Section>

      <Section index="10" title={DEV.palette}>
        <Row gap={2} wrap align="center">
          <PaletteCell n={1} state="nv" />
          <PaletteCell n={2} state="na" />
          <PaletteCell n={3} state="a" />
          <PaletteCell n={4} state="m" />
          <PaletteCell n={5} state="am" dot />
          <PaletteCell n={6} state="a" current />
          <PaletteCell n={7} state="am" current dot />
          <PaletteCell n={8} state="nv" disabled />
        </Row>
      </Section>

      <Section index="11" title={DEV.rail}>
        <Rail />
        <Label>{DEV.railCritical}</Label>
        <Rail critical />
      </Section>

      <PatternStates index="12" />

      <AttemptStates index="13" />

      <Section index="14" title={DEV.auth}>
        <Preview label={DEV.login}>
          <LoginView
            initialPhone="9000012345"
            error={t('common.networkError')}
            onSubmit={() => {}}
          />
        </Preview>
        <Preview label={DEV.otp}>
          <OtpView
            phone="9000012345"
            initialCode="1234"
            devCode="123456"
            resendSeconds={0}
            onVerify={() => false}
            onResend={() => {}}
            onChangeNumber={() => {}}
          />
        </Preview>
        <Preview label={DEV.post}>
          <PostView initialPost="si" onSubmit={() => {}} />
        </Preview>
        <Preview label={DEV.category}>
          <CategoryView initialCategory="bc" onSubmit={() => {}} onBack={() => {}} />
        </Preview>
      </Section>

      <ResultStates index="15" />

      <ShellStates index="16" />

      <StudyStates index="17" />

      <LibraryStates index="18" />

      <PaperStates index="19" />

      <NewsStates index="20" />

      <EligibilityStates index="21" />

      <Section index="22" title={DEV.brand}>
        <Brand />
        <Brand size={40} />
        <Brand variant="splash" size={160} />
      </Section>
    </Screen>
  );
}
