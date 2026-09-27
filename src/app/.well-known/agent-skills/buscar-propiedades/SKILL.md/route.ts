import { discoveryHeaders } from '@/lib/discovery/catalog';
import { propertySkill } from '@/lib/discovery/property-skill';

export function GET() {
  return new Response(propertySkill, { headers: { ...discoveryHeaders, 'Content-Type': 'text/markdown; charset=utf-8' } });
}
