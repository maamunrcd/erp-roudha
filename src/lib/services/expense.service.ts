import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit.service";
import { ApiError } from "@/lib/api-utils";
import type { ApprovingPartner, ExpenseCategory } from "@prisma/client";

export interface CreateExpenseInput {
  voucherNo: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  expenseDate: string;
  isProjectExpense: boolean;
  projectId?: string | null;
  approvedBy: ApprovingPartner;
  userId: string;
}

export interface UpdateExpenseInput {
  voucherNo?: string;
  category?: ExpenseCategory;
  description?: string | null;
  amount?: number;
  expenseDate?: string;
  isProjectExpense?: boolean;
  projectId?: string | null;
  approvedBy?: ApprovingPartner;
  userId: string;
}

export interface ExpenseFilters {
  category?: ExpenseCategory;
  isProjectExpense?: boolean;
  projectId?: string;
  from?: string;
  to?: string;
}

export async function listExpenses(filters: ExpenseFilters = {}) {
  const where: Record<string, unknown> = {};

  if (filters.category) where.category = filters.category;
  if (filters.isProjectExpense !== undefined) where.isProjectExpense = filters.isProjectExpense;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.from || filters.to) {
    where.expenseDate = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  return prisma.companyExpense.findMany({
    where,
    include: {
      project: { select: { id: true, prefix: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getExpenseById(id: string) {
  const expense = await prisma.companyExpense.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, prefix: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });
  if (!expense) throw new ApiError("Expense not found", 404);
  return expense;
}

async function validateProjectLink(isProjectExpense: boolean, projectId?: string | null) {
  if (isProjectExpense && !projectId) {
    throw new ApiError("Project expenses must be linked to a project", 400);
  }
  if (!isProjectExpense && projectId) {
    throw new ApiError("Overhead expenses cannot be linked to a project", 400);
  }
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError("Project not found", 404);
  }
}

export async function createExpense(input: CreateExpenseInput) {
  await validateProjectLink(input.isProjectExpense, input.projectId);

  const existing = await prisma.companyExpense.findUnique({
    where: { voucherNo: input.voucherNo.trim() },
  });
  if (existing) throw new ApiError("Voucher number already exists", 400);

  return prisma.$transaction(async (tx) => {
    const expense = await tx.companyExpense.create({
      data: {
        voucherNo: input.voucherNo.trim(),
        category: input.category,
        description: input.description?.trim() || null,
        amount: input.amount,
        expenseDate: new Date(input.expenseDate),
        isProjectExpense: input.isProjectExpense,
        projectId: input.isProjectExpense ? input.projectId : null,
        approvedBy: input.approvedBy,
        recordedByUserId: input.userId,
      },
      include: {
        project: { select: { id: true, prefix: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    await logAudit(tx, {
      action: "EXPENSE_CREATED",
      entityType: "CompanyExpense",
      entityId: expense.id,
      userId: input.userId,
      payload: { voucherNo: expense.voucherNo, amount: expense.amount, category: expense.category },
    });

    return expense;
  });
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const current = await getExpenseById(id);

  const isProjectExpense = input.isProjectExpense ?? current.isProjectExpense;
  const projectId = input.projectId !== undefined ? input.projectId : current.projectId;
  await validateProjectLink(isProjectExpense, projectId);

  if (input.voucherNo && input.voucherNo.trim() !== current.voucherNo) {
    const dup = await prisma.companyExpense.findUnique({
      where: { voucherNo: input.voucherNo.trim() },
    });
    if (dup) throw new ApiError("Voucher number already exists", 400);
  }

  return prisma.$transaction(async (tx) => {
    const expense = await tx.companyExpense.update({
      where: { id },
      data: {
        ...(input.voucherNo !== undefined ? { voucherNo: input.voucherNo.trim() } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.expenseDate !== undefined ? { expenseDate: new Date(input.expenseDate) } : {}),
        ...(input.isProjectExpense !== undefined ? { isProjectExpense: input.isProjectExpense } : {}),
        ...(input.projectId !== undefined || input.isProjectExpense !== undefined
          ? { projectId: isProjectExpense ? projectId : null }
          : {}),
        ...(input.approvedBy !== undefined ? { approvedBy: input.approvedBy } : {}),
      },
      include: {
        project: { select: { id: true, prefix: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    await logAudit(tx, {
      action: "EXPENSE_UPDATED",
      entityType: "CompanyExpense",
      entityId: expense.id,
      userId: input.userId,
    });

    return expense;
  });
}

export async function deleteExpense(id: string, userId: string) {
  const expense = await getExpenseById(id);

  return prisma.$transaction(async (tx) => {
    await tx.companyExpense.delete({ where: { id } });
    await logAudit(tx, {
      action: "EXPENSE_DELETED",
      entityType: "CompanyExpense",
      entityId: id,
      userId,
      payload: { voucherNo: expense.voucherNo, amount: expense.amount },
    });
  });
}

export async function getExpenseSummary() {
  const [overhead, projectTagged, byCategory] = await Promise.all([
    prisma.companyExpense.aggregate({
      where: { isProjectExpense: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.companyExpense.aggregate({
      where: { isProjectExpense: true },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.companyExpense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    totalOverhead: overhead._sum.amount ?? 0,
    overheadCount: overhead._count,
    totalProjectExpenses: projectTagged._sum.amount ?? 0,
    projectExpenseCount: projectTagged._count,
    totalAll: (overhead._sum.amount ?? 0) + (projectTagged._sum.amount ?? 0),
    byCategory: byCategory.map((row) => ({
      category: row.category,
      total: row._sum.amount ?? 0,
      count: row._count,
    })),
  };
}
