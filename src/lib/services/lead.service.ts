import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { logAudit } from "@/lib/services/audit.service";
import { normalizePhone } from "@/lib/services/customer-summary.service";
import { LeadSource, LeadStatus, type Prisma } from "@prisma/client";

export interface CreateLeadInput {
  fullName: string;
  phone: string;
  email?: string;
  source?: LeadSource;
  status?: LeadStatus;
  interestNotes?: string;
  projectId?: string | null;
  assignedToUserId?: string | null;
  salesAgentId?: string | null;
  nextFollowUpAt?: string | null;
  siteVisitAt?: string | null;
  siteVisitNotes?: string | null;
  lostReason?: string | null;
}

export type UpdateLeadInput = Partial<CreateLeadInput>;

const leadInclude = {
  project: { select: { id: true, prefix: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  salesAgent: { select: { id: true, fullName: true, phone: true } },
  convertedCustomer: { select: { id: true, trackingId: true } },
} satisfies Prisma.LeadInclude;

export async function listLeads(filters: { status?: LeadStatus; search?: string }) {
  return prisma.lead.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { fullName: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: leadInclude,
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id }, include: leadInclude });
  if (!lead) throw new ApiError("Lead not found", 404);
  return lead;
}

export async function createLead(input: CreateLeadInput, userId: string) {
  const lead = await prisma.lead.create({
    data: {
      fullName: input.fullName.trim(),
      phone: normalizePhone(input.phone),
      email: input.email?.toLowerCase() || null,
      source: input.source ?? LeadSource.PHONE,
      status: input.status ?? LeadStatus.NEW,
      interestNotes: input.interestNotes?.trim() || null,
      projectId: input.projectId || null,
      assignedToUserId: input.assignedToUserId || null,
      salesAgentId: input.salesAgentId || null,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null,
      siteVisitAt: input.siteVisitAt ? new Date(input.siteVisitAt) : null,
      siteVisitNotes: input.siteVisitNotes?.trim() || null,
      lostReason: input.lostReason?.trim() || null,
    },
    include: leadInclude,
  });

  await logAudit(prisma, {
    action: "LEAD_CREATED",
    entityType: "Lead",
    entityId: lead.id,
    userId,
    payload: { phone: lead.phone, status: lead.status },
  });

  return lead;
}

export async function updateLead(id: string, input: UpdateLeadInput, userId: string) {
  await getLeadById(id);

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
      ...(input.email !== undefined ? { email: input.email?.toLowerCase() || null } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.interestNotes !== undefined ? { interestNotes: input.interestNotes?.trim() || null } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId || null } : {}),
      ...(input.assignedToUserId !== undefined ? { assignedToUserId: input.assignedToUserId || null } : {}),
      ...(input.salesAgentId !== undefined ? { salesAgentId: input.salesAgentId || null } : {}),
      ...(input.nextFollowUpAt !== undefined
        ? { nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null }
        : {}),
      ...(input.siteVisitAt !== undefined
        ? { siteVisitAt: input.siteVisitAt ? new Date(input.siteVisitAt) : null }
        : {}),
      ...(input.siteVisitNotes !== undefined ? { siteVisitNotes: input.siteVisitNotes?.trim() || null } : {}),
      ...(input.lostReason !== undefined ? { lostReason: input.lostReason?.trim() || null } : {}),
    },
    include: leadInclude,
  });

  await logAudit(prisma, {
    action: "LEAD_UPDATED",
    entityType: "Lead",
    entityId: id,
    userId,
    payload: input,
  });

  return lead;
}

export async function markLeadConverted(
  id: string,
  customerId: string,
  userId: string,
) {
  const lead = await getLeadById(id);
  if (lead.status === LeadStatus.CONVERTED) {
    throw new ApiError("Lead already converted", 400);
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError("Customer not found", 404);

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      status: LeadStatus.CONVERTED,
      convertedCustomerId: customerId,
    },
    include: leadInclude,
  });

  await logAudit(prisma, {
    action: "LEAD_CONVERTED",
    entityType: "Lead",
    entityId: id,
    userId,
    payload: { customerId, trackingId: customer.trackingId },
  });

  return updated;
}

export async function deleteLead(id: string, userId: string) {
  const lead = await getLeadById(id);
  if (lead.status === LeadStatus.CONVERTED) {
    throw new ApiError("Converted leads cannot be deleted", 400);
  }
  await prisma.lead.delete({ where: { id } });
  await logAudit(prisma, {
    action: "LEAD_DELETED",
    entityType: "Lead",
    entityId: id,
    userId,
    payload: { phone: lead.phone },
  });
}
