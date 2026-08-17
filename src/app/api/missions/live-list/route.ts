import { NextResponse } from "next/server";
import { resolveOrgId, listMissionSummaries } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await resolveOrgId();
  const missions = await listMissionSummaries(orgId);
  return NextResponse.json({ missions });
}