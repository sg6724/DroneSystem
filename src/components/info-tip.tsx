"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTipProps {
  /** Short heading shown in bold at the top of the popover. */
  title?: string;
  /** Explanation body. Plain text or JSX. */
  children: React.ReactNode;
  className?: string;
}

const POPOVER_W = 220;
const GAP = 8;
const MARGIN = 8;

export function InfoTip({ title, children, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Position the popover relative to the VIEWPORT. Rendered via a portal onto
  // <body> so `position: fixed` is never trapped by an ancestor with
  // backdrop-filter / transform (e.g. .panel), which would otherwise clip or
  // misplace the tooltip inside the dashboard.
  const update = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const belowSpace = vh - r.bottom - GAP;
    const aboveSpace = r.top - GAP;
    const place = belowSpace >= aboveSpace ? "below" : "above";
    const popH = popRef.current?.offsetHeight ?? 0;

    let top = place === "below" ? r.bottom + GAP : r.top - GAP - popH;
    if (top < MARGIN) top = MARGIN;
    if (place === "above" && top + popH > vh - MARGIN) top = vh - MARGIN - popH;

    const width = Math.min(POPOVER_W, vw - MARGIN * 2);
    const left = Math.min(
      Math.max(r.left + r.width / 2 - width / 2, MARGIN),
      vw - width - MARGIN,
    );

    setCoords({ top, left });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    // Re-anchor when the popover is first measured (popH known).
    const raf = requestAnimationFrame(update);
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const onDocClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, update, close]);

  // Measure the popover before paint so the first frame is already anchored.
  useLayoutEffect(() => {
    if (open) update();
  }, [open, update]);

  const popover =
    open && coords ? (
      <div
        ref={popRef}
        role="tooltip"
        style={{ left: coords.left, top: coords.top, width: Math.min(POPOVER_W, (typeof window !== "undefined" ? window.innerWidth : POPOVER_W) - MARGIN * 2) }}
        className="fixed z-[100] rounded-md border border-white/10 bg-[#0b1624]/95 p-2.5 text-left shadow-lg shadow-black/40"
      >
        {title && (
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-green-300">{title}</div>
        )}
        <div className="text-[11px] leading-snug text-slate-100">{children}</div>
      </div>
    ) : null;

  return (
    <span className={cn("relative inline-flex shrink-0 align-middle", className)}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={title ?? "More information"}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-colors cursor-pointer",
          "border border-gridline/70 bg-ink-700/80 text-slate-400",
          open ? "text-green-500 border-green-500/50" : "hover:text-green-500 hover:border-green-500/40",
        )}
      >
        <Info className="w-2.5 h-2.5" />
      </button>
      {typeof document !== "undefined" ? createPortal(popover, document.body) : null}
    </span>
  );
}
