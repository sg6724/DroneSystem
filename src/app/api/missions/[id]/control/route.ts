import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/repository";
import {
  startMission,
  pauseMission,
  resumeMission,
  abortMission,
  finalizeIfComplete,
} from "@/lib/mission-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let orgId: string;
  try {
    orgId = await resolveOrgId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  try {
    let mission;
    switch (body.action) {
      case "start":
        mission = await startMission(id, orgId);
        break;
      case "pause":
        mission = await pauseMission(id, orgId);
        break;
      case "resume":
        mission = await resumeMission(id, orgId);
        break;
      case "abort":
        mission = await abortMission(id, orgId);
        break;
      case "tick":
        mission = await finalizeIfComplete(id, orgId);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ mission });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json(
      { error: message },
      { status: message === "mission_not_found" ? 404 : 400 },
    );
  }
}