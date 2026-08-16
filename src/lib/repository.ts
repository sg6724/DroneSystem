// ============================================================================
// repository.ts — data gateway. Uses Supabase REST when env keys are present,
// otherwise falls back to the in-memory demo store. Server-only.
// ============================================================================

import "server-only";
import { Drone, Mission, MissionEvent, OrgStats } from "./types";
import { ORG_ID_DEMO, demoStore } from "./demo/demo-store";

const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function delay<T>(v: T, ms = 120): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

export type { Drone, Mission, MissionEvent, OrgStats };

// ---------------------------------------------------------------------------
// Drones
// ---------------------------------------------------------------------------

export async function listDrones(orgId: string): Promise<Drone[]> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data, error } = await sb.from("drones").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data as Drone[]) ?? [];
  }
  const store = demoStore();
  return await delay([...store.drones.values()]);
}

export async function getDrone(id: string, orgId: string): Promise<Drone | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data } = await sb.from("drones").select("*").eq("id", id).single();
    return (data as Drone | null) ?? null;
  }
  return (await delay(demoStore().drones.get(id) ?? null)) as Drone | null;
}

export async function updateDrone(id: string, patch: Partial<Drone>, orgId: string): Promise<Drone | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseAdminClient } = await import("./supabase/server");
    const sb = await getSupabaseAdminClient();
    const { data, error } = await sb.from("drones").update({
      ...patch,
      last_seen_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return (data as Drone) ?? null;
  }
  const store = demoStore();
  const existing = store.drones.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, last_seen_at: new Date().toISOString() };
  store.drones.set(id, updated);
  await delay(null);
  return updated;
}

export async function resetDronePosition(id: string, orgId: string): Promise<Drone | null> {
  const drone = await getDrone(id, orgId);
  if (!drone) return null;
  return updateDrone(id, { last_lat: drone.home_lat, last_lng: drone.home_lng, status: "available" }, orgId);
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

const missionFromRow = (row: any): Mission => ({
  id: row.id,
  org_id: row.org_id,
  name: row.name,
  site_name: row.site_name ?? null,
  drone_id: row.drone_id ?? null,
  status: row.status,
  pattern: row.pattern,
  area_geojson: row.area_geojson ?? null,
  waypoints: Array.isArray(row.waypoints) ? row.waypoints : [],
  altitude_m: row.altitude_m ?? 60,
  speed_mps: row.speed_mps ?? 12,
  overlap_percent: row.overlap_percent ?? 70,
  sensor_cadence_s: row.sensor_cadence_s ?? 1,
  planned_distance_km: row.planned_distance_km ?? null,
  planned_duration_s: row.planned_duration_s ?? null,
  area_ha: row.area_ha ?? null,
  estimated_images: row.estimated_images ?? null,
  start_at: row.start_at ?? null,
  end_at: row.end_at ?? null,
  paused_at: row.paused_at ?? null,
  total_pause_s: row.total_pause_s ?? 0,
  aborted_waypoint_ix: row.aborted_waypoint_ix ?? null,
  telemetry_snapshot: row.telemetry_snapshot ?? null,
  actual_distance_km: row.actual_distance_km ?? null,
  actual_duration_s: row.actual_duration_s ?? null,
  coverage_pct: row.coverage_pct ?? null,
  images_captured: row.images_captured ?? null,
  created_at: row.created_at ?? new Date().toISOString(),
});

export async function listMissions(orgId: string): Promise<Mission[]> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data, error } = await sb.from("missions").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as any[] ?? []).map(missionFromRow);
  }
  const store = demoStore();
  return await delay([...store.missions.values()].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)));
}

export async function getMission(id: string, orgId: string): Promise<Mission | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data, error } = await sb.from("missions").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return data ? missionFromRow(data) : null;
  }
  return (await delay(demoStore().missions.get(id) ?? null)) as Mission | null;
}

