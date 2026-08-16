"use client";

import SurveyMap from "@/components/survey-map";
import { Drone } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  available: "#34d399",
  in_mission: "#22d3ee",
  charging: "#fbbf24",
  maintenance: "#f87171",
  offline: "#f87171",
};

export function FleetMap({ drones }: { drones: Drone[] }) {
  return (
    <SurveyMap
      fleetMarkers={drones.map((d) => ({
        id: d.id,
        lat: d.last_lat,
        lng: d.last_lng,
        color: STATUS_COLOR[d.status] ?? "#818cf8",
        label: d.name,
      }))}
      fitOnDataKey={drones.map((d) => d.id).join(",") || "fleet"}
      className="rounded-b-[14px]"
    />
  );
}
