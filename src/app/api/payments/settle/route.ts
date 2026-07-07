import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { settleSchema } from "@/lib/validators/schemas";
import { settleFullPayment } from "@/lib/services/settlement.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = settleSchema.parse(await req.json());
    const result = await settleFullPayment({ ...body, userId: session.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
