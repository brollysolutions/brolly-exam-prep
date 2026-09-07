import { View } from 'react-native';

import {
  ActionBar,
  BackHeader,
  Button,
  Card,
  EmptyState,
  Kicker,
  LoadError,
  MarkerRow,
  Num,
  PageHeader,
  Pill,
  Row,
  Skeleton,
  Stack,
  StatTile,
  Text,
} from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  patterns: 'Screen patterns (P1–P6)',
  pill: 'Pill — quiet · gold · ink, with a dot and a <Num> lead',
  pillTones: 'Pill — dot tones (gold · danger · ok · none) and align="center"',
  pageHeader: 'PageHeader — trailing, pill, Playfair title, ink3 subtitle',
  pageHeaderPlain: 'PageHeader — title only (Profile)',
  backHeader: 'BackHeader — leaf bar, trailing pill, second row',
  statTile: 'StatTile — counted · quiet zero · nothing yet',
  markerRow: 'MarkerRow — dot · done · locked · plain, in one card',
  actionBar: 'ActionBar — ghost + the one ink primary',
  actionBarPlain: 'ActionBar bordered={false} — the Welcome footer, no line, no shadow',
  placeholder: 'Placeholder — empty · skeleton · error',
  placeholderAction: 'EmptyState with a way on (Phase C uses it)',
  markerRowLong: 'MarkerRow — a Telugu title that wraps, capped at two lines',
  step: 'Step',
  today: 'Today',
  marked: 'Marked',
  answered: 'Answered',
  sample: 'Sample data',
  filters: 'A second row lives here — the solutions filters, the paper’s sections.',
  centred: 'Centred',
  failed: 'Problem',
  eligible: 'Eligible',
  heading: 'Heading (no dot)',
  browse: 'Browse the library',
  // Long enough to wrap at 390 px, and the face that grows the row the most.
  teLong: 'తెలంగాణ రాష్ట్ర స్థాయి పోలీస్ నియామక మండలి తాజా ప్రకటన విడుదల చేసింది',
  teMeta: 'తెలంగాణ',
} as const;

const noop = () => {};

function Label({ children }: { children: string }) {
  return (
    <Text variant="caption" color="ink3">
      {children}
    </Text>
  );
}

/**
 * The six screen patterns Phase B introduced, in the states worth eyeballing. They are
 * compositions of the primitives above, so they live in their own section rather than being
 * scattered through the ones that own their parts.
 */
export function PatternStates({ index }: { index: string }) {
  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="ink3" uppercase>
        {DEV.patterns}
      </Kicker>

      <Label>{DEV.pill}</Label>
      <Row gap={2} wrap align="center">
        <Pill label={DEV.sample} />
        <Pill label={DEV.today} dot />
        <Pill label={DEV.answered} tone="gold" dot />
        <Pill label={DEV.marked} tone="ink" dot />
        <Pill label={DEV.step} leading={<Num variant="caption">{'1 / 3'}</Num>} />
      </Row>

      <Label>{DEV.pillTones}</Label>
      <Stack gap={2}>
        <Row gap={2} wrap align="center">
          <Pill label={DEV.today} dot />
          <Pill label={DEV.failed} dot dotTone="danger" />
          <Pill label={DEV.eligible} dot dotTone="ok" />
          <Pill label={DEV.heading} dot dotTone="none" />
        </Row>
        {/* A pill hugs its label, so a centred block has to be told: `align="center"`. */}
        <Pill align="center" label={DEV.centred} />
      </Stack>

      <Label>{DEV.pageHeader}</Label>
      <PageHeader
        trailing={<Pill label={DEV.today} tone="gold" dot />}
        pill={<Pill label={DEV.step} leading={<Num variant="caption">{'1 / 2'}</Num>} />}
        title="Which post are you preparing for?"
        subtitle="This changes your tests, physical standards and exam pattern."
      />

      <Label>{DEV.pageHeaderPlain}</Label>
      <PageHeader title="Profile" />

      <Label>{DEV.statTile}</Label>
      <Row gap={2} align="stretch">
        <StatTile value="5/11" label="Topics read" />
        <StatTile value={0} label="Papers practised" empty />
        <StatTile label="Best score" />
      </Row>

      <Label>{DEV.markerRow}</Label>
      <Card>
        <MarkerRow first title="Indian polity" meta="12 min" marker="dot" chevron onPress={noop} />
        <MarkerRow
          title="Telangana movement"
          meta="9 min"
          marker="done"
          trailing={<Pill label="Read" />}
          onPress={noop}
        />
        <MarkerRow
          title="Mock 4"
          marker="locked"
          trailing={<Pill label="Locked" />}
          onPress={noop}
        />
        <MarkerRow
          title="Language"
          trailing={
            <Text variant="body" color="ink3">
              English
            </Text>
          }
        />
      </Card>

      {/* The state the mark alignment was fixed for: a wrapped title keeps the dot and the
          date on line 1, and the row grows instead of clipping. */}
      <Label>{DEV.markerRowLong}</Label>
      <Card>
        <MarkerRow
          first
          title={DEV.teLong}
          titleLines={2}
          meta={DEV.teMeta}
          marker="dot"
          trailing={<Num variant="caption">{'12 Jul'}</Num>}
          chevron
          onPress={noop}
        />
      </Card>

      <Label>{DEV.actionBar}</Label>
      <View className="overflow-hidden rounded-md border border-line">
        <ActionBar
          secondary={<Button variant="ghost" label="Skip" onPress={noop} />}
          primary={<Button size="lg" label="Get started" onPress={noop} />}
        />
      </View>

      <Label>{DEV.actionBarPlain}</Label>
      <View className="overflow-hidden rounded-md border border-line">
        <ActionBar
          bordered={false}
          secondary={<Button variant="ghost" label="Skip" onPress={noop} />}
          primary={<Button size="lg" label="Next" onPress={noop} />}
        />
      </View>

      <Label>{DEV.placeholder}</Label>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: 180 }}>
        <EmptyState message="Nothing from the Board yet." testID="states-empty" />
      </View>
      <Skeleton blocks={['kicker', 'row', 'card']} testID="states-skeleton" />
      <LoadError onRetry={noop} testID="states-error" />

      <Label>{DEV.placeholderAction}</Label>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: 200 }}>
        <EmptyState
          message="No papers on this shelf yet."
          action={<Button variant="secondary" label={DEV.browse} onPress={noop} />}
          testID="states-empty-action"
        />
      </View>

      <Label>{DEV.backHeader}</Label>
      <View className="overflow-hidden rounded-md border border-line">
        <BackHeader title="Your result" onBack={() => {}} trailing={<Pill label={DEV.sample} />}>
          <View className="px-3 pb-3">
            <Text variant="caption" color="ink3">
              {DEV.filters}
            </Text>
          </View>
        </BackHeader>
      </View>
    </Stack>
  );
}
