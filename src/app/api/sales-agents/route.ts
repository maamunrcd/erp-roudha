import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createSalesAgent, listSalesAgents } from "@/lib/services/sales-agent.service";
import { salesAgentSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "1";
    return NextResponse.json(await listSalesAgents(activeOnly));
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = salesAgentSchema.parse(await req.json());
    const agent = await createSalesAgent(body, session.user.id!);
    return NextResponse.json(agent, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
