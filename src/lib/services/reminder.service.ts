import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { ReminderStatus, ReminderType, type Prisma } from "@prisma/client";

export interface CreateReminderInput {
  title: string;
  type?: ReminderType;
  dueAt: string;
  notes?: string;
  leadId?: string | null;
  customerId?: string | null;
  createdByUserId: string;
}

const reminderInclude = {
  lead: { select: { id: true, fullName: true, phone: true } },
  customer: { select: { id: true, trackingId: true, fullName: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ReminderInclude;

export async function listReminders(filters: {
  status?: ReminderStatus;
  overdueOnly?: boolean;
}) {
  const now = new Date();
  return prisma.reminder.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.overdueOnly
        ? { status: ReminderStatus.PENDING, dueAt: { lt: now } }
        : {}),
    },
    include: reminderInclude,
    orderBy: { dueAt: "asc" },
  });
}

/** Manual reminders + auto installment dues for CRM inbox. */
export async function getReminderInbox() {
  const now = new Date();
  const [manual, overdueInstallments, dueLeads] = await Promise.all([
    prisma.reminder.findMany({
      where: { status: ReminderStatus.PENDING },
      include: reminderInclude,
      orderBy: { dueAt: "asc" },
      take: 100,
    }),
    prisma.paymentLedger.findMany({
      where: {
        status: { in: ["PENDING", "OVERDUE"] },
        purpose: { in: ["INSTALLMENT", "DOWNPAYMENT"] },
        isFrozen: false,
        dueDate: { lte: now },
      },
      include: {
        customer: { select: { id: true, trackingId: true, fullName: true, phone: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    }),
    prisma.lead.findMany({
      where: {
        status: { notIn: ["CONVERTED", "LOST"] },
        nextFollowUpAt: { lte: now },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        nextFollowUpAt: true,
        status: true,
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 50,
    }),
  ]);

  return {
    reminders: manual,
    installmentDues: overdueInstallments.map((row) => ({
      id: row.id,
      kind: "INSTALLMENT_DUE" as const,
      title: `${row.purpose === "DOWNPAYMENT" ? "Downpayment" : `Installment #${row.installmentIndex}`} due`,
      dueAt: row.dueDate,
      amountDue: Math.max(0, row.amountDue - row.amountPaid),
      customer: row.customer,
    })),
    leadFollowUps: dueLeads.map((lead) => ({
      id: lead.id,
      kind: "LEAD_FOLLOW_UP" as const,
      title: `Follow up: ${lead.fullName}`,
      dueAt: lead.nextFollowUpAt,
      lead,
    })),
  };
}

export async function createReminder(input: CreateReminderInput) {
  if (!input.leadId && !input.customerId) {
    // Allow standalone reminders
  }

  return prisma.reminder.create({
    data: {
      title: input.title.trim(),
      type: input.type ?? ReminderType.FOLLOW_UP,
      dueAt: new Date(input.dueAt),
      notes: input.notes?.trim() || null,
      leadId: input.leadId || null,
      customerId: input.customerId || null,
      createdByUserId: input.createdByUserId,
    },
    include: reminderInclude,
  });
}

export async function updateReminder(
  id: string,
  data: {
    title?: string;
    type?: ReminderType;
    status?: ReminderStatus;
    dueAt?: string;
    notes?: string | null;
  },
) {
  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Reminder not found", 404);

  return prisma.reminder.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.status !== undefined
        ? {
            status: data.status,
            completedAt:
              data.status === ReminderStatus.DONE
                ? new Date()
                : data.status === ReminderStatus.PENDING
                  ? null
                  : existing.completedAt,
          }
        : {}),
      ...(data.dueAt !== undefined ? { dueAt: new Date(data.dueAt) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
    },
    include: reminderInclude,
  });
}

export async function deleteReminder(id: string) {
  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Reminder not found", 404);
  await prisma.reminder.delete({ where: { id } });
}
