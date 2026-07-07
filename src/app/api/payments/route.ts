import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { paymentSchema } from "@/lib/validators/schemas";
import { registerPayment } from "@/lib/services/payment.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = paymentSchema.parse(await req.json());
    const result = await registerPayment({ ...body, userId: session.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
