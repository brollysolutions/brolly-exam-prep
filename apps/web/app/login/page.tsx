import { redirect } from 'next/navigation';
import { loginReturnHref } from '@/lib/routes';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  redirect(loginReturnHref(Array.isArray(returnTo) ? returnTo[0] : returnTo));
}
