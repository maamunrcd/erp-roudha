import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { logAudit } from "@/lib/services/audit.service";
import { findOrCreateProfile, normalizePhone, summarizeLedgers } from "@/lib/services/customer-summary.service";
import { hashPortalPassword } from "@/lib/services/portal.service";
import { effectiveInstallmentMonths } from "@/lib/utils/contract-terms";
import { CustomerStatus, GraceStatus, ShareAllocationStatus } from "@prisma/client";

export interface UpdateCustomerInput {
  fullName?: string;
  phone?: string;
  email?: string | null;
  nid?: string | null;
  address?: string | null;
  status?: CustomerStatus;
  portalPassword?: string;
  graceStatus?: GraceStatus;
  isPaused?: boolean;
}

export async function getCustomerDetail(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, prefix: true, name: true, installmentMonths: true } },
      profile: {
        include: {
          enrollments: {
            include: {
              project: { select: { id: true, prefix: true, name: true } },
              shareAllocations: {
                where: { isActive: true },
                include: { share: { select: { shareNumber: true } } },
              },
            },
          },
        },
      },
      contract: {
        select: {
          pricingMode: true,
          useComboOffer: true,
          contractStartDate: true,
          customInstallmentMonths: true,
          customDownpayment: true,
          customMonthlyAmount: true,
        },
      },
      shareAllocations: {
        where: { isActive: true },
        include: { share: { select: { shareNumber: true } } },
      },
      paymentLedgers: {
        where: { isFrozen: false },
        orderBy: [{ purpose: "asc" }, { installmentIndex: "asc" }],
      },
    },
  });

  if (!customer) return null;

  const financials = summarizeLedgers(customer.paymentLedgers);
  const downpayment = customer.paymentLedgers.find((l) => l.purpose === "DOWNPAYMENT");
  const paidInstallments = customer.paymentLedgers.filter(
    (l) => l.purpose === "INSTALLMENT" && l.status === "PAID",
  ).length;

  const enrollments =
    customer.profile?.enrollments.map((e) => ({
      id: e.id,
      trackingId: e.trackingId,
      project: e.project,
      shareCount: e.shareCount,
      isCurrent: e.id === customer.id,
    })) ?? [
      {
        id: customer.id,
        trackingId: customer.trackingId,
        project: customer.project,
        shareCount: customer.shareCount,
        isCurrent: true,
      },
    ];

  return {
    id: customer.id,
    trackingId: customer.trackingId,
    profileId: customer.profileId,
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    nid: customer.nid,
    address: customer.address,
    status: customer.status,
    graceStatus: customer.graceStatus,
    isPaused: customer.isPaused,
    settlementStatus: customer.settlementStatus,
    shareCount: customer.shareCount,
    project: customer.project,
    contract: customer.contract,
    downpaymentStatus: downpayment?.status ?? "PENDING",
    paidInstallments,
    totalInstallments: effectiveInstallmentMonths(customer.contract, customer.project.installmentMonths),
    portalMustChangePassword: customer.profile?.mustChangePassword ?? true,
    portalPasswordChangedAt: customer.profile?.passwordChangedAt ?? null,
    portalLoginPhone: customer.profile?.phone ?? customer.phone,
    portalLoginEmail: customer.profile?.email ?? customer.email,
    portalTemporaryPassword:
      customer.profile?.mustChangePassword ? customer.profile?.portalTemporaryPassword ?? null : null,
    enrollments,
    ledger: customer.paymentLedgers,
    ...financials,
  };
}

