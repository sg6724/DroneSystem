"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
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
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gKm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#16263a" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => d.slice(5)}
          tick={{ fill: "#5a7394", fontSize: 11 }}
          axisLine={{ stroke: "#1c2a3a" }}
          tickLine={false}
        />
        <YAxis tick={{ fill: "#5a7394", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "#0d1520", border: "1px solid #1c2a3a", borderRadius: 10, fontSize: 12,
          }}
          labelStyle={{ color: "#8fb0d8" }}
          itemStyle={{ color: "#e6f1ff" }}
        />
        <Area type="monotone" dataKey="missions" name="Missions" stroke="#22d3ee" strokeWidth={2} fill="url(#gMissions)" />
        <Area type="monotone" dataKey="km" name="Distance (km)" stroke="#818cf8" strokeWidth={2} fill="url(#gKm)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}