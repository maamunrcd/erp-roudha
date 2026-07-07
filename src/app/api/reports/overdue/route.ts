import { prisma } from "@/lib/prisma";
import { handleApiError, requireSession } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const rows = await prisma.paymentLedger.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        purpose: { in: ["INSTALLMENT", "DOWNPAYMENT"] },
        isFrozen: false,
      },
      include: {
        customer: {
          select: { trackingId: true, fullName: true, phone: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const now = Date.now();
    const withAging = rows.map((r) => {
      const days = r.dueDate ? Math.floor((now - r.dueDate.getTime()) / 86400000) : 0;
      const bucket = days <= 0 ? "current" : days <= 30 ? "30" : days <= 60 ? "60" : "90+";
      return { ...r, daysOverdue: Math.max(0, days), agingBucket: bucket };
    });

    return NextResponse.json(withAging);
  } catch (e) {
    return handleApiError(e);
  }
}
