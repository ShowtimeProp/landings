import { connection } from 'next/server';
import { BackendUnavailableError } from '@/lib/backend';
import { fetchIndexableTenants } from '@/lib/data/public-api';
import { escapeXml, sitemapHeaders } from '@/lib/seo/sitemap';
const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';
export const revalidate = 3600;
export async function GET() {
  // Runtime: no congelar en el build una respuesta del backend aún no desplegado.
  await connection();
  try {
    const tenants = await fetchIndexableTenants();
    const entries = [`<sitemap><loc>${escapeXml(`${LANDINGS_URL}/sitemap-site.xml`)}</loc></sitemap>`];
    for (const tenant of tenants) {
      const lastmod = tenant.updated_at && !Number.isNaN(Date.parse(tenant.updated_at)) ? `<lastmod>${escapeXml(tenant.updated_at)}</lastmod>` : '';
      entries.push(`<sitemap><loc>${escapeXml(`${LANDINGS_URL}/p/${encodeURIComponent(tenant.slug)}/sitemap.xml`)}</loc>${lastmod}</sitemap>`);
    }
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>\n`, { headers: sitemapHeaders });
  } catch (error) {
    if (!(error instanceof BackendUnavailableError)) throw error;
    return new Response('Service Unavailable', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
}
