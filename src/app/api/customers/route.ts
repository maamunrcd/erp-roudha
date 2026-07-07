import { prisma } from "@/lib/prisma";
import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { groupEnrollmentsByProfileProject, summarizeLedgers } from "@/lib/services/customer-summary.service";
import { effectiveInstallmentMonths } from "@/lib/utils/contract-terms";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const prefix = searchParams.get("prefix");
    const search = searchParams.get("search");

    const customers = await prisma.customer.findMany({
      where: {
        ...(prefix ? { trackingId: { startsWith: prefix } } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search } },
                { phone: { contains: search } },
                { nid: { contains: search } },
                { trackingId: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        project: { select: { prefix: true, name: true, installmentMonths: true } },
        profile: {
          select: {
            id: true,
            enrollments: { select: { id: true, projectId: true, trackingId: true, project: { select: { prefix: true, name: true } } } },
          },
        },
        contract: { select: { pricingMode: true, customInstallmentMonths: true } },
        shareAllocations: {
          where: { isActive: true },
          include: { share: { select: { id: true, shareNumber: true } } },
        },
        paymentLedgers: {
          where: { isFrozen: false },
          select: { purpose: true, status: true, installmentIndex: true, amountDue: true, amountPaid: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = customers.map((c) => {
      const downpayment = c.paymentLedgers.find((l) => l.purpose === "DOWNPAYMENT");
      const paidInstallments = c.paymentLedgers.filter(
        (l) => l.purpose === "INSTALLMENT" && l.status === "PAID",
      ).length;
      const financials = summarizeLedgers(c.paymentLedgers);
      const otherProjects = c.profile
        ? c.profile.enrollments
            .filter((e) => e.id !== c.id)
            .map((e) => ({ trackingId: e.trackingId, prefix: e.project.prefix, name: e.project.name }))
        : [];
      const allProjects = [
        { trackingId: c.trackingId, prefix: c.project.prefix, isCurrent: true },
        ...otherProjects.map((p) => ({ ...p, isCurrent: false })),
      ];
      return {
        ...c,
        shareCount: c.shareCount,
        downpaymentStatus: downpayment?.status ?? "PENDING",
        paidInstallments,
        totalInstallments: effectiveInstallmentMonths(c.contract, c.project.installmentMonths),
        ...financials,
        otherProjects,
        allProjects,
      };
    });

    return NextResponse.json(groupEnrollmentsByProfileProject(result));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = await req.json();
    const { enrollSchema } = await import("@/lib/validators/schemas");
    const { enrollCustomer } = await import("@/lib/services/customer-allocation.service");
    const input = enrollSchema.parse(body);
    const result = await enrollCustomer({
      ...input,
      contractStartDate: input.contractStartDate ? new Date(input.contractStartDate) : undefined,
      approvedByUserId: session.user.id,
    });

    if (input.paymentPlan === "FULL_UPFRONT") {
      const { settleFullPayment } = await import("@/lib/services/settlement.service");
      const { SettlementType } = await import("@prisma/client");
      await settleFullPayment({
        customerId: result.customer.id,
        amountPaid: result.totals.totalPrice,
        paymentMethod: "BANK_TRANSFER",
        settlementType: SettlementType.FULL_AT_ENROLLMENT,
        userId: session.user.id,
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
