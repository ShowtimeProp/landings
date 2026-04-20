import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PropertyLandingClient } from "@/components/PropertyLandingClient";
import TenantGtm from "@/components/TenantGtm";

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
  google_place_id?: string | null;
  google_calendar_connected?: boolean;
  marketing?: {
    gtm_enabled?: boolean;
    gtm_container_id?: string | null;
    attribution_model?: string;
  } | null;
};

type PublicProperty = {
  id: string;
  name: string;
  property_code?: string | null;
  slug?: string | null;
  description?: string | null;
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

async function fetchPublicProperty(
  tenantSlug: string,
  propertySlug: string
): Promise<ApiResponse | null> {
  const url = `${BACKEND_URL}/api/properties/public/by-slug?tenant_slug=${encodeURIComponent(
    tenantSlug
  )}&property_slug=${encodeURIComponent(propertySlug)}`;
  const res = await fetch(url, { next: { revalidate: 60 }, redirect: "manual" });
  if (res.status === 301 || res.status === 302) {
    const loc = res.headers.get("location");
    if (loc) redirect(loc);
  }
  if (!res.ok) return null;
  const data = (await res.json()) as ApiResponse;
  if (!data?.tenant?.slug || !data?.property?.id) return null;
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant_slug: string; property_slug: string }>;
}): Promise<Metadata> {
  const { tenant_slug, property_slug } = await params;
  const data = await fetchPublicProperty(tenant_slug, property_slug);
  if (!data) {
    return {
      title: "Propiedad no encontrada | ShowtimeProp",
      description: "La propiedad solicitada no existe o no está disponible.",
    };
  }

  const title = `${data.property.name} | ${data.tenant.name}`;
  const description =
    (data.property.description || "").slice(0, 155) ||
    "Tour virtual y detalles de la propiedad.";
  const canonicalUrl = `${LANDINGS_URL}/p/${tenant_slug}/${property_slug}`;
  const ogImage = pickPrimaryImage(data.property);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
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
              width: 1200,
              height: 630,
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
  searchParams: Promise<{ ref?: string }>;
}) {
  const { tenant_slug, property_slug } = await params;
  const { ref: refParam } = await searchParams;
  const data = await fetchPublicProperty(tenant_slug, property_slug);
  if (!data) notFound();

  const { tenant, property } = data;
  const referralCode = String(refParam || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const whatsappPhone = tenant.whatsapp ? sanitizePhoneToWa(tenant.whatsapp) : "";
  const baseWhatsappText = buildWhatsappMessage(property);
  const whatsappText = referralCode
    ? `${baseWhatsappText} ref=${referralCode} source=referral`
    : baseWhatsappText;
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappText)}`
    : "";

  return (
    <>
      <TenantGtm marketing={tenant.marketing} />
      <PropertyLandingClient
        tenant={tenant}
        property={property}
        whatsappUrl={whatsappUrl}
      />
    </>
  );
}
