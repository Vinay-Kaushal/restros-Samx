import { NextRequest, NextResponse } from "next/server";

// Minimal shared-password gate for launch day. This is NOT per-staff
// accounts - it's one password for anyone with kitchen access. Good enough
// to stop a random person with the URL from seeing customer phone
// numbers/addresses; not good enough as a long-term auth story (no audit
// trail of which staff member changed what). Replace with real accounts
// once there's time.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/login")) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/login")) return NextResponse.next();

  const authed = req.cookies.get("admin_auth")?.value === "true";
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
