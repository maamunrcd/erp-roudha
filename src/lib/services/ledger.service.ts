import { prisma } from "@/lib/prisma";
import type { PricingPhase } from "@/lib/constants/projects";
import { addMonths } from "@/lib/utils/crypto";
import type { Prisma } from "@prisma/client";
import { GraceStatus, PaymentPurpose, PaymentStatus } from "@prisma/client";

export async function addShareObligationsToLedger(
  tx: Prisma.TransactionClient,
  customerId: string,
  downpaymentAdd: number,
  monthlyAdd: number,
  installmentMonths: number,
  contractStartDate: Date,
) {
  if (downpaymentAdd > 0.01) {
    const downpayment = await tx.paymentLedger.findFirst({
      where: { customerId, purpose: PaymentPurpose.DOWNPAYMENT, isFrozen: false },
    });
    if (downpayment) {
      const newDue = downpayment.amountDue + downpaymentAdd;
      await tx.paymentLedger.update({
        where: { id: downpayment.id },
        data: {
          amountDue: newDue,
          status: downpayment.amountPaid >= newDue - 0.01 ? PaymentStatus.PAID : downpayment.status,
        },
      });
    } else {
      await tx.paymentLedger.create({
        data: {
          customerId,
          purpose: PaymentPurpose.DOWNPAYMENT,
          amountDue: downpaymentAdd,
          amountPaid: 0,
          status: PaymentStatus.PENDING,
          graceStatus: GraceStatus.NONE,
          dueDate: contractStartDate,
        },
      });
    }
  }

  if (monthlyAdd <= 0.01) return;

  const installments = await tx.paymentLedger.findMany({
    where: { customerId, purpose: PaymentPurpose.INSTALLMENT, isFrozen: false },
    orderBy: { installmentIndex: "asc" },
  });

  if (installments.length > 0) {
    for (const row of installments) {
      const newDue = row.amountDue + monthlyAdd;
      await tx.paymentLedger.update({
        where: { id: row.id },
        data: {
          amountDue: newDue,
          status: row.amountPaid >= newDue - 0.01 ? PaymentStatus.PAID : row.status,
        },
      });
    }
    return;
  }

  if (installmentMonths <= 0) return;

  await tx.paymentLedger.createMany({
    data: Array.from({ length: installmentMonths }, (_, index) => ({
      customerId,
      purpose: PaymentPurpose.INSTALLMENT,
      installmentIndex: index + 1,
      amountDue: monthlyAdd,
      amountPaid: 0,
      status: PaymentStatus.PENDING,
      graceStatus: GraceStatus.NONE,
      dueDate: addMonths(contractStartDate, index + 1),
    })),
  });
}

export async function bootstrapLedger(
  tx: Prisma.TransactionClient,
  customerId: string,
  contractStartDate: Date,
  installmentMonths: number,
  downpaymentTotal: number,
  monthlyTotal: number,
) {
  await tx.paymentLedger.create({
    data: {
      customerId,
      purpose: PaymentPurpose.DOWNPAYMENT,
      amountDue: downpaymentTotal,
      amountPaid: 0,
      status: PaymentStatus.PENDING,
      graceStatus: GraceStatus.NONE,
      dueDate: contractStartDate,
    },
  });

  if (installmentMonths <= 0 || monthlyTotal <= 0) return;

  await tx.paymentLedger.createMany({
    data: Array.from({ length: installmentMonths }, (_, index) => ({
      customerId,
      purpose: PaymentPurpose.INSTALLMENT,
      installmentIndex: index + 1,
      amountDue: monthlyTotal,
      amountPaid: 0,
      status: PaymentStatus.PENDING,
      graceStatus: GraceStatus.NONE,
      dueDate: addMonths(contractStartDate, index + 1),
    })),
  });
}

export async function markOverdueLedgers() {
  const now = new Date();
  await prisma.paymentLedger.updateMany({
    where: {
      status: PaymentStatus.PENDING,
      isFrozen: false,
      dueDate: { lt: now },
      graceStatus: { not: GraceStatus.PAUSED },
      customer: { isPaused: false },
    },
    data: { status: PaymentStatus.OVERDUE },
  });
}

export function parsePricingPhases(json: string): PricingPhase[] {
  try {
    return JSON.parse(json) as PricingPhase[];
  } catch {
    return [];
  }
}
