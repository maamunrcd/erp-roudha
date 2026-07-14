import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import {
  deleteSalesAgent,
  getSalesAgentById,
  updateSalesAgent,
} from "@/lib/services/sales-agent.service";
import { salesAgentUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    return NextResponse.json(await getSalesAgentById(id));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = salesAgentUpdateSchema.parse(await req.json());
    return NextResponse.json(await updateSalesAgent(id, body, session.user.id!));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteSalesAgent(id, session.user.id!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
