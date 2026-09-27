import { buildSiteMarkdown } from '@/lib/markdown/views';
import { LANDINGS_URL } from '@/lib/markdown/format';
import { markdownResponse } from '@/lib/markdown/response';

// Markdown de la raíz. Ruta interna: se llega por negociación o por /index.md.
export async function GET(request: Request) {
  return markdownResponse(request, buildSiteMarkdown(), { canonical: `${LANDINGS_URL}/` });
}
