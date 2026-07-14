import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import {
  deleteDeveloperAgreement,
  updateDeveloperAgreement,
} from "@/lib/services/developer-agreement.service";
import { developerAgreementUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = developerAgreementUpdateSchema.parse(await req.json());
    return NextResponse.json(await updateDeveloperAgreement(id, body));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteDeveloperAgreement(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
