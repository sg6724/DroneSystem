"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Play, Pause, OctagonX, Satellite, Gauge, Timer,
  BatteryFull, Wind, Waypoints, Zap, Cable,
} from "lucide-react";
import SurveyMap from "@/components/survey-map";
import { StatusBadge, ProgressBar } from "@/components/ui";
import { formatDuration, formatKm, timeAgo, statusLabel } from "@/lib/utils";
import { Mission, Drone, MissionEvent, MissionSummary } from "@/lib/types";
import type { GeoPoint } from "@/lib/simulation/geometry";

interface LiveState {
  position: { lat: number; lng: number; alt: number };
  headingDeg: number;
  progressPct: number;
  distanceFlownKm: number;
  distanceTotalKm: number;
  elapsedS: number;
  totalDurationS: number;
  remainingS: number;
  etaUtc?: number;
  batteryPct: number;
  waypointIx: number;
  nextWaypointIx: number;
  speedMps: number;
  imagesCaptured: number;
  coveragePct: number;
  timeline: { activeS: number; wallS: number; paused: boolean };
}

const STATUS_ORDER = ["starting", "in_progress", "paused", "resumed", "waypoint_reached", "completed", "aborted"];
void STATUS_ORDER;

export default function MonitorClient({
  missions: initialMissions,
  drones,
}: {
  missions: Mission[];
  drones: Drone[];
}) {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("mission");

  const [allMissions, setAllMissions] = useState<Mission[]>(initialMissions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialId ?? initialMissions.find((m) => m.status === "in_progress" || m.status === "starting")?.id ?? initialMissions[0]?.id ?? null,
  );
  const [telemetry, setTelemetry] = useState<Record<string, LiveState>>({});
  const [events, setEvents] = useState<Record<string, MissionEvent[]>>({});
  const [driving, setDriving] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const eventRef = useRef<HTMLDivElement>(null);
  const pollInFlight = useRef(false);

  const selected = allMissions.find((m) => m.id === selectedId) ?? null;
  const live = selected ? telemetry[selected.id] : null;

  // Refresh mission list periodically to reflect status changes & new missions.
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    const t = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/missions/live-list", { cache: "no-store" });
        if (res.ok && !stopped) {
          const data = await res.json();
          setAllMissions((prev) => mergeSummaries(prev, data.missions));
        }
      } finally {
        inFlight = false;
      }
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);

  // When the selected mission only has a summary (no waypoints), fetch the
  // full record once so the map can render the flight path.
  useEffect(() => {
    if (!selectedId) return;
    const m = allMissions.find((x) => x.id === selectedId);
    if (m && m.waypoint_count && !m.waypoints?.length) {
      let cancelled = false;
      fetch(`/api/missions/${selectedId}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d.mission && !cancelled) {
            setAllMissions((prev) => prev.map((x) => (x.id === selectedId ? { ...x, ...d.mission } : x)));
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Poll live telemetry for all active/in-progress (and selected) missions every second.
  const missionKeys = allMissions.map((m) => m.id).join(",");

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      if (pollInFlight.current) return; // never stack overlapping polls
      pollInFlight.current = true;
      try {
        const targets = allMissions
          .filter((m) => ["starting", "in_progress", "paused"].includes(m.status) || m.id === selectedId)
          .map((m) => m.id);
        if (!targets.length) {
          if (!stop) {
            setTelemetry({});
            setEvents({});
          }
          return;
        }
        const results = await Promise.allSettled(
          targets.map((id) => {
            const url = id === selectedId ? `/api/missions/${id}/live?events=1` : `/api/missions/${id}/live`;
            return fetch(url, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
          }),
        );
        if (stop) return;
        const nextT: Record<string, LiveState> = {};
        const nextE: Record<string, MissionEvent[]> = {};
        results.forEach((r, i) => {
          const id = targets[i];
          if (r.status === "fulfilled" && r.value?.state) {
            nextT[id] = r.value.state;
          }
          if (r.status === "fulfilled" && r.value?.mission) {
            // update mission in the list (status, actuals) without clobbering
            // geometry already held locally
            setAllMissions((prev) => {
              const idx = prev.findIndex((x) => x.id === id);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], ...r.value.mission };
              return next;
            });
          }
          const em = (r.status === "fulfilled" && r.value?.events) || [];
          if (em.length) nextE[id] = em;
        });
        setTelemetry((prev) => ({ ...prev, ...nextT }));
        setEvents((prev) => ({ ...prev, ...nextE }));
      } finally {
        pollInFlight.current = false;
      }
    };
    poll();
    const t = setInterval(poll, 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionKeys, selectedId]);

  // auto-scroll event feed
  useEffect(() => {
    eventRef.current?.scrollTo({ top: eventRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  const action = useCallback(async (actionName: string) => {
    if (!selected) return;
    setDriving((p) => ({ ...p, [selected.id]: true }));
    const res = await fetch(`/api/missions/${selected.id}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    const data = await res.json();
    setDriving((p) => ({ ...p, [selected.id]: false }));
    if (!res.ok) {
      setNotice(data.error ?? "Action failed");
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    // refresh the selected mission
    const liveRes = await fetch(`/api/missions/${selected.id}/live`, { cache: "no-store" });
    const liveData = await liveRes.json();
    if (liveData.mission) {
      setAllMissions((prev) => prev.map((m) => (m.id === selected.id ? { ...m, ...liveData.mission } : m)));
      setEvents((prev) => ({ ...prev, [selected.id]: liveData.events ?? prev[selected.id] }));
    }
  }, [selected]);

  const selectedEvents = selected ? events[selected.id] ?? [] : [];

  const positionNow: { lat: number; lng: number; heading?: number } | undefined = live
    ? { lat: live.position.lat, lng: live.position.lng, heading: live.headingDeg }
    : selected?.waypoints?.[0]
    ? { lat: selected.waypoints[0].lat, lng: selected.waypoints[0].lng }
    : undefined;

  // plan-of-record for the selected mission
  const planPath = selected?.waypoints ?? [];
  const flownTo = live && live.distanceFlownKm > 0
    ? interpolateFlown(planPath, live.distanceFlownKm * 1000)
    : [];

  const activeCount = allMissions.filter((m) => ["starting", "in_progress"].includes(m.status)).length;

  return (
    <div className="p-6 space-y-5">
      {/* header strip */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[12px] font-semibold text-green-500">
            <span className="dot bg-green-400 live-pulse" />
            {activeCount} ACTIVE
          </div>
          <span className="text-sm text-slate-500">
            {allMissions.filter((m) => m.status === "planned").length} queued ·{" "}
            {allMissions.filter((m) => m.status === "completed").length} completed
          </span>
        </div>
        <div className="flex items-center gap-2">
          {notice && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-300">
              {notice}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* mission list */}
        <div className="panel overflow-hidden xl:col-span-1 flex flex-col max-h-[640px]">
          <div className="px-4 py-3 border-b border-gridline/40 panel-header">Missions</div>
          <div className="overflow-y-auto flex-1">
            {allMissions.map((m) => {
              const active = m.id === selectedId;
              const st = telemetry[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gridline/40 transition-colors ${
                    active ? "bg-green-500/[0.07] border-l-2 border-l-green-400" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium truncate">{m.name}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Waypoints className="w-3 h-3" />
                      {m.waypoints?.length ?? m.waypoint_count ?? 0} wps
                    </span>
                    <span className="mono">
                      {st ? Math.round(st.progressPct) : m.coverage_pct ?? 0}%
                    </span>
                  </div>
                  {st && (
                    <ProgressBar value={st.progressPct} className="mt-2" />
                  )}
                  {!st && m.coverage_pct !== null && (
                    <ProgressBar value={m.coverage_pct ?? 0} tone={m.status === "aborted" ? "red" : "emerald"} className="mt-2" />
                  )}
                </button>
              );
            })}
            {allMissions.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px] text-slate-500">
                No missions. Plan one first.
              </div>
            )}
          </div>
        </div>

        {/* main col */}
        <div className="xl:col-span-3 space-y-5">
          {selected ? (
            <>
              {/* map */}
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gridline/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-700/20 border border-gridline/60 flex items-center justify-center">
                      <Satellite className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold leading-tight">{selected.name}</div>
                      <div className="text-[11px] text-slate-500">{selected.site_name ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {selected.pattern && (
                      <span className="badge border border-green-500/25 bg-green-500/10 text-green-500 capitalize">
                        {selected.pattern}
                      </span>
                    )}
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <div className="h-[430px] relative">
                  <SurveyMap
                    areaPolygon={areaPointsFrom(selected)}
                    flightPath={planPath}
                    flownPath={flownTo}
                    currentPosition={positionNow}
                    droneMarker={{
                      label: selectedId ? selected.name.slice(0, 8) : undefined,
                      color: selected.status === "aborted" ? "#f87171" : selected.status === "paused" ? "#eab308" : "#22c55e",
                    }}
                    fitOnDataKey={selectedId ?? undefined}
                    className="rounded-none"
                  />
                  {/* status banner */}
                  <div className="absolute top-3 left-3 z-10 panel px-3 py-2 flex items-center gap-2 text-[12px]">
                    <span className={`dot ${selected.status === "in_progress" || selected.status === "starting" ? "bg-green-400 live-pulse" : selected.status === "paused" ? "bg-amber-400" : selected.status === "completed" ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span className="font-medium capitalize">{statusLabel(selected.status)}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">WP {selected.waypoints?.length ? (live ? live.nextWaypointIx + 1 : 1) : 0}/{selected.waypoints?.length ?? selected.waypoint_count ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* telemetry + controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* controls */}
                <div className="panel p-4">
                  <div className="panel-header mb-3">Mission Control</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {["planned", "completed", "aborted"].includes(selected.status) ? (
                      <button
                        disabled={selected.status === "aborted" || selected.status === "completed"}
                        onClick={() => action("start")}
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-3 text-[13px] col-span-2 transition-colors"
                      >
                        <Play className="w-4 h-4" /> Launch Mission
                      </button>
                    ) : selected.status === "paused" ? (
                      <button
                        onClick={() => action("resume")}
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-[13px] col-span-2 transition-colors"
                      >
                        <Play className="w-4 h-4" /> Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => action("pause")}
                        className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 font-semibold py-3 text-[13px] col-span-2 transition-colors"
                      >
                        <Pause className="w-4 h-4" /> Pause
                      </button>
                    )}

                    {["in_progress", "starting", "paused"].includes(selected.status) && (
                      <button
                        onClick={() => action("abort")}
                        disabled={driving[selected.id] ?? false}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 font-semibold py-3 text-[13px] col-span-2 transition-colors disabled:opacity-50"
                      >
                        <OctagonX className="w-4 h-4" /> Abort Mission
                      </button>
                    )}

                    {selected.status === "completed" && (
                      <div className="col-span-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-center text-[13px] text-emerald-300">
                        Survey complete — <span className="mono">{selected.images_captured ?? "—"}</span> frames captured
                      </div>
                    )}
                    {selected.status === "aborted" && (
                      <div className="col-span-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-3 text-center text-[13px] text-red-300">
                        Mission aborted at WP {(selected.aborted_waypoint_ix ?? 0) + 1}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gridline/40 pt-4">
                    <MetricRow icon={Timer} label="Progress" value={`${live ? Math.round(live.progressPct) : selected.coverage_pct ?? 0}%`} />
                    <MetricRow icon={Timer} label="ETR" value={live ? formatDuration(live.remainingS) : formatDuration(selected.planned_duration_s ?? 0)} />
                    <MetricRow icon={Gauge} label="Distance" value={formatKm(live?.distanceFlownKm ?? selected.actual_distance_km ?? selected.planned_distance_km, 2)} />
                    <MetricRow icon={BatteryFull} label="Battery" value={`${Math.round(live?.batteryPct ?? droneBattery(selected, drones))}%`} />
                    <MetricRow icon={Wind} label="Altitude" value={live ? `${live.position.alt.toFixed(0)} m` : `${selected.altitude_m} m`} />
                    <MetricRow icon={Zap} label="Speed" value={live ? `${live.speedMps.toFixed(1)} m/s` : `${selected.speed_mps} m/s`} />
                    <MetricRow icon={Cable} label="Images" value={(live?.imagesCaptured ?? selected.images_captured ?? 0).toString()} />
                  </div>
                </div>

                {/* event feed */}
                <div className="panel lg:col-span-2 flex flex-col min-h-[340px]">
                  <div className="px-4 py-3 border-b border-gridline/40 panel-header flex items-center justify-between">
                    <span>Mission Timeline</span>
                    <span className="text-[10px] font-normal lowercase text-slate-500">live updates</span>
                  </div>
                  <div ref={eventRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                    <TimelineRow key="created" at={selected.created_at} label="Mission created" kind="planned" />
                    {selectedEvents.map((ev, i) => (
                      <TimelineRow key={i} at={ev.at} label={eventLabel(ev)} kind={ev.event} />
                    ))}
                    {selected.status === "in_progress" && (
                      <TimelineRow at={new Date().toISOString()} label="Telemetry streaming" kind="waypoint_reached" live />
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel p-16 text-center text-slate-500">
              <div className="text-2xl">🛰️</div>
              <p className="mt-3 text-sm">Select a mission from the list to open live monitoring.</p>
              <p className="mt-1 text-[12px] text-slate-600">Plan a mission on the Planner page to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Merge a light summary list (from /api/missions/live-list) into the full
 * mission list held in state. Missing keys on summaries (e.g. waypoints) are
 * preserved from existing full records, so geometry is never dropped.
 */
function mergeSummaries(prev: Mission[], summaries: MissionSummary[]): Mission[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const s of summaries) {
    const existing = map.get(s.id);
    map.set(s.id, existing ? { ...existing, ...s } : (s as unknown as Mission));
  }
  return [...map.values()].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

function MetricRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="flex items-center gap-2 text-slate-400">
        <Icon className="w-3.5 h-3.5 text-slate-500" /> {label}
      </span>
      <span className="mono text-slate-200 tabular-nums">{value}</span>
    </div>
  );
}

function TimelineRow({ at, label, kind, live }: { at: string; label: string; kind: string; live?: boolean }) {
  const colors: Record<string, string> = {
    planned: "bg-slate-400",
starting: "bg-green-400",
    in_progress: "bg-green-400",
    resumed: "bg-green-400",
    waypoint_reached: "bg-green-400",
    completed: "bg-emerald-400",
    aborted: "bg-red-400",
  };
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1.5 flex flex-col items-center">
        <span className={`w-2 h-2 rounded-full ${colors[kind] ?? "bg-slate-500"} ${live ? "live-pulse" : ""}`} />
        <span className="w-px h-5 bg-gridline/60" />
      </div>
      <div className="flex-1 pb-2 text-[12px]">
        <div className="font-medium text-slate-300">{label}</div>
        <div className="text-[11px] text-slate-500">{live ? "now" : timeAgo(at)}</div>
      </div>
    </div>
  );
}

function eventLabel(ev: MissionEvent): string {
  const map: Record<string, string> = {
    starting: "Drone launching to survey altitude",
    in_progress: "Mission in progress — streaming telemetry",
    paused: "Mission paused by operator",
    resumed: "Mission resumed by operator",
    waypoint_reached: `Reached waypoint ${(ev.waypoint_ix ?? 0) + 1}`,
    completed: "Mission completed — survey data collected",
    aborted: ev.note ?? "Mission aborted by operator",
  };
  return map[ev.event] ?? ev.event;
}

function areaPointsFrom(m: Mission): GeoPoint[] | undefined {
  if (!m.area_geojson) return undefined;
  try {
    return m.area_geojson.geometry.coordinates[0].map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return undefined;
  }
}

function droneBattery(mission: Mission, drones: Drone[]): number {
  return drones.find((d) => d.id === mission.drone_id)?.battery ?? 100;
}

/** Approximate flown portion of the path given the flown distance. */
function interpolateFlown(waypoints: GeoPoint[], flownM: number): GeoPoint[] {
  if (!waypoints.length || flownM <= 0) return [];
  // cheap planar accumulation for display
  const out: GeoPoint[] = [waypoints[0]];
  let acc = 0;
  const mPerDegLat = 111320;
  const cLat = waypoints[0].lat;
  const mPerDegLng = 111320 * Math.cos((cLat * Math.PI) / 180);
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const seg = Math.hypot((b.lat - a.lat) * mPerDegLat, (b.lng - a.lng) * mPerDegLng);
    if (acc + seg <= flownM) {
      out.push(b);
      acc += seg;
    } else {
      const t = (flownM - acc) / Math.max(1, seg);
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
      break;
    }
  }
  return out;
}