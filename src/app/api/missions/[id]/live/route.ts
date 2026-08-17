import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId, listEvents } from "@/lib/repository";
import { liveState } from "@/lib/mission-service";
import { Mission } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orgId = await resolveOrgId();
  const includeEvents = new URL(req.url).searchParams.get("events") === "1";
  try {
    const { mission, state } = await liveState(id, orgId);
    const events = includeEvents ? await listEvents(id, orgId) : undefined;
    return NextResponse.json({ mission: toLightMission(mission), state, events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "live_state_error";
    return NextResponse.json(
      { error: message === "mission_not_found" ? "Mission not found" : message },
      { status: message === "mission_not_found" ? 404 : 500 },
    );
  }
}

/** Poll-safe projection: status/actuals/counts only, no waypoint geometry. */
function toLightMission(m: Mission) {
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
    actual_distance_km: m.actual_distance_km,
    actual_duration_s: m.actual_duration_s,
    coverage_pct: m.coverage_pct,
    images_captured: m.images_captured,
    aborted_waypoint_ix: m.aborted_waypoint_ix,
    start_at: m.start_at,
    end_at: m.end_at,
    paused_at: m.paused_at,
    created_at: m.created_at,
    waypoint_count: m.waypoints?.length ?? 0,
  };
}