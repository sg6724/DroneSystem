"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// A polling screen must not leave a request hanging for the platform default
// timeout when the database endpoint is unreachable.  The caller receives the
// real failure and can retain the last confirmed telemetry while it retries.
const SUPABASE_REQUEST_TIMEOUT_MS = 8_000;

async function fetchSupabase(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(SUPABASE_REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchSupabase },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is the only place that can refresh sessions.
          }
        },
      },
    },
  );
}

export async function getSupabaseAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: { fetch: fetchSupabase },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
