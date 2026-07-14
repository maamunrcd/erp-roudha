import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteCommission, updateCommissionStatus } from "@/lib/services/commission.service";
import { commissionStatusSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = commissionStatusSchema.parse(await req.json());
    return NextResponse.json(await updateCommissionStatus(id, body.status, session.user.id!));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteCommission(id, session.user.id!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
