/**
 * Datos estructurados schema.org para las fichas de propiedad.
 *
 * Qué esperar de esto, sin vender humo: Google NO tiene un resultado
 * enriquecido oficial para avisos inmobiliarios, así que el RealEstateListing
 * no va a dibujar una tarjeta especial en la búsqueda. Sirve para que el
 * buscador entienda la página, y para los agregadores y modelos que sí leen
 * schema.org. El que sí produce un resultado visible es el BreadcrumbList,
 * que reemplaza la URL cruda por la miga de pan.
 *
 * El vendedor declarado es SIEMPRE la inmobiliaria del tenant, nunca
 * ShowtimeProp: el disclaimer legal del propio sitio aclara que ShowtimeProp
 * no ejerce el corretaje y que cada cliente opera de forma independiente.
 */

type AddressLike = Record<string, unknown> | null | undefined;

export type StructuredDataProperty = {
  name: string;
  slug?: string | null;
  description?: string | null;
  images?: (string | { url?: string })[];
  address?: AddressLike;
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
};

export type StructuredDataTenant = {
  name?: string | null;
  tenant_name?: string | null;
  realtor_name?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  profile_photo_url?: string | null;
  portfolio_bio?: string | null;
  social_links?: Record<string, string | null> | null;
  address?: AddressLike;
  martillero_responsable?: string | null;
  martillero_registro?: string | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function imageUrl(img: string | { url?: string } | null | undefined): string {
  if (!img) return '';
  return typeof img === 'string' ? img.trim() : text(img.url);
}

/** Las mismas claves que acepta buildAddressLine en PropertyLandingClient. */
function buildPostalAddress(address: AddressLike): Record<string, string> | null {
  if (!address) return null;

  const street = text(address.street);
  const streetNumber =
    text(address.street_number) || text(address.number) || text(address.streetNumber);
  const locality = text(address.city) || text(address.locality);
  const region = text(address.state) || text(address.province);
  const country = text(address.country);

  const streetAddress = [street, streetNumber].filter(Boolean).join(' ');
  if (!streetAddress && !locality && !region) return null;

  const postal: Record<string, string> = { '@type': 'PostalAddress' };
  if (streetAddress) postal.streetAddress = streetAddress;
  if (locality) postal.addressLocality = locality;
  if (region) postal.addressRegion = region;
  if (country) postal.addressCountry = country;
  return postal;
}

export function buildRealEstateAgent(tenant: StructuredDataTenant, portfolioUrl: string): Record<string, unknown> {
  const agent: Record<string, unknown> = {
    '@type': 'RealEstateAgent',
    '@id': `${portfolioUrl}#agent`,
    url: portfolioUrl,
  };
  const fields = {
    name: text(tenant.tenant_name) || text(tenant.name),
    logo: text(tenant.logo_url),
    image: text(tenant.profile_photo_url),
    telephone: text(tenant.phone),
    email: text(tenant.email),
    description: text(tenant.portfolio_bio),
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value) agent[key] = value;
  }
  const sameAs = Object.values(tenant.social_links || {}).flatMap((value) => {
    try {
      const url = new URL(text(value));
      return ['http:', 'https:'].includes(url.protocol) ? [url.toString()] : [];
    } catch { return []; }
  });
  if (sameAs.length) agent.sameAs = [...new Set(sameAs)];
  const address = buildPostalAddress(tenant.address);
  if (address) agent.address = address;
  const name = text(tenant.martillero_responsable);
  const identifier = text(tenant.martillero_registro);
  if (name || identifier) agent.employee = { '@type': 'Person', ...(name ? { name } : {}), ...(identifier ? { identifier } : {}) };
  return agent;
}

/**
 * Tipo de schema.org según el tipo de propiedad. Sólo las viviendas son
 * Accommodation; un lote o un local no lo son, y marcarlos como tales sería
 * declarar algo falso.
 */
function accommodationType(propertyType?: string | null): string {
  const value = text(propertyType).toLowerCase();
  if (/(departamento|apartamento|depto|ph|monoambiente)/.test(value)) return 'Apartment';
  if (/(casa|chalet|duplex|quinta|vivienda)/.test(value)) return 'House';
  if (/(lote|terreno|campo|fraccion|cochera|local|oficina|galpon|deposito)/.test(value)) return 'Place';
  return 'Accommodation';
}

function isRental(operationType?: string | null): boolean {
  return /alquiler|renta|arriendo/i.test(text(operationType));
}

export function buildPropertyStructuredData({
  property,
  tenant,
  canonicalUrl,
  portfolioUrl,
}: {
  property: StructuredDataProperty;
  tenant: StructuredDataTenant;
  canonicalUrl: string;
  portfolioUrl: string;
}): Record<string, unknown> {
  const images = (property.images || []).map(imageUrl).filter(Boolean).slice(0, 10);
  const postalAddress = buildPostalAddress(property.address);
  const seller = buildRealEstateAgent(tenant, portfolioUrl);
  const agencyName = seller.name;

  const accommodation: Record<string, unknown> = {
    '@type': accommodationType(property.property_type),
    name: property.name,
  };
  if (postalAddress) accommodation.address = postalAddress;
  if (typeof property.area_sqm === 'number' && property.area_sqm > 0) {
    accommodation.floorSize = {
      '@type': 'QuantitativeValue',
      value: property.area_sqm,
      unitCode: 'MTK', // metro cuadrado, código UN/CEFACT
    };
  }
  if (typeof property.bedrooms === 'number' && property.bedrooms > 0) {
    accommodation.numberOfBedrooms = property.bedrooms;
  }
  if (typeof property.bathrooms === 'number' && property.bathrooms > 0) {
    accommodation.numberOfBathroomsTotal = property.bathrooms;
  }
  if (typeof property.ambientes === 'number' && property.ambientes > 0) {
    accommodation.numberOfRooms = property.ambientes;
  }
  if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
    accommodation.geo = {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }

  const listing: Record<string, unknown> = {
    '@type': 'RealEstateListing',
    '@id': `${canonicalUrl}#listing`,
    url: canonicalUrl,
    name: property.name,
    mainEntity: accommodation,
    provider: seller,
  };
  if (text(property.description)) {
    listing.description = text(property.description).slice(0, 5000);
  }
  if (images.length) listing.image = images;

  // Sin precio publicado no se declara oferta: una Offer sin price es inválida,
  // e inventar un 0 diría que la propiedad es gratis.
  const hasPrice =
    !property.price_on_request && typeof property.price === 'number' && property.price > 0;
  if (hasPrice) {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: text(property.currency) || 'USD',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
      seller,
    };
    if (isRental(property.operation_type)) {
      offer.businessFunction = 'https://schema.org/LeaseOut';
    }
    listing.offers = offer;
  }

  const breadcrumbs = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: agencyName, item: portfolioUrl },
      { '@type': 'ListItem', position: 2, name: property.name, item: canonicalUrl },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [listing, breadcrumbs],
  };
}
