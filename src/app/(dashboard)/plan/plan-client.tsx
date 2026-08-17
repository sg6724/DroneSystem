"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Eraser, Grid3x3, Grid2x2Plus, Route as RouteIcon,
  Loader2, Check, MapPin,
} from "lucide-react";
import SurveyMap from "@/components/survey-map";
import { InfoTip } from "@/components/info-tip";
import { GeoPoint } from "@/lib/simulation/geometry";
import { SurveyPattern, buildPath } from "@/lib/simulation/patterns";
import { metric } from "@/lib/metrics";
import { formatKm } from "@/lib/utils";
import { Drone } from "@/lib/types";

const SAMPLE_SITES: { name: string; coords: GeoPoint[] }[] = [
  {
    name: "SF · Tech Campus",
    coords: [
      { lat: 37.7682, lng: -122.4432 },
      { lat: 37.7782, lng: -122.4432 },
      { lat: 37.7782, lng: -122.4262 },
      { lat: 37.7682, lng: -122.4262 },
    ],
  },
  {
    name: "NV · Solar Farm B-3",
    coords: [
      { lat: 36.9032, lng: -117.0152 },
      { lat: 36.9212, lng: -117.0152 },
      { lat: 36.9212, lng: -116.9892 },
      { lat: 36.9032, lng: -116.9892 },
    ],
  },
  {
    name: "NY · Harbor Terminal",
    coords: [
      { lat: 40.7002, lng: -74.0212 },
      { lat: 40.7142, lng: -74.0212 },
      { lat: 40.7142, lng: -74.0012 },
      { lat: 40.7002, lng: -74.0012 },
    ],
  },
];

