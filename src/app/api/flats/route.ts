import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createFlat, listFlats } from "@/lib/services/flat.service";
import { flatSchema } from "@/lib/validators/schemas";
import { FlatStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const status = searchParams.get("status") as FlatStatus | null;
    return NextResponse.json(
      await listFlats({
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      }),
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = flatSchema.parse(await req.json());
    const row = await createFlat(body);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
