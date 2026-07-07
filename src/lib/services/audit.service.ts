import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function nextReceiptSlNo(tx: Prisma.TransactionClient): Promise<number> {
  const counter = await tx.receiptCounter.upsert({
    where: { id: "global" },
    create: { id: "global", lastSerial: 1 },
    update: { lastSerial: { increment: 1 } },
  });
  return counter.lastSerial;
}

export async function logAudit(
  tx: Prisma.TransactionClient,
  data: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    payload?: Record<string, unknown>;
    ipAddress?: string;
  },
) {
  await tx.auditLog.create({
    data: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      payload: JSON.stringify(data.payload ?? {}),
      ipAddress: data.ipAddress,
    },
  });
}
