"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Radio,
  BarChart3,
  Rocket,
  Network,
  ScanSearch,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/fleet", label: "Fleet", icon: Radio, match: (p: string) => p.startsWith("/fleet") },
  { href: "/plan", label: "Mission Planner", icon: Route, match: (p: string) => p.startsWith("/plan") },
  { href: "/monitor", label: "Live Monitor", icon: RadarIcon, match: (p: string) => p.startsWith("/monitor") },
  { href: "/analytics", label: "Analytics", icon: BarChart3, match: (p: string) => p.startsWith("/analytics") },
];

function RadarIcon(props: { className?: string }) {
  return <Crosshair {...props} />;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col shrink-0 border-r border-gridline/60 bg-ink-900/70 backdrop-blur-sm">
      {/* brand */}
      <Link href="/" className="flex items-center gap-3 px-5 h-16 border-b border-gridline/60">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-wide text-[15px]">SKYGRID</div>
          <div className="text-[10px] text-slate-400 tracking-[0.22em] uppercase">Survey Ops</div>
        </div>
      </Link>

      {/* nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations
        </div>
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                active
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent",
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-cyan-300" : "text-slate-500")} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 live-pulse" />}
            </Link>
          );
        })}

        <div className="px-2 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Intels
        </div>
        <div className="px-3 py-2 text-[11px] text-slate-500 space-y-1.5">
          <div className="flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-emerald-400" />
            <span>Systems nominal</span>
          </div>
          <div className="flex items-center gap-2">
            <ScanSearch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulation engine v2</span>
          </div>
        </div>
      </nav>
    </aside>
  );
}