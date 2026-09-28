import type { IndexableTenant, PublicPortfolio } from '@/lib/data/public-api';
import { cleanDescription, cleanText } from '@/lib/text';
import { LANDINGS_URL, agencyName, cityOf, formatPrice, linkText, operationLabel, portfolioUrl, propertyTypeLabel, propertyUrl, whatsappUrl } from './format';

export const llmsHeaders = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' };

export function buildSiteLlms(tenants: IndexableTenant[]): string {
  const sections = [
    '# ShowtimeProp',
    '> Landings y portfolios de inmobiliarias con tours virtuales 360° en Mar del Plata y zona.',
    `## ShowtimeProp\n\n- [Tours virtuales 360°](https://tours.showtimeprop.com/): Conocé el servicio de tours virtuales.`,
  ];
  if (tenants.length) sections.push(`## Inmobiliarias\n\n${tenants.flatMap((tenant) => [
    `- [${linkText(tenant.name)}](${portfolioUrl(tenant.slug)}.md): Portfolio en Markdown.`,
    `- [Guía de ${linkText(tenant.name)}](${portfolioUrl(tenant.slug)}/llms.txt): Contacto y fichas de propiedades.`,
  ]).join('\n')}`);
  return `${sections.join('\n\n')}\n`;
}

export function buildTenantLlms({ tenant, properties }: PublicPortfolio): string {
  const sections = [`# ${linkText(agencyName(tenant))}`];
  const bio = cleanDescription(tenant.portfolio_bio);
  if (bio) sections.push(`> ${bio.replace(/\n/g, '\n> ')}`);
  const responsible = cleanText(tenant.martillero_responsable);
  const registry = cleanText(tenant.martillero_registro);
  if (responsible || registry) sections.push(`Responsable / matrícula: ${[responsible, registry].filter(Boolean).join(' — ')}`);
  const contact: string[] = [];
  const phone = cleanText(tenant.phone);
  const email = cleanText(tenant.email);
  const whatsapp = whatsappUrl(tenant.whatsapp);
  if (phone) contact.push(`- [Teléfono ${linkText(phone)}](tel:${phone.replace(/[^+\d]/g, '')})`);
  if (email) contact.push(`- [Email ${linkText(email)}](mailto:${email})`);
  if (whatsapp) contact.push(`- [WhatsApp](${whatsapp}): Consultá a la inmobiliaria.`);
  if (contact.length) sections.push(`## Contacto\n\n${contact.join('\n')}`);
  sections.push(`## Portfolio\n\n- [Portfolio de ${linkText(agencyName(tenant))}](${portfolioUrl(tenant.slug)}.md): Todas las propiedades públicas.`);
  if (properties.length) sections.push(`## Propiedades\n\n${properties.map((property) => {
    const note = [operationLabel(property.operation_type), propertyTypeLabel(property.property_type), cityOf(property.address),
      property.price_on_request || cleanText(property.currency) ? formatPrice(property) : null,
    ].filter(Boolean).join(' · ');
    return `- [${linkText(property.name)}](${propertyUrl(tenant.slug, property.slug || property.id)}.md)${note ? `: ${note}` : ''}`;
  }).join('\n')}`);
  return `${sections.join('\n\n')}\n`;
}
