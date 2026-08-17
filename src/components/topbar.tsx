"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Plus, LogOut, ShieldCheck, Rocket, Menu, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/fleet", label: "Fleet" },
  { href: "/plan", label: "Mission Planner" },
  { href: "/monitor", label: "Live Monitor" },
  { href: "/analytics", label: "Analytics" },
];

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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header className="h-16 shrink-0 bg-gray-800/50 backdrop-blur-sm shadow-lg border-b border-gray-700 flex items-center gap-2 sm:gap-4 px-3 sm:px-5 relative z-30">
      {/* mobile menu toggle */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden w-9 h-9 rounded-lg bg-gray-700/50 border border-gray-700 flex items-center justify-center hover:border-green-500/40 transition-colors"
        aria-label="Toggle navigation menu"
      >
        {menuOpen ? <X className="w-4 h-4 text-gray-300" /> : <Menu className="w-4 h-4 text-gray-300" />}
      </button>

      <div className="flex items-center gap-2.5 min-w-0">
        <Rocket className="h-7 w-7 sm:h-8 sm:w-8 text-green-500 shrink-0" />
        <div className="leading-tight min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">Drone Tracker</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] truncate">{title}</p>
        </div>
      </div>

      <div className="flex-1" />

      {/* system health */}
      <div className="hidden sm:flex items-center gap-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-green-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-gray-400">RLS secured</span>
        </span>
        <span className="text-gray-700">|</span>
        <span className="mono text-gray-400 tabular-nums">
          {now.toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
          <span className="text-green-500">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>{" "}
          <span className="text-gray-600">UTC{now.getTimezoneOffset() <= 0 ? "+" : "-"}
            {Math.abs(now.getTimezoneOffset() / 60)}</span>
        </span>
      </div>

      <Link
        href="/plan"
        className="flex items-center gap-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold px-4 py-2 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New Mission</span>
        <span className="sm:hidden">Plan</span>
      </Link>

      <button className="relative w-9 h-9 rounded-lg bg-gray-700/50 border border-gray-700 flex items-center justify-center hover:border-green-500/40 transition-colors">
        <Bell className="w-4 h-4 text-gray-400" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500" />
      </button>

      <button
        onClick={signOut}
        title="Sign out"
        className="w-9 h-9 rounded-lg bg-gray-700/50 border border-gray-700 flex items-center justify-center hover:border-red-500/40 hover:text-red-400 transition-colors"
      >
        <LogOut className="w-4 h-4 text-gray-400" />
      </button>

      {/* mobile nav dropdown */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 border-b border-gray-700 bg-gray-900/95 backdrop-blur shadow-xl">
          <nav className="flex flex-col p-3 space-y-1">
            {MOBILE_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                    active ? "bg-green-900/50 text-green-400" : "text-gray-200 hover:bg-gray-800",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}