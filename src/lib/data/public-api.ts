/**
 * Lectura de la API pública del backend para las vistas que no son HTML
 * (Markdown para agentes, y lo que venga: llms.txt, MCP).
 *
 * Las páginas HTML todavía tienen sus propios fetchers con tipos locales; este
 * módulo tipa sólo los campos que se usan fuera de ellas.
 */
import { BackendUnavailableError, backendSsrHeaders, isBackendUnavailable } from '@/lib/backend';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

export type PublicImage = string | { url?: string | null };

export interface PublicAddress {
  street?: string | null;
  street_number?: string | null;
  number?: string | null;
  city?: string | null;
  locality?: string | null;
  state?: string | null;
  province?: string | null;
  country?: string | null;
}

export interface PublicTenant {
  name: string;
  slug: string;
  tenant_name?: string | null;
  realtor_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  social_links?: Record<string, string | null> | null;
  martillero_responsable?: string | null;
  martillero_registro?: string | null;
  portfolio_bio?: string | null;
  /** Opt-in de indexación (AE-002): gobierna búsqueda MCP, llms.txt global y sitemap índice. */
  seo_indexing?: boolean | null;
}

export interface PublicProperty {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  property_type?: string | null;
  operation_type?: string | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  expenses_amount?: number | null;
  expenses_currency?: string | null;
  ambientes?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  lot_frontage_m?: number | null;
  lot_depth_m?: number | null;
  total_units?: number | null;
  address?: PublicAddress | null;
  latitude?: number | null;
  longitude?: number | null;
  tour_virtual_url?: string | null;
  video_url?: string | null;
  floor_plan_url?: string | null;
  images?: PublicImage[] | null;
  updated_at?: string | null;
}

export interface PublicPortfolio {
  tenant: PublicTenant;
  properties: PublicProperty[];
}

export interface PublicPropertyDetail {
  tenant: PublicTenant;
  property: PublicProperty;
}

/** El slug de la propiedad cambió: el backend indica el nuevo. */
export interface PublicPropertyMoved {
  movedTo: string;
}

async function getJson(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      next: { revalidate: 60 },
      redirect: 'manual',
      headers: backendSsrHeaders(),
    });
  } catch {
    throw new BackendUnavailableError(0, url);
  }
}

export async function fetchPublicPortfolio(tenantSlug: string): Promise<PublicPortfolio | null> {
  const url = `${BACKEND_URL}/api/properties/public/portfolio?tenant_slug=${encodeURIComponent(tenantSlug)}`;
  const res = await getJson(url);
  if (isBackendUnavailable(res.status)) throw new BackendUnavailableError(res.status, url);
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<PublicPortfolio>;
  if (!data?.tenant?.slug || !Array.isArray(data.properties)) return null;
  return { tenant: data.tenant, properties: data.properties };
}

export async function fetchPublicProperty(
  tenantSlug: string,
  propertySlug: string
): Promise<PublicPropertyDetail | PublicPropertyMoved | null> {
  const params = new URLSearchParams({ tenant_slug: tenantSlug, property_slug: propertySlug });
  const url = `${BACKEND_URL}/api/properties/public/by-slug?${params.toString()}`;
  const res = await getJson(url);
  if (res.status === 301 || res.status === 302) {
    const location = res.headers.get('location') || '';
    const movedTo = location ? new URL(location, 'https://x.invalid').pathname.split('/').pop() : '';
    return movedTo ? { movedTo: decodeURIComponent(movedTo) } : null;
  }
  if (isBackendUnavailable(res.status)) throw new BackendUnavailableError(res.status, url);
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<PublicPropertyDetail>;
  if (!data?.tenant?.slug || !data.property?.id) return null;
  return { tenant: data.tenant, property: data.property };
}

export interface PublicSearchItem {
  id: string;
  name: string;
  url: string;
  markdown_url: string;
  agency_slug: string;
  agency_name: string;
  operation_type?: string | null;
  property_type?: string | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_request?: boolean;
  currency?: string | null;
  area_sqm?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  ambientes?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  city?: string | null;
  street?: string | null;
  apto_credito?: boolean | null;
  has_virtual_tour?: boolean;
  image?: string | null;
  updated_at?: string | null;
}

export interface PublicSearchResult {
  total: number;
  offset: number;
  limit: number;
  items: PublicSearchItem[];
}

export type PublicSearchParams = Record<string, string | number | boolean | undefined>;

/** Búsqueda entre inmobiliarias con opt-in (AE-011). */
export async function searchPublicProperties(params: PublicSearchParams): Promise<PublicSearchResult> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const url = `${BACKEND_URL}/api/properties/public/search?${query.toString()}`;
  const res = await getJson(url);
  if (!res.ok) throw new BackendUnavailableError(res.status, url);
  return (await res.json()) as PublicSearchResult;
}

export interface IndexableTenant {
  slug: string;
  name: string;
  updated_at?: string | null;
}

export async function fetchIndexableTenants(): Promise<IndexableTenant[]> {
  const url = `${BACKEND_URL}/api/properties/public/indexable-tenants`;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 }, headers: backendSsrHeaders() });
    if (!response.ok) throw new BackendUnavailableError(response.status, url);
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.every((row: unknown) =>
      typeof row === 'object' && row !== null && 'slug' in row && typeof row.slug === 'string' && row.slug.trim() &&
      'name' in row && typeof row.name === 'string'
    )) throw new BackendUnavailableError(502, url);
    return data as IndexableTenant[];
  } catch (error) {
    if (error instanceof BackendUnavailableError) throw error;
    throw new BackendUnavailableError(0, url);
  }
}
