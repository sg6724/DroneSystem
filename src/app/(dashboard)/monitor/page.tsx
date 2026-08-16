import { resolveOrgId, listMissions, listDrones } from "@/lib/repository";
import MonitorClient from "./monitor-client";

export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  const orgId = await resolveOrgId();
  const [missions, drones] = await Promise.all([listMissions(orgId), listDrones(orgId)]);
  return <MonitorClient missions={missions} drones={drones} />;
}