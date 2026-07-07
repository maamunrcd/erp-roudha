import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteDocument, getDocumentById, updateDocument } from "@/lib/services/document.service";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  label: z.string().min(1).optional(),
  isSoftLocked: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const doc = await getDocumentById(id);
    const { searchParams } = new URL(req.url);
    if (searchParams.get("download") === "1") {
      const filePath = path.join(process.cwd(), doc.fileUrl.replace(/^\//, ""));
      const content = await readFile(filePath);
      const filename = doc.label ?? path.basename(doc.fileUrl);
      return new NextResponse(content, {
        headers: {
          "Content-Type": doc.mimeType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const doc = await updateDocument(id, body, session.user.id!);
    return NextResponse.json(doc);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteDocument(id, session.user.id!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
