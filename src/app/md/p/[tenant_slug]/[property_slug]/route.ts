import { fetchPublicProperty } from '@/lib/data/public-api';
import { propertyUrl } from '@/lib/markdown/format';
import { markdownMoved, markdownNotFound, markdownResponse, withBackendGuard } from '@/lib/markdown/response';
import { buildPropertyMarkdown } from '@/lib/markdown/views';
import { cleanText } from '@/lib/text';

// Markdown de la ficha. Ruta interna: se llega por negociación o por /p/{t}/{slug}.md.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenant_slug: string; property_slug: string }> }
) {
  const { tenant_slug, property_slug } = await params;
  return withBackendGuard(request, async () => {
    const data = await fetchPublicProperty(tenant_slug, property_slug);
    if (!data) return markdownNotFound(request);
    if ('movedTo' in data) {
      return markdownMoved(request, `/p/${encodeURIComponent(tenant_slug)}/${encodeURIComponent(data.movedTo)}`);
    }
    const slug = cleanText(data.property.slug) || data.property.id;
    return markdownResponse(request, buildPropertyMarkdown(data.tenant, data.property), {
      canonical: propertyUrl(data.tenant.slug, slug),
    });
  });
}
