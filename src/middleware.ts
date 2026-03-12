import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("mc_admin_token")?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "") ||
    request.nextUrl.searchParams.get("_token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Basic JWT structure check (full verify happens server-side)
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If token came from query param, set it as a cookie and redirect to clean URL
  if (request.nextUrl.searchParams.has("_token")) {
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete("_token");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set({
      name: "mc_admin_token",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
