import { buildToursLlms } from '@/lib/markdown/tours';
import { llmsHeaders } from '@/lib/markdown/llms';

// llms.txt de tours.showtimeprop.com.
export const revalidate = 3600;
export function GET() {
  return new Response(buildToursLlms(), { headers: llmsHeaders });
}
