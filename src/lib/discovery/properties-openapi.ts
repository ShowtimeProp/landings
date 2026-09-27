import { PUBLIC_PROPERTIES_API } from './catalog';

function query(name: string, schema: Record<string, unknown>, description: string, required = false) {
  return { name, in: 'query', required, description, schema };
}
const tenantSlug = query('tenant_slug', { type: 'string' }, 'Slug de la inmobiliaria.', true);
const referral = query('ref', { type: 'string' }, 'Código opcional que personaliza el contacto; omitir al citar URLs canónicas.');
const errors = {
  '422': { description: 'Parámetros inválidos.' },
  '429': { description: 'Límite de consultas alcanzado; reintentar más tarde.' },
  '500': { description: 'Error temporal; no significa que la propiedad no exista.' },
};
const object = { type: 'object', additionalProperties: true };
function jsonResponse(description: string, schema: Record<string, unknown>) {
  return { description, content: { 'application/json': { schema } } };
}

/** Contrato mínimo escrito a mano: sólo las tres operaciones públicas de lectura. */
export const propertiesOpenApi = {
  openapi: '3.1.0',
  info: {
    title: 'ShowtimeProp — propiedades públicas', version: '1.0.0',
    description: 'Búsqueda entre inmobiliarias con indexación activada y lectura de fichas/portfolios públicos. Sin autenticación.',
  },
  servers: [{ url: PUBLIC_PROPERTIES_API }],
  security: [],
  paths: {
    '/search': {
      get: {
        operationId: 'searchPublicProperties', summary: 'Buscar propiedades de inmobiliarias con opt-in.',
        description: 'GET ' + PUBLIC_PROPERTIES_API + '/search. Sin inmobiliarias indexables devuelve items vacío.',
        parameters: [
          query('q', { type: 'string', maxLength: 120 }, 'Texto libre: nombre, descripción o código.'),
          query('operation', { type: 'string', enum: ['sale', 'rent', 'rent_short_term'] }, 'Venta, alquiler o alquiler temporario.'),
          query('property_type', { type: 'string', maxLength: 40 }, 'apartment, house, ph, local, land, garage o project.'),
          query('city', { type: 'string', maxLength: 80 }, 'Ciudad o localidad.'),
          query('tenant_slug', { type: 'string', maxLength: 100 }, 'Limitar a una inmobiliaria indexable.'),
          query('currency', { type: 'string', maxLength: 3 }, 'Moneda de min_price/max_price, por ejemplo USD o ARS; indicar al filtrar precios.'),
          query('min_price', { type: 'number', exclusiveMinimum: 0 }, 'Precio mínimo.'),
          query('max_price', { type: 'number', exclusiveMinimum: 0 }, 'Precio máximo.'),
          query('min_area', { type: 'number', exclusiveMinimum: 0 }, 'Superficie mínima en m².'),
          query('min_bedrooms', { type: 'integer', minimum: 0, maximum: 20 }, 'Dormitorios mínimos.'),
          query('min_ambientes', { type: 'integer', minimum: 0, maximum: 30 }, 'Ambientes mínimos.'),
          query('apto_credito', { type: 'boolean' }, 'Filtrar por el valor publicado de apto crédito.'),
          query('limit', { type: 'integer', minimum: 1, maximum: 20, default: 10 }, 'Resultados por página.'),
          query('offset', { type: 'integer', minimum: 0, maximum: 2000, default: 0 }, 'Desplazamiento para paginar.'),
        ],
        responses: {
          '200': jsonResponse('Resultados públicos, con enlaces a HTML y Markdown.', {
            type: 'object', required: ['total', 'offset', 'limit', 'items'],
            properties: {
              total: { type: 'integer' }, offset: { type: 'integer' }, limit: { type: 'integer' },
              items: { type: 'array', items: {
                type: 'object', required: ['id', 'name', 'url', 'markdown_url', 'agency_slug', 'agency_name'],
                properties: {
                  id: { type: 'string' }, name: { type: 'string' },
                  url: { type: 'string', format: 'uri' }, markdown_url: { type: 'string', format: 'uri' },
                  agency_slug: { type: 'string' }, agency_name: { type: 'string' },
                }, additionalProperties: true,
              } },
            },
          }), ...errors,
        },
      },
    },
    '/by-slug': {
      get: {
        operationId: 'getPublicProperty', summary: 'Leer una ficha pública por inmobiliaria y slug o UUID.',
        parameters: [tenantSlug, query('property_slug', { type: 'string' }, 'Slug SEO o UUID de la propiedad.', true), referral],
        responses: {
          '200': jsonResponse('Inmobiliaria y ficha; se omiten o son null los datos no disponibles.', {
            type: 'object', required: ['tenant', 'property'], properties: { tenant: object, property: object },
          }),
          '301': { description: 'Slug renombrado: Location apunta a la ficha HTML canónica.', headers: { Location: { schema: { type: 'string', format: 'uri' } } } },
          '404': { description: 'Inmobiliaria o propiedad no encontrada.' }, ...errors,
        },
      },
    },
    '/portfolio': {
      get: {
        operationId: 'getPublicPortfolio', summary: 'Leer el portfolio público de una inmobiliaria, sin exigir opt-in.',
        parameters: [tenantSlug, referral],
        responses: {
          '200': jsonResponse('Inmobiliaria y propiedades públicas.', {
            type: 'object', required: ['tenant', 'properties'],
            properties: { tenant: object, properties: { type: 'array', items: object } },
          }),
          '404': { description: 'Inmobiliaria no encontrada.' }, ...errors,
        },
      },
    },
  },
};
