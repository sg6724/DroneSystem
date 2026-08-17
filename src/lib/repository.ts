// ============================================================================
// repository.ts — data gateway. Uses Supabase REST when env keys are present,
// otherwise falls back to the in-memory demo store. Server-only.
// ============================================================================

import "server-only";
import { Drone, Mission, MissionEvent, MissionSummary, OrgStats } from "./types";
import { ORG_ID_DEMO, demoStore } from "./demo/demo-store";

const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const orgIdCache = new Map<string, { orgId: string; expiresAt: number }>();
const ORG_ID_CACHE_TTL_MS = 60_000;

// Demo-store artificial latency. Configurable so dev/demo stays snappy.
const DEMO_DELAY_MS = Number(process.env.DEMO_DELAY_MS ?? 0);

function delay<T>(v: T, ms = DEMO_DELAY_MS): Promise<T> {
  return ms > 0 ? new Promise((r) => setTimeout(() => r(v), ms)) : Promise.resolve(v);
}

// ---------------------------------------------------------------------------
// Short-TTL read cache (per server instance). Dashboard reads are memoized for
// a few seconds; every write invalidates the org's cached reads immediately.
// ---------------------------------------------------------------------------

const DATA_CACHE_TTL_MS = 3_000;
const DATA_STALE_TTL_MS = 120_000;
const dataCache = new Map<string, { value: unknown; expiresAt: number; staleAt: number }>();

function cacheGet<T>(key: string, allowStale = false): T | null {
  const hit = dataCache.get(key);
  if (!hit) return null;
  const now = Date.now();
  if (hit.staleAt <= now) {
    dataCache.delete(key);
    return null;
  }
  if (!allowStale && hit.expiresAt <= now) return null;
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs = DATA_CACHE_TTL_MS): void {
  const now = Date.now();
  dataCache.set(key, { value, expiresAt: now + ttlMs, staleAt: now + DATA_STALE_TTL_MS });
}

function cacheInvalidateOrg(orgId: string): void {
  const prefix = `${orgId}:`;
  for (const key of dataCache.keys()) {
    if (key.startsWith(prefix)) dataCache.delete(key);
  }
}

export type { Drone, Mission, MissionEvent, OrgStats };

type MissionRow = {
  id: string;
  org_id: string;
  name: string;
  site_name: string | null;
  drone_id: string | null;
  status: Mission["status"];
  pattern: Mission["pattern"];
  area_geojson: Mission["area_geojson"];
  waypoints: Mission["waypoints"];
  altitude_m: number;
  speed_mps: number;
  overlap_percent: number;
  sensor_cadence_s: number;
  planned_distance_km: number | null;
  planned_duration_s: number | null;
  area_ha: number | null;
  estimated_images: number | null;
  start_at: string | null;
  end_at: string | null;
  paused_at: string | null;
  total_pause_s: number;
  aborted_waypoint_ix: number | null;
  telemetry_snapshot: Record<string, unknown> | null;
  actual_distance_km: number | null;
  actual_duration_s: number | null;
  coverage_pct: number | null;
  images_captured: number | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Drones
// ---------------------------------------------------------------------------

export async function listDrones(orgId: string): Promise<Drone[]> {
  const key = `${orgId}:drones`;
  const cached = cacheGet<Drone[]>(key);
  if (cached) return cached;
  try {
    const result = await listDronesUncached(orgId);
    cacheSet(key, result);
    return result;
  } catch (error) {
    const stale = cacheGet<Drone[]>(key, true);
    if (stale) return stale;
    throw error;
  }
}

async function listDronesUncached(orgId: string): Promise<Drone[]> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data, error } = await sb.from("drones").select("*").eq("org_id", orgId).order("name");
    if (error) throw new Error(error.message);
    return (data as Drone[]) ?? [];
  }
  const store = demoStore();
  return await delay([...store.drones.values()]);
}

export async function getDrone(id: string, _orgId: string): Promise<Drone | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data } = await sb.from("drones").select("*").eq("id", id).single();
    return (data as Drone | null) ?? null;
  }
  return (await delay(demoStore().drones.get(id) ?? null)) as Drone | null;
}

