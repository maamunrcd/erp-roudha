import { handleApiError, requireSession, requireWriteRole } from "@/lib/api-utils";
import { deleteExpense, getExpenseById, updateExpense } from "@/lib/services/expense.service";
import { expenseUpdateSchema } from "@/lib/validators/schemas";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const expense = await getExpenseById(id);
    return NextResponse.json(expense);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    const body = expenseUpdateSchema.parse(await req.json());
    const expense = await updateExpense(id, {
      ...body,
      userId: session.user.id!,
    });
    return NextResponse.json(expense);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    requireWriteRole(session.user.role);
    const { id } = await params;
    await deleteExpense(id, session.user.id!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
