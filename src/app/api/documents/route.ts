import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteDocument, listDocuments, updateDocument, uploadDocument } from "@/lib/services/document.service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const isPublic = searchParams.get("isPublic");
    const docs = await listDocuments({
      projectId,
      customerId,
      ...(isPublic !== null && isPublic !== "" ? { isPublic: isPublic === "true" } : {}),
    });
    return NextResponse.json(docs);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await uploadDocument({
      file: buffer,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      label: (form.get("label") as string) || undefined,
      projectId: (form.get("projectId") as string) || null,
      customerId: (form.get("customerId") as string) || null,
      isPublic: form.get("isPublic") === "true",
      userId: session.user.id!,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
