/**
 * Vistas Markdown del sitio: raíz, portfolio de una inmobiliaria y ficha.
 * Se arman desde los datos del backend, no convirtiendo el HTML: sale un texto
 * más corto y sin los parámetros de campaña (ref, UTM) de los links.
 */
import type { PublicProperty, PublicTenant } from '@/lib/data/public-api';
import { cleanDescription, cleanText } from '@/lib/text';
import {
  LANDINGS_URL,
  agencyName,
  cityOf,
  contactLines,
  formatAddress,
  formatArea,
  formatExpenses,
  formatLot,
  formatPrice,
  formatRooms,
  frontmatter,
  imageUrls,
  linkText,
  operationLabel,
  portfolioUrl,
  propertyTypeLabel,
  propertyUrl,
} from './format';

const MAX_IMAGES = 8;

function latestUpdate(properties: PublicProperty[]): string | null {
  const times = properties
    .map((p) => (p.updated_at ? Date.parse(p.updated_at) : NaN))
    .filter((t) => Number.isFinite(t));
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

export function summaryParts(property: PublicProperty): string[] {
  return [
    operationLabel(property.operation_type),
    propertyTypeLabel(property.property_type),
    cityOf(property.address),
    formatPrice(property),
    formatArea(property),
    formatRooms(property),
  ].filter((part): part is string => !!part);
}

export function buildPropertyMarkdown(tenant: PublicTenant, property: PublicProperty): string {
  const slug = cleanText(property.slug) || property.id;
  const url = propertyUrl(tenant.slug, slug);
  const agency = agencyName(tenant);
  const title = cleanText(property.name) || 'Propiedad';
  const out: string[] = [];

  out.push(
    frontmatter({
      title,
      url,
      agency,
      updated: property.updated_at || null,
    })
  );
  out.push(`# ${title}\n`);

  const headline = [operationLabel(property.operation_type), propertyTypeLabel(property.property_type)]
    .filter(Boolean)
    .join(' · ');
  const city = cityOf(property.address);
  if (headline || city) out.push(`${[headline, city].filter(Boolean).join(' — ')}\n`);

  const facts: [string, string | null][] = [
    ['Precio', formatPrice(property)],
    ['Expensas', formatExpenses(property)],
    ['Superficie', formatArea(property)],
    ['Ambientes', formatRooms(property)],
    ['Unidades', property.total_units && property.total_units > 0 ? String(property.total_units) : null],
    ['Lote', formatLot(property)],
    ['Ubicación', formatAddress(property.address)],
    [
      'Coordenadas',
      typeof property.latitude === 'number' && typeof property.longitude === 'number'
        ? `${property.latitude}, ${property.longitude}`
        : null,
    ],
  ];
  const factLines = facts.filter(([, value]) => value).map(([label, value]) => `- ${label}: ${value}`);
  if (factLines.length) out.push(`## Datos principales\n\n${factLines.join('\n')}\n`);

  const description = cleanDescription(property.description);
  if (description) out.push(`## Descripción\n\n${description}\n`);

  const media: string[] = [];
  const tour = cleanText(property.tour_virtual_url);
  if (tour) media.push(`- Tour virtual 360°: ${tour}`);
  const video = cleanText(property.video_url);
  if (video) media.push(`- Video: ${video}`);
  const plan = cleanText(property.floor_plan_url);
  if (plan) media.push(`- Plano: ${plan}`);
  const images = imageUrls(property.images);
  images.slice(0, MAX_IMAGES).forEach((img, i) => media.push(`- Foto ${i + 1}: ${img}`));
  if (images.length > MAX_IMAGES) media.push(`- (${images.length - MAX_IMAGES} fotos más en la ficha)`);
  if (media.length) out.push(`## Multimedia\n\n${media.join('\n')}\n`);

  out.push(`## Contacto\n\n${contactLines(tenant).join('\n')}\n`);
  out.push(
    `## Links\n\n- Ficha completa: ${url}\n- Más propiedades de ${linkText(agency)}: ${portfolioUrl(tenant.slug)}.md\n`
  );
  return out.join('\n');
}

export function buildPortfolioMarkdown(tenant: PublicTenant, properties: PublicProperty[]): string {
  const url = portfolioUrl(tenant.slug);
  const agency = agencyName(tenant);
  const out: string[] = [];

  out.push(frontmatter({ title: agency, url, updated: latestUpdate(properties) }));
  out.push(`# ${agency}\n`);
  const bio = cleanDescription(tenant.portfolio_bio);
  if (bio) out.push(`${bio}\n`);

  out.push(`## Contacto\n\n${contactLines(tenant).join('\n')}\n`);

  const items = properties
    .map((property) => {
      const slug = cleanText(property.slug) || property.id;
      const name = linkText(cleanText(property.name) || 'Propiedad');
      const summary = summaryParts(property).join(' · ');
      const detail = propertyUrl(tenant.slug, slug);
      return `- [${name}](${detail})${summary ? ` — ${summary}` : ''}. Markdown: ${detail}.md`;
    })
    .join('\n');
  out.push(`## Propiedades (${properties.length})\n\n${items || 'Sin propiedades publicadas por ahora.'}\n`);
  out.push(`Portfolio completo con fotos y tours virtuales: ${url}\n`);
  return out.join('\n');
}

export function buildSiteMarkdown(): string {
  return [
    frontmatter({ title: 'ShowtimeProp — landings de inmobiliarias', url: `${LANDINGS_URL}/` }),
    '# ShowtimeProp\n',
    'Landings y portfolios de inmobiliarias y desarrolladoras de Mar del Plata y la zona, con ' +
      'tours virtuales 360° y atención por WhatsApp las 24 horas.\n',
    '## Cómo leer este sitio\n',
    '- Portfolio de una inmobiliaria: `/p/{inmobiliaria}` (Markdown: `/p/{inmobiliaria}.md`).',
    '- Ficha de una propiedad: `/p/{inmobiliaria}/{propiedad}` (Markdown: agregar `.md`).',
    '- Cualquiera de esas URLs devuelve Markdown si se pide con `Accept: text/markdown`.',
    '- Cada inmobiliaria publica su sitemap en `/p/{inmobiliaria}/sitemap.xml`.',
    `- Servidor MCP para buscar propiedades: ${LANDINGS_URL}/mcp (server card: ` +
      `${LANDINGS_URL}/.well-known/mcp/server-card.json).\n`,
    '## ShowtimeProp\n',
    `- Tours virtuales 360° para inmobiliarias y comercios: https://tours.showtimeprop.com/`,
    '- Contacto: info@showtimeprop.com\n',
  ].join('\n');
}
