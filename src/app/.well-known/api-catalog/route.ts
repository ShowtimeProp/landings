import { catalog, catalogHeaders } from '@/lib/discovery/catalog';

export function GET() {
  return new Response(JSON.stringify(catalog, null, 2), { headers: catalogHeaders });
}

export function HEAD() {
  return new Response(null, { headers: catalogHeaders });
}
