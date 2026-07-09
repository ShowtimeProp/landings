import { notFound } from 'next/navigation';
import SmartBioClient from './smart-bio-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

async function fetchSmartBio(slug: string) {
  const res = await fetch(`${BACKEND_URL}/api/smart-bios/public/${encodeURIComponent(slug)}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchReviews(tenantSlug?: string | null) {
  if (!tenantSlug) return null;
  const res = await fetch(`${BACKEND_URL}/api/properties/public/place-reviews?tenant_slug=${encodeURIComponent(tenantSlug)}`, {
    next: { revalidate: 600 },
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
  const reviews = await fetchReviews(data?.tenant?.slug);

  return <SmartBioClient initialData={data} reviews={reviews} backendUrl={BACKEND_URL} />;
}
