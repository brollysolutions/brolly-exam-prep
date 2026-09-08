import ClientPage from '@/components/client-page';
import { CONSTABLE_MOCK_01_ID } from '@/lib/test-ids';

export default function Page() {
  return <ClientPage route="exam" id={CONSTABLE_MOCK_01_ID} />;
}
