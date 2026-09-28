import { site } from '@/app/tours/_lib/site';
import { buildRobotsTxt, robotsHeaders } from '@/lib/seo/robots';

// robots.txt de tours.showtimeprop.com (el middleware reescribe /robots.txt acá).
export const revalidate = 3600;
export function GET() {
  return new Response(buildRobotsTxt(`${site.url}/sitemap.xml`), { headers: robotsHeaders });
}
