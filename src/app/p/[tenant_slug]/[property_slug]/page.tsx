import type { PublicPropertyFeatures } from '@/lib/data/public-api';
import type { Metadata } from "next";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { PropertyLandingClient } from "@/components/PropertyLandingClient";
import TenantGtm from "@/components/TenantGtm";
import {
  appendCampaignParamsToMessage,
  campaignParamsFromSearchParams,
} from "@/lib/campaign-tracking";
import { buildPropertyStructuredData } from "@/lib/seo/property-structured-data";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { cleanDescription, cleanText } from "@/lib/text";
import { BackendUnavailableError, backendSsrHeaders, isBackendUnavailable } from "@/lib/backend";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://agent.showtimeprop.com";
const LANDINGS_URL =
  process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || "https://landings.showtimeprop.com";

type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  tenant_name?: string | null;
  realtor_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  social_links?: Record<string, string> | null;
  martillero_responsable?: string | null;
  martillero_registro?: string | null;
  vcard_slug?: string | null;
  vcard_url?: string | null;
  vcard_qr_data_url?: string | null;
  contact_ref_applied?: boolean | null;
  contact_ref_code?: string | null;
  google_place_id?: string | null;
  google_calendar_connected?: boolean;
  map?: {
    enabled: boolean;
    styleUrl?: string | null;
    publicToken: string;
  } | null;
  marketing?: {
    gtm_enabled?: boolean;
    gtm_container_id?: string | null;
    attribution_model?: string;
  } | null;
};

type PublicProperty = PublicPropertyFeatures & {
  id: string;
  name: string;
  property_code?: string | null;
  slug?: string | null;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  tour_virtual_url?: string | null;
  images?: (string | { url?: string })[];
  address?: Record<string, unknown> | null;
  property_type?: string | null;
  operation_type?: string | null;
  price_on_request?: boolean | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  expenses_amount?: number | null;
  expenses_currency?: string | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  total_units?: number | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  floor_plan_url?: string | null;
  video_url?: string | null;
};

type ApiResponse = {
  status: "ok";
  tenant: PublicTenant;
  property: PublicProperty;
};

function getImageUrl(img: string | { url?: string } | null | undefined): string {
  if (!img) return "";
  return typeof img === "string" ? img : img.url || "";
}

function pickPrimaryImage(property: PublicProperty): string | null {
  const image = (property.images || []).map((img) => getImageUrl(img as string | { url?: string })).find(Boolean);
  return image || null;
}

function sanitizePhoneToWa(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function buildWhatsappMessage(property: PublicProperty) {
  if (property.property_code) {
    return `Hola! Me interesa la propiedad código ${property.property_code}.`;
  }
  return `Hola! Me interesa la propiedad ${property.name}.`;
}

function firstSearchValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function withSearchParams(url: string, params: Record<string, string | string[] | undefined>): string {
  const target = new URL(url, LANDINGS_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) target.searchParams.set(key, firstSearchValue(value));
  }
  return target.toString();
}

function propertyMetaDescription(property: PublicProperty): string | undefined {
  const meta = cleanDescription(property.meta_description);
  if (meta) return meta;
  const description = cleanDescription(property.description)?.replace(/\s+/g, ' ');
  if (description) {
    if (description.length <= 155) return description;
    const cut = description.lastIndexOf(' ', 155);
    return `${description.slice(0, cut > 0 ? cut : 155)}…`;
  }
  const operation = cleanText(property.operation_type);
  const labels: Record<string, string> = { sale: 'Venta', rent: 'Alquiler', rent_short_term: 'Alquiler temporario' };
  const city = cleanText(property.address?.city) || cleanText(property.address?.locality);
  const location = [operation ? labels[operation] || operation : null, cleanText(property.property_type), city ? `en ${city}` : null].filter(Boolean).join(' ');
  const details = [property.area_sqm != null ? `${property.area_sqm} m²` : null, property.ambientes != null ? `${property.ambientes} ambientes` : null].filter(Boolean).join(', ');
  const parts = [location, details, cleanText(property.tour_virtual_url) ? 'Tour virtual 360°' : null].filter(Boolean);
  return parts.length ? `${parts.join('. ')}.` : undefined;
}

