import { prisma, HEAVY_TX_OPTIONS } from "@/lib/prisma";
import { generateTrackingId } from "@/lib/services/customer-id.service";
import { logAudit } from "@/lib/services/audit.service";
import { syncShareCount } from "@/lib/services/customer-allocation.service";
import { bootstrapLedger } from "@/lib/services/ledger.service";
import { findOrCreateProfile, normalizePhone } from "@/lib/services/customer-summary.service";
import { hmacAnchor } from "@/lib/utils/crypto";
import {
  CustomerStatus,
  PaymentPurpose,
  PaymentStatus,
  ShareAllocationStatus,
  type PaymentLedger,
  type Prisma,
} from "@prisma/client";
import { ApiError } from "@/lib/api-utils";

export interface TransferInput {
  fromCustomerId: string;
  shareId: string;
  successor: {
    fullName: string;
    phone: string;
    email?: string;
    nid?: string;
    address?: string;
  };
  cutoffInstallment: number;
  userId: string;
}

const MERGEABLE_STATUSES: CustomerStatus[] = [
  CustomerStatus.ACTIVE,
  CustomerStatus.PAUSED,
  CustomerStatus.SHARE_TO_SELL,
];

function ledgerKey(purpose: PaymentPurpose, installmentIndex: number | null) {
  return `${purpose}:${installmentIndex ?? "x"}`;
}

