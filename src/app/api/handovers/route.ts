import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { listHandovers, upsertHandover } from "@/lib/services/handover.service";
import { handoverSchema } from "@/lib/validators/schemas";
import { HandoverStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const status = searchParams.get("status") as HandoverStatus | null;
    return NextResponse.json(
      await listHandovers({
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
    const body = handoverSchema.parse(await req.json());
    const row = await upsertHandover({
      ...body,
      recordedByUserId: session.user.id!,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