export async function updateDrone(id: string, patch: Partial<Drone>, _orgId: string): Promise<Drone | null> {
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
  cacheInvalidateOrg(_orgId);
  return updated;
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

const missionFromRow = (row: MissionRow): Mission => ({
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
  const key = `${orgId}:missions`;
  const cached = cacheGet<Mission[]>(key);
  if (cached) return cached;
  try {
    const result = await listMissionsUncached(orgId);
    cacheSet(key, result);
    return result;
  } catch (error) {
    const stale = cacheGet<Mission[]>(key, true);
    if (stale) return stale;
    throw error;
  }
}

async function listMissionsUncached(orgId: string): Promise<Mission[]> {
  if (isSupabaseConfigured()) {
    const { getSupabaseServerClient } = await import("./supabase/server");
    const sb = await getSupabaseServerClient();
    const { data, error } = await sb.from("missions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MissionRow[]).map(missionFromRow);
  }
  const store = demoStore();
  return await delay([...store.missions.values()].sort((a, b) => (b.created_at > a.created_at ? 1 : -1)));
}

/**
 * Lightweight mission list for high-frequency polling (e.g. the live monitor).
 * Omits the heavy jsonb columns (waypoints, area_geojson, telemetry_snapshot)
 * and exposes a precomputed `waypoint_count` so the payload stays small even
 * with many missions.
 */
export async function listMissionSummaries(orgId: string): Promise<MissionSummary[]> {
  const key = `${orgId}:mission-summaries`;
  const cached = cacheGet<MissionSummary[]>(key);
  if (cached) return cached;
  if (isSupabaseConfigured()) {
    try {
      const { getSupabaseServerClient } = await import("./supabase/server");
      const sb = await getSupabaseServerClient();
      const { data, error } = await sb.from("mission_summaries").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const result = ((data ?? []) as MissionSummary[]).map((s) => ({
        ...s,
        waypoint_count: s.waypoint_count ?? 0,
      }));
      cacheSet(key, result);
      return result;
    } catch (error) {
      const stale = cacheGet<MissionSummary[]>(key, true);
      if (stale) return stale;
      throw error;
    }
  }
  const store = demoStore();
  const list = [...store.missions.values()].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  const result = await delay(list.map(missionToSummary));
  cacheSet(key, result);
  return result;
}

function missionToSummary(m: Mission): MissionSummary {
  return {
    id: m.id,
    org_id: m.org_id,
    name: m.name,
    site_name: m.site_name,
    drone_id: m.drone_id,
    status: m.status,
    pattern: m.pattern,
    altitude_m: m.altitude_m,
    speed_mps: m.speed_mps,
    overlap_percent: m.overlap_percent,
    sensor_cadence_s: m.sensor_cadence_s,
    planned_distance_km: m.planned_distance_km,
    planned_duration_s: m.planned_duration_s,
    area_ha: m.area_ha,
    estimated_images: m.estimated_images,
    start_at: m.start_at,
    end_at: m.end_at,
    paused_at: m.paused_at,
    total_pause_s: m.total_pause_s,
    aborted_waypoint_ix: m.aborted_waypoint_ix,
    actual_distance_km: m.actual_distance_km,
    actual_duration_s: m.actual_duration_s,
    coverage_pct: m.coverage_pct,
    images_captured: m.images_captured,
    created_at: m.created_at,
    waypoint_count: m.waypoints?.length ?? 0,
  };
}

export async function getMission(id: string, _orgId: string): Promise<Mission | null> {
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
  cacheInvalidateOrg(orgId);
  return mission;
}

export async function saveMission(
  id: string,
  patch: Partial<Mission>,
  _orgId: string,
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
  cacheInvalidateOrg(_orgId);
  return updated;
}

export async function deleteMission(id: string, _orgId: string): Promise<void> {
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
  cacheInvalidateOrg(_orgId);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function listEvents(missionId: string, _orgId: string): Promise<MissionEvent[]> {
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

export async function orgStats(orgId: string, loadedMissions?: Mission[]): Promise<OrgStats> {
  const missions = loadedMissions ?? await listMissions(orgId);
  const completed = missions.filter((m) => m.status === "completed");
  const aborted = missions.filter((m) => m.status === "aborted");
  const active = missions.filter((m) => m.status === "in_progress" || m.status === "starting" || m.status === "paused");

  const totalDistance = missions.reduce((s, m) => s + (m.actual_distance_km ?? m.planned_distance_km ?? 0), 0);
  const totalSeconds = missions.reduce((s, m) => s + (m.actual_duration_s ?? m.planned_duration_s ?? 0), 0);
  const totalImages = missions.reduce((s, m) => s + (m.images_captured ?? 0), 0);
  const coverage = completed.length
    ? completed.reduce((s, m) => s + (m.coverage_pct ?? 0), 0) / completed.length
    : 0;

  if (!loadedMissions) await delay(60);
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
    const { data: verifiedClaims } = await sb.auth.getClaims();
    const userId = typeof verifiedClaims?.claims.sub === "string" ? verifiedClaims.claims.sub : null;
    if (!userId) return ORG_ID_DEMO;

    const cached = orgIdCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.orgId;

    const { data } = await sb.from("profiles").select("org_id").eq("id", userId).single();
    const orgId = (data?.org_id as string) ?? ORG_ID_DEMO;
    orgIdCache.set(userId, { orgId, expiresAt: Date.now() + ORG_ID_CACHE_TTL_MS });
    return orgId;
  }
  return ORG_ID_DEMO;
}

export { isSupabaseConfigured, ORG_ID_DEMO };
