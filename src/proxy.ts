import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/callback"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => p === "/" ? url === p : url.startsWith(p));

  // In demo mode (no Supabase configured) everything is accessible.
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!configured) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verify the JWT locally (with cached signing keys) on the hot path. This
  // avoids an Auth API round-trip for every telemetry poll and page request.
  const { data: verifiedClaims } = await supabase.auth.getClaims();
  let userId = typeof verifiedClaims?.claims.sub === "string" ? verifiedClaims.claims.sub : null;

  // An expired token still needs the Auth API once to refresh its session.
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", url);
    return NextResponse.redirect(redirectUrl);
  }

  if (userId && isPublic && url !== "/auth/callback") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/overview";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
