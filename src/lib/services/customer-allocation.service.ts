import { prisma, HEAVY_TX_OPTIONS } from "@/lib/prisma";
import { generateTrackingId } from "@/lib/services/customer-id.service";
import { logAudit } from "@/lib/services/audit.service";
import { addShareObligationsToLedger, bootstrapLedger, parsePricingPhases } from "@/lib/services/ledger.service";
import { findOrCreateProfile, normalizePhone } from "@/lib/services/customer-summary.service";
import { aggregateContractTotals, applyContractTermOverrides, resolveSharePricing } from "@/lib/services/pricing.service";
import { generateTemporaryPassword, hashPortalPassword } from "@/lib/services/portal.service";
import { createEnrollmentCommission } from "@/lib/services/commission.service";
import {
  CustomerStatus,
  PaymentPlan,
  PricingMode,
  ShareAllocationStatus,
  type Prisma,
} from "@prisma/client";
import { ApiError } from "@/lib/api-utils";

export interface EnrollCustomerInput {
  projectId: string;
  shareCount: number;
  fullName: string;
  phone: string;
  email?: string;
  nid?: string;
  address?: string;
  paymentPlan?: PaymentPlan;
  pricingMode?: PricingMode;
  useComboOffer?: boolean;
  customTotalPrice?: number;
  customDownpayment?: number;
  customMonthlyAmount?: number;
  customInstallmentMonths?: number;
  discountReason?: string;
  approvedByUserId: string;
  contractStartDate?: Date;
  salesAgentId?: string | null;
  leadId?: string | null;
}

const MERGEABLE_STATUSES: CustomerStatus[] = [
  CustomerStatus.ACTIVE,
  CustomerStatus.PAUSED,
  CustomerStatus.SHARE_TO_SELL,
];

async function allocateNextAvailableShares(
  tx: Prisma.TransactionClient,
  projectId: string,
  count: number,
) {
  const take = Math.max(1, Math.floor(count));
  const shares = await tx.share.findMany({
    where: {
      projectId,
      allocationStatus: { in: [ShareAllocationStatus.AVAILABLE, ShareAllocationStatus.RESERVED] },
    },
    orderBy: { shareNumber: "asc" },
    take,
  });

  if (shares.length < take) {
    throw new ApiError(`Only ${shares.length} share(s) available`, 400);
  }

  return shares;
}

async function attachSharesToCustomer(
  tx: Prisma.TransactionClient,
  customerId: string,
  contractId: string,
  shares: { id: string }[],
  resolved: ReturnType<typeof resolveSharePricing>[],
) {
  for (let i = 0; i < shares.length; i++) {
    const share = shares[i];
    const pricing = resolved[i];
    await tx.customerShare.create({
      data: {
        customerId,
        shareId: share.id,
        unitPrice: pricing.unitPrice,
        downpaymentPortion: pricing.downpaymentPortion,
        monthlyInstallment: pricing.monthlyInstallment,
        pricingSource: pricing.pricingSource,
        phaseId: pricing.phaseId,
        contractId,
      },
    });
    await tx.share.update({
      where: { id: share.id },
      data: {
        allocationStatus: ShareAllocationStatus.ALLOCATED,
        activeCustomerId: customerId,
      },
    });
  }
}

