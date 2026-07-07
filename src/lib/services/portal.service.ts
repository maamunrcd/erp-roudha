import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/services/customer-summary.service";
import { effectiveInstallmentMonths } from "@/lib/utils/contract-terms";
import { summarizeLedgers } from "@/lib/services/customer-summary.service";
import { ApiError } from "@/lib/api-utils";

export async function findProfileByLogin(login: string) {
  const trimmed = login.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    return prisma.customerProfile.findFirst({
      where: { email: { equals: email } },
    });
  }

  const phone = normalizePhone(trimmed);
  return prisma.customerProfile.findUnique({ where: { phone } });
}

export async function verifyProfilePassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function hashPortalPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function generateTemporaryPassword() {
  return `RP-${crypto.randomBytes(4).toString("hex")}`;
}

export function getJourneyMilestone(progressPercent: number) {
  if (progressPercent >= 100) return "destination";
  if (progressPercent >= 75) return "almost_there";
  if (progressPercent >= 50) return "halfway";
  if (progressPercent >= 25) return "steady_progress";
  return "journey_started";
}

const enrollmentInclude = {
  project: { select: { id: true, name: true, prefix: true, installmentMonths: true } },
  contract: { select: { pricingMode: true, contractStartDate: true, customInstallmentMonths: true } },
  paymentLedgers: {
    where: { isFrozen: false },
    orderBy: [{ purpose: "asc" as const }, { installmentIndex: "asc" as const }],
    select: {
      id: true,
      purpose: true,
      installmentIndex: true,
      amountDue: true,
      amountPaid: true,
      status: true,
      dueDate: true,
      paidAt: true,
      receiptId: true,
    },
  },
  receipts: {
    where: { status: "ACTIVE" as const },
    orderBy: { issuedAt: "desc" as const },
    select: {
      id: true,
      receiptSlNo: true,
      purpose: true,
      installmentIndex: true,
      amount: true,
      paymentMethod: true,
      issuedAt: true,
    },
  },
};

function mapEnrollment(customer: Awaited<ReturnType<typeof loadEnrollment>>) {
  if (!customer) return null;

  const downpayment = customer.paymentLedgers.find((l) => l.purpose === "DOWNPAYMENT");
  const installments = customer.paymentLedgers.filter((l) => l.purpose === "INSTALLMENT");
  const paidInstallments = installments.filter((l) => l.status === "PAID").length;
  const financials = summarizeLedgers(customer.paymentLedgers);
  const progressPercent = financials.totalDue > 0 ? Math.min(100, Math.round((financials.totalPaid / financials.totalDue) * 100)) : 0;

  return {
    customerId: customer.id,
    trackingId: customer.trackingId,
    fullName: customer.fullName,
    phone: customer.phone,
    status: customer.status,
    settlementStatus: customer.settlementStatus,
    shareCount: customer.shareCount,
    project: customer.project,
    contract: customer.contract,
    downpaymentStatus: downpayment?.status ?? "PENDING",
    paidInstallments,
    totalInstallments: effectiveInstallmentMonths(customer.contract, customer.project.installmentMonths),
    totalPaid: financials.totalPaid,
    remaining: financials.remaining,
    overdueAmount: financials.overdueAmount,
    progressPercent,
    journeyMilestone: getJourneyMilestone(progressPercent),
    ledger: customer.paymentLedgers,
    receipts: customer.receipts,
  };
}

async function loadEnrollment(customerId: string, profileId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, profileId },
    include: enrollmentInclude,
  });
}

