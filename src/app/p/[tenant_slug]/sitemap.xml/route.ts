/**
 * Sitemap por tenant: /p/{tenant_slug}/sitemap.xml
 *
 * Es por tenant y no global a propósito. Cada inmobiliaria manda el suyo a su
 * propia Search Console, que es donde le sirve; un sitemap global mezclaría
 * las propiedades de todos y ninguno podría reclamar las suyas.
 *
 * Incluye el portfolio, las fichas de propiedad y —si el blog está activo— el
 * índice y los artículos. Los artículos con noindex o con canonical apuntando
 * a otro lado quedan afuera: pedirle a Google que indexe algo que la propia
 * página le dice que no indexe es contradecirse.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const LANDINGS_URL =
  process.env.NEXT_PUBLIC_LANDINGS_URL ||
  process.env.LANDINGS_URL ||
  'https://landings.showtimeprop.com';

// Se regenera cada hora: una propiedad nueva no justifica pegarle al backend
// en cada visita de un crawler.
export const revalidate = 3600;

type SitemapEntry = { loc: string; lastmod?: string; priority?: string };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.priority) parts.push(`    <priority>${entry.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function isoDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenant_slug: string }> }
) {
  const { tenant_slug } = await params;
  const base = `${LANDINGS_URL}/p/${encodeURIComponent(tenant_slug)}`;

  const portfolio = await fetchJson(
    `${BACKEND_URL}/api/properties/public/portfolio?tenant_slug=${encodeURIComponent(tenant_slug)}`
  );

  // Tenant inexistente: 404 en vez de un sitemap vacío, que Google
  // interpretaría como "acá no hay nada" para un slug que quizá sí existe.
  if (!portfolio) {
    return new Response('Not found', { status: 404 });
  }

  const entries: SitemapEntry[] = [{ loc: base, priority: '1.0' }];

  const properties = Array.isArray(portfolio.properties)
    ? (portfolio.properties as Record<string, unknown>[])
    : Array.isArray(portfolio.items)
      ? (portfolio.items as Record<string, unknown>[])
      : [];

  for (const property of properties) {
    const slug = typeof property.slug === 'string' ? property.slug.trim() : '';
    if (!slug) continue;
    entries.push({
      loc: `${base}/${encodeURIComponent(slug)}`,
      lastmod: isoDate(property.updated_at),
      priority: '0.8',
    });
  }

  const blog = await fetchJson(
    `${BACKEND_URL}/api/blogs/public/tenants/${encodeURIComponent(tenant_slug)}/blog`
  );
  if (blog?.blog_enabled) {
    entries.push({ loc: `${base}/blog`, priority: '0.5' });
    const articles = Array.isArray(blog.articles)
      ? (blog.articles as Record<string, unknown>[])
      : [];
    for (const article of articles) {
      const url = typeof article.url === 'string' ? article.url.trim() : '';
      if (!url || article.noindex) continue;
      // Si el canónico apunta a otra URL, la que manda es esa, no ésta.
      const canonical =
        typeof article.canonical_url === 'string' ? article.canonical_url.trim() : '';
      if (canonical && canonical !== url) continue;
      entries.push({
        loc: url,
        lastmod: isoDate(article.published_at) || isoDate(article.updated_at),
        priority: '0.4',
      });
    }
  }

  return new Response(renderSitemap(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
