"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Plus, LogOut, Database, ShieldCheck } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const now = useClock();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const titles: Record<string, string> = {
    "/overview": "Operations Overview",
    "/fleet": "Fleet Management",
    "/plan": "Mission Planner",
    "/monitor": "Live Mission Monitor",
    "/analytics": "Survey Analytics",
  };
  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? "SkyGrid";

  const signOut = async () => {
    try {
      const sb = getSupabaseBrowserClient();
      await sb.auth.signOut();
    } finally {
      await router.replace("/login");
      router.refresh();
    }
  };

  return (
    <header className="h-16 shrink-0 border-b border-gridline/60 bg-[#0d100c]/95 backdrop-blur-sm flex items-center gap-4 px-5">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex-1" />

      {/* system health */}
      <div className="hidden sm:flex items-center gap-2 text-[11px]">
        {configured ? (
          <span className="flex items-center gap-1.5 text-emerald-400/90">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-slate-400">RLS secured</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-400/90">
            <Database className="w-3.5 h-3.5" />
            <span className="text-slate-400">Demo mode</span>
          </span>
        )}
        <span className="text-slate-700">|</span>
        <span className="mono text-slate-400 tabular-nums">
          {now.toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
          <span className="text-amber-300">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>{" "}
          <span className="text-slate-600">UTC{now.getTimezoneOffset() <= 0 ? "+" : "-"}
            {Math.abs(now.getTimezoneOffset() / 60)}</span>
        </span>
      </div>

      <Link
        href="/plan"
        className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-ink-950 text-[13px] font-semibold px-3 py-1.5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New Mission</span>
        <span className="sm:hidden">Plan</span>
      </Link>

      <button className="relative w-9 h-9 rounded-lg bg-ink-800 border border-gridline/60 flex items-center justify-center hover:border-cyan-500/40 transition-colors">
        <Bell className="w-4 h-4 text-slate-400" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300" />
      </button>

      {configured && (
        <button
          onClick={signOut}
          title="Sign out"
          className="w-9 h-9 rounded-lg bg-ink-800 border border-gridline/60 flex items-center justify-center hover:border-red-500/40 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </header>
  );
}
