import { Radio, Cpu, MapPin, BatteryCharging, Wrench, ZapOff } from "lucide-react";
import { listDrones, resolveOrgId } from "@/lib/repository";
import { Stat, Panel, StatusBadge, BatteryBar } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Drone } from "@/lib/types";
import { FleetMap } from "@/components/fleet-map";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const orgId = await resolveOrgId();
  const drones = await listDrones(orgId);

  const available = drones.filter((d) => d.status === "available");
  const inMission = drones.filter((d) => d.status === "in_mission");
  const charging = drones.filter((d) => d.status === "charging");
  const grounded = drones.filter((d) => d.status === "maintenance" || d.status === "offline");

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Aircraft" value={drones.length} icon={<Radio className="w-4 h-4" />} tone="cyan" sub="Fleet inventory" />
        <Stat label="Available" value={available.length} icon={<Cpu className="w-4 h-4" />} tone="emerald" sub="Ready for dispatch" />
        <Stat label="Deployed" value={inMission.length} icon={<MapPin className="w-4 h-4" />} tone="indigo" sub="In active missions" />
        <Stat label="Grounded" value={charging.length + grounded.length} icon={<BatteryCharging className="w-4 h-4" />} tone="amber" sub="Charging or in service" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Panel title="Fleet Position" className="lg:col-span-2" pad={false}>
          <div className="h-[420px]">
            <FleetMap drones={drones} />
          </div>
        </Panel>

        <div className="lg:col-span-3 space-y-3">
          {drones.map((d) => (
            <DroneCard key={d.id} drone={d} />
          ))}
          {drones.length === 0 && (
            <div className="panel p-10 text-center text-sm text-slate-500">
              No aircraft registered.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DroneCard({ drone }: { drone: Drone }) {
  const statusIcon =
    drone.status === "charging" ? <BatteryCharging className="w-3.5 h-3.5 text-amber-400" /> :
    drone.status === "maintenance" ? <Wrench className="w-3.5 h-3.5 text-red-400" /> :
    drone.status === "offline" ? <ZapOff className="w-3.5 h-3.5 text-red-400" /> :
    <MapPin className="w-3.5 h-3.5 text-green-500" />;

  return (
    <div className="panel p-4 flex items-center gap-4 hover:border-green-500/20 transition-colors">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/15 border border-gridline/60 flex items-center justify-center shrink-0">
        <Radio className="w-5 h-5 text-green-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-[14px]">{drone.name}</span>
          <span className="text-[11px] text-slate-500">{drone.model}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">{statusIcon}
            <span className="mono tabular-nums">
              {drone.last_lat.toFixed(4)}, {drone.last_lng.toFixed(4)}
            </span>
          </span>
          <span>·</span>
          <span>Last seen {timeAgo(drone.last_seen_at)}</span>
          <span>·</span>
          <span className="mono">RNG {drone.max_range_km} km</span>
        </div>
      </div>

      <div className="w-36">
        <BatteryBar battery={drone.battery} />
      </div>

      <StatusBadge status={drone.status} />
    </div>
  );
}