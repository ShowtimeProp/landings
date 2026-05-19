import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import MatchLandingClient from '@/components/MatchLandingClient';
import type { MatchLandingPayload } from '@/components/MatchLandingClient';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

async function fetchMatchLanding(landingToken: string): Promise<MatchLandingPayload | null> {
  const url = `${BACKEND_URL}/api/match/public/landing/${encodeURIComponent(landingToken)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = (await res.json()) as MatchLandingPayload;
  if (!data) return null;
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ landing_token: string }>;
}): Promise<Metadata> {
  const { landing_token } = await params;
  const data = await fetchMatchLanding(landing_token);
  if (!data) {
    return { title: 'Match expirado | ShowtimeProp' };
  }
  return {
    title: `Match de propiedades | ${data.tenant.name}`,
    description: `Encontramos ${data.properties.length} opciones para vos.`,
  };
}

export default async function MatchLandingPage({
  params,
}: {
  params: Promise<{ landing_token: string }>;
}) {
  const { landing_token } = await params;
  const payload = await fetchMatchLanding(landing_token);
  if (!payload) notFound();
  return <MatchLandingClient payload={payload} />;
}

