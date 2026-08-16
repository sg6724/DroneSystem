import { NextResponse } from "next/server";
import { resolveOrgId, listMissions } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await resolveOrgId();
  const missions = await listMissions(orgId);
  return NextResponse.json({ missions });
}