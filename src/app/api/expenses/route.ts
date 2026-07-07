import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { createExpense, listExpenses } from "@/lib/services/expense.service";
import { expenseSchema } from "@/lib/validators/schemas";
import type { ExpenseCategory } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as ExpenseCategory | null;
    const isProjectExpense = searchParams.get("isProjectExpense");
    const projectId = searchParams.get("projectId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const expenses = await listExpenses({
      ...(category ? { category } : {}),
      ...(isProjectExpense !== null && isProjectExpense !== ""
        ? { isProjectExpense: isProjectExpense === "true" }
        : {}),
      ...(projectId ? { projectId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });

    return NextResponse.json(expenses);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const body = expenseSchema.parse(await req.json());
    const expense = await createExpense({
      ...body,
      userId: session.user.id!,
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
