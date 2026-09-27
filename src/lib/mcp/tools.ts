/**
 * Herramientas del servidor MCP de búsqueda de propiedades (AE-011).
 * Sólo lectura, sin datos personales más allá del contacto público de la
 * inmobiliaria. Universo: inmobiliarias con opt-in de indexación (AE-002).
 */
import {
  type PublicProperty,
  type PublicSearchItem,
  fetchIndexableTenants,
  fetchPublicProperty,
  searchPublicProperties,
} from '@/lib/data/public-api';
import { LANDINGS_URL, linkText, portfolioUrl } from '@/lib/markdown/format';
import { buildPropertyMarkdown, summaryParts } from '@/lib/markdown/views';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

type Args = Record<string, unknown>;

interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, boolean | string>;
  run: (args: Args) => Promise<ToolResult>;
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export class ToolInputError extends Error {}

function text(value: string, structured?: Record<string, unknown>): ToolResult {
  return { content: [{ type: 'text', text: value }], ...(structured ? { structuredContent: structured } : {}) };
}

function optionalString(args: Args, key: string, max = 120): string | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new ToolInputError(`"${key}" debe ser texto.`);
  return value.trim().slice(0, max) || undefined;
}

function optionalNumber(args: Args, key: string, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = args[key];
  if (value === undefined || value === null || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new ToolInputError(`"${key}" debe ser un número entre ${min} y ${max}.`);
  }
  return number;
}

function optionalBoolean(args: Args, key: string): boolean | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw new ToolInputError(`"${key}" debe ser true o false.`);
  return value;
}

function optionalEnum<T extends string>(args: Args, key: string, allowed: readonly T[]): T | undefined {
  const value = optionalString(args, key);
  if (value === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ToolInputError(`"${key}" debe ser uno de: ${allowed.join(', ')}.`);
  }
  return value as T;
}

const OPERATIONS = ['sale', 'rent', 'rent_short_term'] as const;
const PROPERTY_TYPES = ['apartment', 'house', 'ph', 'local', 'land', 'garage', 'project'] as const;
const CURRENCIES = ['USD', 'ARS'] as const;

/** El resultado de la búsqueda tiene casi la forma de una propiedad pública. */
function asProperty(item: PublicSearchItem): PublicProperty {
  return { ...item, address: { city: item.city, street: item.street } };
}

function searchItemLine(item: PublicSearchItem): string {
  const parts = summaryParts(asProperty(item));
  if (item.apto_credito) parts.push('apto crédito');
  if (item.has_virtual_tour) parts.push('tour virtual 360°');
  return (
    `- [${linkText(item.name)}](${item.url}) — ${linkText(item.agency_name)}` +
    `${parts.length ? ` · ${parts.join(' · ')}` : ''}. Ficha en Markdown: ${item.markdown_url}`
  );
}

const searchProperties: ToolDefinition = {
  name: 'search_properties',
  title: 'Buscar propiedades',
  description:
    'Busca propiedades en venta o alquiler publicadas por inmobiliarias y desarrolladoras de ' +
    'Mar del Plata y la zona que usan ShowtimeProp. Devuelve hasta 20 resultados con precio, ' +
    'superficie, ambientes y link a la ficha. Los datos los publica cada inmobiliaria; para ' +
    'consultar o visitar, usar el contacto de la ficha (get_property). / Search real-estate ' +
    'listings (sale or rent) published by agencies in Mar del Plata, Argentina.',
  inputSchema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Texto libre: nombre del edificio, calle, código o palabra de la descripción.' },
      operation: { type: 'string', enum: OPERATIONS, description: 'sale = venta, rent = alquiler, rent_short_term = alquiler temporario.' },
      property_type: { type: 'string', enum: PROPERTY_TYPES, description: 'project = emprendimiento en pozo.' },
      city: { type: 'string', description: 'Ciudad o localidad, p. ej. "Mar del Plata".' },
      agency: { type: 'string', description: 'Slug de una inmobiliaria (ver list_agencies) para buscar sólo en su cartera.' },
      currency: { type: 'string', enum: CURRENCIES, description: 'Moneda de min_price/max_price. Por defecto USD.' },
      min_price: { type: 'number', minimum: 0 },
      max_price: { type: 'number', minimum: 0 },
      min_area: { type: 'number', minimum: 0, description: 'Superficie mínima en m².' },
      min_bedrooms: { type: 'integer', minimum: 0 },
      min_ambientes: { type: 'integer', minimum: 0, description: 'Ambientes mínimos (en Argentina, living + dormitorios).' },
      apto_credito: { type: 'boolean', description: 'Sólo propiedades aptas para crédito hipotecario.' },
      limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
    additionalProperties: false,
  },
  annotations: { title: 'Buscar propiedades', ...READ_ONLY },
  async run(args) {
    const minPrice = optionalNumber(args, 'min_price');
    const maxPrice = optionalNumber(args, 'max_price');
    const currency = optionalEnum(args, 'currency', CURRENCIES) ?? (minPrice || maxPrice ? 'USD' : undefined);
    const limit = optionalNumber(args, 'limit', { min: 1, max: 20 }) ?? 10;
    const offset = optionalNumber(args, 'offset', { min: 0, max: 2000 }) ?? 0;
    const result = await searchPublicProperties({
      q: optionalString(args, 'q'),
      operation: optionalEnum(args, 'operation', OPERATIONS),
      property_type: optionalEnum(args, 'property_type', PROPERTY_TYPES),
      city: optionalString(args, 'city', 80),
      tenant_slug: optionalString(args, 'agency', 100),
      currency,
      min_price: minPrice,
      max_price: maxPrice,
      min_area: optionalNumber(args, 'min_area'),
      min_bedrooms: optionalNumber(args, 'min_bedrooms', { max: 20 }),
      min_ambientes: optionalNumber(args, 'min_ambientes', { max: 30 }),
      apto_credito: optionalBoolean(args, 'apto_credito'),
      limit: Math.trunc(limit),
      offset: Math.trunc(offset),
    });
    if (!result.items.length) {
      return text(
        'No hay propiedades publicadas que cumplan esos criterios. Probá ampliar el rango de precio, ' +
          'quitar filtros o buscar por ciudad.',
        { total: result.total, items: [] }
      );
    }
    const shown = `${result.offset + 1}–${result.offset + result.items.length} de ${result.total}`;
    const more =
      result.offset + result.items.length < result.total
        ? `\n\nHay más resultados: repetir con offset=${result.offset + result.items.length}.`
        : '';
    return text(
      `Resultados ${shown}:\n\n${result.items.map(searchItemLine).join('\n')}${more}`,
      { total: result.total, offset: result.offset, items: result.items }
    );
  },
};

