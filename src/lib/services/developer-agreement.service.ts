import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-utils";
import type { DeveloperAgreementStatus } from "@prisma/client";

export async function listDeveloperAgreements(projectId?: string) {
  return prisma.developerAgreement.findMany({
    where: projectId ? { projectId } : undefined,
    include: { project: { select: { id: true, prefix: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDeveloperAgreement(input: {
  projectId: string;
  developerName: string;
  contactPhone?: string;
  contactEmail?: string;
  signedAt?: string | null;
  ourSharePercent?: number | null;
  developerSharePercent?: number | null;
  constructionStart?: string | null;
  expectedCompletion?: string | null;
  status?: DeveloperAgreementStatus;
  milestones?: unknown[];
  notes?: string;
}) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new ApiError("Project not found", 404);

  return prisma.developerAgreement.create({
    data: {
      projectId: input.projectId,
      developerName: input.developerName.trim(),
      contactPhone: input.contactPhone?.trim() || null,
      contactEmail: input.contactEmail?.toLowerCase() || null,
      signedAt: input.signedAt ? new Date(input.signedAt) : null,
      ourSharePercent: input.ourSharePercent ?? null,
      developerSharePercent: input.developerSharePercent ?? null,
      constructionStart: input.constructionStart ? new Date(input.constructionStart) : null,
      expectedCompletion: input.expectedCompletion ? new Date(input.expectedCompletion) : null,
      status: input.status ?? "DRAFT",
      milestones: JSON.stringify(input.milestones ?? []),
      notes: input.notes?.trim() || null,
    },
    include: { project: { select: { id: true, prefix: true, name: true } } },
  });
}

export async function updateDeveloperAgreement(
  id: string,
  input: Partial<{
    developerName: string;
    contactPhone: string | null;
    contactEmail: string | null;
    signedAt: string | null;
    ourSharePercent: number | null;
    developerSharePercent: number | null;
    constructionStart: string | null;
    expectedCompletion: string | null;
    status: DeveloperAgreementStatus;
    milestones: unknown[];
    notes: string | null;
  }>,
) {
  const existing = await prisma.developerAgreement.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Agreement not found", 404);

  return prisma.developerAgreement.update({
    where: { id },
    data: {
      ...(input.developerName !== undefined ? { developerName: input.developerName.trim() } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone?.trim() || null } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail?.toLowerCase() || null } : {}),
      ...(input.signedAt !== undefined ? { signedAt: input.signedAt ? new Date(input.signedAt) : null } : {}),
      ...(input.ourSharePercent !== undefined ? { ourSharePercent: input.ourSharePercent } : {}),
      ...(input.developerSharePercent !== undefined
        ? { developerSharePercent: input.developerSharePercent }
        : {}),
      ...(input.constructionStart !== undefined
        ? { constructionStart: input.constructionStart ? new Date(input.constructionStart) : null }
        : {}),
      ...(input.expectedCompletion !== undefined
        ? { expectedCompletion: input.expectedCompletion ? new Date(input.expectedCompletion) : null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.milestones !== undefined ? { milestones: JSON.stringify(input.milestones) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
    include: { project: { select: { id: true, prefix: true, name: true } } },
  });
}

export async function deleteDeveloperAgreement(id: string) {
  const existing = await prisma.developerAgreement.findUnique({ where: { id } });
  if (!existing) throw new ApiError("Agreement not found", 404);
  await prisma.developerAgreement.delete({ where: { id } });
}
