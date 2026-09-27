/**
 * Formato compartido por las vistas Markdown para agentes.
 * Regla: un dato que falta se omite; nunca se completa con un supuesto.
 */
import type { PublicAddress, PublicImage, PublicProperty, PublicTenant } from '@/lib/data/public-api';
import { cleanText } from '@/lib/text';

export const LANDINGS_URL = (
  process.env.NEXT_PUBLIC_LANDINGS_URL ||
  process.env.LANDINGS_URL ||
  'https://landings.showtimeprop.com'
).replace(/\/$/, '');

const OPERATION_LABELS: Record<string, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  rent_short_term: 'Alquiler temporario',
  rent_long_term: 'Alquiler largo plazo',
  both: 'Venta y alquiler',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Departamento',
  house: 'Casa',
  ph: 'PH',
  local: 'Local',
  land: 'Terreno',
  garage: 'Cochera',
  project: 'Emprendimiento en pozo',
  proyecto: 'Emprendimiento en pozo',
  desarrollo: 'Emprendimiento en pozo',
  inversion_pozo: 'Emprendimiento en pozo',
  inversion_en_pozo: 'Emprendimiento en pozo',
  other: 'Otro',
};

export function operationLabel(raw: string | null | undefined): string | null {
  const value = cleanText(raw);
  if (!value) return null;
  return OPERATION_LABELS[value.toLowerCase()] || value;
}

export function propertyTypeLabel(raw: string | null | undefined): string | null {
  const value = cleanText(raw);
  if (!value) return null;
  return PROPERTY_TYPE_LABELS[value.toLowerCase()] || value;
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

function money(currency: string | null | undefined, value: number): string {
  return `${cleanText(currency) || 'USD'} ${formatNumber(value)}`;
}

/** "USD 129.900", "desde USD 133.400 hasta USD 139.200", "Precio a consultar" o null. */
export function formatPrice(property: PublicProperty): string | null {
  if (property.price_on_request) return 'Precio a consultar';
  const { price_min: min, price_max: max, currency } = property;
  if (isPositive(min) && isPositive(max) && min !== max) {
    return `desde ${money(currency, min)} hasta ${money(currency, max)}`;
  }
  if (isPositive(property.price)) return money(currency, property.price);
  if (isPositive(min)) return `desde ${money(currency, min)}`;
  return null;
}

export function formatExpenses(property: PublicProperty): string | null {
  if (!isPositive(property.expenses_amount)) return null;
  return money(property.expenses_currency || 'ARS', property.expenses_amount);
}

export function formatArea(property: PublicProperty): string | null {
  const { area_sqm_min: min, area_sqm_max: max } = property;
  if (isPositive(min) && isPositive(max) && min !== max) {
    return `${formatNumber(min)} a ${formatNumber(max)} m²`;
  }
  if (isPositive(property.area_sqm)) return `${formatNumber(property.area_sqm)} m²`;
  return null;
}

export function formatRooms(property: PublicProperty): string | null {
  const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;
  const parts: string[] = [];
  if (isPositive(property.ambientes)) parts.push(count(property.ambientes, 'ambiente', 'ambientes'));
  if (isPositive(property.bedrooms)) parts.push(count(property.bedrooms, 'dormitorio', 'dormitorios'));
  if (isPositive(property.bathrooms)) parts.push(count(property.bathrooms, 'baño', 'baños'));
  return parts.length ? parts.join(', ') : null;
}

export function formatLot(property: PublicProperty): string | null {
  const { lot_frontage_m: front, lot_depth_m: depth } = property;
  if (isPositive(front) && isPositive(depth)) {
    return `${formatNumber(front)} m de frente × ${formatNumber(depth)} m de fondo`;
  }
  return null;
}

export function cityOf(address: PublicAddress | null | undefined): string | null {
  return cleanText(address?.city) || cleanText(address?.locality);
}

export function formatAddress(address: PublicAddress | null | undefined): string | null {
  if (!address) return null;
  const street = [cleanText(address.street), cleanText(address.street_number) || cleanText(address.number)]
    .filter(Boolean)
    .join(' ');
  const parts = [street, cityOf(address), cleanText(address.state) || cleanText(address.province)];
  const unique = parts.filter((part, i): part is string => !!part && parts.indexOf(part) === i);
  return unique.length ? unique.join(', ') : null;
}

export function imageUrls(images: PublicImage[] | null | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => (typeof img === 'string' ? img : img?.url || ''))
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url));
}

export function agencyName(tenant: PublicTenant): string {
  return cleanText(tenant.tenant_name) || cleanText(tenant.name) || tenant.slug;
}

export function whatsappUrl(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function portfolioUrl(tenantSlug: string): string {
  return `${LANDINGS_URL}/p/${encodeURIComponent(tenantSlug)}`;
}

export function propertyUrl(tenantSlug: string, propertySlug: string): string {
  return `${portfolioUrl(tenantSlug)}/${encodeURIComponent(propertySlug)}`;
}

/** Texto seguro para un link Markdown: sin corchetes que rompan la sintaxis. */
export function linkText(value: string): string {
  return value.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();
}

/** Valor YAML entre comillas dobles. */
export function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

export function frontmatter(fields: Record<string, string | null | undefined>): string {
  const lines = Object.entries(fields)
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([key, value]) => `${key}: ${yamlString(value)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

export function contactLines(tenant: PublicTenant): string[] {
  const lines: string[] = [];
  const agency = agencyName(tenant);
  lines.push(`- Inmobiliaria: ${agency}`);
  const advisor = cleanText(tenant.realtor_name);
  if (advisor && advisor !== agency) lines.push(`- Asesor: ${advisor}`);
  const wa = whatsappUrl(tenant.whatsapp);
  if (wa) lines.push(`- WhatsApp (respuesta inmediata, 24 h): ${wa}`);
  const phone = cleanText(tenant.phone);
  if (phone) lines.push(`- Teléfono: ${phone}`);
  const email = cleanText(tenant.email);
  if (email) lines.push(`- Email: ${email}`);
  const responsible = cleanText(tenant.martillero_responsable);
  const registry = cleanText(tenant.martillero_registro);
  if (responsible || registry) {
    lines.push(`- Responsable / matrícula: ${[responsible, registry].filter(Boolean).join(' — ')}`);
  }
  for (const [network, url] of Object.entries(tenant.social_links || {})) {
    const clean = cleanText(url);
    if (clean && /^https?:\/\//i.test(clean)) lines.push(`- ${network}: ${clean}`);
  }
  return lines;
}
