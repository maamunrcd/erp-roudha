import { prisma, HEAVY_TX_OPTIONS } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit.service";
import { generateReceipt } from "@/lib/services/payment.service";
import { ApiError } from "@/lib/api-utils";
import {
  CustomerStatus,
  PaymentPurpose,
  PaymentStatus,
  SettlementStatus,
  SettlementType,
  type PaymentMethod,
} from "@prisma/client";

export interface SettleInput {
  customerId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  settlementType: SettlementType;
  includeOptionalFees?: boolean;
  adminNote?: string;
  userId: string;
}

export async function calculateOutstanding(customerId: string, includeOptionalFees = false) {
  const purposes: PaymentPurpose[] = [PaymentPurpose.DOWNPAYMENT, PaymentPurpose.INSTALLMENT];
  if (includeOptionalFees) {
    purposes.push(
      PaymentPurpose.UTILITIES,
      PaymentPurpose.SAND_FILLING,
      PaymentPurpose.DOCUMENT_VERIFICATION,
      PaymentPurpose.MISCELLANEOUS,
    );
  }

  const rows = await prisma.paymentLedger.findMany({
    where: {
      customerId,
      purpose: { in: purposes },
      status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
      isFrozen: false,
    },
  });

  const downpayment = rows
    .filter((r) => r.purpose === PaymentPurpose.DOWNPAYMENT)
    .reduce((s, r) => s + (r.amountDue - r.amountPaid), 0);
  const installments = rows
    .filter((r) => r.purpose === PaymentPurpose.INSTALLMENT)
    .map((r) => ({
      index: r.installmentIndex!,
      remaining: r.amountDue - r.amountPaid,
    }));
  const optionalFees = rows
    .filter((r) => !["DOWNPAYMENT", "INSTALLMENT"].includes(r.purpose))
    .reduce((s, r) => s + (r.amountDue - r.amountPaid), 0);

  const totalOutstanding = downpayment + installments.reduce((s, i) => s + i.remaining, 0) + optionalFees;
  const alreadyPaid = await prisma.paymentLedger.aggregate({
    where: { customerId, status: PaymentStatus.PAID },
    _sum: { amountPaid: true },
  });

  return {
    downpayment,
    installments,
    optionalFees,
    totalOutstanding,
    alreadyPaid: alreadyPaid._sum.amountPaid ?? 0,
    rowIds: rows.map((r) => r.id),
  };
}

export async function settleFullPayment(input: SettleInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });
    if (customer.settlementStatus !== SettlementStatus.NONE) {
      throw new ApiError("Customer already settled", 400);
    }

    const purposes: PaymentPurpose[] = [PaymentPurpose.DOWNPAYMENT, PaymentPurpose.INSTALLMENT];
    if (input.includeOptionalFees) {
      purposes.push(
        PaymentPurpose.UTILITIES,
        PaymentPurpose.SAND_FILLING,
        PaymentPurpose.DOCUMENT_VERIFICATION,
        PaymentPurpose.MISCELLANEOUS,
      );
    }

    const rows = await tx.paymentLedger.findMany({
      where: {
        customerId: input.customerId,
        purpose: { in: purposes },
        status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
        isFrozen: false,
      },
    });

    const totalOutstanding = rows.reduce((s, r) => s + (r.amountDue - r.amountPaid), 0);
    if (Math.abs(input.amountPaid - totalOutstanding) > 0.01) {
      throw new ApiError(`Amount must equal outstanding: ৳${totalOutstanding}`, 400);
    }

    const settlement = await tx.paymentSettlement.create({
      data: {
        customerId: input.customerId,
        settlementType: input.settlementType,
        totalAmountPaid: input.amountPaid,
        paymentMethod: input.paymentMethod,
        includeOptionalFees: input.includeOptionalFees ?? false,
        adminNote: input.adminNote,
        settledByUserId: input.userId,
      },
    });

    for (const row of rows) {
      await tx.paymentLedger.update({
        where: { id: row.id },
        data: {
          amountPaid: row.amountDue,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          paymentMethod: input.paymentMethod,
          settlementId: settlement.id,
        },
      });
    }

    const settlementStatus =
      input.settlementType === SettlementType.EARLY_PAYOFF
        ? SettlementStatus.EARLY_SETTLED
        : SettlementStatus.FULLY_SETTLED;

    await tx.customer.update({
      where: { id: input.customerId },
      data: {
        settlementStatus,
        status: CustomerStatus.COMPLETED,
      },
    });

    const receipt = await generateReceipt(tx, {
      customerId: customer.id,
      purpose: PaymentPurpose.FULL_SETTLEMENT,
      amount: input.amountPaid,
      paymentMethod: input.paymentMethod,
      trackingId: customer.trackingId,
      customerName: customer.fullName,
    });

    await tx.paymentSettlement.update({
      where: { id: settlement.id },
      data: { receiptId: receipt.id },
    });

    await logAudit(tx, {
      action: "FULL_SETTLEMENT",
      entityType: "PaymentSettlement",
      entityId: settlement.id,
      userId: input.userId,
      payload: { amount: input.amountPaid, type: input.settlementType },
    });

    return { settlement, receipt };
  }, HEAVY_TX_OPTIONS);
}
