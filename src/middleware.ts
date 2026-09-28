import { NextResponse, type NextRequest } from "next/server";
import {
  MARKDOWN_INTERNAL_PREFIX,
  MARKDOWN_MODE_HEADER,
  type MarkdownMode,
  discoveryLinkHeader,
  markdownRouteForFile,
  markdownRouteForPage,
  prefersMarkdown,
} from "@/lib/markdown/negotiation";

function rewriteToMarkdown(req: NextRequest, route: string, mode: MarkdownMode) {
  const headers = new Headers(req.headers);
  headers.set(MARKDOWN_MODE_HEADER, mode);
  return NextResponse.rewrite(new URL(route, req.url), { request: { headers } });
}

// tours.showtimeprop.com: la misma app sirve la landing comercial de tours.
// (/propiedades/, /comercios/ y /landing/ van a SeaweedFS por Traefik.)
const TOURS_HOST_PREFIX = "/tours-host";
const TOURS_HOST_FILES: Record<string, string> = {
  "/robots.txt": `${TOURS_HOST_PREFIX}/robots.txt`,
  "/sitemap.xml": `${TOURS_HOST_PREFIX}/sitemap.xml`,
  "/llms.txt": `${TOURS_HOST_PREFIX}/llms.txt`,
};
const TOURS_MARKDOWN_ROUTE = `${MARKDOWN_INTERNAL_PREFIX}/tours`;
// Next vuelve a correr el middleware sobre la ruta reescrita, pero ya sin el
// host tours.: esta marca le indica a esa segunda pasada que viene de tours.
const TOURS_INTERNAL_HEADER = "x-landings-tours-host";
const TOURS_LINK_HEADER = [
  '</index.md>; rel="alternate"; type="text/markdown"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
].join(", ");

function rewriteForTours(req: NextRequest, route: string) {
  const headers = new Headers(req.headers);
  headers.set(TOURS_INTERNAL_HEADER, "1");
  return NextResponse.rewrite(new URL(route, req.url), { request: { headers } });
}

/** Segunda pasada de una ruta reescrita desde tours. */
function toursRewritten(pathname: string) {
  const response = NextResponse.next();
  if (pathname === "/tours") response.headers.set("Link", TOURS_LINK_HEADER);
  return response;
}

function toursHost(req: NextRequest, pathname: string) {
  // Rutas ya reescritas (el middleware vuelve a correr sobre ellas).
  if (pathname.startsWith(`${TOURS_HOST_PREFIX}/`)) return NextResponse.next();
  if (pathname === TOURS_MARKDOWN_ROUTE) {
    if (req.headers.get(MARKDOWN_MODE_HEADER)) return NextResponse.next();
    return new NextResponse(null, { status: 404 });
  }

  const file = TOURS_HOST_FILES[pathname];
  if (file) return rewriteForTours(req, file);
  if (pathname === "/index.md") return rewriteToMarkdown(req, TOURS_MARKDOWN_ROUTE, "file");

  if (pathname === "/") {
    if (prefersMarkdown(req.headers.get("accept"))) {
      return rewriteToMarkdown(req, TOURS_MARKDOWN_ROUTE, "negotiated");
    }
    const response = rewriteForTours(req, "/tours");
    response.headers.set("Link", TOURS_LINK_HEADER);
    return response;
  }
  return NextResponse.next();
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  if (host.startsWith("tours.")) return toursHost(req, pathname);
  if (req.headers.get(TOURS_INTERNAL_HEADER)) return toursRewritten(pathname);

  // Rutas internas del host tours: no se sirven desde landings.
  if (pathname.startsWith(`${TOURS_HOST_PREFIX}/`)) return new NextResponse(null, { status: 404 });

  // Las rutas Markdown internas sólo se sirven vía rewrite. El middleware
  // vuelve a correr sobre la ruta reescrita: la deja pasar la marca de modo.
  if (pathname === MARKDOWN_INTERNAL_PREFIX || pathname.startsWith(`${MARKDOWN_INTERNAL_PREFIX}/`)) {
    if (req.headers.get(MARKDOWN_MODE_HEADER)) return NextResponse.next();
    return new NextResponse(null, { status: 404 });
  }

  const fileRoute = markdownRouteForFile(pathname);
  if (fileRoute) return rewriteToMarkdown(req, fileRoute, "file");

  const pageRoute = markdownRouteForPage(pathname);
  if (pageRoute && prefersMarkdown(req.headers.get("accept"))) {
    return rewriteToMarkdown(req, pageRoute, "negotiated");
  }

  // Next pisa el Vary de las páginas HTML (no se puede sumar Accept), pero salen
  // como private/no-store: ningún caché compartido las guarda.
  const response = NextResponse.next();
  const link = discoveryLinkHeader(pathname);
  if (link) response.headers.set("Link", link);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|\\.well-known(?:/|$)).*)"],
};
