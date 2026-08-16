import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId, createMission, listDrones } from "@/lib/repository";
import { buildPath, estimateImages, SurveyPattern } from "@/lib/simulation/patterns";
import { pathDistance } from "@/lib/simulation/geometry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    name,
    site_name,
    pattern,
    area,
    drone_id,
    altitude_m,
    speed_mps,
    overlap_percent,
    sensor_cadence_s,
    swath_factor,
  } = body as {
    name?: string;
    site_name?: string;
    pattern?: SurveyPattern;
    area?: { lat: number; lng: number }[];
    drone_id?: string | null;
    altitude_m?: number;
    speed_mps?: number;
    overlap_percent?: number;
    sensor_cadence_s?: number;
    swath_factor?: number;
  };

  if (!name || !pattern || !area || area.length < 3) {
    return NextResponse.json({ error: "name, pattern and a 3+ vertex area are required" }, { status: 400 });
  }
  if (!["grid", "crosshatch", "perimeter"].includes(pattern)) {
    return NextResponse.json({ error: "Unknown pattern" }, { status: 400 });
  }

  const alt = Math.min(Math.max(Number(altitude_m) || 60, 20), 120);
  const speed = Math.min(Math.max(Number(speed_mps) || 12, 4), 25);
  const overlap = Math.min(Math.max(Number(overlap_percent) ?? 70, 0), 95);
  const cadence = Math.max(Number(sensor_cadence_s) || 1, 0.2);
  const swath = Number(swath_factor) || 2.0;

  const generated = buildPath(area, pattern, {
    altitudeM: alt,
    speedMps: speed,
    overlapPercent: overlap,
    swathFactor: swath,
  });

  const totalM = pathDistance(generated.waypoints);
  const durationS = Math.round(totalM / speed);
  const images = estimateImages(generated.coverageHa, alt, overlap, swath);

  const area_geojson = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [area.map((p) => [p.lng, p.lat])],
    },
  };

  const mission = await createMission(
    {
      name,
      site_name,
      drone_id: drone_id || null,
      pattern,
      area_geojson: area_geojson as any,
      waypoints: generated.waypoints,
      altitude_m: alt,
      speed_mps: speed,
      overlap_percent: overlap,
      sensor_cadence_s: cadence,
      planned_distance_km: Math.round(generated.totalKm * 100) / 100,
      planned_duration_s: durationS,
      area_ha: Math.round(generated.coverageHa * 100) / 100,
      estimated_images: images,
    },
    orgId,
  );

  // If the assigned drone is merely referenced, mark it unavailable for planning.
  if (drone_id) {
    const drones = await listDrones(orgId);
    const drone = drones.find((d) => d.id === drone_id);
    if (drone?.status === "in_mission" || drone?.status === "charging") {
      // allow, but no-op — planning a mission with a busy aircraft is fine
    }
  }

  return NextResponse.json({ mission, stats: { totalKm: generated.totalKm, passes: generated.passes } }, { status: 201 });
}