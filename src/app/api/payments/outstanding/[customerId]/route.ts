import { handleApiError, requireSession } from "@/lib/api-utils";
import { calculateOutstanding } from "@/lib/services/settlement.service";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    await requireSession();
    const { customerId } = await params;
    const includeOptionalFees = new URL(_req.url).searchParams.get("includeOptionalFees") === "true";
    const breakdown = await calculateOutstanding(customerId, includeOptionalFees);
    return NextResponse.json(breakdown);
  } catch (e) {
    return handleApiError(e);
  }
}
