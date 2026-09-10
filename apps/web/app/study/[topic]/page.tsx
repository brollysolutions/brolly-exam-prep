import ClientPage from '@/components/client-page';
import { SI_MOCK_01_ID } from '@tslprb/fixtures/src/runtime';

export default async function Page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return <ClientPage route="topic" id={topic === 'simocktest' ? SI_MOCK_01_ID : topic} />;
}
