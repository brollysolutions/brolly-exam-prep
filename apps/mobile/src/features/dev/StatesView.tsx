import { LANGS, type Lang } from '@tslprb/i18n';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { LoginView } from '@/features/auth/LoginView';
import { OtpView } from '@/features/auth/OtpView';
import { AttemptStates } from '@/features/dev/sections/AttemptStates';
import { ResultStates } from '@/features/dev/sections/ResultStates';
import { CategoryView } from '@/features/onboarding/CategoryView';
import { PostView } from '@/features/onboarding/PostView';
import {
  Banner,
  Button,
  Card,
  Chip,
  Dialog,
  HazardRail,
  Keypad,
  Kicker,
  OtpCells,
  PaletteCell,
  PhoneField,
  ProgressRail,
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
  sub: 'Every primitive in every state. Switch language to inspect Urdu mirroring.',
  text: 'Text',
  buttons: 'Buttons',
  cards: 'Cards',
  chips: 'Chips',
  dialog: 'Dialog',
  toasts: 'Toast + Banner',
  sheet: 'Sheet',
  sheetOpen: 'Open sheet',
  dialogOpen: 'Open dialog',
  sheetBody: 'Sheet body — panel2, 3 px hi-vis edge, scrim backdrop.',
  entry: 'Keypad + PhoneField + OTP',
  progress: 'ProgressRail 40 %',
  palette: 'PaletteCell',
  rail: 'HazardRail',
  railCritical: 'critical (marquee)',
  auth: 'Auth & onboarding',
  login: 'LoginView — filled + error toast',
  otp: 'OtpView — partial code, resend ready',
  post: 'PostView — step 1/2, SI chosen',
  category: 'CategoryView — step 2/2, BC chosen',
  disabled: 'disabled',
  selected: 'selected',
  active: 'active',
  filled: 'filled',
  empty: 'empty',
} as const;

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'hazard'];
const TONES: ChipTone[] = ['hivis', 'hazard', 'flag', 'sand'];
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
      <Kicker index={index} color="dim" uppercase>
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
      <View
        className="overflow-hidden rounded-md border border-line"
        style={{ height: PREVIEW_H }}
      >
        {children}
      </View>
    </Stack>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="caption" color="dim">
      {children}
    </Text>
  );
}

export function StatesView() {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const [phone, setPhone] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const sheet = useRef<SheetHandle>(null);

  const langOptions = LANGS.map((l: Lang) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));

  const dialog = (
    <Dialog
      visible={dialogOpen}
      tone="hivis"
      kicker={t('test.submitKicker')}
      title={t('test.submitTitle')}
      body={t('test.submitBody')}
      stats={[
        { num: 31, label: t('test.answered') },
        { num: 6, label: t('test.notAnswered') },
        { num: 3, label: t('test.marked') },
      ]}
      primary={{ label: t('test.submitYes'), onPress: () => setDialogOpen(false) }}
      secondary={{ label: t('test.submitNo'), onPress: () => setDialogOpen(false) }}
      testID="dialog"
    />
  );

  return (
    <Screen scroll padded overlay={dialog} testID="states-screen">
      <Row testID="states-header" align="center" justify="between" className="mt-4">
        <Kicker lang="en" color="hivis" tracking="brand">
          {t('common.brand')}
        </Kicker>
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
      <Text variant="small" color="dim" className="mt-2">
        {DEV.sub}
      </Text>

      <Section index="01" title={DEV.text}>
        {TEXT_VARIANTS.map((v) => (
          <Text
            key={v}
            variant={v}
            weight={v === 'kicker' ? '700' : '400'}
            color={v === 'kicker' ? 'dim' : 'chalk'}
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
              {v === 'hazard' && (
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
          <Chip label={t('common.locked')} disabled />
        </Row>
        <Row gap={2} wrap align="center">
          <Chip label="sm 34" active size="sm" />
          <Chip label="md 40" active size="md" />
          <Chip label="lg 48" active size="lg" />
          <Chip label={t('result.qualified')} active shape="pill" size="md" />
        </Row>
      </Section>

      <Section index="05" title={DEV.dialog}>
        <Row gap={2}>
          <Button
            variant="secondary"
            label={DEV.dialogOpen}
            onPress={() => setDialogOpen(true)}
            testID="dialog-toggle"
          />
        </Row>
      </Section>

      <Section index="06" title={DEV.toasts}>
        <Toast text={t('test.warn5')} tone="hazard" />
        <Toast text={t('test.warn1')} tone="flag" />
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
            <Text variant="body" color="chalk2">
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
        <ProgressRail fraction={1} ticks={5} />
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
        <HazardRail />
        <Label>{DEV.railCritical}</Label>
        <HazardRail critical />
      </Section>

      <AttemptStates />

      <Section index="12" title={DEV.auth}>
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

      <ResultStates />
    </Screen>
  );
}
