import ClientPage from '@/components/client-page';
import { SI_MOCK_01_ID } from '@tslprb/fixtures';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientPage route="result" id={id === 'simocktest' ? SI_MOCK_01_ID : id} />;
}
