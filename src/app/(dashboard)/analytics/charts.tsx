"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Mission } from "@/lib/types";

function toMissionsSeries(missions: Mission[]) {
  // group completed/in-progress missions by day
  const byDay = new Map<string, { date: string; missions: number; km: number; hours: number }>();
  missions.forEach((m) => {
    const key = new Date(m.created_at).toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { date: key, missions: 0, km: 0, hours: 0 };
    entry.missions += 1;
    entry.km += m.actual_distance_km ?? m.planned_distance_km ?? 0;
    entry.hours += (m.actual_duration_s ?? m.planned_duration_s ?? 0) / 3600;
    byDay.set(key, entry);
  });
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v)
    .slice(-14);
}

export function MissionCharts({ missions }: { missions: Mission[] }) {
  const data = toMissionsSeries(missions);
  const empty = data.every((d) => d.missions === 0);

  if (empty || !data.length) {
    return (
      <div className="h-full flex items-center justify-center text-[13px] text-slate-500">
        Launch missions to see throughput trends.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="gMissions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gKm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => d.slice(5)}
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={{ stroke: "#374151" }}
          tickLine={false}
        />
        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "#111827", border: "1px solid #374151", borderRadius: 10, fontSize: 12,
          }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#e5e7eb" }}
        />
        <Area type="monotone" dataKey="missions" name="Missions" stroke="#22c55e" strokeWidth={2} fill="url(#gMissions)" />
        <Area type="monotone" dataKey="km" name="Distance (km)" stroke="#4ade80" strokeWidth={2} fill="url(#gKm)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "#6b7280" },
  starting: { label: "Launching", color: "#4ade80" },
  in_progress: { label: "In Progress", color: "#22c55e" },
  paused: { label: "Paused", color: "#eab308" },
  completed: { label: "Completed", color: "#34d399" },
  aborted: { label: "Aborted", color: "#f87171" },
};

/** Donut showing the share of missions in each lifecycle status. */
export function MissionStatusDonut({ missions }: { missions: Mission[] }) {
  const counts = new Map<string, number>();
  missions.forEach((m) => counts.set(m.status, (counts.get(m.status) ?? 0) + 1));
  const data = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .map(([status, count]) => ({
      name: STATUS_META[status]?.label ?? status,
      value: count,
      color: STATUS_META[status]?.color ?? "#64748b",
    }));

  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-[13px] text-slate-500">
        No missions yet — plan one to see the status mix.
      </div>
    );
  }

  return (
    <div className="flex h-full items-center gap-2">
      <ResponsiveContainer width="60%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={82}
            paddingAngle={2}
            stroke="transparent"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#111827", border: "1px solid #374151", borderRadius: 10, fontSize: 12,
            }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-1.5 pr-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="mono text-slate-400 tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bar chart of coverage % per mission — flags under-surveyed flights. */
export function CoverageBars({ missions }: { missions: Mission[] }) {
  const rows = missions
    .slice(0, 10)
    .reverse()
    .map((m) => ({
      name: m.name.length > 18 ? `${m.name.slice(0, 18)}…` : m.name,
      coverage: Math.round(m.coverage_pct ?? (m.status === "completed" ? 100 : 0)),
      aborted: m.status === "aborted",
    }));

  if (!rows.length) {
    return (
      <div className="h-full flex items-center justify-center text-[13px] text-slate-500">
        No missions yet — coverage appears after flights finish.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 16, right: 12, bottom: 0, left: -14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={{ stroke: "#374151" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          domain={[0, 100]}
          unit="%"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#111827", border: "1px solid #374151", borderRadius: 10, fontSize: 12,
          }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#e5e7eb" }}
        />
        <Bar dataKey="coverage" name="Coverage" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.aborted ? "#f87171" : r.coverage >= 100 ? "#34d399" : "#22c55e"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}