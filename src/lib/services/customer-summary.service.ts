import { prisma } from "@/lib/prisma";
import type { PaymentLedger, Prisma } from "@prisma/client";
import { PaymentStatus } from "@prisma/client";

export function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "").replace(/^\+88/, "");
}

export function groupEnrollmentsByProfileProject<
  T extends {
    id: string;
    profileId: string | null;
    phone: string;
    projectId: string;
    shareCount: number;
    totalPaid: number;
    remaining: number;
    totalDue: number;
    overdueAmount: number;
    paidInstallments: number;
    shareAllocations: unknown[];
    createdAt: Date;
    status: string;
    trackingId: string;
    mergedEnrollmentIds?: string[];
  },
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  const sorted = [...rows].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const row of sorted) {
    const key = `${row.profileId ?? normalizePhone(row.phone)}::${row.projectId}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, mergedEnrollmentIds: [row.id] });
      continue;
    }

    map.set(key, {
      ...existing,
      shareCount: existing.shareCount + row.shareCount,
      totalPaid: existing.totalPaid + row.totalPaid,
      remaining: existing.remaining + row.remaining,
      totalDue: existing.totalDue + row.totalDue,
      overdueAmount: existing.overdueAmount + row.overdueAmount,
      paidInstallments: existing.paidInstallments + row.paidInstallments,
      shareAllocations: [...existing.shareAllocations, ...row.shareAllocations],
      mergedEnrollmentIds: [...(existing.mergedEnrollmentIds ?? [existing.id]), row.id],
      status:
        existing.status === "ACTIVE" || row.status === "ACTIVE"
          ? "ACTIVE"
          : existing.status,
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function summarizeLedgers(ledgers: Pick<PaymentLedger, "amountDue" | "amountPaid" | "status">[]) {
  const totalDue = ledgers.reduce((s, l) => s + l.amountDue, 0);
  const totalPaid = ledgers.reduce((s, l) => s + l.amountPaid, 0);
  const remaining = Math.max(0, totalDue - totalPaid);
  const overdueRows = ledgers.filter((l) => l.status === PaymentStatus.OVERDUE);
  const overdueAmount = overdueRows.reduce((s, l) => s + Math.max(0, l.amountDue - l.amountPaid), 0);
  return { totalDue, totalPaid, remaining, overdueAmount, overdueCount: overdueRows.length };
}

export async function getCustomerFinancials(customerId: string) {
  const ledgers = await prisma.paymentLedger.findMany({
    where: { customerId, isFrozen: false },
  });
  return summarizeLedgers(ledgers);
}

export async function findOrCreateProfile(
  tx: Prisma.TransactionClient,
  data: { fullName: string; phone: string; email?: string; nid?: string; address?: string },
) {
  const phone = normalizePhone(data.phone);
  const existing = await tx.customerProfile.findUnique({ where: { phone } });
  if (existing) {
    return tx.customerProfile.update({
      where: { id: existing.id },
      data: {
        fullName: data.fullName,
        email: data.email ?? existing.email,
        nid: data.nid ?? existing.nid,
        address: data.address ?? existing.address,
      },
    });
  }
  return tx.customerProfile.create({
    data: {
      fullName: data.fullName,
      phone,
      email: data.email,
      nid: data.nid,
      address: data.address,
    },
  });
}
