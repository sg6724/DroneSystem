import { SurveyPattern } from "@/lib/simulation/patterns";
import { MissionStatus } from "@/lib/simulation/engine";

export interface Drone {
  id: string;
  org_id: string;
  name: string;
  model: string;
  status: "available" | "in_mission" | "charging" | "maintenance" | "offline";
  battery: number;
  max_range_km: number;
  max_speed_mps: number;
  max_altitude_m: number;
  home_lat: number;
  home_lng: number;
  last_lat: number;
  last_lng: number;
  last_seen_at?: string | null;
  created_at: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Waypoint extends GeoPoint {
  alt: number;
  speed: number;
  index: number;
}

export interface Mission {
  id: string;
  org_id: string;
  name: string;
  site_name: string | null;
  drone_id: string | null;
  status: MissionStatus;
  pattern: SurveyPattern;
  area_geojson: { type: "Feature"; properties: Record<string, unknown>; geometry: { type: "Polygon"; coordinates: number[][][] } } | null;
  waypoints: Waypoint[];
  waypoint_count?: number;
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
}

export interface MissionEvent {
  id: string;
  org_id: string;
  mission_id: string;
  event: "planned" | "starting" | "in_progress" | "paused" | "resumed" | "waypoint_reached" | "completed" | "aborted";
  waypoint_ix: number | null;
  note: string | null;
  at: string;
}

/**
 * Lightweight mission projection used by high-frequency list polls. Omits the
 * heavy jsonb columns (waypoints, area_geojson, telemetry_snapshot).
 */
export interface MissionSummary {
  id: string;
  org_id: string;
  name: string;
  site_name: string | null;
  drone_id: string | null;
  status: MissionStatus;
  pattern: SurveyPattern;
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
  actual_distance_km: number | null;
  actual_duration_s: number | null;
  coverage_pct: number | null;
  images_captured: number | null;
  created_at: string;
  waypoint_count: number;
}

export interface OrgStats {
  totalMissions: number;
  completedMissions: number;
  abortedMissions: number;
  activeMissions: number;
  totalFlightHours: number;
  totalDistanceKm: number;
  totalImages: number;
  avgCoveragePct: number;
}

export interface MissionStats {
  distanceKm: number;
  durationS: number;
  coveragePct: number;
  images: number;
}

export type { SurveyPattern, MissionStatus };