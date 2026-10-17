import { fetchPublicPortfolio } from '@/lib/data/public-api';
import { portfolioUrl } from '@/lib/markdown/format';
import { markdownMoved, markdownNotFound, markdownResponse, withBackendGuard } from '@/lib/markdown/response';
import { buildPortfolioMarkdown } from '@/lib/markdown/views';
import { findCurrentTenantSlug } from '@/lib/tenant-slug-redirect';

// Markdown del portfolio. Ruta interna: se llega por negociación o por /p/{slug}.md.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string }> }
) {
  const { tenant_slug } = await params;
  return withBackendGuard(request, async () => {
    const current = await findCurrentTenantSlug(tenant_slug);
    if (current) return markdownMoved(request, `/p/${encodeURIComponent(current)}`);
    const data = await fetchPublicPortfolio(tenant_slug);
    if (!data) return markdownNotFound(request);
    return markdownResponse(request, buildPortfolioMarkdown(data.tenant, data.properties), {
      canonical: portfolioUrl(data.tenant.slug),
    });
  });
}
