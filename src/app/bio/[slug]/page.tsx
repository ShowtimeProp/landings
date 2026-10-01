import { notFound } from 'next/navigation';
import SmartBioClient from './smart-bio-client';
import { backendSsrHeaders } from '@/lib/backend';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

async function fetchSmartBio(slug: string) {
  const res = await fetch(`${BACKEND_URL}/api/smart-bios/public/${encodeURIComponent(slug)}`, {
    next: { revalidate: 30 },
    headers: backendSsrHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function SmartBioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchSmartBio(String(slug || '').trim());
  if (!data?.profile?.id) notFound();

  return <SmartBioClient initialData={data} backendUrl={BACKEND_URL} />;
}
