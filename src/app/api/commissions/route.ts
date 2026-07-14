import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import {
  createCommission,
  getCommissionSummary,
  listCommissions,
} from "@/lib/services/commission.service";
import { commissionSchema } from "@/lib/validators/schemas";
import { CommissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("summary") === "1") {
      return NextResponse.json(await getCommissionSummary());
    }
    const status = searchParams.get("status") as CommissionStatus | null;
    const agentId = searchParams.get("agentId") ?? undefined;
    return NextResponse.json(
      await listCommissions({
        ...(status ? { status } : {}),
        agentId,
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
    const body = commissionSchema.parse(await req.json());
    const commission = await createCommission({
      ...body,
      userId: session.user.id!,
    });
    return NextResponse.json(commission, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
