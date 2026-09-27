import { BackendUnavailableError } from '@/lib/backend';
import { MARKDOWN_MODE_HEADER } from './negotiation';

/**
 * Respuesta Markdown. Si se negoció sobre la URL HTML, no se cachea en ningún
 * lado: Cloudflare Free ignora `Vary: Accept` y podría servirle Markdown a un
 * navegador. Las URLs `.md` sí pueden cachearse.
 */
export function markdownResponse(
  request: Request,
  body: string,
  { status = 200, canonical }: { status?: number; canonical?: string } = {}
): Response {
  const negotiated = request.headers.get(MARKDOWN_MODE_HEADER) !== 'file';
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': negotiated ? 'private, no-store' : 'public, max-age=300',
    Vary: 'Accept',
    'X-Content-Type-Options': 'nosniff',
  });
  if (canonical) headers.set('Link', `<${canonical}>; rel="canonical"`);
  return new Response(body, { status, headers });
}

export function markdownNotFound(request: Request): Response {
  return markdownResponse(request, '# No encontrado\n\nLa página pedida no existe o ya no está publicada.\n', {
    status: 404,
  });
}

/** Ejecuta el armado y traduce una caída del backend en 503 (nunca 404). */
export async function withBackendGuard(
  request: Request,
  build: () => Promise<Response>
): Promise<Response> {
  try {
    return await build();
  } catch (error) {
    if (!(error instanceof BackendUnavailableError)) throw error;
    const response = markdownResponse(request, '# Servicio no disponible\n\nProbá de nuevo en un minuto.\n', {
      status: 503,
    });
    response.headers.set('Retry-After', '60');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}

/** Redirección permanente a la versión Markdown de un slug renombrado. */
export function markdownMoved(request: Request, htmlPath: string): Response {
  const file = request.headers.get(MARKDOWN_MODE_HEADER) === 'file';
  return new Response(null, {
    status: 308,
    headers: { Location: file ? `${htmlPath}.md` : htmlPath, Vary: 'Accept' },
  });
}
