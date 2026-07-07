import { handleApiError, requireSession } from "@/lib/api-utils";
import { getExpenseSummary } from "@/lib/services/expense.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireSession();
    const summary = await getExpenseSummary();
    return NextResponse.json(summary);
  } catch (e) {
    return handleApiError(e);
  }
}
