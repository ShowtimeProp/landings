import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import MatchLandingClient from '@/components/MatchLandingClient';
import type { MatchLandingPayload } from '@/components/MatchLandingClient';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

async function fetchMatchLanding(landingToken: string, refCode?: string): Promise<MatchLandingPayload | null> {
  const query = new URLSearchParams();
  if (refCode) query.set('ref', refCode);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const url = `${BACKEND_URL}/api/match/public/landing/${encodeURIComponent(landingToken)}${suffix}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = (await res.json()) as MatchLandingPayload;
  if (!data) return null;
  return data;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Match de propiedades | ShowtimeProp',
    description: 'Opciones seleccionadas para tu búsqueda.',
  };
}

export default async function MatchLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ landing_token: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { landing_token } = await params;
  const query = await searchParams;
  const refCode = firstParam(query.ref);
  const payload = await fetchMatchLanding(landing_token, refCode);
  if (!payload) notFound();
  return <MatchLandingClient payload={payload} refCode={refCode} />;
}

