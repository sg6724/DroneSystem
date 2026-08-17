// ============================================================================
// repository.ts — data gateway. Production only: always uses Supabase REST
// with the authenticated user's session (or the service-role admin client for
// writes that bypass RLS). Server-only.
// ============================================================================

import "server-only";
import { Drone, Mission, MissionEvent, MissionSummary, OrgStats } from "./types";

const orgIdCache = new Map<string, { orgId: string; expiresAt: number }>();
const ORG_ID_CACHE_TTL_MS = 60_000;

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
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { data, error } = await sb.from("drones").select("*").eq("org_id", orgId).order("name");
  if (error) throw new Error(error.message);
  return (data as Drone[]) ?? [];
}

export async function getDrone(id: string, _orgId: string): Promise<Drone | null> {
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { data } = await sb.from("drones").select("*").eq("id", id).single();
  return (data as Drone | null) ?? null;
}

export async function updateDrone(id: string, patch: Partial<Drone>, _orgId: string): Promise<Drone | null> {
  const { getSupabaseAdminClient } = await import("./supabase/server");
  const sb = await getSupabaseAdminClient();
  const { data, error } = await sb.from("drones").update({
    ...patch,
    last_seen_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  cacheInvalidateOrg(_orgId);
  return (data as Drone) ?? null;
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
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { data, error } = await sb.from("missions").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as MissionRow[]).map(missionFromRow);
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

export async function getMission(id: string, _orgId: string): Promise<Mission | null> {
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { data, error } = await sb.from("missions").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ? missionFromRow(data) : null;
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
  cacheInvalidateOrg(orgId);
  return missionFromRow(data);
}

export async function saveMission(
  id: string,
  patch: Partial<Mission>,
  _orgId: string,
): Promise<Mission | null> {
  const { getSupabaseAdminClient } = await import("./supabase/server");
  const sb = await getSupabaseAdminClient();
  const { data, error } = await sb.from("missions").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  cacheInvalidateOrg(_orgId);
  return data ? missionFromRow(data) : null;
}

export async function deleteMission(id: string, _orgId: string): Promise<void> {
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { error } = await sb.from("missions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  cacheInvalidateOrg(_orgId);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function listEvents(missionId: string, _orgId: string): Promise<MissionEvent[]> {
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { data, error } = await sb.from("mission_events")
    .select("*").eq("mission_id", missionId).order("at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MissionEvent[] ?? []).map((e) => ({ ...e, event: e.event, at: e.at ?? new Date().toISOString() }));
}

export async function appendEvent(
  missionId: string,
  orgId: string,
  event: MissionEvent["event"],
  note?: string,
  waypoint_ix?: number | null,
): Promise<void> {
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { error } = await sb.from("mission_events").insert({
    org_id: orgId,
    mission_id: missionId,
    event,
    note: note ?? null,
    waypoint_ix: waypoint_ix ?? null,
  });
  if (error) throw new Error(error.message);
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

// ---------------------------------------------------------------------------
// Org resolution (server components + API routes)
// ---------------------------------------------------------------------------

/**
 * Resolve the authenticated user's organization id. Requires a valid Supabase
 * session (guaranteed for dashboard routes by proxy.ts); throws when there is
 * no authenticated user or no profile record, so callers never silently fall
 * back to a shared/demo tenant.
 */
export async function resolveOrgId(): Promise<string> {
  const { getSupabaseServerClient } = await import("./supabase/server");
  const sb = await getSupabaseServerClient();
  const { data: verifiedClaims } = await sb.auth.getClaims();
  const userId = typeof verifiedClaims?.claims.sub === "string" ? verifiedClaims.claims.sub : null;
  if (!userId) throw new Error("unauthorized");

  const cached = orgIdCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.orgId;

  const { data, error } = await sb.from("profiles").select("org_id").eq("id", userId).single();
  if (error) throw new Error(error.message);
  const orgId = data?.org_id as string;
  if (!orgId) throw new Error("unauthorized");

  orgIdCache.set(userId, { orgId, expiresAt: Date.now() + ORG_ID_CACHE_TTL_MS });
  return orgId;
}