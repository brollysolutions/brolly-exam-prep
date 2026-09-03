import { useTranslation } from 'react-i18next';

import { Kicker, Stack, Text } from '@/ui';

/**
 * F-24 — "there is nothing here yet", shared by the updates and current-affairs lists.
 *
 * Distinct from `LoadError`: nothing failed, so there is nothing to retry and no flag
 * kicker. Centred in the space the list would have filled, with a kicker over one `dim`
 * line — a grey line in the top corner read as a screen that had not loaded (design 13).
 */
export function NewsEmpty({ message, testID }: { message: string; testID: string }) {
  const { t } = useTranslation();
  return (
    <Stack gap={2} className="flex-1 items-center justify-center px-8" testID={testID}>
      <Kicker align="center">{t('common.nothingYet')}</Kicker>
      <Text variant="body" color="dim" align="center">
        {message}
      </Text>
    </Stack>
  );
}
