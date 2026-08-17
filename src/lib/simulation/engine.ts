// ============================================================================
// engine.ts — deterministic, time-interpolated drone simulation (Option B).
//
// The drone's state is a PURE FUNCTION of (mission plan, control timeline, now).
// No background process, no tick loop. Any serverless function can recompute the
// exact same state at any time from the persisted row. Pause/resume reshape the
// timeline by inserting slack; abort freezes at the interrupted point.
// ============================================================================

import {
  Waypoint,
  pointAtDistanceWithCum,
  cumulativeDistances,
  slerp,
  haversine,
  pathDistance,
} from "./geometry";

export type MissionStatus =
  | "planned"
  | "starting"
  | "in_progress"
  | "paused"
  | "completed"
  | "aborted";

export interface MissionPlan {
  waypoints: Waypoint[];
  speedMps: number; // cruise speed (m/s)
  sensorCadenceS: number;
  overlapPercent: number;
  altitudeM: number;
}

export interface ControlTimeline {
  startAt: string | null; // absolute launch time
  pausedAt: string | null;
  totalPauseS: number; // accumulated pauses before current one
  endAt: string | null;
  abortedWaypointIx: number | null;
}

export interface SimInput {
  plan: MissionPlan;
  timeline: ControlTimeline;
  status: MissionStatus;
  batteryStart: number; // % at launch
  batteryDrainPerKm?: number; // default 1.8
  now?: number;
}

export interface DroneState {
  position: { lat: number; lng: number; alt: number };
  headingDeg: number;
  progressPct: number; // 0..100
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
  timeline: {
    activeS: number; // time actually flying (excludes pauses)
    wallS: number; // wall-clock since launch (includes pauses)
    paused: boolean;
  };
}

const PLANNED_ETA_INTO_FUTURE_S = 4; // "starting" phase simulates takeoff / ARM

function nowMs(now?: number): number {
  return now ?? Date.now();
}

/** Compute the full deterministic state of a mission at time `now`. */
export function simulateMission(input: SimInput): DroneState {
  const { plan, timeline, status, batteryStart } = input;
  const now = nowMs(input.now);
  const drainPerKm = input.batteryDrainPerKm ?? 1.8;

  const wps = plan.waypoints;
  const dist = cumulativeDistances(wps);
  const totalM = dist.total;
  const totalDurationS = totalM / plan.speedMps;
  const distanceTotalKm = totalM / 1000;

  const startMs = timeline.startAt ? new Date(timeline.startAt).getTime() : null;

  // ---- defensive early returns ---------------------------------------------
  if (!startMs || status === "planned") {
    return zeroState(input, 0, dist);
  }
  if (status === "aborted" || timeline.endAt) {
    const wp = timeline.abortedWaypointIx ?? 0;
    const w = wps[Math.min(wp, wps.length - 1)] ?? wps[0];
    const flown = wp > 0 ? dist.cum[wp] : 0;
    return frozen(input, w, flown, distanceTotalKm, totalDurationS, batteryStart, drainPerKm, undefined, undefined, dist);
  }
  if (status === "completed") {
    const last = wps[wps.length - 1];
    return frozen(input, last, totalM, distanceTotalKm, totalDurationS, batteryStart, drainPerKm, 100, undefined, dist);
  }

  // ---- flying time computation (pause-aware) -------------------------------
  const wallS = (now - startMs) / 1000;
  const paused = Boolean(timeline.pausedAt) && status === "paused";
  let activeS = wallS - timeline.totalPauseS;

  let snap = 0; // time-frozen offset when paused
  if (timeline.pausedAt && paused) {
    const pausedAtMs = new Date(timeline.pausedAt).getTime();
    snap = (pausedAtMs - startMs) / 1000 - timeline.totalPauseS;
    activeS = snap;
  }

  // ---- starting phase: brief pre-flight ------------------------------------
  // Once launched, the first `starting` seconds ramp the drone up to speed.
  const effActive = Math.max(0, activeS - PLANNED_ETA_INTO_FUTURE_S);

  // ---- clamp flyable time --------------------------------------------------
  if (effActive >= totalDurationS) {
    const last = wps[wps.length - 1];
    return frozen(
      input,
      last,
      totalM,
      distanceTotalKm,
      totalDurationS,
      batteryStart,
      drainPerKm,
      100,
      totalDurationS,
      dist,
    );
  }

  // ---- interpolate position + leg math --------------------------------------
  const flownM = Math.max(0, effActive) * plan.speedMps;
  const pos = pointAtDistanceWithCum(wps, flownM, dist);
  const { cum } = dist;

  let waypointIx = 0;
  for (let i = 1; i < wps.length; i++) if (flownM >= cum[i - 1]) waypointIx = i - 1;
  waypointIx = Math.max(0, waypointIx);
  const nextIX = Math.min(waypointIx + 1, wps.length - 1);

  let headingDeg = 0;
  if (nextIX > waypointIx || waypointIx + 1 < wps.length) {
    const a = wps[waypointIx];
    const b = wps[Math.min(waypointIx + 1, wps.length - 1)];
    headingDeg = bearingDeg(a, b);
  }

  const alt = lerp(
    wps[waypointIx].alt,
    wps[nextIX].alt,
    waypointIx === nextIX ? 1 : (flownM - cum[waypointIx]) / Math.max(1, cum[nextIX] - cum[waypointIx]),
  );

  const progressPct = Math.min(100, (flownM / totalM) * 100);
  const distanceFlownKm = flownM / 1000;
  const remainingS = Math.max(0, totalDurationS - effActive);
  const batteryPct = Math.max(
    0,
    Math.min(100, batteryStart - (distanceFlownKm * drainPerKm)),
  );
  const images = Math.max(0, Math.floor(effActive / plan.sensorCadenceS));

  return {
    position: { lat: pos.lat, lng: pos.lng, alt },
    headingDeg,
    progressPct,
    distanceFlownKm,
    distanceTotalKm,
    elapsedS: effActive,
    totalDurationS,
    remainingS,
    etaUtc: Date.now() + remainingS * 1000,
    batteryPct,
    waypointIx,
    nextWaypointIx: nextIX,
    speedMps: plan.speedMps,
    imagesCaptured: images,
    coveragePct: Math.min(100, progressPct),
    timeline: {
      activeS: effActive,
      wallS: wallS + (timeline.pausedAt && status === "paused" ? 0 : 0) - (snap > 0 ? 0 : snap),
      paused,
    },
  };
}

