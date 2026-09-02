import { CATEGORIES, type CategoryId } from '@tslprb/fixtures';
import { useDir } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Card, Num, Row, Screen, Stack, Text } from '@/ui';

const COLUMNS = 2;

/** CATEGORIES laid out two per row, in reading order. */
const ROWS = Array.from({ length: Math.ceil(CATEGORIES.length / COLUMNS) }, (_, i) =>
  CATEGORIES.slice(i * COLUMNS, i * COLUMNS + COLUMNS),
);

export type CategoryViewProps = {
  /** The category already on file, if the user is revisiting the step. */
  initialCategory?: CategoryId;
  busy?: boolean;
  onSubmit: (category: CategoryId) => void;
  onBack: () => void;
};

/**
 * Onboarding 2/2. The category sets the PWT qualifying percentage every result is measured
 * against, so each card carries its own number rather than hiding it in a footnote.
 */
export function CategoryView({
  initialCategory,
  busy = false,
  onSubmit,
  onBack,
}: CategoryViewProps) {
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
        <Pressable
          testID="category-back"
          accessibilityRole="button"
          onPress={onBack}
          className="h-touch justify-center"
        >
          <Row testID="category-back-row" gap={2} align="center">
            <Text variant="glyph" color="dim" accessibilityElementsHidden>
              {d.chevronPrev}
            </Text>
            <Text variant="body" weight="600" color="dim">
              {t('common.back')}
            </Text>
          </Row>
        </Pressable>

        <Num
          variant="kicker"
          weight="700"
          color="hazard"
          tracking="kicker"
          testID="category-step"
          className="mt-1"
        >
          {t('onboarding.step', { n: 2, total: 2 })}
        </Num>
        <Text variant="title" weight="600" className="mt-2">
          {t('onboarding.catTitle')}
        </Text>
        <Text variant="small" color="dim" className="mt-2">
          {t('onboarding.catSub')}
        </Text>

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
                  <Row gap={1} align="baseline" wrap className="mt-1">
                    <Text variant="caption" color="dim">
                      {t('onboarding.catQual')}
                    </Text>
                    <Num variant="caption" weight="400" color="dim">
                      {`${c.qualifyingPct}%`}
                    </Num>
                  </Row>
                </Card>
              ))}
            </Row>
          ))}
        </Stack>
      </ScrollView>
      <View className="px-3 pb-4">
        <Button
          testID="category-start"
          size="lg"
          label={t('onboarding.startTest')}
          disabled={category === undefined || busy}
          onPress={() => category !== undefined && onSubmit(category)}
        />
      </View>
    </Screen>
  );
}
