import {
  BarChart3, Plane, Images, Map, Percent, Clock3, TrendingUp, Route,
} from "lucide-react";
import { resolveOrgId, listMissions, orgStats, listDrones } from "@/lib/repository";
import { Stat, Panel, StatusBadge, ProgressBar } from "@/components/ui";
import { formatDuration, formatKm } from "@/lib/utils";
import { Mission } from "@/lib/types";
import { MissionCharts } from "./charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const orgId = await resolveOrgId();
  const [missions, stats, drones] = await Promise.all([
    listMissions(orgId),
    orgStats(orgId),
    listDrones(orgId),
  ]);

  const patternBreakdown = {
    grid: missions.filter((m) => m.pattern === "grid").length,
    crosshatch: missions.filter((m) => m.pattern === "crosshatch").length,
    perimeter: missions.filter((m) => m.pattern === "perimeter").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Surveys" value={stats.totalMissions} icon={<BarChart3 className="w-4 h-4" />} tone="cyan"
          sub={`${stats.completedMissions} completed · ${stats.abortedMissions} aborted`} />
        <Stat label="Flight Hours" value={stats.totalFlightHours.toFixed(1)} icon={<Clock3 className="w-4 h-4" />} tone="emerald"
          sub="Accumulated across fleet" />
        <Stat label="Distance Flown" value={stats.totalDistanceKm.toFixed(1) + " km"} icon={<Route className="w-4 h-4" />} tone="indigo"
          sub="Surveyed swath paths" />
        <Stat label="Frames Captured" value={stats.totalImages.toLocaleString()} icon={<Images className="w-4 h-4" />} tone="amber"
          sub={`Avg coverage ${stats.avgCoveragePct}%`} />
      </div>

      {/* charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Survey Throughput" pad={false}>
          <div className="h-[280px] px-2">
            <MissionCharts missions={missions as any} />
          </div>
        </Panel>

        <Panel title="Fleet Utilization" pad={false}>
          <div className="h-[280px] px-2">
            <Utilization bars={patternCounts(missions)} />
          </div>
        </Panel>
      </div>

      {/* pattern breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <PatternStat label="Grid" count={patternBreakdown.grid} total={missions.length} tone="bg-indigo-400" />
        <PatternStat label="Crosshatch" count={patternBreakdown.crosshatch} total={missions.length} tone="bg-cyan-400" />
        <PatternStat label="Perimeter" count={patternBreakdown.perimeter} total={missions.length} tone="bg-emerald-400" />
      </div>

      {/* mission detail table */}
      <Panel
        title="Survey Report Log"
        right={
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Plane className="w-3.5 h-3.5" /> {drones.length} aircraft registered
          </div>
        }
      >
        <SurveyTable missions={missions} />
      </Panel>
    </div>
  );
}

function PatternStat({ label, count, total, tone }: { label: string; count: number; total: number; tone: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
        <span className="mono text-lg font-bold text-slate-100">{count}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-ink-700/60 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-[11px] text-slate-500">{pct}% of missions</div>
    </div>
  );
}

function patternCounts(missions: Mission[]) {
  return ["grid", "crosshatch", "perimeter"].map((p) => ({
    label: p,
    count: missions.filter((m) => m.pattern === p).length,
  }));
}

function Utilization({ bars }: { bars: { label: string; count: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  const colors: Record<string, string> = {
    grid: "bg-indigo-400",
    crosshatch: "bg-cyan-400",
    perimeter: "bg-emerald-400",
  };
  return (
    <div className="h-full flex items-end justify-around px-4 pb-2">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-2 flex-1">
          <span className="mono text-[12px] text-slate-300">{b.count}</span>
          <div className="w-12 rounded-t-lg bg-ink-700/40 relative overflow-hidden" style={{ height: 200 }}>
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${colors[b.label] ?? "bg-cyan-400"} transition-all duration-700`}
              style={{ height: `${(b.count / max) * 100}%`, opacity: 0.75 }}
            />
          </div>
          <span className="text-[11px] capitalize text-slate-400">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function SurveyTable({ missions }: { missions: Mission[] }) {
  if (!missions.length) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No completed surveys yet — launch missions to populate reports.
      </div>
    );
  }
  const sorted = [...missions].sort((a, b) =>
    (b.status === "completed" ? 1 : 0) - (a.status === "completed" ? 1 : 0) ||
    (b.created_at > a.created_at ? 1 : -1));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-gridline/60">
            <th className="py-2.5 pr-4 font-semibold">Mission</th>
            <th className="py-2.5 pr-4 font-semibold">Pattern</th>
            <th className="py-2.5 pr-4 font-semibold text-right">Distance</th>
            <th className="py-2.5 pr-4 font-semibold text-right">Duration</th>
            <th className="py-2.5 pr-4 font-semibold text-right">Frames</th>
            <th className="py-2.5 pr-4 font-semibold text-right">Coverage</th>
            <th className="py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gridline/40">
          {sorted.map((m) => (
            <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pr-4">
                <div className="font-medium">{m.name}</div>
                <div className="text-[11px] text-slate-500">{m.site_name ?? "—"}</div>
              </td>
              <td className="py-3 pr-4">
                <span className="badge border border-gridline/60 bg-ink-800 text-slate-300 capitalize">{m.pattern}</span>
              </td>
              <td className="py-3 pr-4 text-right mono tabular-nums">
                {formatKm(m.actual_distance_km ?? m.planned_distance_km, 2)}
              </td>
              <td className="py-3 pr-4 text-right mono tabular-nums text-slate-300">
                {formatDuration(m.actual_duration_s ?? m.planned_duration_s ?? 0)}
              </td>
              <td className="py-3 pr-4 text-right mono tabular-nums">
                {(m.images_captured ?? m.estimated_images ?? 0).toLocaleString()}
              </td>
              <td className="py-3 pr-4 w-32 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="mono text-[12px] tabular-nums">
                    {Math.round(m.coverage_pct ?? (m.status === "completed" ? 100 : 0))}%
                  </span>
                  <ProgressBar value={m.coverage_pct ?? (m.status === "completed" ? 100 : 0)} tone={m.status === "aborted" ? "red" : "emerald"} className="w-16" />
                </div>
              </td>
              <td className="py-3"><StatusBadge status={m.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}