function buildSlotResolverRedirect(
  tenantSlug: string,
  slot: string,
  searchParams: Record<string, string | string[] | undefined>
): string {
  const safeCampaignKeys = [
    "ref",
    "qr_slot",
    "source",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "marketing_campaign_id",
    "variant_id",
    "fbclid",
    "gclid",
    "gbraid",
    "wbraid",
  ];
  const query = new URLSearchParams();
  for (const key of safeCampaignKeys) {
    const value = firstSearchValue(searchParams[key]).trim();
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return `/v/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(slot)}${qs ? `?${qs}` : ""}`;
}

async function fetchPublicProperty(
  tenantSlug: string,
  propertySlug: string,
  referralCode?: string | null,
  searchParams: Record<string, string | string[] | undefined> = {}
): Promise<ApiResponse | null> {
  const buildUrl = (ref?: string | null) => {
    const params = new URLSearchParams({
      tenant_slug: tenantSlug,
      property_slug: propertySlug,
    });
    if (ref) {
      params.set("ref", ref);
    }
    return `${BACKEND_URL}/api/properties/public/by-slug?${params.toString()}`;
  };
  let res = await fetch(buildUrl(referralCode), {
    next: { revalidate: 60 },
    redirect: "manual",
    headers: backendSsrHeaders(),
  });
  if (!res.ok && referralCode && res.status !== 301 && res.status !== 302) {
    console.warn(
      `Public property fetch failed with referral (${res.status}); retrying without referral.`,
      { tenantSlug, propertySlug }
    );
    res = await fetch(buildUrl(null), {
      next: { revalidate: 60 },
      redirect: "manual",
      headers: backendSsrHeaders(),
    });
  }
  if (res.status === 301 || res.status === 302) {
    const loc = res.headers.get("location");
    if (loc) {
      const destination = withSearchParams(loc, searchParams);
      if (res.status === 301) permanentRedirect(destination);
      redirect(destination);
    }
  }
  if (isBackendUnavailable(res.status)) throw new BackendUnavailableError(res.status, res.url);
  if (!res.ok) return null;
  const data = (await res.json()) as ApiResponse;
  if (!data?.tenant?.slug || !data?.property?.id) return null;
  return data;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string; property_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { tenant_slug, property_slug } = await params;
  const data = await fetchPublicProperty(tenant_slug, property_slug, null, await searchParams);
  if (!data) {
    return {
      title: "Propiedad no encontrada | ShowtimeProp",
      description: "La propiedad solicitada no existe o no está disponible.",
    };
  }

  const title = cleanText(data.property.meta_title) || `${data.property.name} | ${data.tenant.name}`;
  const description = propertyMetaDescription(data.property);
  const canonicalUrl = `${LANDINGS_URL}/p/${data.tenant.slug}/${data.property.slug || property_slug}`;
  const ogImage = pickPrimaryImage(data.property);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      types: { 'text/markdown': `${canonicalUrl}.md` },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      images: ogImage
        ? [
            {
              url: ogImage,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PropertyLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string; property_slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenant_slug, property_slug } = await params;
  const resolvedSearchParams = await searchParams;
  const slotParam = firstSearchValue(resolvedSearchParams.slot).trim();
  if (slotParam) {
    redirect(buildSlotResolverRedirect(tenant_slug, slotParam, resolvedSearchParams));
  }

  const refParam = firstSearchValue(resolvedSearchParams.ref);
  const referralCode = String(refParam || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const data = await fetchPublicProperty(tenant_slug, property_slug, referralCode || null, resolvedSearchParams);
  if (!data) notFound();

  const { tenant, property } = data;
  const canonicalUrl = `${LANDINGS_URL}/p/${tenant.slug}/${property.slug || property_slug}`;
  if (property_slug === property.id && property.slug && property.slug !== property_slug) {
    permanentRedirect(withSearchParams(canonicalUrl, resolvedSearchParams));
  }
  const whatsappPhone = tenant.whatsapp ? sanitizePhoneToWa(tenant.whatsapp) : "";
  const whatsappText = buildWhatsappMessage(property);
  const campaignSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    const firstValue = firstSearchValue(value).trim();
    if (firstValue) campaignSearchParams.set(key, firstValue);
  }
  if (referralCode) campaignSearchParams.set("ref", referralCode);
  if (referralCode) campaignSearchParams.set("source", "referral");
  const trackedWhatsappText = appendCampaignParamsToMessage(
    whatsappText,
    campaignParamsFromSearchParams(campaignSearchParams)
  );
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(trackedWhatsappText)}`
    : "";

  const structuredData = buildPropertyStructuredData({
    property: { ...property, description: cleanDescription(property.description) },
    tenant,
    canonicalUrl,
    portfolioUrl: `${LANDINGS_URL}/p/${tenant_slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <TenantGtm marketing={tenant.marketing} />
      <PropertyLandingClient
        tenant={tenant}
        property={property}
        whatsappUrl={whatsappUrl}
      />
    </>
  );
}
