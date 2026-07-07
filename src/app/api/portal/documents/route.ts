import { getPortalSession } from "@/lib/portal-auth";
import { listDocuments } from "@/lib/services/document.service";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const downloadId = searchParams.get("id");
  const customerId = searchParams.get("customerId");

  if (downloadId) {
    const doc = await prisma.document.findFirst({
      where: { id: downloadId, isPublic: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.projectId) {
      const enrolled = await prisma.customer.count({
        where: { profileId: session.profileId, projectId: doc.projectId },
      });
      if (!enrolled) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const filePath = path.join(process.cwd(), doc.fileUrl.replace(/^\//, ""));
    const content = await readFile(filePath);
    return new NextResponse(content, {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.label ?? "document"}"`,
      },
    });
  }

  const enrollments = await prisma.customer.findMany({
    where: { profileId: session.profileId },
    select: { projectId: true },
  });
  const projectIds = [...new Set(enrollments.map((e) => e.projectId))];

  const docs = await listDocuments({ isPublic: true });
  const visible = docs.filter(
    (d) =>
      d.projectId &&
      projectIds.includes(d.projectId) &&
      (!customerId || d.customerId === null || d.customerId === customerId),
  );

  return NextResponse.json(
    visible.map((d) => ({
      id: d.id,
      label: d.label,
      project: d.project,
      createdAt: d.createdAt,
      isSoftLocked: d.isSoftLocked,
    })),
  );
}
