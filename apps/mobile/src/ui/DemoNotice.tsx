import { useTranslation } from 'react-i18next';
import { Text } from './Text';

export function DemoNotice() {
  const { t } = useTranslation();
  return (
    <Text variant="small" color="ink2" className="py-3">
      {t('audit.demoPaperNote')}
    </Text>
  );
}
