import { buildRobotsTxt, robotsHeaders } from '@/lib/seo/robots';

const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';
export const revalidate = 3600;
export function GET() {
  return new Response(buildRobotsTxt(`${LANDINGS_URL}/sitemap.xml`), { headers: robotsHeaders });
}
