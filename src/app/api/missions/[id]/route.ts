import { NextResponse } from "next/server";
import { resolveOrgId, getMission } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orgId = await resolveOrgId();
  const mission = await getMission(id, orgId);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }
  return NextResponse.json({ mission });
}