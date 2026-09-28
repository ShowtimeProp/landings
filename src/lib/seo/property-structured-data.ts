import type { PublicPropertyFeatures } from '@/lib/data/public-api';
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

export type StructuredDataProperty = PublicPropertyFeatures & {
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
  price_min?: number | null;
  price_max?: number | null;
  total_units?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  expenses_amount?: number | null;
  expenses_currency?: string | null;
  video_url?: string | null;
  tour_virtual_url?: string | null;
  floor_plan_url?: string | null;
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
  return /alquiler|renta|arriendo|^rent/i.test(text(operationType));
}


function validDate(value: string | null | undefined): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function videoLocation(value: string | null | undefined): Record<string, string> | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
      const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/').pop();
      return id && /^[\w-]+$/.test(id) ? { embedUrl: `https://www.youtube.com/embed/${id}` } : null;
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').pop();
      return id && /^\d+$/.test(id) ? { embedUrl: `https://player.vimeo.com/video/${id}` } : null;
    }
    return { [host === 'iframe.mediadelivery.net' ? 'embedUrl' : 'contentUrl']: value };
  } catch { return null; }
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
  const agencyName = seller.name || 'Inmobiliaria';

  const accommodation: Record<string, unknown> = {
    '@type': accommodationType(property.property_type),
    name: property.name,
  };
  if (postalAddress) accommodation.address = postalAddress;
  const amenities = (property.amenities || []).map(text).filter(Boolean);
  if (amenities.length) accommodation.amenityFeature = amenities.map((name) => ({
    '@type': 'LocationFeatureSpecification', name, value: true,
  }));
  if (text(property.floor_plan_url)) accommodation.accommodationFloorPlan = {
    '@type': 'FloorPlan', image: text(property.floor_plan_url),
  };
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
  const createdAt = validDate(property.created_at);
  const updatedAt = validDate(property.updated_at);
  if (createdAt) listing.datePosted = createdAt;
  if (updatedAt) listing.dateModified = updatedAt;
  const subjects: Record<string, unknown>[] = [];
  const video = videoLocation(property.video_url);
  if (video && createdAt && images[0]) subjects.push({
    '@type': 'VideoObject', name: property.name, ...video, thumbnailUrl: images[0], uploadDate: createdAt,
  });
  if (text(property.tour_virtual_url)) subjects.push({
    '@type': 'WebPage', name: 'Tour virtual 360°', url: text(property.tour_virtual_url),
  });
  if (subjects.length) listing.subjectOf = subjects;

  // Sin precio publicado no se declara oferta: una Offer sin price es inválida,
  // e inventar un 0 diría que la propiedad es gratis.
  const hasPrice =
    !property.price_on_request && typeof property.price === 'number' && property.price > 0;
  const isProject = /^(project|proyecto|desarrollo|inversion_pozo|inversion_en_pozo)$/i.test(text(property.property_type));
  const hasRange = isProject && !property.price_on_request && text(property.currency) &&
    typeof property.price_min === 'number' && property.price_min > 0 &&
    typeof property.price_max === 'number' && property.price_max >= property.price_min;
  if (hasRange) {
    listing.offers = {
      '@type': 'AggregateOffer', lowPrice: property.price_min, highPrice: property.price_max,
      priceCurrency: text(property.currency), url: canonicalUrl, seller,
      ...(typeof property.total_units === 'number' && property.total_units > 0 ? { offerCount: property.total_units } : {}),
    };
  } else if (hasPrice && text(property.currency)) {
    const offer: Record<string, unknown> = {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: text(property.currency),
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
