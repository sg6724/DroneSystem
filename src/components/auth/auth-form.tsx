"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // If unconfigured (demo/offline), allow a local dev-session so the UI is explorable.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter a valid email address.");
      return;
    }
    if (!configured) {
      router.replace("/overview");
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: normalizedEmail.split("@")[0], org_name: orgName.trim() || normalizedEmail.split("@")[0] + "'s Fleet" } },
        });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          setError("An account with this email already exists. Try signing in.");
          return;
        }
        router.replace("/overview");
        router.refresh();
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        router.replace("/overview");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } = {} } =
      getSupabaseBrowserClientSafe()?.auth.onAuthStateChange(
        (_event: string, session: { user: unknown } | null) => {
          if (session) router.refresh();
        },
      ) ?? {};

    return () => subscription?.unsubscribe();
  }, [router]);

  return (
    <form onSubmit={submit} className="space-y-4">
      {!configured ? (
        <TestModeNotice />
      ) : (
        <>
          {mode === "signup" && (
            <div>
              <label className="block text-[13px] font-medium text-slate-300 mb-1.5">
                Organization name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Survey Corp"
                className="w-full rounded-lg bg-ink-800 border border-gridline/60 px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg bg-ink-800 border border-gridline/60 px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="w-full rounded-lg bg-ink-800 border border-gridline/60 px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition"
            />
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-ink-950 font-semibold py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create organization"}
      </button>
    </form>
  );
}

function TestModeNotice() {
  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-4">
      <div className="text-[13px] font-semibold text-cyan-300">Demo mode active</div>
      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
        Supabase isn&apos;t configured yet, so you&apos;ll enter a seeded offline
        sandbox. Add <span className="mono text-cyan-300">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
        <span className="mono text-cyan-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to .env.local
        to enable org accounts and Row Level Security.
      </p>
    </div>
  );
}

function getSupabaseBrowserClientSafe() {
  try {
    return getSupabaseBrowserClient();
  } catch {
    return null;
  }
}
