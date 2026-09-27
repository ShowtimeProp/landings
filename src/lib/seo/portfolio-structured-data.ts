import { buildRealEstateAgent, type StructuredDataTenant } from './property-structured-data';
import type { PublicProperty } from '@/lib/data/public-api';

export function buildPortfolioStructuredData({ tenant, properties, canonicalUrl }: {
  tenant: StructuredDataTenant;
  properties: Pick<PublicProperty, 'id' | 'slug' | 'name'>[];
  canonicalUrl: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildRealEstateAgent(tenant, canonicalUrl),
      {
        '@type': 'ItemList',
        itemListElement: properties.map((property, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${canonicalUrl}/${encodeURIComponent(property.slug || property.id)}`,
          name: property.name,
        })),
      },
    ],
  };
}
