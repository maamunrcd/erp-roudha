import { handleApiError, requireSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const rows = await prisma.paymentLedger.findMany({
      where: { status: "PAID", paidAt: { not: null } },
      include: {
        customer: { select: { trackingId: true, fullName: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 500,
    });
    return NextResponse.json(rows);
  } catch (e) {
    return handleApiError(e);
  }
}
