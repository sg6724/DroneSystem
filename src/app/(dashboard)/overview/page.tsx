import Link from "next/link";
import { Activity, ArrowUpRight, BarChart3, Crosshair, Plane, ShieldCheck } from "lucide-react";
import {
  listMissions,
  listDrones,
  orgStats,
  resolveOrgId,
} from "@/lib/repository";
import { Stat, Panel, StatusBadge, BatteryBar, ProgressBar, InfoTip, metric } from "@/components/ui";
import { formatKm, timeAgo, statusColor, statusLabel } from "@/lib/utils";
import { OverviewMap } from "@/components/overview-map";
import { Mission, Drone } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const orgId = await resolveOrgId();
  const [missions, drones] = await Promise.all([
    listMissions(orgId),
    listDrones(orgId),
  ]);
  const stats = await orgStats(orgId, missions);

  const active = missions.filter(
    (m) => m.status === "in_progress" || m.status === "starting" || m.status === "paused",
  );
  const recent = missions.slice(0, 6);

  return (
    <div className="p-6 space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-[linear-gradient(115deg,#1f2937_0%,#111827_55%,#0a0a0a_100%)] px-6 py-7 shadow-2xl shadow-black/20">
        <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-green-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-green-500"><ShieldCheck className="h-3.5 w-3.5" /> Field command</div>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">Every flight, in focus.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">A live view of the fleet, mission health, and the evidence being captured across your active survey sites.</p>
          </div>
          <Link href="/plan" className="inline-flex items-center gap-2 self-start rounded-full bg-green-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-green-700 lg:self-auto">Plan field mission <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>
      {/* top stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Fleet"
          value={drones.length}
          sub={`${drones.filter((d) => d.status === "available").length} available · ${active.length} deployed`}
          icon={<Plane className="w-4 h-4" />}
          tone="cyan"
          info={<InfoTip title={metric.ov_fleet.title}>{metric.ov_fleet.body}</InfoTip>}
        />
        <Stat
          label="Active Missions"
          value={active.length}
          sub={`${stats.completedMissions} completed to date`}
          icon={<Crosshair className="w-4 h-4" />}
          tone="indigo"
          info={<InfoTip title={metric.ov_active.title}>{metric.ov_active.body}</InfoTip>}
        />
        <Stat
          label="Flight Time"
          value={stats.totalFlightHours.toFixed(1) + "h"}
          sub={`${stats.totalDistanceKm.toFixed(1)} km surveyed`}
          icon={<Activity className="w-4 h-4" />}
          tone="emerald"
          info={<InfoTip title={metric.ov_flight_time.title}>{metric.ov_flight_time.body}</InfoTip>}
        />
        <Stat
          label="Org Coverage"
          value={stats.avgCoveragePct + "%"}
          sub={`${stats.totalImages.toLocaleString()} images captured`}
          icon={<BarChart3 className="w-4 h-4" />}
          tone="amber"
          info={<InfoTip title={metric.ov_coverage.title}>{metric.ov_coverage.body}</InfoTip>}
        />
      </div>

      {/* map + missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          title="Live Operations"
          right={<span className="flex items-center gap-1.5 text-[11px] text-green-500"><span className="dot bg-green-400 live-pulse" /> LIVE</span>}
          className="lg:col-span-2"
          pad={false}
          info={<InfoTip title="Live Operations">Every mission’s planned survey area and drone position, plotted on the map. A live marker shows in-flight aircraft; completed sites are shaded by their last survey.</InfoTip>}
        >
          <div className="h-[420px]">
            <OverviewMap missions={missions} drones={drones} />
          </div>
        </Panel>

        <Panel
          title="Aircraft Deployed"
          right={<Link href="/fleet" className="text-[11px] text-green-500 hover:text-green-400">Manage</Link>}
          info={<InfoTip title="Aircraft Deployed">Live battery and status of your top aircraft. “Available” units can be assigned to new missions; “In mission” units are flying right now; grounded units are charging or in maintenance.</InfoTip>}
        >
          <div className="space-y-3">
            {drones.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-ink-800 border border-gridline/60 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-green-500" />
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
        right={<Link href="/monitor" className="text-[11px] text-green-500 hover:text-green-400">Open Monitor</Link>}
        info={<InfoTip title="Recent Missions">The six most recent missions across the organization. Progress shows how much of the planned area has been flown; “live” rows update in real time.</InfoTip>}
      >
        <MissionTable missions={recent} drones={drones} />
      </Panel>
    </div>
  );
}

function MissionTable({ missions, drones }: { missions: Mission[]; drones: Drone[] }) {
  if (!missions.length) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No missions yet.{" "}
        <Link href="/plan" className="text-green-500 hover:text-green-400 font-semibold">
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
                  <Link href={`/monitor`} className="font-medium hover:text-green-400">
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
  return <span className="flex items-center justify-end gap-1.5 text-green-500 text-[11px]"><span className="dot bg-green-400 live-pulse" /> live</span>;
}

export function PatternBadge({ pattern }: { pattern: string }) {
  const styles: Record<string, string> = {
    grid: "bg-green-500/10 text-green-500 border-green-500/25",
    crosshatch: "bg-green-500/10 text-green-500 border-green-500/25",
    perimeter: "bg-green-500/10 text-green-500 border-green-500/25",
  };
  return (
    <span className={`badge border ${styles[pattern] ?? styles.grid} capitalize`}>{pattern}</span>
  );
}
