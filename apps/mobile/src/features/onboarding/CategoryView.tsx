import { CATEGORIES, type CategoryId } from '@tslprb/fixtures';
import { useDir } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import {
  ActionBar,
  BackRow,
  Button,
  Card,
  Num,
  PageHeader,
  Pill,
  Row,
  Screen,
  Stack,
  Text,
} from '@/ui';

const COLUMNS = 2;

/** CATEGORIES laid out two per row, in reading order. */
const ROWS = Array.from({ length: Math.ceil(CATEGORIES.length / COLUMNS) }, (_, i) =>
  CATEGORIES.slice(i * COLUMNS, i * COLUMNS + COLUMNS),
);

export type CategoryViewProps = {
  /** The category already on file, if the user is revisiting the step. */
  initialCategory?: CategoryId;
  onSubmit: (category: CategoryId) => void;
  onBack: () => void;
};

/**
 * Onboarding 2/2. The category sets the PWT qualifying percentage every result is measured
 * against, so each card carries its own number rather than hiding it in a footnote — the
 * percentage is the tile's figure (`<Num variant="stat">`), not a footnote under the label.
 */
export function CategoryView({ initialCategory, onSubmit, onBack }: CategoryViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const [category, setCategory] = useState<CategoryId | undefined>(initialCategory);

  return (
    <Screen testID="category-screen">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-3 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <BackRow testID="category-back" label={t('common.back')} onPress={onBack} />

        <PageHeader
          testID="category-header"
          className="mt-1"
          pill={
            <Pill
              leading={
                <Num
                  variant="caption"
                  weight="700"
                  testID="category-step"
                  tracking={d.lang === 'en' ? 'kicker' : 'none'}
                >
                  {t('onboarding.step', { n: 2, total: 2 })}
                </Num>
              }
            />
          }
          title={t('onboarding.catTitle')}
          subtitle={t('onboarding.catSub')}
        />

        <Stack testID="category-grid" gap={2} className="mt-5">
          {ROWS.map((row, i) => (
            <Row key={i} testID={`category-row-${i}`} gap={2} align="stretch">
              {row.map((c) => (
                <Card
                  key={c.id}
                  testID={`category-card-${c.id}`}
                  size="md"
                  title={t(c.labelKey)}
                  selected={category === c.id}
                  onPress={() => setCategory(c.id)}
                  className="flex-1"
                >
                  {/* The figure the whole step exists to set, at tile size. */}
                  <Num variant="stat" color="ink" className="mt-1">
                    {`${c.qualifyingPct}%`}
                  </Num>
                  <Text variant="caption" color="ink3">
                    {t('onboarding.catQual')}
                  </Text>
                </Card>
              ))}
              {/* An odd last row keeps its card half-width instead of stretching across. */}
              {row.length < COLUMNS && <View className="flex-1" />}
            </Row>
          ))}
        </Stack>
      </ScrollView>
      <ActionBar
        testID="category-bar"
        primary={
          <Button
            testID="category-start"
            size="lg"
            label={t('onboarding.startTest')}
            disabled={category === undefined}
            onPress={() => category !== undefined && onSubmit(category)}
          />
        }
      />
    </Screen>
  );
}
