import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OwnerCaptureFunnelClient from '@/components/OwnerCaptureFunnelClient';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const LANDINGS_URL =
  process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

type OwnerCaptureConfig = {
  enabled?: boolean;
  front_title?: string | null;
  front_text?: string | null;
  front_cta?: string | null;
  front_media_url?: string | null;
  front_media_type?: string | null;
  back_title?: string | null;
  back_text?: string | null;
  back_cta?: string | null;
  back_media_url?: string | null;
  back_media_type?: string | null;
  accent_color?: string | null;
};

type PortfolioResponse = {
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    profile_photo_url?: string | null;
    owner_capture?: OwnerCaptureConfig | null;
  };
};

async function fetchTenant(tenantSlug: string): Promise<PortfolioResponse['tenant'] | null> {
  const params = new URLSearchParams({ tenant_slug: tenantSlug });
  const res = await fetch(`${BACKEND_URL}/api/properties/public/portfolio?${params.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as PortfolioResponse;
  return data?.tenant?.slug ? data.tenant : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}): Promise<Metadata> {
  const { tenant_slug } = await params;
  const tenant = await fetchTenant(tenant_slug);
  if (!tenant) {
    return { title: 'Captacion no encontrada | ShowtimeProp' };
  }
  const title = `Captacion de propietarios | ${tenant.name}`;
  return {
    title,
    description: `Vende o alquila tu propiedad con ${tenant.name}`,
    alternates: {
      canonical: `${LANDINGS_URL}/captacion/${tenant_slug}`,
    },
  };
}

export default async function OwnerCapturePage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  const tenant = await fetchTenant(tenant_slug);
  if (!tenant) notFound();

  return (
    <OwnerCaptureFunnelClient
      backendUrl={BACKEND_URL}
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      logoUrl={tenant.logo_url || tenant.profile_photo_url || null}
      config={tenant.owner_capture || null}
    />
  );
}
