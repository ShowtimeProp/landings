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

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  if (host.startsWith("tours.")) {
    if (pathname === "/") return NextResponse.rewrite(new URL("/tours", req.url));
    return NextResponse.next();
  }

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
