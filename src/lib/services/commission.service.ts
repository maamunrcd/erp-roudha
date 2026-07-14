import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { logAudit } from "@/lib/services/audit.service";
import {
  CommissionBasis,
  CommissionStatus,
  type Prisma,
} from "@prisma/client";

export interface CreateCommissionInput {
  agentId: string;
  customerId?: string | null;
  leadId?: string | null;
  projectId?: string | null;
  basis?: CommissionBasis;
  ratePercent: number;
  baseAmount: number;
  notes?: string;
  userId: string;
}

const commissionInclude = {
  agent: { select: { id: true, fullName: true, phone: true } },
  customer: { select: { id: true, trackingId: true, fullName: true } },
  lead: { select: { id: true, fullName: true, phone: true } },
  project: { select: { id: true, prefix: true, name: true } },
} satisfies Prisma.CommissionInclude;

export function calculateCommissionAmount(baseAmount: number, ratePercent: number) {
  return Math.round(baseAmount * (ratePercent / 100) * 100) / 100;
}

export async function listCommissions(filters: {
  status?: CommissionStatus;
  agentId?: string;
}) {
  return prisma.commission.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
    },
    include: commissionInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCommissionSummary() {
  const rows = await prisma.commission.groupBy({
    by: ["status"],
    _sum: { amount: true },
    _count: true,
  });
  const byStatus = Object.fromEntries(
    rows.map((r) => [r.status, { count: r._count, total: r._sum.amount ?? 0 }]),
  );
  return {
    pending: byStatus.PENDING ?? { count: 0, total: 0 },
    approved: byStatus.APPROVED ?? { count: 0, total: 0 },
    paid: byStatus.PAID ?? { count: 0, total: 0 },
    cancelled: byStatus.CANCELLED ?? { count: 0, total: 0 },
  };
}

export async function createCommission(input: CreateCommissionInput) {
  if (input.ratePercent < 0 || input.ratePercent > 100) {
    throw new ApiError("Rate must be 0–100%", 400);
  }
  if (input.baseAmount < 0) throw new ApiError("Base amount cannot be negative", 400);

  const agent = await prisma.salesAgent.findUnique({ where: { id: input.agentId } });
  if (!agent) throw new ApiError("Sales agent not found", 404);
  if (!agent.isActive) throw new ApiError("Sales agent is inactive", 400);

  const amount = calculateCommissionAmount(input.baseAmount, input.ratePercent);

  const commission = await prisma.commission.create({
    data: {
      agentId: input.agentId,
      customerId: input.customerId || null,
      leadId: input.leadId || null,
      projectId: input.projectId || null,
      basis: input.basis ?? CommissionBasis.MANUAL,
      ratePercent: input.ratePercent,
      baseAmount: input.baseAmount,
      amount,
      notes: input.notes?.trim() || null,
      status: CommissionStatus.PENDING,
    },
    include: commissionInclude,
  });

  await logAudit(prisma, {
    action: "COMMISSION_CREATED",
    entityType: "Commission",
    entityId: commission.id,
    userId: input.userId,
    payload: { amount, agentId: input.agentId, basis: commission.basis },
  });

  return commission;
}

/** Called inside enrollment transaction when agent is assigned. */
export async function createEnrollmentCommission(
  tx: Prisma.TransactionClient,
  data: {
    agentId: string;
    customerId: string;
    projectId: string;
    leadId?: string | null;
    baseAmount: number;
    basis?: CommissionBasis;
    userId: string;
  },
) {
  const agent = await tx.salesAgent.findUnique({ where: { id: data.agentId } });
  if (!agent || !agent.isActive) return null;
  if (data.baseAmount <= 0) return null;

  const ratePercent = agent.defaultCommissionPct;
  const amount = calculateCommissionAmount(data.baseAmount, ratePercent);

  const commission = await tx.commission.create({
    data: {
      agentId: data.agentId,
      customerId: data.customerId,
      projectId: data.projectId,
      leadId: data.leadId || null,
      basis: data.basis ?? CommissionBasis.DOWNPAYMENT,
      ratePercent,
      baseAmount: data.baseAmount,
      amount,
      notes: `Auto from enrollment (${data.basis ?? "DOWNPAYMENT"})`,
      status: CommissionStatus.PENDING,
    },
  });

  await logAudit(tx, {
    action: "COMMISSION_AUTO_ENROLLMENT",
    entityType: "Commission",
    entityId: commission.id,
    userId: data.userId,
    payload: { amount, ratePercent, customerId: data.customerId },
  });

  return commission;
}

export async function updateCommissionStatus(
  id: string,
  status: CommissionStatus,
  userId: string,
) {
  const existing = await prisma.commission.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Commission not found", 404);

  const commission = await prisma.commission.update({
    where: { id },
    data: {
      status,
      paidAt: status === CommissionStatus.PAID ? new Date() : status === CommissionStatus.PENDING ? null : existing.paidAt,
    },
    include: commissionInclude,
  });

  await logAudit(prisma, {
    action: "COMMISSION_STATUS_UPDATED",
    entityType: "Commission",
    entityId: id,
    userId,
    payload: { from: existing.status, to: status },
  });

  return commission;
}

export async function deleteCommission(id: string, userId: string) {
  const existing = await prisma.commission.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Commission not found", 404);
  if (existing.status === CommissionStatus.PAID) {
    throw new ApiError("Paid commissions cannot be deleted", 400);
  }
  await prisma.commission.delete({ where: { id } });
  await logAudit(prisma, {
    action: "COMMISSION_DELETED",
    entityType: "Commission",
    entityId: id,
    userId,
    payload: { amount: existing.amount },
  });
}
