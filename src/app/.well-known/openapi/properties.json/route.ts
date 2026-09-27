import { discoveryHeaders } from '@/lib/discovery/catalog';
import { propertiesOpenApi } from '@/lib/discovery/properties-openapi';

export function GET() {
  return Response.json(propertiesOpenApi, { headers: discoveryHeaders });
}
