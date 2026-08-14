import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";

  if (host.startsWith("tours.") && req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/tours", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
