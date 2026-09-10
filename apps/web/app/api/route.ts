import { NextRequest } from 'next/server';
import { GET as proxy } from './[...path]/route';

export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return proxy(request, { params: Promise.resolve({ path: ['health'] }) });
}
