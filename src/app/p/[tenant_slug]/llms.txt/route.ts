import { BackendUnavailableError } from '@/lib/backend';
import { fetchPublicPortfolio } from '@/lib/data/public-api';
import { buildTenantLlms, llmsHeaders } from '@/lib/markdown/llms';

export const revalidate = 3600;
export async function GET(_request: Request, { params }: { params: Promise<{ tenant_slug: string }> }) {
  try {
    const { tenant_slug } = await params;
    const portfolio = await fetchPublicPortfolio(tenant_slug);
    if (!portfolio) return new Response('No encontrado\n', { status: 404, headers: { ...llmsHeaders, 'Cache-Control': 'no-store' } });
    return new Response(buildTenantLlms(portfolio), { headers: llmsHeaders });
  } catch (error) {
    if (!(error instanceof BackendUnavailableError)) throw error;
    return new Response('Servicio no disponible\n', { status: 503, headers: { ...llmsHeaders, 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }
}
