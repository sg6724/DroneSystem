import { cn, statusLabel } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { metric } from "@/lib/metrics";

export { InfoTip, metric };

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, { dot: string; ring: string }> = {
    available: { dot: "bg-green-500", ring: "bg-green-500/10 text-green-500 border-green-500/25" },
    in_mission: { dot: "bg-green-400 live-pulse", ring: "bg-green-500/10 text-green-500 border-green-500/25" },
    starting: { dot: "bg-green-400 live-pulse", ring: "bg-green-500/10 text-green-500 border-green-500/25" },
    in_progress: { dot: "bg-green-400 live-pulse", ring: "bg-green-500/10 text-green-500 border-green-500/25" },
    charging: { dot: "bg-amber-400", ring: "bg-amber-400/10 text-amber-300 border-amber-400/25" },
    paused: { dot: "bg-amber-400", ring: "bg-amber-400/10 text-amber-300 border-amber-400/25" },
    planned: { dot: "bg-slate-400", ring: "bg-slate-400/10 text-slate-300 border-slate-400/25" },
    maintenance: { dot: "bg-red-400", ring: "bg-red-400/10 text-red-300 border-red-400/25" },
    offline: { dot: "bg-red-400", ring: "bg-red-400/10 text-red-300 border-red-400/25" },
    aborted: { dot: "bg-red-400", ring: "bg-red-400/10 text-red-300 border-red-400/25" },
    completed: { dot: "bg-green-500", ring: "bg-green-500/10 text-green-500 border-green-500/25" },
  };
  const entry = map[status] ?? map.planned;
  return (
    <span className={cn("badge", entry.ring, className)}>
      <span className={cn("dot", entry.dot)} />
      {statusLabel(status)}
    </span>
  );
}

export function batteryTone(battery: number): string {
  if (battery >= 50) return "bg-emerald-400";
  if (battery >= 25) return "bg-amber-400";
  return "bg-red-400";
}

export function BatteryBar({ battery, className }: { battery: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 rounded-full bg-ink-700/70 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", batteryTone(battery))}
          style={{ width: `${Math.max(0, Math.min(100, battery))}%` }}
        />
      </div>
      <span className="mono text-[11px] text-slate-400 tabular-nums">{Math.round(battery)}%</span>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "cyan",
  className,
}: {
  value: number;
  tone?: "cyan" | "emerald" | "amber" | "red";
  className?: string;
}) {
  const tones: Record<string, string> = {
    cyan: "bg-gradient-to-r from-green-500 to-green-300",
    emerald: "bg-gradient-to-r from-green-600 to-green-400",
    amber: "bg-gradient-to-r from-amber-500 to-amber-300",
    red: "bg-gradient-to-r from-red-500 to-red-300",
  };
  return (
    <div className={cn("w-full h-1.5 rounded-full bg-ink-700/60 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "cyan",
  info,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "cyan" | "emerald" | "amber" | "red" | "indigo";
  info?: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    cyan: "text-green-500",
    emerald: "text-green-500",
    amber: "text-amber-300",
    red: "text-red-300",
    indigo: "text-green-500",
  };
  return (
    <div className="panel p-4 fade-up relative">
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
        <div className="flex items-center gap-1.5">
          {icon && <div className={cn("opacity-80", tones[tone])}>{icon}</div>}
          {info}
        </div>
      </div>
      <div className={cn("mt-2 text-2xl font-bold tracking-tight mono", tones[tone])}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function Panel({
  title,
  right,
  info,
  children,
  className,
  pad = true,
}: {
  title?: string;
  right?: React.ReactNode;
  info?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={cn("panel", className)}>
      {(title || right || info) && (
        <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            {title && <div className="panel-header">{title}</div>}
            {info}
          </div>
          {right}
        </header>
      )}
      <div className={pad ? "p-4 pt-2" : ""}>{children}</div>
    </section>
  );
}
