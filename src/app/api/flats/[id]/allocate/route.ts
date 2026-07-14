import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { allocateFlat, unallocateFlat } from "@/lib/services/flat.service";
import { flatAllocateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = flatAllocateSchema.parse(await req.json());
    return NextResponse.json(
      await allocateFlat({
        flatId: id,
        customerId: body.customerId,
        shareIds: body.shareIds,
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
    return NextResponse.json(await unallocateFlat(id));
  } catch (e) {
    return handleApiError(e);
  }
}
