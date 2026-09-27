import { escapeXml, sitemapHeaders } from '@/lib/seo/sitemap';
const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';
export const revalidate = 3600;
export function GET() {
  const urls = ['/'].map((path) => `<url><loc>${escapeXml(`${LANDINGS_URL}${path}`)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, { headers: sitemapHeaders });
}
