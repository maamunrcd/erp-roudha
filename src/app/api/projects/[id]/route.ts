import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { getProjectDetail, updateProject, deleteProject, type CreateProjectInput } from "@/lib/services/project.service";
import { projectUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const detail = await getProjectDetail(id);
    if (!detail) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = projectUpdateSchema.parse(await req.json());
    const project = await updateProject(id, body as Partial<CreateProjectInput>);
    return NextResponse.json(project);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
