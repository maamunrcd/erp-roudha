import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteLandValuation } from "@/lib/services/land-valuation.service";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteLandValuation(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