/** State when nothing is flying yet. */
function zeroState(input: SimInput, ix: number, dist?: { cum: number[]; total: number }): DroneState {
  const plan = input.plan;
  const first = plan.waypoints[ix] ?? plan.waypoints[0];
  const totalM = dist ? dist.total : cumulativeDistances(plan.waypoints).total;
  return {
    position: first ? { lat: first.lat, lng: first.lng, alt: 0 } : { lat: 0, lng: 0, alt: 0 },
    headingDeg: 0,
    progressPct: 0,
    distanceFlownKm: 0,
    distanceTotalKm: totalM / 1000,
    elapsedS: 0,
    totalDurationS: totalM / plan.speedMps,
    remainingS: totalM / plan.speedMps,
    batteryPct: input.batteryStart,
    waypointIx: ix,
    nextWaypointIx: Math.min(ix + 1, plan.waypoints.length - 1),
    speedMps: plan.speedMps,
    imagesCaptured: 0,
    coveragePct: 0,
    timeline: { activeS: 0, wallS: 0, paused: false },
  };
}

/** State at mission end (completed or aborted) — frozen snapshot. */
function frozen(
  input: SimInput,
  pos: Waypoint,
  flownM: number,
  totalKm: number,
  totalDurationS: number,
  batteryStart: number,
  drainPerKm: number,
  progress?: number,
  durationS = totalDurationS,
  dist?: { cum: number[]; total: number },
): DroneState {
  const totalM = dist ? dist.total : cumulativeDistances(input.plan.waypoints).total;
  const finalProgress = progress ?? (flownM > 0 ? Math.min(100, (flownM / totalM) * 100) : 0);
  const complete = finalProgress >= 100;
  const wps = input.plan.waypoints;
  const last = wps[wps.length - 1];
  const finalPos = complete ? last : pos;
  void finalPos;
  return {
    position: { lat: pos.lat, lng: pos.lng, alt: pos.alt },
    headingDeg: bearingDeg(wps[0], last),
    progressPct: finalProgress,
    distanceFlownKm: flownM / 1000,
    distanceTotalKm: totalKm,
    elapsedS: durationS,
    totalDurationS,
    remainingS: 0,
    batteryPct: Math.max(0, Math.min(100, batteryStart - (flownM / 1000) * drainPerKm)),
    waypointIx: input.plan.waypoints.length - 1,
    nextWaypointIx: input.plan.waypoints.length - 1,
    speedMps: input.plan.speedMps,
    imagesCaptured: complete ? maxImages(input, totalM) : Math.floor(durationS / input.plan.sensorCadenceS),
    coveragePct: finalProgress,
    timeline: { activeS: durationS, wallS: durationS, paused: false },
  };
}

function maxImages(input: SimInput, totalM?: number): number {
  const total = totalM ?? pathDistance(input.plan.waypoints);
  return Math.floor((total / input.plan.speedMps) / input.plan.sensorCadenceS);
}

/** Great-circle initial bearing (degrees, 0=north). */
export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const φ1 = a.lat * (Math.PI / 180);
  const φ2 = b.lat * (Math.PI / 180);
  const Δλ = (b.lng - a.lng) * (Math.PI / 180);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Control helpers — build the *next* timeline from a control action, keeping
// the simulation deterministic. Return the control flag set for persistence.
// ---------------------------------------------------------------------------

export function actionPause(status: MissionStatus, timeline: ControlTimeline): { status: MissionStatus; pausedAt: string | null; endAt: string | null } {
  if (status === "in_progress" || status === "starting") {
    return { status: "paused", pausedAt: new Date().toISOString(), endAt: null };
  }
  return { status, pausedAt: timeline.pausedAt, endAt: timeline.endAt };
}

export function actionResume(status: MissionStatus, timeline: ControlTimeline): { status: MissionStatus; pausedAt: string | null; totalPauseS: number } {
  if (status === "paused" && timeline.pausedAt) {
    const pauseMs = Date.now() - new Date(timeline.pausedAt).getTime();
    const total = Math.max(0, timeline.totalPauseS + pauseMs / 1000);
    return { status: "in_progress", pausedAt: null, totalPauseS: total };
  }
  return { status, pausedAt: timeline.pausedAt, totalPauseS: timeline.totalPauseS };
}

export function actionAbort(status: MissionStatus, timeline: ControlTimeline, state: DroneState): { status: MissionStatus; endAt: string; abortedWaypointIx: number } {
  return {
    status: "aborted",
    endAt: new Date().toISOString(),
    abortedWaypointIx: state.waypointIx,
  };
}

export function actionStart(): { status: MissionStatus; startAt: string; endAt: string | null } {
  return {
    status: "starting",
    startAt: new Date().toISOString(),
    endAt: null,
  };
}

export { pathDistance, slerp, haversine };