/** Acepta una URL de ficha (con o sin .md) o agency + slug. */
function parsePropertyRef(args: Args): { tenant: string; slug: string } {
  const url = optionalString(args, 'url', 500);
  if (url) {
    let path: string;
    try {
      path = new URL(url, LANDINGS_URL).pathname;
    } catch {
      throw new ToolInputError('"url" no es una URL válida.');
    }
    const match = path.match(/^\/p\/([^/]+)\/([^/]+?)(?:\.md)?\/?$/);
    if (!match) throw new ToolInputError('"url" debe ser una ficha: https://landings.showtimeprop.com/p/{inmobiliaria}/{propiedad}');
    return { tenant: decodeURIComponent(match[1]), slug: decodeURIComponent(match[2]) };
  }
  const tenant = optionalString(args, 'agency', 100);
  const slug = optionalString(args, 'slug', 200);
  if (!tenant || !slug) throw new ToolInputError('Indicar "url", o "agency" y "slug".');
  return { tenant, slug };
}

const getProperty: ToolDefinition = {
  name: 'get_property',
  title: 'Ver ficha de una propiedad',
  description:
    'Devuelve la ficha completa de una propiedad en Markdown: precio, superficie, ambientes, ' +
    'ubicación, descripción, tour virtual, fotos y contacto de la inmobiliaria (WhatsApp, ' +
    'teléfono, email). Usar la URL que devuelve search_properties. / Full listing details.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL de la ficha (la que devuelve search_properties).' },
      agency: { type: 'string', description: 'Slug de la inmobiliaria, si no se pasa url.' },
      slug: { type: 'string', description: 'Slug de la propiedad, si no se pasa url.' },
    },
    additionalProperties: false,
  },
  annotations: { title: 'Ver ficha de una propiedad', ...READ_ONLY },
  async run(args) {
    const ref = parsePropertyRef(args);
    let data = await fetchPublicProperty(ref.tenant, ref.slug);
    if (data && 'movedTo' in data) data = await fetchPublicProperty(ref.tenant, data.movedTo);
    if (!data || 'movedTo' in data || data.tenant.seo_indexing !== true) {
      return { ...text('No se encontró esa propiedad entre las publicadas para búsqueda.'), isError: true };
    }
    return text(buildPropertyMarkdown(data.tenant, data.property));
  },
};

const listAgencies: ToolDefinition = {
  name: 'list_agencies',
  title: 'Listar inmobiliarias',
  description:
    'Lista las inmobiliarias y desarrolladoras cuyas propiedades se pueden buscar con ' +
    'search_properties, con el link a su portfolio. / List the agencies whose listings are searchable.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { title: 'Listar inmobiliarias', ...READ_ONLY },
  async run() {
    const agencies = await fetchIndexableTenants();
    if (!agencies.length) return text('Todavía no hay inmobiliarias publicadas para búsqueda.', { agencies: [] });
    const lines = agencies.map(
      (a) => `- ${linkText(a.name)} (agency: \`${a.slug}\`): ${portfolioUrl(a.slug)} — Markdown: ${portfolioUrl(a.slug)}.md`
    );
    return text(`Inmobiliarias (${agencies.length}):\n\n${lines.join('\n')}`, {
      agencies: agencies.map((a) => ({ ...a, url: portfolioUrl(a.slug) })),
    });
  },
};

export const TOOLS: ToolDefinition[] = [searchProperties, getProperty, listAgencies];

export function toolDescriptors() {
  return TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({
    name,
    title,
    description,
    inputSchema,
    annotations,
  }));
}
