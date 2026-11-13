import { NextResponse, type NextRequest } from "next/server";

/**
 * One canonical address for the app. The sign-in token lives in localStorage, which is per origin, so a seller who
 * signed in on www.pesaninn.my.id looked signed out after Shopee sent them back to pesaninn.my.id (and vice versa).
 * Customers' own custom domains are left alone.
 */
const CANONICAL = process.env.NEXT_PUBLIC_CANONICAL_HOST || "pesaninn.my.id";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (host === `www.${CANONICAL}`) {
    const url = req.nextUrl.clone();
    url.protocol = "https";
    url.host = CANONICAL;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Pages only; static files and images don't need the check.
  matcher: ["/((?!_next/|favicon|brands/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|css|mjs)$).*)"],
};
