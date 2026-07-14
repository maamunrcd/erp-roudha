import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import {
  createDeveloperAgreement,
  listDeveloperAgreements,
} from "@/lib/services/developer-agreement.service";
import { developerAgreementSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    return NextResponse.json(await listDeveloperAgreements(projectId));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = developerAgreementSchema.parse(await req.json());
    const row = await createDeveloperAgreement(body);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