async function loadLedgerCache(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<Map<string, PaymentLedger>> {
  const rows = await tx.paymentLedger.findMany({
    where: { customerId, isFrozen: false },
  });
  const cache = new Map<string, PaymentLedger>();
  for (const row of rows) {
    cache.set(ledgerKey(row.purpose, row.installmentIndex), row);
  }
  return cache;
}

async function addToBuyerLedger(
  tx: Prisma.TransactionClient,
  buyerCache: Map<string, PaymentLedger>,
  customerId: string,
  purpose: PaymentPurpose,
  installmentIndex: number | null,
  addAmount: number,
  dueDate?: Date | null,
) {
  if (addAmount <= 0.01) return;

  const key = ledgerKey(purpose, installmentIndex);
  const existing = buyerCache.get(key);

  if (existing) {
    const newDue = existing.amountDue + addAmount;
    const updated = await tx.paymentLedger.update({
      where: { id: existing.id },
      data: {
        amountDue: newDue,
        status: existing.amountPaid >= newDue - 0.01 ? PaymentStatus.PAID : existing.status,
      },
    });
    buyerCache.set(key, updated);
  } else {
    const created = await tx.paymentLedger.create({
      data: {
        customerId,
        purpose,
        installmentIndex: installmentIndex ?? undefined,
        amountDue: addAmount,
        amountPaid: 0,
        status: PaymentStatus.PENDING,
        dueDate: dueDate ?? undefined,
      },
    });
    buyerCache.set(key, created);
  }
}

async function reduceSellerLedger(
  tx: Prisma.TransactionClient,
  sellerCache: Map<string, PaymentLedger>,
  customerId: string,
  purpose: PaymentPurpose,
  installmentIndex: number | null,
  reduceAmount: number,
) {
  if (reduceAmount <= 0.01) return;

  const key = ledgerKey(purpose, installmentIndex);
  const existing = sellerCache.get(key);
  if (!existing) return;

  const newDue = Math.max(existing.amountPaid, existing.amountDue - reduceAmount);
  const updated = await tx.paymentLedger.update({
    where: { id: existing.id },
    data: {
      amountDue: newDue,
      status: existing.amountPaid >= newDue - 0.01 ? PaymentStatus.PAID : existing.status,
    },
  });
  sellerCache.set(key, updated);
}

async function transferShareObligations(
  tx: Prisma.TransactionClient,
  fromCustomerId: string,
  toCustomerId: string,
  allocation: {
    monthlyInstallment: number;
    downpaymentPortion: number;
  },
  cutoffInstallment: number,
  installmentMonths: number,
  sellerKeepsShares: boolean,
) {
  const sellerCache = await loadLedgerCache(tx, fromCustomerId);
  const buyerCache = await loadLedgerCache(tx, toCustomerId);

  const downpaymentRow = sellerCache.get(ledgerKey(PaymentPurpose.DOWNPAYMENT, null));

  if (downpaymentRow) {
    const dpRemaining = Math.min(
      allocation.downpaymentPortion,
      Math.max(0, downpaymentRow.amountDue - downpaymentRow.amountPaid),
    );
    if (dpRemaining > 0.01) {
      await addToBuyerLedger(
        tx,
        buyerCache,
        toCustomerId,
        PaymentPurpose.DOWNPAYMENT,
        null,
        dpRemaining,
        downpaymentRow.dueDate,
      );
      if (sellerKeepsShares) {
        await reduceSellerLedger(tx, sellerCache, fromCustomerId, PaymentPurpose.DOWNPAYMENT, null, dpRemaining);
      }
    }
  }

  for (let i = cutoffInstallment + 1; i <= installmentMonths; i++) {
    const sellerRow = sellerCache.get(ledgerKey(PaymentPurpose.INSTALLMENT, i));

    const transferMonthly = sellerRow
      ? Math.min(allocation.monthlyInstallment, Math.max(0, sellerRow.amountDue - sellerRow.amountPaid))
      : allocation.monthlyInstallment;

    if (transferMonthly > 0.01) {
      await addToBuyerLedger(
        tx,
        buyerCache,
        toCustomerId,
        PaymentPurpose.INSTALLMENT,
        i,
        transferMonthly,
        sellerRow?.dueDate,
      );
      if (sellerKeepsShares) {
        await reduceSellerLedger(tx, sellerCache, fromCustomerId, PaymentPurpose.INSTALLMENT, i, transferMonthly);
      }
    }
  }
}

export async function executeShareTransfer(input: TransferInput) {
  return prisma.$transaction(async (tx) => {
    const fromCustomer = await tx.customer.findUniqueOrThrow({
      where: { id: input.fromCustomerId },
      include: {
        project: true,
        contract: true,
        shareAllocations: { where: { shareId: input.shareId, isActive: true } },
      },
    });

    if (fromCustomer.status !== CustomerStatus.ACTIVE) {
      throw new ApiError("Source customer must be ACTIVE", 400);
    }
    if (fromCustomer.shareAllocations.length === 0) {
      throw new ApiError("Customer does not hold this share", 400);
    }

    const share = await tx.share.findUniqueOrThrow({ where: { id: input.shareId } });
    const allocation = fromCustomer.shareAllocations[0];
    const installmentMonths = fromCustomer.project.installmentMonths;
    const phone = normalizePhone(input.successor.phone);

    if (phone === normalizePhone(fromCustomer.phone)) {
      throw new ApiError("Cannot transfer a share to the same customer", 400);
    }

    // Deactivate seller's hold on this share
    await tx.customerShare.update({
      where: { id: allocation.id },
      data: { isActive: false },
    });

    await syncShareCount(tx, fromCustomer.id);
    const sellerRemainingShares = await tx.customerShare.count({
      where: { customerId: fromCustomer.id, isActive: true },
    });
    const sellerFullyTransferred = sellerRemainingShares === 0;

    const profile = await findOrCreateProfile(tx, {
      fullName: input.successor.fullName,
      phone: input.successor.phone,
      email: input.successor.email,
      nid: input.successor.nid,
      address: input.successor.address,
    });

    // Same project only — merge into existing enrollment if buyer already has one
    let toCustomer = await tx.customer.findFirst({
      where: {
        projectId: fromCustomer.projectId,
        phone,
        status: { in: MERGEABLE_STATUSES },
        id: { not: fromCustomer.id },
      },
      include: { contract: true },
    });

    let merged = false;

    if (toCustomer) {
      merged = true;
      await tx.customer.update({
        where: { id: toCustomer.id },
        data: {
          fullName: input.successor.fullName,
          email: input.successor.email ?? toCustomer.email,
          nid: input.successor.nid ?? toCustomer.nid,
          address: input.successor.address ?? toCustomer.address,
          profileId: profile.id,
        },
      });

      await tx.customerShare.create({
        data: {
          customerId: toCustomer.id,
          shareId: share.id,
          unitPrice: allocation.unitPrice,
          downpaymentPortion: allocation.downpaymentPortion,
          monthlyInstallment: allocation.monthlyInstallment,
          pricingSource: allocation.pricingSource,
          phaseId: allocation.phaseId,
          contractId: toCustomer.contract?.id,
        },
      });

      await syncShareCount(tx, toCustomer.id);

      await transferShareObligations(
        tx,
        fromCustomer.id,
        toCustomer.id,
        allocation,
        input.cutoffInstallment,
        installmentMonths,
        !sellerFullyTransferred,
      );
    } else {
      const trackingId = await generateTrackingId(tx, fromCustomer.projectId, fromCustomer.project.prefix);

      toCustomer = await tx.customer.create({
        data: {
          trackingId,
          profileId: profile.id,
          projectId: fromCustomer.projectId,
          fullName: input.successor.fullName,
          phone: input.successor.phone,
          email: input.successor.email,
          nid: input.successor.nid,
          address: input.successor.address,
          shareCount: 1,
          status: CustomerStatus.ACTIVE,
          predecessorId: fromCustomer.id,
          contractStartDate: new Date(),
        },
        include: { contract: true },
      });

      const contract = await tx.customerContract.create({
        data: {
          customerId: toCustomer.id,
          approvedByUserId: input.userId,
          contractStartDate: new Date(),
          effectiveFrom: new Date(),
        },
      });

      await tx.customerShare.create({
        data: {
          customerId: toCustomer.id,
          shareId: share.id,
          unitPrice: allocation.unitPrice,
          downpaymentPortion: allocation.downpaymentPortion,
          monthlyInstallment: allocation.monthlyInstallment,
          pricingSource: allocation.pricingSource,
          phaseId: allocation.phaseId,
          contractId: contract.id,
        },
      });

      await transferShareObligations(
        tx,
        fromCustomer.id,
        toCustomer.id,
        allocation,
        input.cutoffInstallment,
        installmentMonths,
        !sellerFullyTransferred,
      );

      const buyerLedgerCount = await tx.paymentLedger.count({
        where: { customerId: toCustomer.id, isFrozen: false },
      });
      if (buyerLedgerCount === 0) {
        await bootstrapLedger(
          tx,
          toCustomer.id,
          new Date(),
          installmentMonths,
          0,
          allocation.monthlyInstallment,
        );
      }
    }

    if (sellerFullyTransferred) {
      await tx.customer.update({
        where: { id: fromCustomer.id },
        data: { status: CustomerStatus.TRANSFERRED },
      });
      await tx.paymentLedger.updateMany({
        where: { customerId: fromCustomer.id },
        data: { isFrozen: true },
      });
    }

    await tx.share.update({
      where: { id: share.id },
      data: {
        activeCustomerId: toCustomer.id,
        allocationStatus: ShareAllocationStatus.ALLOCATED,
      },
    });

    const signature = hmacAnchor(
      JSON.stringify({
        from: fromCustomer.id,
        to: toCustomer.id,
        share: share.id,
        cutoff: input.cutoffInstallment,
        merged,
      }),
      process.env.RECEIPT_SECRET ?? "dev",
    );

    const log = await tx.shareTransferLog.create({
      data: {
        fromCustomerId: fromCustomer.id,
        toCustomerId: toCustomer.id,
        shareId: share.id,
        cutoffInstallment: input.cutoffInstallment,
        digitalLogSignature: signature,
      },
    });

    await logAudit(tx, {
      action: "SHARE_TRANSFERRED",
      entityType: "ShareTransferLog",
      entityId: log.id,
      userId: input.userId,
      payload: {
        from: fromCustomer.trackingId,
        to: toCustomer.trackingId,
        merged,
        buyerShareCount: toCustomer.shareCount,
      },
    });

    const updatedBuyer = await tx.customer.findUniqueOrThrow({ where: { id: toCustomer.id } });

    return { fromCustomer, toCustomer: updatedBuyer, log, merged };
  }, HEAVY_TX_OPTIONS);
}
