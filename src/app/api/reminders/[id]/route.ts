import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteReminder, updateReminder } from "@/lib/services/reminder.service";
import { reminderUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = reminderUpdateSchema.parse(await req.json());
    const reminder = await updateReminder(id, body);
    return NextResponse.json(reminder);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteReminder(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
