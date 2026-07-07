import { prisma, HEAVY_TX_OPTIONS } from "@/lib/prisma";
import { logAudit, nextReceiptSlNo } from "@/lib/services/audit.service";
import { receiptFileHash, writeReceiptPdf } from "@/lib/receipts/write-receipt-file";
import { hmacAnchor } from "@/lib/utils/crypto";
import {
  CustomerStatus,
  PaymentPurpose,
  PaymentStatus,
  ReceiptStatus,
  type PaymentMethod,
  type Prisma,
} from "@prisma/client";
import { ApiError } from "@/lib/api-utils";

const RECEIPT_SECRET = process.env.RECEIPT_SECRET ?? "dev-receipt-secret";

export async function generateReceipt(
  tx: Prisma.TransactionClient,
  data: {
    customerId: string;
    ledgerId?: string;
    purpose: PaymentPurpose;
    installmentIndex?: number | null;
    amount: number;
    paymentMethod: PaymentMethod;
    trackingId: string;
    customerName: string;
  },
) {
  const slNo = await nextReceiptSlNo(tx);
  const payload = JSON.stringify({
    slNo,
    trackingId: data.trackingId,
    purpose: data.purpose,
    installmentIndex: data.installmentIndex,
    amount: data.amount,
    method: data.paymentMethod,
    at: new Date().toISOString(),
  });
  const signatureAnchor = hmacAnchor(payload, RECEIPT_SECRET);

  const receipt = await tx.moneyReceipt.create({
    data: {
      receiptSlNo: slNo,
      customerId: data.customerId,
      purpose: data.purpose,
      installmentIndex: data.installmentIndex ?? undefined,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      signatureAnchor,
      status: ReceiptStatus.ACTIVE,
    },
  });

  if (data.ledgerId) {
    await tx.paymentLedger.update({
      where: { id: data.ledgerId },
      data: { receiptId: receipt.id },
    });
  }

  const issuedAt = new Date();
  const pdfUrl = await writeReceiptPdf({
    slNo,
    trackingId: data.trackingId,
    customerName: data.customerName,
    purpose: data.purpose,
    installmentIndex: data.installmentIndex,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    issuedAt,
  });

  await tx.moneyReceipt.update({
    where: { id: receipt.id },
    data: { pdfUrl, fileHash: receiptFileHash(signatureAnchor) },
  });

  return receipt;
}

export interface RegisterPaymentInput {
  customerId: string;
  purpose: PaymentPurpose;
  installmentIndex?: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  description?: string;
  userId: string;
}

export async function registerPayment(input: RegisterPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({
      where: { id: input.customerId },
    });

    if (customer.settlementStatus !== "NONE") {
      throw new ApiError("Contract already fully settled", 400);
    }

    let ledger = await tx.paymentLedger.findFirst({
      where: {
        customerId: input.customerId,
        purpose: input.purpose,
        installmentIndex: input.installmentIndex ?? null,
        isFrozen: false,
      },
    });

    if (!ledger && input.purpose !== PaymentPurpose.INSTALLMENT && input.purpose !== PaymentPurpose.DOWNPAYMENT) {
      ledger = await tx.paymentLedger.create({
        data: {
          customerId: input.customerId,
          purpose: input.purpose,
          description: input.description,
          amountDue: input.amountPaid,
          amountPaid: 0,
          status: PaymentStatus.PENDING,
        },
      });
    }

    if (!ledger) throw new ApiError("Ledger row not found", 404);
    if (ledger.isFrozen) throw new ApiError("Ledger row is frozen", 400);

    const remaining = Math.max(0, ledger.amountDue - ledger.amountPaid);
    if (remaining <= 0.01) {
      throw new ApiError("This payment row is already fully paid", 400);
    }

    const appliedAmount = Math.min(input.amountPaid, remaining);
    if (appliedAmount <= 0) {
      throw new ApiError("Payment amount must be greater than zero", 400);
    }

    const newPaid = ledger.amountPaid + appliedAmount;
    const isFullyPaid = newPaid >= ledger.amountDue - 0.01;

    const updated = await tx.paymentLedger.update({
      where: { id: ledger.id },
      data: {
        amountPaid: newPaid,
        status: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paymentMethod: input.paymentMethod,
        paidAt: isFullyPaid ? new Date() : ledger.paidAt,
      },
    });

    const receipt = await generateReceipt(tx, {
      customerId: customer.id,
      ledgerId: ledger.id,
      purpose: input.purpose,
      installmentIndex: input.installmentIndex,
      amount: appliedAmount,
      paymentMethod: input.paymentMethod,
      trackingId: customer.trackingId,
      customerName: customer.fullName,
    });

    await logAudit(tx, {
      action: "PAYMENT_REGISTERED",
      entityType: "PaymentLedger",
      entityId: ledger.id,
      userId: input.userId,
      payload: { amount: appliedAmount, purpose: input.purpose },
    });

    if (isFullyPaid) {
      const pending = await tx.paymentLedger.count({
        where: {
          customerId: customer.id,
          purpose: { in: [PaymentPurpose.DOWNPAYMENT, PaymentPurpose.INSTALLMENT] },
          status: { in: [PaymentStatus.PENDING, PaymentStatus.OVERDUE] },
          isFrozen: false,
        },
      });
      if (pending === 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { status: CustomerStatus.COMPLETED },
        });
      }
    }

    return { ledger: updated, receipt };
  }, HEAVY_TX_OPTIONS);
}
