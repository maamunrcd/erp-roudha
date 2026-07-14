import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { logAudit } from "@/lib/services/audit.service";
import { normalizePhone } from "@/lib/services/customer-summary.service";

export interface CreateSalesAgentInput {
  fullName: string;
  phone: string;
  email?: string;
  isActive?: boolean;
  defaultCommissionPct?: number;
  notes?: string;
  userId?: string | null;
}

export type UpdateSalesAgentInput = Partial<CreateSalesAgentInput>;

export async function listSalesAgents(activeOnly = false) {
  return prisma.salesAgent.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: {
      _count: { select: { customers: true, leads: true, commissions: true } },
    },
    orderBy: { fullName: "asc" },
  });
}

export async function getSalesAgentById(id: string) {
  const agent = await prisma.salesAgent.findUnique({
    where: { id },
    include: {
      _count: { select: { customers: true, leads: true, commissions: true } },
      commissions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          customer: { select: { trackingId: true, fullName: true } },
          project: { select: { prefix: true } },
        },
      },
    },
  });
  if (!agent) throw new ApiError("Sales agent not found", 404);
  return agent;
}

export async function createSalesAgent(input: CreateSalesAgentInput, userId: string) {
  const pct = input.defaultCommissionPct ?? 2;
  if (pct < 0 || pct > 100) throw new ApiError("Commission % must be 0–100", 400);

  const agent = await prisma.salesAgent.create({
    data: {
      fullName: input.fullName.trim(),
      phone: normalizePhone(input.phone),
      email: input.email?.toLowerCase() || null,
      isActive: input.isActive ?? true,
      defaultCommissionPct: pct,
      notes: input.notes?.trim() || null,
      userId: input.userId || null,
    },
  });

  await logAudit(prisma, {
    action: "SALES_AGENT_CREATED",
    entityType: "SalesAgent",
    entityId: agent.id,
    userId,
    payload: { name: agent.fullName, rate: agent.defaultCommissionPct },
  });

  return agent;
}

export async function updateSalesAgent(id: string, input: UpdateSalesAgentInput, userId: string) {
  await getSalesAgentById(id);
  if (input.defaultCommissionPct !== undefined && (input.defaultCommissionPct < 0 || input.defaultCommissionPct > 100)) {
    throw new ApiError("Commission % must be 0–100", 400);
  }

  const agent = await prisma.salesAgent.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
      ...(input.email !== undefined ? { email: input.email?.toLowerCase() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.defaultCommissionPct !== undefined ? { defaultCommissionPct: input.defaultCommissionPct } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.userId !== undefined ? { userId: input.userId || null } : {}),
    },
  });

  await logAudit(prisma, {
    action: "SALES_AGENT_UPDATED",
    entityType: "SalesAgent",
    entityId: id,
    userId,
    payload: input,
  });

  return agent;
}

export async function deleteSalesAgent(id: string, userId: string) {
  const agent = await getSalesAgentById(id);
  const openCommissions = await prisma.commission.count({
    where: { agentId: id, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (openCommissions > 0) {
    throw new ApiError("Cannot delete agent with pending/approved commissions — deactivate instead", 400);
  }

  await prisma.salesAgent.delete({ where: { id } });
  await logAudit(prisma, {
    action: "SALES_AGENT_DELETED",
    entityType: "SalesAgent",
    entityId: id,
    userId,
    payload: { name: agent.fullName },
  });
}
