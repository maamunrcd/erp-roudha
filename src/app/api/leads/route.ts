import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createLead, listLeads } from "@/lib/services/lead.service";
import { leadSchema } from "@/lib/validators/schemas";
import { LeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeadStatus | null;
    const search = searchParams.get("search") ?? undefined;
    const leads = await listLeads({
      ...(status ? { status } : {}),
      search,
    });
    return NextResponse.json(leads);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = leadSchema.parse(await req.json());
    const lead = await createLead(body, session.user.id!);
    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
