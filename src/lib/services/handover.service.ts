import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { FlatStatus, HandoverStatus, RegistrationStage } from "@prisma/client";

const handoverInclude = {
  project: { select: { id: true, prefix: true, name: true } },
  customer: { select: { id: true, trackingId: true, fullName: true, phone: true, registrationStage: true } },
  flat: { select: { id: true, code: true, building: true, floor: true } },
  recordedBy: { select: { id: true, name: true } },
} as const;

export async function listHandovers(filters: { projectId?: string; status?: HandoverStatus }) {
  return prisma.handover.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: handoverInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertHandover(input: {
  customerId: string;
  flatId?: string | null;
  status?: HandoverStatus;
  keysDelivered?: boolean;
  documentsDelivered?: boolean;
  snagNotes?: string | null;
  notes?: string | null;
  handedOverAt?: string | null;
  recordedByUserId: string;
}) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new ApiError("Customer not found", 404);

  let flatId = input.flatId;
  if (flatId) {
    const flat = await prisma.flat.findUnique({ where: { id: flatId } });
    if (!flat) throw new ApiError("Flat not found", 404);
    if (flat.projectId !== customer.projectId) {
      throw new ApiError("Flat must belong to the customer's project", 400);
    }
  } else {
    const allocated = await prisma.flat.findFirst({
      where: { customerId: customer.id },
    });
    flatId = allocated?.id ?? null;
  }

  const status = input.status ?? HandoverStatus.IN_PROGRESS;
  const completed = status === HandoverStatus.COMPLETED;

  const handover = await prisma.$transaction(async (tx) => {
    const row = await tx.handover.upsert({
      where: { customerId: customer.id },
      create: {
        projectId: customer.projectId,
        customerId: customer.id,
        flatId: flatId || null,
        status,
        keysDelivered: input.keysDelivered ?? false,
        documentsDelivered: input.documentsDelivered ?? false,
        snagNotes: input.snagNotes?.trim() || null,
        notes: input.notes?.trim() || null,
        handedOverAt: completed
          ? input.handedOverAt
            ? new Date(input.handedOverAt)
            : new Date()
          : null,
        recordedByUserId: input.recordedByUserId,
      },
      update: {
        ...(flatId !== undefined ? { flatId: flatId || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.keysDelivered !== undefined ? { keysDelivered: input.keysDelivered } : {}),
        ...(input.documentsDelivered !== undefined
          ? { documentsDelivered: input.documentsDelivered }
          : {}),
        ...(input.snagNotes !== undefined ? { snagNotes: input.snagNotes?.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(completed
          ? {
              handedOverAt: input.handedOverAt ? new Date(input.handedOverAt) : new Date(),
            }
          : input.status === HandoverStatus.NOT_STARTED || input.status === HandoverStatus.IN_PROGRESS
            ? { handedOverAt: null }
            : {}),
        recordedByUserId: input.recordedByUserId,
      },
      include: handoverInclude,
    });

    if (completed) {
      if (flatId) {
        await tx.flat.update({
          where: { id: flatId },
          data: { status: FlatStatus.HANDED_OVER, customerId: customer.id },
        });
      }
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          registrationStage: RegistrationStage.HANDOVER_DONE,
          registrationUpdatedAt: new Date(),
          status: "COMPLETED",
        },
      });
    }

    return row;
  });

  return handover;
}

export async function deleteHandover(id: string) {
  const row = await prisma.handover.findUnique({ where: { id } });
  if (!row) throw new ApiError("Handover not found", 404);
  if (row.status === HandoverStatus.COMPLETED) {
    throw new ApiError("Completed handovers cannot be deleted", 400);
  }
  await prisma.handover.delete({ where: { id } });
}