export async function updateCustomer(id: string, input: UpdateCustomerInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({
      where: { id },
      include: { profile: true },
    });

    const data: UpdateCustomerInput = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.phone !== undefined) data.phone = normalizePhone(input.phone);
    if (input.email !== undefined) data.email = input.email?.toLowerCase() ?? null;
    if (input.nid !== undefined) data.nid = input.nid;
    if (input.address !== undefined) data.address = input.address;
    if (input.status !== undefined) data.status = input.status;

    if (data.phone && data.phone !== customer.phone) {
      const conflict = await tx.customerProfile.findUnique({ where: { phone: data.phone } });
      if (conflict && conflict.id !== customer.profileId) {
        throw new ApiError("Phone number already belongs to another customer profile", 400);
      }
    }

    const graceStatus = input.graceStatus;
    const isPaused = input.isPaused;

    const updated = await tx.customer.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        nid: data.nid,
        address: data.address,
        status:
          isPaused === true
            ? CustomerStatus.PAUSED
            : isPaused === false && customer.status === CustomerStatus.PAUSED
              ? CustomerStatus.ACTIVE
              : data.status,
        ...(graceStatus !== undefined ? { graceStatus } : {}),
        ...(isPaused !== undefined ? { isPaused } : {}),
      },
    });

    if (graceStatus !== undefined || isPaused !== undefined) {
      const ledgerGrace =
        isPaused === true || graceStatus === GraceStatus.PAUSED
          ? GraceStatus.PAUSED
          : graceStatus ?? GraceStatus.NONE;

      await tx.paymentLedger.updateMany({
        where: { customerId: id, isFrozen: false, status: { not: "PAID" } },
        data: { graceStatus: ledgerGrace },
      });
    }

    if (customer.profileId) {
      const profileData: {
        fullName?: string;
        phone?: string;
        email?: string | null;
        nid?: string | null;
        address?: string | null;
        passwordHash?: string;
        portalTemporaryPassword?: string | null;
        mustChangePassword?: boolean;
        passwordChangedAt?: Date | null;
      } = {
        fullName: data.fullName ?? customer.fullName,
        phone: data.phone ?? customer.phone,
        email: data.email !== undefined ? data.email : customer.email,
        nid: data.nid !== undefined ? data.nid : customer.nid,
        address: data.address !== undefined ? data.address : customer.address,
      };

      if (input.portalPassword) {
        profileData.passwordHash = await hashPortalPassword(input.portalPassword);
        profileData.portalTemporaryPassword = input.portalPassword;
        profileData.mustChangePassword = true;
        profileData.passwordChangedAt = null;
      }

      await tx.customerProfile.update({
        where: { id: customer.profileId },
        data: profileData,
      });

      if (data.fullName || data.phone || data.email !== undefined || data.nid !== undefined || data.address !== undefined) {
        await tx.customer.updateMany({
          where: { profileId: customer.profileId, id: { not: id } },
          data: {
            ...(data.fullName ? { fullName: data.fullName } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
            ...(data.email !== undefined ? { email: data.email } : {}),
            ...(data.nid !== undefined ? { nid: data.nid } : {}),
            ...(data.address !== undefined ? { address: data.address } : {}),
          },
        });
      }
    } else if (data.fullName || data.phone) {
      const profile = await findOrCreateProfile(tx, {
        fullName: updated.fullName,
        phone: updated.phone,
        email: updated.email ?? undefined,
        nid: updated.nid ?? undefined,
        address: updated.address ?? undefined,
      });
      await tx.customer.update({ where: { id }, data: { profileId: profile.id } });
    }

    await logAudit(tx, {
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: id,
      userId,
      payload: { ...data },
    });

    return updated;
  });
}

export async function deleteCustomerEnrollment(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({
      where: { id },
      include: {
        paymentLedgers: true,
        shareAllocations: { where: { isActive: true }, include: { share: true } },
        successors: true,
        transfersFrom: true,
        transfersTo: true,
      },
    });

    const totalPaid = customer.paymentLedgers.reduce((s, l) => s + l.amountPaid, 0);
    if (totalPaid > 0) {
      throw new ApiError("Cannot delete customer with recorded payments. Cancel or transfer instead.", 400);
    }

    if (customer.status === CustomerStatus.TRANSFERRED || customer.successors.length > 0) {
      throw new ApiError("Cannot delete customer involved in a share transfer", 400);
    }

    if (customer.transfersFrom.length > 0 || customer.transfersTo.length > 0) {
      throw new ApiError("Cannot delete customer with transfer history", 400);
    }

    for (const allocation of customer.shareAllocations) {
      await tx.share.update({
        where: { id: allocation.shareId },
        data: { allocationStatus: ShareAllocationStatus.AVAILABLE, activeCustomerId: null },
      });
    }

    await tx.moneyReceipt.deleteMany({ where: { customerId: id } });
    await tx.paymentSettlement.deleteMany({ where: { customerId: id } });
    await tx.paymentLedger.deleteMany({ where: { customerId: id } });
    await tx.customerNote.deleteMany({ where: { customerId: id } });
    await tx.document.deleteMany({ where: { customerId: id } });
    await tx.customerShare.deleteMany({ where: { customerId: id } });
    await tx.customerContract.deleteMany({ where: { customerId: id } });

    const profileId = customer.profileId;
    await tx.customer.delete({ where: { id } });

    if (profileId) {
      const remaining = await tx.customer.count({ where: { profileId } });
      if (remaining === 0) {
        await tx.customerProfile.delete({ where: { id: profileId } });
      }
    }

    await logAudit(tx, {
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: id,
      userId,
      payload: { trackingId: customer.trackingId },
    });
  });
}
