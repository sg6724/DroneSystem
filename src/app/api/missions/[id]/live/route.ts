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
  } catch (e) {
    const message = e instanceof Error ? e.message : "live_state_error";
    return NextResponse.json(
      { error: message === "mission_not_found" ? "Mission not found" : message },
      { status: message === "mission_not_found" ? 404 : 500 },
    );
  }
}