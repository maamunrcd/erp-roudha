import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function generateTrackingId(
  tx: Prisma.TransactionClient,
  projectId: string,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await tx.projectSerialCounter.upsert({
    where: { projectId_year: { projectId, year } },
    create: { projectId, year, lastSerial: 1 },
    update: { lastSerial: { increment: 1 } },
  });
  const serial = counter.lastSerial;
  return `${prefix}-${year}-${String(serial).padStart(3, "0")}`;
}
