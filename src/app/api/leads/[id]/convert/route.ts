import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { markLeadConverted } from "@/lib/services/lead.service";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const convertSchema = z.object({
  customerId: z.string().min(1),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = convertSchema.parse(await req.json());
    const lead = await markLeadConverted(id, body.customerId, session.user.id!);
    return NextResponse.json(lead);
  } catch (e) {
    return handleApiError(e);
  }
}
