import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import { FlatStatus } from "@prisma/client";

const flatInclude = {
  project: { select: { id: true, prefix: true, name: true } },
  customer: { select: { id: true, trackingId: true, fullName: true, shareCount: true } },
  shareLinks: {
    include: { share: { select: { id: true, shareNumber: true } } },
  },
} as const;

export async function listFlats(filters: { projectId?: string; status?: FlatStatus }) {
  return prisma.flat.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: flatInclude,
    orderBy: [{ building: "asc" }, { floor: "asc" }, { code: "asc" }],
  });
}

export async function createFlat(input: {
  projectId: string;
  code: string;
  building?: string;
  floor?: number | null;
  flatNumber?: string;
  sizeSqft?: number | null;
  bedrooms?: number | null;
  status?: FlatStatus;
  notes?: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new ApiError("Project not found", 404);

  try {
    return await prisma.flat.create({
      data: {
        projectId: input.projectId,
        code: input.code.trim().toUpperCase(),
        building: input.building?.trim() || null,
        floor: input.floor ?? null,
        flatNumber: input.flatNumber?.trim() || null,
        sizeSqft: input.sizeSqft ?? null,
        bedrooms: input.bedrooms ?? null,
        status: input.status ?? FlatStatus.PLANNED,
        notes: input.notes?.trim() || null,
      },
      include: flatInclude,
    });
  } catch {
    throw new ApiError(`Flat code ${input.code} already exists in this project`, 400);
  }
}

export async function updateFlat(
  id: string,
  input: Partial<{
    code: string;
    building: string | null;
    floor: number | null;
    flatNumber: string | null;
    sizeSqft: number | null;
    bedrooms: number | null;
    status: FlatStatus;
    notes: string | null;
  }>,
) {
  const existing = await prisma.flat.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Flat not found", 404);

  return prisma.flat.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.building !== undefined ? { building: input.building?.trim() || null } : {}),
      ...(input.floor !== undefined ? { floor: input.floor } : {}),
      ...(input.flatNumber !== undefined ? { flatNumber: input.flatNumber?.trim() || null } : {}),
      ...(input.sizeSqft !== undefined ? { sizeSqft: input.sizeSqft } : {}),
      ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
    include: flatInclude,
  });
}

export async function allocateFlat(input: {
  flatId: string;
  customerId: string;
  shareIds?: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const flat = await tx.flat.findUnique({ where: { id: input.flatId } });
    if (!flat) throw new ApiError("Flat not found", 404);
    if (flat.status === FlatStatus.HANDED_OVER) {
      throw new ApiError("Flat already handed over", 400);
    }

    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
      include: { shareAllocations: { where: { isActive: true } } },
    });
    if (!customer) throw new ApiError("Customer not found", 404);
    if (customer.projectId !== flat.projectId) {
      throw new ApiError("Customer and flat must belong to the same project", 400);
    }

    const shareIds =
      input.shareIds && input.shareIds.length > 0
        ? input.shareIds
        : customer.shareAllocations.map((a) => a.shareId);

    for (const shareId of shareIds) {
      const owned = customer.shareAllocations.some((a) => a.shareId === shareId);
      if (!owned) throw new ApiError("Customer does not hold one of the selected shares", 400);
      const conflict = await tx.flatShareLink.findUnique({ where: { shareId } });
      if (conflict && conflict.flatId !== flat.id) {
        throw new ApiError("A share is already linked to another flat", 400);
      }
    }

    await tx.flatShareLink.deleteMany({ where: { flatId: flat.id } });
    if (shareIds.length) {
      await tx.flatShareLink.createMany({
        data: shareIds.map((shareId) => ({ flatId: flat.id, shareId })),
      });
    }

    return tx.flat.update({
      where: { id: flat.id },
      data: {
        customerId: customer.id,
        status: FlatStatus.ALLOCATED,
      },
      include: flatInclude,
    });
  });
}

export async function unallocateFlat(flatId: string) {
  return prisma.$transaction(async (tx) => {
    const flat = await tx.flat.findUnique({ where: { id: flatId } });
    if (!flat) throw new ApiError("Flat not found", 404);
    if (flat.status === FlatStatus.HANDED_OVER) {
      throw new ApiError("Cannot unallocate a handed-over flat", 400);
    }
    await tx.flatShareLink.deleteMany({ where: { flatId } });
    return tx.flat.update({
      where: { id: flatId },
      data: { customerId: null, status: FlatStatus.AVAILABLE },
      include: flatInclude,
    });
  });
}

export async function deleteFlat(id: string) {
  const flat = await prisma.flat.findUnique({ where: { id } });
  if (!flat) throw new ApiError("Flat not found", 404);
  if (flat.customerId || flat.status === FlatStatus.HANDED_OVER) {
    throw new ApiError("Cannot delete an allocated or handed-over flat", 400);
  }
  await prisma.flat.delete({ where: { id } });
}
