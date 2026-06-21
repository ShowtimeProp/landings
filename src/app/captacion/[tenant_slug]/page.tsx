import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import OwnerCaptureFunnelClient from '@/components/OwnerCaptureFunnelClient';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const LANDINGS_URL =
  process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

type OwnerCaptureConfig = {
  enabled?: boolean;
  funnel_header_text?: string | null;
  front_title?: string | null;
  front_text?: string | null;
  front_cta?: string | null;
  front_media_url?: string | null;
  front_media_type?: string | null;
  front_video_url?: string | null;
  front_video_thumbnail_url?: string | null;
  back_title?: string | null;
  back_text?: string | null;
  back_cta?: string | null;
  back_media_url?: string | null;
  back_media_type?: string | null;
  back_video_url?: string | null;
  back_video_thumbnail_url?: string | null;
  accent_color?: string | null;
  button_text_color?: string | null;
};

type PortfolioResponse = {
  tenant?: {
    id: string;
    name: string;
    slug: string;
    realtor_name?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    logo_url?: string | null;
    profile_photo_url?: string | null;
    social_links?: Record<string, string> | null;
    portfolio_bio?: string | null;
    vcard_slug?: string | null;
    vcard_url?: string | null;
    vcard_qr_data_url?: string | null;
    contact_ref_applied?: boolean | null;
    owner_capture?: OwnerCaptureConfig | null;
  };
  properties?: Array<{
    id: string;
    tour_virtual_url?: string | null;
  }>;
};

function normalizeReferralCode(raw?: string | null): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return normalized || null;
}

async function fetchPortfolio(
  tenantSlug: string,
  referralCode?: string | null
): Promise<PortfolioResponse | null> {
  const params = new URLSearchParams({ tenant_slug: tenantSlug });
  if (referralCode) params.set('ref', referralCode);
  const res = await fetch(`${BACKEND_URL}/api/properties/public/portfolio?${params.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as PortfolioResponse;
  return data?.tenant?.slug ? data : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}): Promise<Metadata> {
  const { tenant_slug } = await params;
  const portfolio = await fetchPortfolio(tenant_slug);
  const tenant = portfolio?.tenant || null;
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
  searchParams,
}: {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant_slug } = await params;
  const resolvedSearchParams = await searchParams;
  const referralCode = normalizeReferralCode(
    Array.isArray(resolvedSearchParams.ref) ? resolvedSearchParams.ref[0] : resolvedSearchParams.ref
  );
  const portfolio = await fetchPortfolio(tenant_slug, referralCode);
  const tenant = portfolio?.tenant || null;
  if (!tenant) notFound();

  const properties = Array.isArray(portfolio?.properties) ? portfolio.properties : [];
  const propertiesCount = properties.length;
  const toursCount = properties.filter((item) => String(item.tour_virtual_url || '').trim()).length;
  const defaultPropertyId = properties[0]?.id ?? null;
  const vcardUrlFromApi = String(tenant.vcard_url || '').trim().replace(
    /\/vcard\/([^/?#]+)\.vcf(?=$|[?#])/i,
    '/vcard/$1'
  );
  const vcardUrl = vcardUrlFromApi || (tenant.vcard_slug ? `/vcard/${tenant.vcard_slug}` : '');
  const persistedQrFallback = tenant.contact_ref_applied ? '' : String(tenant.vcard_qr_data_url || '').trim();
  let vcardQrDataUrl = persistedQrFallback;
  if (vcardUrl) {
    try {
      vcardQrDataUrl = await QRCode.toDataURL(vcardUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
      });
    } catch {
      vcardQrDataUrl = persistedQrFallback;
    }
  }

  return (
    <OwnerCaptureFunnelClient
      backendUrl={BACKEND_URL}
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      contactName={tenant.realtor_name || tenant.name}
      portfolioBio={tenant.portfolio_bio || null}
      whatsapp={tenant.whatsapp || null}
      logoUrl={tenant.logo_url || tenant.profile_photo_url || null}
      profilePhotoUrl={tenant.profile_photo_url || null}
      socialLinks={tenant.social_links || null}
      vcardUrl={vcardUrl || null}
      vcardQrDataUrl={vcardQrDataUrl || null}
      defaultPropertyId={defaultPropertyId}
      referralCode={referralCode}
      propertiesCount={propertiesCount}
      toursCount={toursCount}
      config={tenant.owner_capture || null}
    />
  );
}
