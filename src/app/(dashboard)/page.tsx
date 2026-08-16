import Link from "next/link";
import { Activity, BarChart3, Crosshair, Plane } from "lucide-react";
import {
  listMissions,
  listDrones,
  orgStats,
  resolveOrgId,
  isSupabaseConfigured,
} from "@/lib/repository";
import { Stat, Panel, StatusBadge, BatteryBar, ProgressBar } from "@/components/ui";
import { formatDuration, formatKm, timeAgo, statusColor, statusLabel } from "@/lib/utils";
import { OverviewMap } from "@/components/overview-map";
import { Mission, Drone } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const orgId = await resolveOrgId();
  const [missions, drones, stats] = await Promise.all([
    listMissions(orgId),
    listDrones(orgId),
    orgStats(orgId),
  ]);

  const active = missions.filter(
    (m) => m.status === "in_progress" || m.status === "starting" || m.status === "paused",
  );
  const recent = missions.slice(0, 6);

  return (
    <div className="p-6 space-y-6">
      {/* top stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Fleet"
          value={drones.length}
          sub={`${drones.filter((d) => d.status === "available").length} available · ${active.length} deployed`}
          icon={<Plane className="w-4 h-4" />}
          tone="cyan"
        />
        <Stat
          label="Active Missions"
          value={active.length}
          sub={`${stats.completedMissions} completed to date`}
          icon={<Crosshair className="w-4 h-4" />}
          tone="indigo"
        />
        <Stat
          label="Flight Time"
          value={stats.totalFlightHours.toFixed(1) + "h"}
          sub={`${stats.totalDistanceKm.toFixed(1)} km surveyed`}
          icon={<Activity className="w-4 h-4" />}
          tone="emerald"
        />
        <Stat
          label="Org Coverage"
          value={stats.avgCoveragePct + "%"}
          sub={`${stats.totalImages.toLocaleString()} images captured`}
          icon={<BarChart3 className="w-4 h-4" />}
          tone="amber"
        />
      </div>

      {/* map + missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          title="Live Operations"
          right={<span className="flex items-center gap-1.5 text-[11px] text-cyan-300"><span className="dot bg-cyan-400 live-pulse" /> LIVE</span>}
          className="lg:col-span-2"
          pad={false}
        >
          <div className="h-[420px]">
            <OverviewMap missions={missions as any} drones={drones as any} activeOnly={false} />
          </div>
        </Panel>

        <Panel title="Aircraft Deployed" right={<Link href="/fleet" className="text-[11px] text-cyan-400 hover:text-cyan-300">Manage</Link>}>
          <div className="space-y-3">
            {drones.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-ink-800 border border-gridline/60 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{d.name}</span>
                    <span className={statusColor(d.status)}>{statusLabel(d.status)}</span>
                  </div>
                  <BatteryBar battery={d.battery} className="mt-1.5" />
                </div>
              </div>
            ))}
            {drones.length === 0 && (
              <div className="text-sm text-slate-500 py-8 text-center">No drones registered yet.</div>
            )}
          </div>
        </Panel>
      </div>

      {/* mission table */}
      <Panel
        title="Recent Missions"
        right={<Link href="/monitor" className="text-[11px] text-cyan-400 hover:text-cyan-300">Open Monitor</Link>}
      >
        <MissionTable missions={recent} drones={drones} />
      </Panel>

      {isSupabaseConfigured() && (
        <p className="text-center text-[11px] text-slate-600">
          Connected to Supabase · org-scoped data · RLS enforced
        </p>
      )}
    </div>
  );
}

function MissionTable({ missions, drones }: { missions: Mission[]; drones: Drone[] }) {
  if (!missions.length) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No missions yet.{" "}
        <Link href="/plan" className="text-cyan-400 hover:text-cyan-300 font-semibold">
          Plan your first survey
        </Link>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-gridline/60">
            <th className="py-2.5 pr-4 font-semibold">Mission</th>
            <th className="py-2.5 pr-4 font-semibold">Site</th>
            <th className="py-2.5 pr-4 font-semibold">Pattern</th>
            <th className="py-2.5 pr-4 font-semibold">Aircraft</th>
            <th className="py-2.5 pr-4 font-semibold">Status</th>
            <th className="py-2.5 pr-4 font-semibold text-right">Distance</th>
            <th className="py-2.5 pr-4 font-semibold text-right">Progress</th>
            <th className="py-2.5 font-semibold text-right">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gridline/40">
          {missions.map((m) => {
            const drone = m.drone_id ? drones.find((d) => d.id === m.drone_id) : undefined;
            return (
              <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-4">
                  <Link href={`/monitor`} className="font-medium hover:text-cyan-300">
                    {m.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-slate-400">{m.site_name ?? "—"}</td>
                <td className="py-3 pr-4">
                  <PatternBadge pattern={m.pattern} />
                </td>
                <td className="py-3 pr-4 text-slate-400">{drone?.name ?? "—"}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={m.status} />
                </td>
                <td className="py-3 pr-4 text-right mono text-slate-300 tabular-nums">
                  {formatKm(m.actual_distance_km ?? m.planned_distance_km)}
                </td>
                <td className="py-3 pr-4 w-36 text-right">
                  <ProgressBar value={m.coverage_pct ?? m.status === "completed" ? 100 : 0} tone={m.status === "aborted" ? "red" : "cyan"} />
                </td>
                <td className="py-3 text-right text-slate-500">
                  {m.status === "in_progress" || m.status === "starting" ? <LiveLabel /> : timeAgo(m.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LiveLabel() {
  return <span className="flex items-center justify-end gap-1.5 text-cyan-300 text-[11px]"><span className="dot bg-cyan-400 live-pulse" /> live</span>;
}

export function PatternBadge({ pattern }: { pattern: string }) {
  const styles: Record<string, string> = {
    grid: "bg-indigo-400/10 text-indigo-300 border-indigo-400/25",
    crosshatch: "bg-cyan-400/10 text-cyan-300 border-cyan-400/25",
    perimeter: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  };
  return (
    <span className={`badge border ${styles[pattern] ?? styles.grid} capitalize`}>{pattern}</span>
  );
}