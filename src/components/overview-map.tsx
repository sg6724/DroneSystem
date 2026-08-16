"use client";

import { useEffect, useMemo, useState } from "react";
import SurveyMap from "@/components/survey-map";
import { Mission, Drone } from "@/lib/types";
import { GeoPoint } from "@/lib/simulation/geometry";

interface LiveTelemetry {
  missionId: string;
  position: GeoPoint & { heading?: number };
  progressPct: number;
}

export function OverviewMap({
  missions,
  drones,
  activeOnly,
}: {
  missions: Mission[];
  drones: Drone[];
  activeOnly?: boolean;
}) {
  const [telemetry, setTelemetry] = useState<LiveTelemetry[]>([]);

  const activeMissions = missions.filter(
    (m) => m.status === "in_progress" || m.status === "starting" || m.status === "paused",
  );

  // Poll live position of active missions every second.
  useEffect(() => {
    if (!activeMissions.length) {
      setTelemetry([]);
      return;
    }
    let stop = false;
    const tick = async () => {
      const results = await Promise.allSettled(
        activeMissions.map((m) =>
          fetch(`/api/missions/${m.id}/live`, { cache: "no-store" }).then((r) => r.json()),
        ),
      );
      if (stop) return;
      const next: LiveTelemetry[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.state?.position) {
          next.push({
            missionId: activeMissions[i].id,
            position: r.value.state.position,
            progressPct: r.value.state.progressPct,
          });
        }
      });
      setTelemetry(next);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [activeMissions.map((m) => m.id).join(",")]);

  const { areaPoints, allFlown } = useMemo(() => {
    let areaPoints: GeoPoint[] | undefined;
    let points: GeoPoint[] = [];
    for (const m of activeMissions) {
      if (m.area_geojson) {
        const coords = m.area_geojson.geometry.coordinates[0].map(([lng, lat]) => ({ lng, lat }));
        if (!areaPoints) areaPoints = coords;
      }
      points = points.concat(m.waypoints.map((w) => ({ lng: w.lng, lat: w.lat })));
    }
    if (!areaPoints && points.length) {
      const c = points[0];
      areaPoints = [{ lng: c.lng - 0.004, lat: c.lat - 0.003 }, { lng: c.lng + 0.004, lat: c.lat - 0.003 }, { lng: c.lng + 0.004, lat: c.lat + 0.003 }, { lng: c.lng - 0.004, lat: c.lat + 0.003 }];
    }
    return { areaPoints, allFlown: points };
  }, [activeMissions]);

  return (
    <SurveyMap
      areaPolygon={areaPoints}
      flightPath={allFlown}
      flownPath={telemetry.map((t) => t.position)}
      currentPosition={telemetry[0]?.position}
      droneMarker={{ label: activeMissions[0]?.name?.slice(0, 6), color: "#22d3ee" }}
      fitOnDataKey={activeMissions.map((m) => m.id).join(",") || "overview"}
      className="rounded-b-[14px]"
      fleetMarkers={drones.map((d) => ({
        id: d.id,
        lat: d.last_lat,
        lng: d.last_lng,
        color: d.status === "available" ? "#34d399" : d.status === "in_mission" ? "#22d3ee" : "#fbbf24",
        label: d.name,
      }))}
    />
  );
}