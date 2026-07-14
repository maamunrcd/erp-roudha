import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";

export async function listLandValuations(projectId?: string) {
  return prisma.landValuation.findMany({
    where: projectId ? { projectId } : undefined,
    include: {
      project: { select: { id: true, prefix: true, name: true, landBuyPrice: true, targetSellPrice: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { valuedAt: "desc" },
  });
}

export async function createLandValuation(input: {
  projectId: string;
  valuedAt: string;
  landValue: number;
  notes?: string;
  recordedByUserId: string;
}) {
  if (input.landValue < 0) throw new ApiError("Land value cannot be negative", 400);
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new ApiError("Project not found", 404);

  return prisma.landValuation.create({
    data: {
      projectId: input.projectId,
      valuedAt: new Date(input.valuedAt),
      landValue: input.landValue,
      notes: input.notes?.trim() || null,
      recordedByUserId: input.recordedByUserId,
    },
    include: {
      project: { select: { id: true, prefix: true, name: true, landBuyPrice: true, targetSellPrice: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });
}

export async function deleteLandValuation(id: string) {
  const row = await prisma.landValuation.findUnique({ where: { id } });
  if (!row) throw new ApiError("Valuation not found", 404);
  await prisma.landValuation.delete({ where: { id } });
}

export async function getLandValueGrowth(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError("Project not found", 404);
  const rows = await prisma.landValuation.findMany({
    where: { projectId },
    orderBy: { valuedAt: "asc" },
  });
  const buy = project.landBuyPrice ?? 0;
  const latest = rows.length ? rows[rows.length - 1].landValue : buy;
  const growthPct = buy > 0 ? Math.round(((latest - buy) / buy) * 1000) / 10 : null;
  return {
    buyPrice: buy,
    targetSellPrice: project.targetSellPrice,
    latestValue: latest,
    growthPct,
    points: [
      ...(buy > 0
        ? [{ at: project.dealStartDate ?? project.createdAt, value: buy, label: "Purchase" }]
        : []),
      ...rows.map((r) => ({ at: r.valuedAt, value: r.landValue, label: "Valuation" })),
    ],
  };
}
