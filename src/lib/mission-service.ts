// ============================================================================
// mission-service.ts — orchestration layer between the repository and the
// deterministic simulation engine. Encapsulates start/pause/resume/abort and
// live-state retrieval so route handlers stay thin.
// ============================================================================

import "server-only";
import {
  Mission, Drone,
} from "./types";
import {
  simulateMission, actionStart, actionPause, actionResume, actionAbort,
  MissionPlan, ControlTimeline, DroneState,
} from "./simulation/engine";
import {
  getMission, saveMission, appendEvent, updateDrone,
  Mission as RepoMission,
} from "./repository";

const BATTERY_DRAIN_PER_KM = 1.8;

function toPlan(mission: RepoMission): MissionPlan {
  return {
    waypoints: mission.waypoints,
    speedMps: mission.speed_mps,
    sensorCadenceS: mission.sensor_cadence_s,
    overlapPercent: mission.overlap_percent,
    altitudeM: mission.altitude_m,
  };
}

function toTimeline(mission: RepoMission): ControlTimeline {
  return {
    startAt: mission.start_at,
    pausedAt: mission.paused_at,
    totalPauseS: mission.total_pause_s,
    endAt: mission.end_at,
    abortedWaypointIx: mission.aborted_waypoint_ix,
  };
}

/** Compute the live state of a mission right now (idempotent, pure). */
export async function liveState(missionId: string, orgId: string, batteryStart = 100): Promise<{ mission: RepoMission; state: DroneState | null }> {
  const mission = await getMission(missionId, orgId);
  if (!mission) throw new Error("mission_not_found");

  const state = simulateMission({
    plan: toPlan(mission),
    timeline: toTimeline(mission),
    status: mission.status,
    batteryStart,
  });

  return { mission, state };
}

/** Transition: launch a queued mission. */
export async function startMission(missionId: string, orgId: string): Promise<RepoMission> {
  const mission = await getMission(missionId, orgId);
  if (!mission) throw new Error("mission_not_found");
  if (!["planned"].includes(mission.status)) throw new Error("invalid_state");

  const timeline = toTimeline(mission);
  const next = actionStart(timeline);

  const updated = await saveMission(
    missionId,
    { status: next.status, start_at: next.startAt, end_at: null, paused_at: null, total_pause_s: 0, aborted_waypoint_ix: null },
    orgId,
  );

  // Mark the assigned drone in-mission.
  if (mission.drone_id) {
    await updateDrone(mission.drone_id, { status: "in_mission" }, orgId);
  }

  await appendEvent(missionId, orgId, "starting", "Mission launching");
  return updated!;
}

/** Control: pause a running mission. */
export async function pauseMission(missionId: string, orgId: string): Promise<RepoMission> {
  const mission = await getMission(missionId, orgId);
  if (!mission) throw new Error("mission_not_found");

  const timeline = toTimeline(mission);
  const next = actionPause(mission.status, timeline);
  const updated = await saveMission(missionId, next as Partial<RepoMission>, orgId);
  if (next.status === "paused") await appendEvent(missionId, orgId, "paused", "Operator paused mission");
  return updated!;
}

/** Control: resume a paused mission. */
export async function resumeMission(missionId: string, orgId: string): Promise<RepoMission> {
  const mission = await getMission(missionId, orgId);
  if (!mission) throw new Error("mission_not_found");

  const timeline = toTimeline(mission);
  const next = actionResume(mission.status, timeline, toPlan(mission));
  const updated = await saveMission(missionId, next as Partial<RepoMission>, orgId);
  if (next.status === "in_progress") await appendEvent(missionId, orgId, "resumed", "Operator resumed mission");
  return updated!;
}

/** Control: abort a mission at its current position. */
export async function abortMission(missionId: string, orgId: string): Promise<RepoMission> {
  const mission = await getMission(missionId, orgId);
  if (!mission) throw new Error("mission_not_found");

  const timeline = toTimeline(mission);
  const state = simulateMission({
    plan: toPlan(mission),
    timeline,
    status: mission.status,
    batteryStart: 100, // overwritten by snapshot below
  });
  const now = new Date().toISOString();
  const next = actionAbort(mission.status, timeline, state);

  const updated = await saveMission(
    missionId,
    {
      status: next.status,
      end_at: next.endAt,
      aborted_waypoint_ix: next.abortedWaypointIx,
      telemetry_snapshot: { position: state.position, progressPct: state.progressPct, distanceFlownKm: state.distanceFlownKm },
      actual_distance_km: state.distanceFlownKm,
      actual_duration_s: Math.round(state.elapsedS),
      coverage_pct: Math.round(state.coveragePct * 10) / 10,
      images_captured: state.imagesCaptured,
    },
    orgId,
  );

  if (mission.drone_id) {
    await updateDrone(mission.drone_id, { status: "available", last_lat: state.position.lat, last_lng: state.position.lng }, orgId);
  }
  await appendEvent(missionId, orgId, "aborted", `Aborted at waypoint ${next.abortedWaypointIx + 1}`, next.abortedWaypointIx);
  void now;
  return updated!;
}

/** Evaluate => persist final stats when a mission completes without an operator. */
export async function finalizeIfComplete(missionId: string, orgId: string, batteryStart = 100): Promise<RepoMission | null> {
  const mission = await getMission(missionId, orgId);
  if (!mission) return null;
  if (mission.status !== "in_progress" && mission.status !== "starting") return mission;

  const plan = toPlan(mission);
  const timeline = toTimeline(mission);
  const state = simulateMission({ plan, timeline, status: mission.status, batteryStart });

  if (state.progressPct >= 100) {
    const updated = await saveMission(
      missionId,
      {
        status: "completed",
        end_at: new Date().toISOString(),
        telemetry_snapshot: { position: state.position, progressPct: 100 },
        actual_distance_km: state.distanceTotalKm,
        actual_duration_s: Math.round(state.totalDurationS),
        coverage_pct: 100,
        images_captured: state.imagesCaptured,
      },
      orgId,
    );
    await appendEvent(missionId, orgId, "completed", "Mission completed — survey data collected");
    if (mission.drone_id) {
      const drone = await getDroneForUpdate(mission.drone_id, orgId);
      await updateDrone(mission.drone_id, { status: "available", last_lat: state.position.lat, last_lng: state.position.lng, battery: drone ? Math.round(state.batteryPct) : 80 }, orgId);
    }
    return updated;
  }
  return mission;
}

async function getDroneForUpdate(id: string, orgId: string): Promise<Drone | null> {
  const { getDrone } = await import("./repository");
  return getDrone(id, orgId);
}

export { BATTERY_DRAIN_PER_KM };