import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteLead, getLeadById, updateLead } from "@/lib/services/lead.service";
import { leadUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    return NextResponse.json(await getLeadById(id));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = leadUpdateSchema.parse(await req.json());
    const lead = await updateLead(id, body, session.user.id!);
    return NextResponse.json(lead);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteLead(id, session.user.id!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
