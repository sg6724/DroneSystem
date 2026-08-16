import { NextResponse } from "next/server";

// Supabase auth uses PKCE with the browser client — this route just hands off
// to the app home after the exchange. Cookies are managed client-side via
// @supabase/ssr in getSupabaseBrowserClient.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  return NextResponse.redirect(new URL(next, url.origin));
}

export const dynamic = "force-dynamic";