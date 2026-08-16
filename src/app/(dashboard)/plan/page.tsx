import { resolveOrgId, listDrones } from "@/lib/repository";
import PlanClient from "./plan-client";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const orgId = await resolveOrgId();
  const drones = await listDrones(orgId);
  return <PlanClient drones={drones} />;
}