export async function getPortalOverview(profileId: string, customerId?: string | null) {
  const profile = await prisma.customerProfile.findUnique({
    where: { id: profileId },
    include: {
      enrollments: {
        include: {
          project: { select: { id: true, name: true, prefix: true } },
          paymentLedgers: { where: { isFrozen: false }, select: { amountDue: true, amountPaid: true, status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!profile) return null;

  const projects = profile.enrollments.map((enrollment) => {
    const financials = summarizeLedgers(enrollment.paymentLedgers);
    const progressPercent =
      financials.totalDue > 0 ? Math.min(100, Math.round((financials.totalPaid / financials.totalDue) * 100)) : 0;
    return {
      customerId: enrollment.id,
      projectId: enrollment.projectId,
      prefix: enrollment.project.prefix,
      name: enrollment.project.name,
      trackingId: enrollment.trackingId,
      shareCount: enrollment.shareCount,
      status: enrollment.status,
      totalPaid: financials.totalPaid,
      remaining: financials.remaining,
      totalDue: financials.totalDue,
      progressPercent,
      journeyMilestone: getJourneyMilestone(progressPercent),
    };
  });

  const summary = {
    projectCount: projects.length,
    totalShares: projects.reduce((sum, p) => sum + p.shareCount, 0),
    totalPaid: projects.reduce((sum, p) => sum + p.totalPaid, 0),
    totalRemaining: projects.reduce((sum, p) => sum + p.remaining, 0),
    totalDue: projects.reduce((sum, p) => sum + p.totalDue, 0),
  };
  const overallProgressPercent =
    summary.totalDue > 0 ? Math.min(100, Math.round((summary.totalPaid / summary.totalDue) * 100)) : 0;

  let enrollment = null;
  if (customerId) {
    const detail = await loadEnrollment(customerId, profileId);
    enrollment = mapEnrollment(detail);
  }

  return {
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    mustChangePassword: profile.mustChangePassword,
    passwordChangedAt: profile.passwordChangedAt,
    projects,
    summary: {
      ...summary,
      overallProgressPercent,
      journeyMilestone: getJourneyMilestone(overallProgressPercent),
    },
    enrollment,
  };
}

export async function receiptBelongsToProfile(receiptSlNo: number, profileId: string) {
  return prisma.moneyReceipt.findFirst({
    where: {
      receiptSlNo,
      status: "ACTIVE",
      customer: { profileId },
    },
  });
}

export async function markPortalPasswordChanged(profileId: string, newPassword: string) {
  const passwordHash = await hashPortalPassword(newPassword);
  return prisma.customerProfile.update({
    where: { id: profileId },
    data: {
      passwordHash,
      portalTemporaryPassword: null,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
}

export async function updatePortalProfile(profileId: string, input: { fullName?: string; email?: string | null; address?: string | null }) {
  const profile = await prisma.customerProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new ApiError("Profile not found", 404);

  const nextEmail = input.email === undefined ? undefined : input.email?.toLowerCase() ?? null;
  if (nextEmail) {
    const conflict = await prisma.customerProfile.findFirst({
      where: { email: { equals: nextEmail }, id: { not: profileId } },
      select: { id: true },
    });
    if (conflict) {
      throw new ApiError("This email is already used by another profile", 400);
    }
  }

  const updatedProfile = await prisma.customerProfile.update({
    where: { id: profileId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
    },
  });

  await prisma.customer.updateMany({
    where: { profileId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(nextEmail !== undefined ? { email: nextEmail } : {}),
    },
  });

  return updatedProfile;
}

function hashResetToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function createForgotPasswordToken(login: string) {
  const profile = await findProfileByLogin(login);
  if (!profile) return null;

  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.portalPasswordReset.create({
    data: {
      profileId: profile.id,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, profileId: profile.id, expiresAt };
}

export async function consumeForgotPasswordToken(rawToken: string, newPassword: string) {
  const tokenHash = hashResetToken(rawToken);
  const reset = await prisma.portalPasswordReset.findUnique({
    where: { tokenHash },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw new ApiError("Invalid or expired reset token", 400);
  }

  const passwordHash = await hashPortalPassword(newPassword);
  await prisma.$transaction([
    prisma.customerProfile.update({
      where: { id: reset.profileId },
      data: {
        passwordHash,
        portalTemporaryPassword: null,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.portalPasswordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
