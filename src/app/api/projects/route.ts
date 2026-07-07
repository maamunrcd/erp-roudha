import { prisma } from "@/lib/prisma";
import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createProject, type CreateProjectInput } from "@/lib/services/project.service";
import { projectSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const projects = await prisma.project.findMany({
      include: { _count: { select: { shares: true, customers: true } } },
      orderBy: { prefix: "asc" },
    });
    return NextResponse.json(projects);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = projectSchema.parse(await req.json());
    const project = await createProject(body as CreateProjectInput);
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