export default function PlanClient({ drones }: { drones: Drone[] }) {
  const router = useRouter();
  const [area, setArea] = useState<GeoPoint[] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [pattern, setPattern] = useState<SurveyPattern>("crosshatch");
  const [altitude, setAltitude] = useState(80);
  const [speed, setSpeed] = useState(12);
  const [overlap, setOverlap] = useState(70);
  const [cadence, setCadence] = useState(1);
  const [swathFactor, setSwathFactor] = useState(2);
  const [name, setName] = useState("");
  const [siteName, setSiteName] = useState("Custom Site");
  const [droneId, setDroneId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!area || area.length < 3) return null;
    return buildPath(area, pattern, {
      altitudeM: altitude,
      speedMps: speed,
      overlapPercent: overlap,
      swathFactor,
    });
  }, [area, pattern, altitude, speed, overlap, swathFactor]);

  const loadSite = useCallback((site: (typeof SAMPLE_SITES)[number]) => {
    setName(`Survey ${site.name}`);
    setSiteName(site.name);
    setArea(site.coords);
  }, []);

  const onDraw = useCallback((polygon: GeoPoint[]) => {
    setArea(polygon);
  }, []);

  const clearAll = useCallback(() => {
    setArea(null);
    setName("");
  }, []);

  const submit = async () => {
    setError(null);
    if (!area || area.length < 3) {
      setError("Draw a survey area on the map (≥ 3 points).");
      return;
    }
    if (!name.trim()) {
      setError("Give the mission a name.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          site_name: siteName,
          pattern,
          area,
          drone_id: droneId || null,
          altitude_m: altitude,
          speed_mps: speed,
          overlap_percent: overlap,
          sensor_cadence_s: cadence,
          swath_factor: swathFactor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to plan mission");
      router.push(`/monitor?mission=${data.mission.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to plan mission");
    } finally {
      setSubmitting(false);
    }
  };

  const availableDrones = drones.filter((d) => d.status === "available");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Mission Planner</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Define a survey area — SkyGrid generates an optimized, battery-validated flight path.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg border border-gridline/60 bg-ink-800 hover:bg-ink-700 px-3 py-2 text-[13px] text-slate-300 transition-colors"
          >
            <Eraser className="w-4 h-4" /> Clear
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 text-[13px] transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {submitting ? "Planning…" : "Plan Mission"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gridline/40">
            <div className="panel-header">Survey Area</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawing(!drawing)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium border transition-colors ${
                  drawing
                    ? "bg-green-500/15 border-green-500/40 text-green-500"
                    : "border-gridline/60 bg-ink-800 text-slate-300 hover:bg-ink-700"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {drawing ? "Drawing… dbl-click to finish" : "Draw Area"}
              </button>
              <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500">
                {SAMPLE_SITES.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => loadSite(s)}
                    className="rounded-full border border-gridline/60 px-2.5 py-1 hover:border-green-500/40 hover:text-green-500 transition-colors"
                  >
                    {s.name.split("·")[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative flex-1 h-[480px]">
            <SurveyMap
              areaPolygon={area ?? undefined}
              flightPath={preview?.waypoints ?? []}
              drawing={drawing}
              onDrawPolygon={onDraw}
              fitOnDataKey="plan"
              className="rounded-none"
            />
          </div>
          <div className="px-4 py-2.5 border-t border-gridline/40 flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-green-500" />
              {area && area.length >= 3
                ? `Area locked (${area.length} vertices)`
                : drawing
                ? "Click map to add vertices · double-click to close polygon"
                : "Enable Draw Area, then click vertices on the map"}
            </span>
            {preview && (
              <>
                <span className="mono">{formatKm(preview.totalKm)} route</span>
                <span className="mono">{preview.passes} passes</span>
                <span className="mono">{preview.waypoints.length} waypoints</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="panel-header">Mission Details</div>
              <InfoTip
                title="Mission Details"
              >
                A mission groups one survey area, one aircraft, and one flight pattern into a single executable plan. Give it a recognizable name and site so the team can identify it on the monitor and in reports.
              </InfoTip>
            </div>
            <div className="flex items-center gap-2">
              <label className="block text-[12px] text-slate-400">Mission name</label>
              <InfoTip title="Mission Name">A short, recognizable label for the mission, e.g. “Q3 Solar Inspection”. It appears on the live monitor, in the overview table, and in the analytics report log.</InfoTip>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mission name (e.g. Q3 Solar Inspection)"
              className="w-full rounded-lg bg-ink-800 border border-gridline/60 px-3.5 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition"
            />
            <div className="flex items-center gap-2">
              <label className="block text-[12px] text-slate-400">Site name</label>
              <InfoTip title={metric.site_name.title}>{metric.site_name.body}</InfoTip>
            </div>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Site name"
              className="w-full rounded-lg bg-ink-800 border border-gridline/60 px-3.5 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition"
            />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-[12px] text-slate-400">Assign aircraft</label>
                <InfoTip title={metric.drone_id.title}>{metric.drone_id.body}</InfoTip>
              </div>
              <select
                value={droneId}
                onChange={(e) => setDroneId(e.target.value)}
                className="w-full rounded-lg bg-ink-800 border border-gridline/60 px-3.5 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition"
              >
                <option value="">Auto-assign at launch</option>
                {drones.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.status !== "available"}>
                    {d.name} — {d.model} ({Math.round(d.battery)}%)
                  </option>
                ))}
              </select>
              {availableDrones.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-400">
                  No aircraft available right now — mission will wait for an available unit.
                </p>
              )}
            </div>
          </div>

          <div className="panel p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="panel-header">Survey Pattern</div>
              <InfoTip
                title="Flight Patterns"
              >
                The route shape the drone flies over your survey area. Each pattern trades coverage detail against flight time and battery — pick the one that matches the job and terrain.
              </InfoTip>
            </div>
            {(
              [
                { id: "grid", label: "Grid", desc: "Single-direction parallel passes", icon: Grid3x3 },
                { id: "crosshatch", label: "Crosshatch", desc: "Dual-direction, max coverage", icon: Grid2x2Plus },
                { id: "perimeter", label: "Perimeter", desc: "Boundary trace for inspection", icon: RouteIcon },
              ] as const
            ).map((p) => (
              <div
                key={p.id}
                className={`relative rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                  pattern === p.id
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-gridline/60 bg-ink-800/50 hover:bg-ink-800"
                }`}
                onClick={() => setPattern(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPattern(p.id); } }}
              >
                <InfoTip
                  className="absolute top-2 right-2"
                  title={metric[`pattern_${p.id}` as keyof typeof metric].title}
                >
                  {metric[`pattern_${p.id}` as keyof typeof metric].body}
                </InfoTip>
                <div className="flex items-start gap-3">
                  <p.icon className={`w-4 h-4 mt-0.5 ${pattern === p.id ? "text-green-500" : "text-slate-500"}`} />
                  <span>
                    <span className="block text-[13px] font-medium">{p.label}</span>
                    <span className="block text-[11px] text-slate-500">{p.desc}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="panel-header">Flight Parameters</div>
              <InfoTip
                title="Flight Parameters"
              >
                These control how the drone flies and captures data. Higher altitude and swath cover more ground per pass; higher overlap and faster cadence capture more detail. The mission estimate on the right updates live as you adjust them.
              </InfoTip>
            </div>
            <Slider label="Altitude" value={altitude} unit=" m" min={20} max={120} step={5} onChange={setAltitude} info={<InfoTip title={metric.altitude.title}>{metric.altitude.body}</InfoTip>} />
            <Slider label="Cruise speed" value={speed} unit=" m/s" min={4} max={25} step={1} onChange={setSpeed} info={<InfoTip title={metric.speed.title}>{metric.speed.body}</InfoTip>} />
            <Slider label="Overlap" value={overlap} unit="%" min={0} max={95} step={5} onChange={setOverlap} info={<InfoTip title={metric.overlap.title}>{metric.overlap.body}</InfoTip>} />
            <Slider label="Sensor cadence" value={cadence} unit=" s" min={1} max={30} step={1} onChange={setCadence} info={<InfoTip title={metric.cadence.title}>{metric.cadence.body}</InfoTip>} />
            <Slider label="Swath factor" value={swathFactor} unit="×" min={1} max={6} step={0.5} onChange={setSwathFactor} info={<InfoTip title={metric.swath.title}>{metric.swath.body}</InfoTip>} />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
              {error}
            </div>
          )}

          {preview && (
            <div className="panel p-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Est. Duration</div>
                <div className="mono text-lg font-semibold text-green-500">
                  {Math.round((preview.totalKm * 1000) / speed / 60)}m
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Route Length</div>
                <div className="mono text-lg font-semibold text-green-500">{formatKm(preview.totalKm)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, value, unit, min, max, step, onChange, info,
}: {
  label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void; info?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-slate-400">{label}</label>
          {info}
        </div>
        <span className="mono text-[13px] text-green-500 tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-500"
      />
    </div>
  );
}