export async function enrollCustomer(input: EnrollCustomerInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({ where: { id: input.projectId } });
    const phases = parsePricingPhases(project.pricingPhases);
    if (!phases.length) {
      throw new ApiError(
        "This project has no pricing phases configured. Add pricing phases in project settings before enrolling customers.",
        400,
      );
    }
    const installmentMonths = input.customInstallmentMonths ?? project.installmentMonths;
    const contractStart = input.contractStartDate ?? new Date();
    const shareCount = Math.max(1, Math.floor(input.shareCount));
    const phone = normalizePhone(input.phone);

    const shares = await allocateNextAvailableShares(tx, project.id, shareCount);
    const shareNumbers = shares.map((s) => s.shareNumber);

    const pricingMode = input.pricingMode ?? PricingMode.STANDARD;
    const useComboOffer = input.useComboOffer ?? false;
    const custom = {
      customTotalPrice: input.customTotalPrice,
      customDownpayment: input.customDownpayment,
      customMonthlyAmount: input.customMonthlyAmount,
    };

    const resolved = shareNumbers.map((n) =>
      resolveSharePricing(n, shareNumbers, phases, installmentMonths, pricingMode, custom, useComboOffer),
    );
    let totals = aggregateContractTotals(resolved);
    totals = applyContractTermOverrides(resolved, totals, {
      downpaymentTotal: input.customDownpayment,
      monthlyTotal: input.customMonthlyAmount,
      installmentMonths,
    });

    const profile = await findOrCreateProfile(tx, {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      nid: input.nid,
      address: input.address,
    });
    let temporaryPassword: string | null = null;
    let profileForPortal = profile;
    if (!profile.passwordHash) {
      temporaryPassword = generateTemporaryPassword();
      profileForPortal = await tx.customerProfile.update({
        where: { id: profile.id },
        data: {
          passwordHash: await hashPortalPassword(temporaryPassword),
          portalTemporaryPassword: temporaryPassword,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });
    }

    const existingInProject = await tx.customer.findFirst({
      where: {
        projectId: project.id,
        phone,
        status: { in: MERGEABLE_STATUSES },
      },
      include: { contract: true },
    });

    let merged = false;
    let customer;
    let contract;

    if (existingInProject) {
      merged = true;
      customer = await tx.customer.update({
        where: { id: existingInProject.id },
        data: {
          fullName: input.fullName,
          email: input.email ?? existingInProject.email,
          nid: input.nid ?? existingInProject.nid,
          address: input.address ?? existingInProject.address,
          profileId: profileForPortal.id,
          ...(input.salesAgentId ? { salesAgentId: input.salesAgentId } : {}),
        },
      });
      contract = existingInProject.contract;

      if (!contract) {
        contract = await tx.customerContract.create({
          data: {
            customerId: customer.id,
            pricingMode,
            useComboOffer,
            customTotalPrice: input.customTotalPrice,
            customDownpayment: totals.downpayment,
            customMonthlyAmount: totals.monthlyTotal,
            customInstallmentMonths: input.customInstallmentMonths,
            discountReason: input.discountReason,
            approvedByUserId: input.approvedByUserId,
            contractStartDate: contractStart,
            effectiveFrom: contractStart,
          },
        });
      } else if (
        pricingMode === PricingMode.CUSTOM ||
        useComboOffer ||
        input.customInstallmentMonths ||
        input.customDownpayment != null
      ) {
        contract = await tx.customerContract.update({
          where: { id: contract.id },
          data: {
            pricingMode,
            useComboOffer: useComboOffer || contract.useComboOffer,
            customTotalPrice: input.customTotalPrice ?? contract.customTotalPrice,
            customDownpayment: totals.downpayment,
            customMonthlyAmount: totals.monthlyTotal,
            customInstallmentMonths: input.customInstallmentMonths ?? contract.customInstallmentMonths,
            discountReason: input.discountReason ?? contract.discountReason,
          },
        });
      }

      await attachSharesToCustomer(tx, customer.id, contract.id, shares, resolved);
      await syncShareCount(tx, customer.id);
      await addShareObligationsToLedger(
        tx,
        customer.id,
        totals.downpayment,
        totals.monthlyTotal,
        installmentMonths,
        contractStart,
      );
    } else {
      const trackingId = await generateTrackingId(tx, project.id, project.prefix);

      customer = await tx.customer.create({
        data: {
          trackingId,
          profileId: profileForPortal.id,
          projectId: project.id,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          nid: input.nid,
          address: input.address,
          shareCount: shares.length,
          paymentPlan: input.paymentPlan ?? PaymentPlan.INSTALLMENT,
          contractStartDate: contractStart,
          status: CustomerStatus.ACTIVE,
          salesAgentId: input.salesAgentId || null,
        },
      });

      contract = await tx.customerContract.create({
        data: {
          customerId: customer.id,
          pricingMode,
          useComboOffer,
          customTotalPrice: input.customTotalPrice,
          customDownpayment: totals.downpayment,
          customMonthlyAmount: totals.monthlyTotal,
          customInstallmentMonths: input.customInstallmentMonths,
          discountReason: input.discountReason,
          approvedByUserId: input.approvedByUserId,
          contractStartDate: contractStart,
          effectiveFrom: contractStart,
        },
      });

      await attachSharesToCustomer(tx, customer.id, contract.id, shares, resolved);
      await bootstrapLedger(
        tx,
        customer.id,
        contractStart,
        installmentMonths,
        totals.downpayment,
        totals.monthlyTotal,
      );
    }

    await logAudit(tx, {
      action: merged ? "CUSTOMER_SHARES_ADDED" : "CUSTOMER_ENROLLED",
      entityType: "Customer",
      entityId: customer.id,
      userId: input.approvedByUserId,
      payload: {
        trackingId: customer.trackingId,
        shareCount: shares.length,
        merged,
        projectPrefix: project.prefix,
        salesAgentId: input.salesAgentId ?? null,
      },
    });

    if (input.salesAgentId && !merged) {
      await createEnrollmentCommission(tx, {
        agentId: input.salesAgentId,
        customerId: customer.id,
        projectId: project.id,
        leadId: input.leadId,
        baseAmount: totals.downpayment,
        basis: "DOWNPAYMENT",
        userId: input.approvedByUserId,
      });
    }

    const updatedCustomer = await tx.customer.findUniqueOrThrow({ where: { id: customer.id } });

    return {
      customer: updatedCustomer,
      contract,
      totals,
      merged,
      portalCredentials: temporaryPassword
        ? {
            loginPhone: profileForPortal.phone,
            loginEmail: profileForPortal.email,
            temporaryPassword,
          }
        : null,
    };
  }, HEAVY_TX_OPTIONS);
}

export async function syncShareCount(tx: Prisma.TransactionClient, customerId: string) {
  const count = await tx.customerShare.count({ where: { customerId, isActive: true } });
  await tx.customer.update({ where: { id: customerId }, data: { shareCount: count } });
}
