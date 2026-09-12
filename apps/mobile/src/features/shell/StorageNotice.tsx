import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { kvStorage } from '@/data/storage';
import { Button, Stack, Text } from '@/ui';

export function StorageNotice() {
  const { t } = useTranslation();
  const status = useSyncExternalStore(kvStorage.subscribe, kvStorage.getStatus);
  const [failed, setFailed] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (status !== 'temporary') return null;
  return (
    <ScrollView style={{ maxHeight: height * 0.35, flexGrow: 0, marginTop: insets.top }}>
      <Stack gap={2} className="bg-surface2 p-4">
        <Text accessibilityRole="alert">{t('storage.unavailable')}</Text>
        <Button
          variant="secondary"
          label={t('storage.retry')}
          onPress={() => setFailed(!kvStorage.retry())}
        />
        {failed && <Text accessibilityLiveRegion="polite">{t('storage.stillUnavailable')}</Text>}
      </Stack>
    </ScrollView>
  );
}
