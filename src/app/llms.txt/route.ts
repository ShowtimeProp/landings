import { connection } from 'next/server';
import { BackendUnavailableError } from '@/lib/backend';
import { fetchIndexableTenants } from '@/lib/data/public-api';
import { buildSiteLlms, llmsHeaders } from '@/lib/markdown/llms';

export const revalidate = 3600;
export async function GET() {
  await connection();
  try {
    return new Response(buildSiteLlms(await fetchIndexableTenants()), { headers: llmsHeaders });
  } catch (error) {
    if (!(error instanceof BackendUnavailableError)) throw error;
    return new Response('Servicio no disponible\n', { status: 503, headers: { ...llmsHeaders, 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }
}
