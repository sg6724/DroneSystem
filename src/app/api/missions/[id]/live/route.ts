import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/repository";
import { liveState } from "@/lib/mission-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orgId = await resolveOrgId();
  try {
    const { mission, state } = await liveState(id, orgId);
    return NextResponse.json({ mission, state });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message === "mission_not_found" ? "Mission not found" : e.message },
      { status: e.message === "mission_not_found" ? 404 : 500 },
    );
  }
}