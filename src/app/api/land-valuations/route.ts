import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import {
  createLandValuation,
  getLandValueGrowth,
  listLandValuations,
} from "@/lib/services/land-valuation.service";
import { landValuationSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    if (searchParams.get("growth") === "1" && projectId) {
      return NextResponse.json(await getLandValueGrowth(projectId));
    }
    return NextResponse.json(await listLandValuations(projectId));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = landValuationSchema.parse(await req.json());
    const row = await createLandValuation({
      ...body,
      recordedByUserId: session.user.id!,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
