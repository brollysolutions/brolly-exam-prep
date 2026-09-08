import ClientPage from '@/components/client-page';
import { SI_MOCK_01_ID } from '@tslprb/fixtures';
export default function Page() {
  return <ClientPage route="exam" id={SI_MOCK_01_ID} />;
}
