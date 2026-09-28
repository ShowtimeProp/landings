import { buildToursSitemap } from '@/lib/markdown/tours';
import { sitemapHeaders } from '@/lib/seo/sitemap';

// Sitemap de tours.showtimeprop.com: la página del servicio y los tours de ejemplo.
export const revalidate = 3600;
export function GET() {
  return new Response(buildToursSitemap(), { headers: sitemapHeaders });
}
