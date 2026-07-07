import { handleApiError, requireSession } from "@/lib/api-utils";
import { markOverdueLedgers } from "@/lib/services/ledger.service";
import { getExecutiveDashboard } from "@/lib/services/dashboard.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    await markOverdueLedgers();
    const dashboard = await getExecutiveDashboard();
    return NextResponse.json(dashboard);
  } catch (e) {
    return handleApiError(e);
  }
}
