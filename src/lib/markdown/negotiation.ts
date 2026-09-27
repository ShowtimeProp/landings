/**
 * Negociación de Markdown para agentes (Accept: text/markdown) y cabeceras de
 * descubrimiento. Lo usa el middleware, así que no importa nada de Node.
 */

export const MARKDOWN_MODE_HEADER = 'x-landings-md-mode';
export type MarkdownMode = 'negotiated' | 'file';

/** Prefijo interno de las rutas Markdown; no se sirve directo. */
export const MARKDOWN_INTERNAL_PREFIX = '/md';

// Segundos segmentos de /p/{tenant}/... que no son una ficha de propiedad.
const RESERVED_PROPERTY_SEGMENTS = new Set(['blog', 'sitemap.xml', 'llms.txt']);

function qualityOf(accept: string, type: string): number {
  let best = -1;
  for (const range of accept.split(',')) {
    const [mediaRaw, ...params] = range.split(';');
    const media = mediaRaw.trim().toLowerCase();
    if (media !== type) continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split('=').map((part) => part.trim());
      if (key === 'q') {
        const parsed = Number(value);
        q = Number.isFinite(parsed) ? parsed : 0;
      }
    }
    best = Math.max(best, q);
  }
  return best;
}

/**
 * True si el cliente pide Markdown al menos con la misma preferencia que HTML.
 * Los navegadores nunca listan text/markdown, así que no les cambia nada.
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  const markdown = qualityOf(accept, 'text/markdown');
  if (markdown <= 0) return false;
  return markdown >= Math.max(qualityOf(accept, 'text/html'), 0);
}

/** Ruta interna Markdown equivalente a una página HTML, o null si no tiene. */
export function markdownRouteForPage(pathname: string): string | null {
  if (pathname === '/') return MARKDOWN_INTERNAL_PREFIX;
  const portfolio = pathname.match(/^\/p\/([^/.]+)\/?$/);
  if (portfolio) return `${MARKDOWN_INTERNAL_PREFIX}/p/${portfolio[1]}`;
  const property = pathname.match(/^\/p\/([^/.]+)\/([^/]+?)\/?$/);
  if (property && !RESERVED_PROPERTY_SEGMENTS.has(property[2]) && !property[2].includes('.')) {
    return `${MARKDOWN_INTERNAL_PREFIX}/p/${property[1]}/${property[2]}`;
  }
  return null;
}

/** Ruta interna para las URLs explícitas `.md`, o null. */
export function markdownRouteForFile(pathname: string): string | null {
  if (pathname === '/index.md') return MARKDOWN_INTERNAL_PREFIX;
  const portfolio = pathname.match(/^\/p\/([^/.]+)\.md$/);
  if (portfolio) return `${MARKDOWN_INTERNAL_PREFIX}/p/${portfolio[1]}`;
  const property = pathname.match(/^\/p\/([^/.]+)\/([^/]+)\.md$/);
  if (property && !RESERVED_PROPERTY_SEGMENTS.has(property[2])) {
    return `${MARKDOWN_INTERNAL_PREFIX}/p/${property[1]}/${property[2]}`;
  }
  return null;
}

/** URL pública `.md` de una página HTML que tiene versión Markdown. */
export function markdownFileUrlForPage(pathname: string): string | null {
  if (!markdownRouteForPage(pathname)) return null;
  if (pathname === '/') return '/index.md';
  return `${pathname.replace(/\/$/, '')}.md`;
}

/**
 * Cabecera Link de descubrimiento para una página HTML. Acá se suman los
 * recursos globales a medida que existan (llms.txt, api-catalog, sitemap
 * global): agregarlos en `SITE_LINKS`.
 */
const SITE_LINKS: string[] = [
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/api-catalog>; rel="api-catalog"',
];

export function discoveryLinkHeader(pathname: string): string | null {
  const links = [...SITE_LINKS];
  const markdown = markdownFileUrlForPage(pathname);
  if (markdown) links.push(`<${markdown}>; rel="alternate"; type="text/markdown"`);
  const tenant = pathname.match(/^\/p\/([^/.]+)/);
  if (tenant) links.push(`</p/${tenant[1]}/sitemap.xml>; rel="sitemap"; type="application/xml"`);
  return links.length ? links.join(', ') : null;
}
