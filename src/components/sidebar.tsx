"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Route,
  Radio,
  BarChart3,
  Rocket,
  Network,
  ScanSearch,
  Crosshair,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, match: (p: string) => p.startsWith("/overview") },
  { href: "/fleet", label: "Fleet", icon: Radio, match: (p: string) => p.startsWith("/fleet") },
  { href: "/plan", label: "Mission Planner", icon: Route, match: (p: string) => p.startsWith("/plan") },
  { href: "/monitor", label: "Live Monitor", icon: Crosshair, match: (p: string) => p.startsWith("/monitor") },
  { href: "/analytics", label: "Analytics", icon: BarChart3, match: (p: string) => p.startsWith("/analytics") },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const showBackToHome = pathname !== "/overview" && pathname !== "/dashboard";

  return (
    <motion.aside
      initial={{ width: 240 }}
      animate={{ width: isExpanded ? 240 : 72 }}
      className="hidden md:block h-screen shrink-0 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700 shadow-lg overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* brand + collapse toggle */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <Link href="/overview" className={cn("flex items-center gap-3", !isExpanded && "justify-center w-[48px]")}>
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="leading-tight"
                  >
                    <div className="font-bold tracking-wide text-[15px] text-white">SKYGRID</div>
                    <div className="text-[10px] text-gray-400 tracking-[0.22em] uppercase">Survey Ops</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* collapse toggle */}
          <div className="mt-4 flex justify-end">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isExpanded ? (
                <ChevronLeft className="w-5 h-5 text-gray-300" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-300" />
              )}
            </motion.button>
          </div>

          {showBackToHome && (
            <Link href="/" className={cn("w-full flex items-center mt-4", !isExpanded && "justify-center")}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg shadow-md transition-all duration-200",
                  isExpanded ? "w-full" : "w-[48px] justify-center",
                )}
              >
                <ArrowLeft className="w-5 h-5" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-medium text-[13px]"
                    >
                      Back to Home
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )}
        </div>

        {/* nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                Operations
              </motion.div>
            )}
          </AnimatePresence>
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "w-full flex items-center p-3 rounded-lg transition-colors",
                  active
                    ? "bg-green-900/50 text-green-500"
                    : "text-gray-300 hover:bg-gray-700/50",
                  !isExpanded && "justify-center",
                )}
              >
                <Icon className={cn("w-5 h-5", active ? "text-green-500" : "text-gray-400")} />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="ml-3 text-[13px] font-medium"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && isExpanded && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 live-pulse" />
                )}
              </Link>
            );
          })}

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-2 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                Intels
              </motion.div>
            )}
          </AnimatePresence>
          <div className="px-3 py-2 text-[11px] text-gray-500 space-y-1.5">
            <div className={cn("flex items-center gap-2", !isExpanded && "justify-center")} title="Systems nominal">
              <Network className="w-3.5 h-3.5 text-green-500" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Systems nominal
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className={cn("flex items-center gap-2", !isExpanded && "justify-center")} title="Simulation engine v2">
              <ScanSearch className="w-3.5 h-3.5 text-green-400" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Simulation engine v2
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </div>
    </motion.aside>
  );
}
