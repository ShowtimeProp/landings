import { redirect } from 'next/navigation';
import { backendSsrHeaders } from '@/lib/backend';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

export default async function SmartBioNfcResolverPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = String(code || '').trim();
  if (!cleanCode) redirect('/');

  const res = await fetch(`${BACKEND_URL}/api/smart-bios/public/cards/${encodeURIComponent(cleanCode)}/resolve`, {
    cache: 'no-store',
    headers: backendSsrHeaders(),
  });
  if (!res.ok) redirect('/');
  const data = (await res.json()) as { redirect_url?: string };
  redirect(data.redirect_url || '/');
}
