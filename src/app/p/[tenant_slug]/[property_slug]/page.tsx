import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PropertyLandingClient } from "@/components/PropertyLandingClient";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://agent.showtimeprop.com";

type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  tenant_name?: string | null;
  phone?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  google_place_id?: string | null;
  google_calendar_connected?: boolean;
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
  price?: number | null;
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function PropertyLandingPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; property_slug: string }>;
}) {
  const { tenant_slug, property_slug } = await params;
  const data = await fetchPublicProperty(tenant_slug, property_slug);
  if (!data) notFound();

  const { tenant, property } = data;
  const whatsappPhone = tenant.phone ? sanitizePhoneToWa(tenant.phone) : "";
  const whatsappText = buildWhatsappMessage(property);
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappText)}`
    : "";

  return (
    <PropertyLandingClient
      tenant={tenant}
      property={property}
      whatsappUrl={whatsappUrl}
    />
  );
}
