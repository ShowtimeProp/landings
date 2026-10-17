/**
 * Slugs de tenant que cambiaron. El tenant puede cambiar la URL de su portfolio
 * desde Cuenta; el backend guarda los slugs viejos. Cada ruta /p/<slug>/… pregunta
 * PRIMERO si el slug es viejo y redirige (301) al actual, así no se rompen links
 * compartidos, QR impresos ni lo que Google ya indexó.
 *
 * Tiene que ir antes del fetch de datos, no en el 404: Next sólo guarda en caché
 * respuestas 200, y si al renovar el portfolio el backend da 404, sigue sirviendo
 * para siempre la copia vieja (con el slug viejo) y nunca se llega al 404.
 *
 * Sólo para código de servidor.
 */
import { permanentRedirect } from 'next/navigation';
import { backendSsrHeaders } from '@/lib/backend';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

type SearchParamsLike = Record<string, string | string[] | undefined> | URLSearchParams | null | undefined;

/** Slug actual para un slug viejo, o null. Nunca lanza: ante cualquier falla, sin redirección. */
export async function findCurrentTenantSlug(oldSlug: string): Promise<string | null> {
  const slug = String(oldSlug || '').trim();
  if (!slug) return null;
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/properties/public/tenant-slug-redirect?tenant_slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 }, headers: backendSsrHeaders() },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { slug?: unknown };
    const current = typeof data?.slug === 'string' ? data.slug.trim() : '';
    return current && current !== slug ? current : null;
  } catch {
    return null;
  }
}

function toQueryString(searchParams: SearchParamsLike): string {
  if (!searchParams) return '';
  const qs =
    searchParams instanceof URLSearchParams
      ? new URLSearchParams(searchParams)
      : new URLSearchParams(
          Object.entries(searchParams).flatMap(([key, value]) =>
            value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((v) => [key, v] as [string, string]),
          ),
        );
  const out = qs.toString();
  return out ? `?${out}` : '';
}

/**
 * Path con el segmento del tenant reemplazado. `prefix` es lo que va antes del
 * slug (p. ej. "/p" o "/captacion") y `rest` lo que va después ("/blog", "/mi-depto").
 */
export function buildTenantSlugPath(prefix: string, slug: string, rest = '', searchParams?: SearchParamsLike): string {
  return `${prefix}/${encodeURIComponent(slug)}${rest}${toQueryString(searchParams)}`;
}

/** Para páginas: si el slug es viejo, 301 al actual; si no, vuelve y la página sigue normal. */
export async function redirectIfOldTenantSlug(
  oldSlug: string,
  opts: { prefix?: string; rest?: string; searchParams?: SearchParamsLike } = {},
): Promise<void> {
  const current = await findCurrentTenantSlug(oldSlug);
  if (current) {
    permanentRedirect(buildTenantSlugPath(opts.prefix ?? '/p', current, opts.rest ?? '', opts.searchParams));
  }
}

/** Para route handlers (sitemap, llms.txt, markdown): Response 301 o null. */
export async function oldTenantSlugRedirectResponse(
  request: Request,
  oldSlug: string,
  opts: { prefix?: string; rest?: string } = {},
): Promise<Response | null> {
  const current = await findCurrentTenantSlug(oldSlug);
  if (!current) return null;
  const url = new URL(request.url);
  const location = buildTenantSlugPath(opts.prefix ?? '/p', current, opts.rest ?? '', url.searchParams);
  return new Response(null, { status: 301, headers: { Location: location } });
}