export async function createMission(input: {
  name: string;
  site_name?: string;
  drone_id?: string | null;
  pattern: Mission["pattern"];
  area_geojson: Mission["area_geojson"];
  waypoints: Mission["waypoints"];
  altitude_m: number;
  speed_mps: number;
  overlap_percent: number;
  sensor_cadence_s: number;
  planned_distance_km: number;
  planned_duration_s: number;
  area_ha: number;
  estimated_images: number;
}, orgId: string): Promise<Mission> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const row = {
      org_id: orgId,
      name: input.name,
      site_name: input.site_name ?? null,
      drone_id: input.drone_id ?? null,
      status: "planned",
      pattern: input.pattern,
      area_geojson: input.area_geojson,
      waypoints: input.waypoints,
      altitude_m: input.altitude_m,
      speed_mps: input.speed_mps,
      overlap_percent: input.overlap_percent,
      sensor_cadence_s: input.sensor_cadence_s,
      planned_distance_km: input.planned_distance_km,
      planned_duration_s: input.planned_duration_s,
      area_ha: input.area_ha,
      estimated_images: input.estimated_images,
    };
    const { data, error } = await sb.from("missions").insert(row).select().single();
    if (error) throw new Error(error.message);
    await appendEvent(data.id, orgId, "planned", "Mission planned and queued");
    return missionFromRow(data);
  }
  const store = demoStore();
  const id = crypto.randomUUID();
  const mission: Mission = {
    id,
    org_id: orgId,
    name: input.name,
    site_name: input.site_name ?? null,
    drone_id: input.drone_id ?? null,
    status: "planned",
    pattern: input.pattern,
    area_geojson: input.area_geojson,
    waypoints: input.waypoints,
    altitude_m: input.altitude_m,
    speed_mps: input.speed_mps,
    overlap_percent: input.overlap_percent,
    sensor_cadence_s: input.sensor_cadence_s,
    planned_distance_km: input.planned_distance_km,
    planned_duration_s: input.planned_duration_s,
    area_ha: input.area_ha,
    estimated_images: input.estimated_images,
    start_at: null,
    end_at: null,
    paused_at: null,
    total_pause_s: 0,
    aborted_waypoint_ix: null,
    telemetry_snapshot: null,
    actual_distance_km: null,
    actual_duration_s: null,
    coverage_pct: null,
    images_captured: null,
    created_at: new Date().toISOString(),
  };
  store.missions.set(id, mission);
  store.events.push({
    id: crypto.randomUUID(),
    org_id: orgId,
    mission_id: id,
    event: "planned",
    waypoint_ix: null,
    note: "Mission planned and queued",
    at: new Date().toISOString(),
  });
  await delay(null);
  return mission;
}

export async function saveMission(
  id: string,
  patch: Partial<Mission>,
  orgId: string,
): Promise<Mission | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseAdminClient } = await import("./supabase/server");
    const sb = await getSupabaseAdminClient();
    const { data, error } = await sb.from("missions").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data ? missionFromRow(data) : null;
  }
  const store = demoStore();
  const existing = store.missions.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  store.missions.set(id, updated);
  await delay(null);
  return updated;
}

export async function deleteMission(id: string, orgId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    await sb.from("missions").delete().eq("id", id);
    return;
  }
  const store = demoStore();
  store.missions.delete(id);
  store.events = store.events.filter((e) => e.mission_id !== id);
  await delay(null);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function listEvents(missionId: string, orgId: string): Promise<MissionEvent[]> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data, error } = await sb.from("mission_events")
      .select("*").eq("mission_id", missionId).order("at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as MissionEvent[] ?? []).map((e) => ({ ...e, event: e.event, at: e.at ?? new Date().toISOString() }));
  }
  const store = demoStore();
  return await delay(
    store.events
      .filter((e) => e.mission_id === missionId)
      .sort((a, b) => (a.at > b.at ? 1 : -1)),
  );
}

export async function appendEvent(
  missionId: string,
  orgId: string,
  event: MissionEvent["event"],
  note?: string,
  waypoint_ix?: number | null,
): Promise<void> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    await sb.from("mission_events").insert({
      org_id: orgId,
      mission_id: missionId,
      event,
      note: note ?? null,
      waypoint_ix: waypoint_ix ?? null,
    });
    return;
  }
  const store = demoStore();
  store.events.push({
    id: crypto.randomUUID(),
    org_id: orgId,
    mission_id: missionId,
    event,
    waypoint_ix: waypoint_ix ?? null,
    note: note ?? null,
    at: new Date().toISOString(),
  });
  await delay(null);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function orgStats(orgId: string): Promise<OrgStats> {
  const missions = await listMissions(orgId);
  const completed = missions.filter((m) => m.status === "completed");
  const aborted = missions.filter((m) => m.status === "aborted");
  const active = missions.filter((m) => m.status === "in_progress" || m.status === "starting" || m.status === "paused");

  const totalDistance = missions.reduce((s, m) => s + (m.actual_distance_km ?? m.planned_distance_km ?? 0), 0);
  const totalSeconds = missions.reduce((s, m) => s + (m.actual_duration_s ?? m.planned_duration_s ?? 0), 0);
  const totalImages = missions.reduce((s, m) => s + (m.images_captured ?? m.estimated_images ?? 0), 0);
  const coverage = completed.length
    ? completed.reduce((s, m) => s + (m.coverage_pct ?? 0), 0) / completed.length
    : 0;

  await delay(60);
  return {
    totalMissions: missions.length,
    completedMissions: completed.length,
    abortedMissions: aborted.length,
    activeMissions: active.length,
    totalFlightHours: totalSeconds / 3600,
    totalDistanceKm: totalDistance,
    totalImages,
    avgCoveragePct: Math.round(coverage),
  };
}

export async function resolveOrgId(): Promise<string> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return ORG_ID_DEMO;
    const { data } = await sb.from("profiles").select("org_id").eq("id", user.id).single();
    return (data?.org_id as string) ?? ORG_ID_DEMO;
  }
  return ORG_ID_DEMO;
}

export { isSupabaseConfigured, ORG_ID_DEMO };