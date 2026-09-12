import ClientPage from '@/components/client-page';
import { SI_MOCK_03_ID } from '@/lib/test-ids';

export default function Page() {
  return <ClientPage route="exam" id={SI_MOCK_03_ID} />;
}
