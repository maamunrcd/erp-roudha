import { handleApiError, requireSession } from "@/lib/api-utils";
import { transferSchema } from "@/lib/validators/schemas";
import { executeShareTransfer } from "@/lib/services/share-transfer.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = transferSchema.parse(await req.json());
    const result = await executeShareTransfer({ ...body, userId: session.user.id });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
