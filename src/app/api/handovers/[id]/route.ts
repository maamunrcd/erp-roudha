import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteHandover, upsertHandover } from "@/lib/services/handover.service";
import { handoverSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    await params; // id not used — handover is upserted by customerId
    const body = handoverSchema.parse(await req.json());
    return NextResponse.json(
      await upsertHandover({
        ...body,
        recordedByUserId: session.user.id!,
      }),
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteHandover(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
