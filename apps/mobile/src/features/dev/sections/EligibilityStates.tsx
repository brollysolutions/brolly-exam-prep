import { standardsFor } from '@tslprb/fixtures';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { EligibilityView } from '@/features/eligibility/EligibilityView';
import { evaluate, toInput, type MeasureValues } from '@/features/eligibility/evaluate';
import { Kicker, Stack, Text } from '@/ui';

/**
 * Developer-only gallery for the PMT/PET checker. Labels are dev copy, deliberately outside the
 * locale files; the frame height is a dev-only viewport, because `EligibilityView` is `flex-1`
 * and needs a bounded box inside the gallery's own scroll view.
 */
const DEV = {
  title: 'PMT / PET eligibility',
  eligible: 'F-25 — every standard met (constable, men, general)',
  notYet: 'F-25 — short on height and the 1600 m (constable, men, general)',
  stChest: 'F-25 — ST chest relaxation tagged unconfirmed (constable, men, ST)',
  incomplete: 'F-25 — half a form, SI note and every row tagged unconfirmed (SI, women, ST)',
} as const;

const FRAME_HEIGHT = 560;

/** A constable man who clears everything, including the boundary height exactly. */
const PASSING: MeasureValues = {
  height: '167.6',
  chest: '88',
  chestExpansion: '5',
  run1600m: '425',
  longJump: '4.1',
  shotPut: '6.2',
};

/** The same man 8 cm shorter and 25 seconds slower. */
const FAILING: MeasureValues = { ...PASSING, height: '159.5', run1600m: '460' };

/** Two answers in, three to go (an SI woman has no chest rows). */
const PARTIAL: MeasureValues = { height: '155', run100m: '15.5' };

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="dim">
        {label}
      </Text>
      <View
        className="overflow-hidden rounded-md border border-line"
        style={{ height: FRAME_HEIGHT }}
      >
        {children}
      </View>
    </Stack>
  );
}

const noop = () => {};

function Preview({
  label,
  post,
  gender,
  group,
  values,
}: {
  label: string;
  post: 'pc' | 'si';
  gender: 'male' | 'female';
  group: 'general' | 'st';
  values: MeasureValues;
}) {
  const standards = standardsFor(post, gender, group);
  return (
    <Frame label={label}>
      <EligibilityView
        post={post}
        gender={gender}
        group={group}
        values={values}
        result={evaluate(toInput(post, gender, group, values), standards)}
        onPost={noop}
        onGender={noop}
        onGroup={noop}
        onChange={noop}
        onCheck={noop}
      />
    </Frame>
  );
}

export function EligibilityStates({ index }: { index: string }) {
  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="dim" uppercase>
        {DEV.title}
      </Kicker>
      <Preview label={DEV.eligible} post="pc" gender="male" group="general" values={PASSING} />
      <Preview label={DEV.notYet} post="pc" gender="male" group="general" values={FAILING} />
      <Preview label={DEV.stChest} post="pc" gender="male" group="st" values={PASSING} />
      <Preview label={DEV.incomplete} post="si" gender="female" group="st" values={PARTIAL} />
    </Stack>
  );
}
