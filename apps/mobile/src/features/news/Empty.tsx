import { Stack, Text } from '@/ui';

/**
 * F-24 — "there is nothing here yet", shared by the updates and current-affairs lists.
 *
 * Distinct from `LoadError`: nothing failed, so there is nothing to retry and no flag
 * kicker. One `dim` line, on the same gutter the cards would have stood on.
 */
export function NewsEmpty({ message, testID }: { message: string; testID: string }) {
  return (
    <Stack className="px-4 pt-6" testID={testID}>
      <Text variant="body" color="dim">
        {message}
      </Text>
    </Stack>
  );
}
