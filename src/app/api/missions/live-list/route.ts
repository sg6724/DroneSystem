import { NextResponse } from "next/server";
import { resolveOrgId, listMissionSummaries } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orgId = await resolveOrgId();
    const missions = await listMissionSummaries(orgId);
    return NextResponse.json({ missions });
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const detail = error instanceof Error ? error.message : "live_list_error";
    return NextResponse.json(
      { error: "Live data is temporarily unavailable", detail },
      { status: 503, headers: { "Retry-After": "8", "Cache-Control": "no-store" } },
    );
  }
}
