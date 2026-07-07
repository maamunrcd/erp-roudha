import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit.service";
import { ApiError } from "@/lib/api-utils";

export interface UploadDocumentInput {
  file: Buffer;
  originalName: string;
  mimeType: string;
  label?: string;
  projectId?: string | null;
  customerId?: string | null;
  isPublic?: boolean;
  userId: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function listDocuments(filters: {
  projectId?: string;
  customerId?: string;
  isPublic?: boolean;
}) {
  const where: Record<string, unknown> = {};
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { prefix: true, name: true } },
      customer: { select: { trackingId: true, fullName: true } },
    },
  });
}

export async function uploadDocument(input: UploadDocumentInput) {
  if (!input.projectId && !input.customerId) {
    throw new ApiError("Document must be linked to a project or customer", 400);
  }

  const sha256Hash = createHash("sha256").update(input.file).digest("hex");
  const scope = input.projectId ?? input.customerId ?? "general";
  const dir = path.join(process.cwd(), "storage", "documents", scope);
  await mkdir(dir, { recursive: true });

  const safeName = sanitizeFilename(input.originalName);
  const storedName = `${sha256Hash.slice(0, 12)}-${safeName}`;
  const absolutePath = path.join(dir, storedName);
  await writeFile(absolutePath, input.file);

  const fileUrl = `/storage/documents/${scope}/${storedName}`;

  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        fileUrl,
        sha256Hash,
        label: input.label?.trim() || input.originalName,
        mimeType: input.mimeType,
        fileSize: input.file.length,
        projectId: input.projectId ?? null,
        customerId: input.customerId ?? null,
        isPublic: input.isPublic ?? false,
      },
      include: {
        project: { select: { prefix: true, name: true } },
        customer: { select: { trackingId: true, fullName: true } },
      },
    });

    await logAudit(tx, {
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: doc.id,
      userId: input.userId,
      payload: { label: doc.label, projectId: doc.projectId, isPublic: doc.isPublic },
    });

    return doc;
  });
}

export async function updateDocument(
  id: string,
  data: { label?: string; isSoftLocked?: boolean; isPublic?: boolean },
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label.trim() } : {}),
        ...(data.isSoftLocked !== undefined ? { isSoftLocked: data.isSoftLocked } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      },
    });

    await logAudit(tx, {
      action: "DOCUMENT_UPDATED",
      entityType: "Document",
      entityId: id,
      userId,
      payload: data,
    });

    return doc;
  });
}

export async function deleteDocument(id: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new ApiError("Document not found", 404);
  if (doc.isSoftLocked) throw new ApiError("Document is soft-locked and cannot be deleted", 400);

  return prisma.$transaction(async (tx) => {
    await tx.document.delete({ where: { id } });
    await logAudit(tx, {
      action: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: id,
      userId,
      payload: { label: doc.label },
    });
  });
}

export async function getDocumentById(id: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new ApiError("Document not found", 404);
  return doc;
}
