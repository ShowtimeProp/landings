import { site } from '@/app/tours/_lib/site';
import { buildToursMarkdown } from '@/lib/markdown/tours';
import { markdownResponse } from '@/lib/markdown/response';

// Markdown de tours.showtimeprop.com. Ruta interna: negociación sobre / o /index.md.
export async function GET(request: Request) {
  return markdownResponse(request, buildToursMarkdown(), { canonical: `${site.url}/` });
}
