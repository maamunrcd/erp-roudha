import { prisma } from "@/lib/prisma";
import { getExpenseSummary } from "@/lib/services/expense.service";
import { ShareAllocationStatus } from "@prisma/client";

export interface ProjectOverview {
  id: string;
  prefix: string;
  name: string;
  status: string;
  vendorCompany: { id: string; name: string } | null;
  totalShares: number;
  soldShares: number;
  availableShares: number;
  landBuyPrice: number;
  targetSellPrice: number;
  companyPaid: number;
  companyDue: number;
  customerCollected: number;
  customerRemaining: number;
  dealStartDate: string | null;
  dealEndDate: string | null;
  sharesSoldPercent: number;
  companyPaidPercent: number;
}

export interface CompanyOverview {
  id: string;
  name: string;
  projectCount: number;
  totalBuyPrice: number;
  totalPaid: number;
  totalDue: number;
  projects: Array<{ id: string; prefix: string; name: string; companyDue: number }>;
}

export async function getExecutiveDashboard() {
  const projects = await prisma.project.findMany({
    include: {
      vendorCompany: { select: { id: true, name: true } },
      shares: { select: { allocationStatus: true } },
      customers: {
        select: {
          paymentLedgers: {
            where: { isFrozen: false },
            select: { amountDue: true, amountPaid: true },
          },
        },
      },
    },
    orderBy: { prefix: "asc" },
  });

  const projectOverviews: ProjectOverview[] = projects.map((p) => {
    const soldShares = p.shares.filter(
      (s) =>
        s.allocationStatus === ShareAllocationStatus.ALLOCATED ||
        s.allocationStatus === ShareAllocationStatus.TRANSFERRED,
    ).length;
    const availableShares = p.shares.filter((s) => s.allocationStatus === ShareAllocationStatus.AVAILABLE).length;
    const totalShares = p.shares.length || p.totalShares;

    const customerCollected = p.customers.reduce(
      (sum, c) => sum + c.paymentLedgers.reduce((s, l) => s + l.amountPaid, 0),
      0,
    );
    const customerRemaining = p.customers.reduce(
      (sum, c) => sum + c.paymentLedgers.reduce((s, l) => s + Math.max(0, l.amountDue - l.amountPaid), 0),
      0,
    );

    const landBuyPrice = p.landBuyPrice ?? 0;
    const targetSellPrice = p.targetSellPrice ?? 0;
    const companyPaid = p.companyPaidAmount ?? 0;
    const companyDue = Math.max(0, landBuyPrice - companyPaid);

    return {
      id: p.id,
      prefix: p.prefix,
      name: p.name,
      status: p.status,
      vendorCompany: p.vendorCompany,
      totalShares,
      soldShares,
      availableShares,
      landBuyPrice,
      targetSellPrice,
      companyPaid,
      companyDue,
      customerCollected,
      customerRemaining,
      dealStartDate: p.dealStartDate?.toISOString() ?? null,
      dealEndDate: p.dealEndDate?.toISOString() ?? null,
      sharesSoldPercent: totalShares > 0 ? Math.round((soldShares / totalShares) * 100) : 0,
      companyPaidPercent: landBuyPrice > 0 ? Math.round((companyPaid / landBuyPrice) * 100) : 0,
    };
  });

  const companyMap = new Map<string, CompanyOverview>();

  for (const p of projectOverviews) {
    if (!p.vendorCompany) continue;
    const existing = companyMap.get(p.vendorCompany.id) ?? {
      id: p.vendorCompany.id,
      name: p.vendorCompany.name,
      projectCount: 0,
      totalBuyPrice: 0,
      totalPaid: 0,
      totalDue: 0,
      projects: [],
    };
    existing.projectCount += 1;
    existing.totalBuyPrice += p.landBuyPrice;
    existing.totalPaid += p.companyPaid;
    existing.totalDue += p.companyDue;
    existing.projects.push({ id: p.id, prefix: p.prefix, name: p.name, companyDue: p.companyDue });
    companyMap.set(p.vendorCompany.id, existing);
  }

  const [totalInvested, pendingMonthly, activeCount, transferredCount, expenseSummary] = await Promise.all([
    prisma.paymentLedger.aggregate({ where: { status: "PAID" }, _sum: { amountPaid: true } }),
    prisma.paymentLedger.aggregate({
      where: { purpose: "INSTALLMENT", status: { in: ["PENDING", "OVERDUE"] } },
      _sum: { amountDue: true },
    }),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count({ where: { status: "TRANSFERRED" } }),
    getExpenseSummary(),
  ]);

  const totalInflow = totalInvested._sum.amountPaid ?? 0;
  const totalProjectCosts =
    projectOverviews.reduce((s, p) => s + p.companyPaid, 0) + expenseSummary.totalProjectExpenses;
  const totalCompanyOverhead = expenseSummary.totalOverhead;
  const netLiquidity = totalInflow - totalProjectCosts - totalCompanyOverhead;

  return {
    summary: {
      totalProjects: projects.length,
      totalCompanyBuyPrice: projectOverviews.reduce((s, p) => s + p.landBuyPrice, 0),
      totalCompanyPaid: projectOverviews.reduce((s, p) => s + p.companyPaid, 0),
      totalCompanyDue: projectOverviews.reduce((s, p) => s + p.companyDue, 0),
      totalCustomerCollected: projectOverviews.reduce((s, p) => s + p.customerCollected, 0),
      totalCustomerRemaining: projectOverviews.reduce((s, p) => s + p.customerRemaining, 0),
      totalShares: projectOverviews.reduce((s, p) => s + p.totalShares, 0),
      totalSoldShares: projectOverviews.reduce((s, p) => s + p.soldShares, 0),
      totalInvested: totalInflow,
      pendingMonthly: pendingMonthly._sum.amountDue ?? 0,
      activeCustomers: activeCount,
      transferredCustomers: transferredCount,
      totalInflow,
      totalProjectCosts,
      totalCompanyOverhead,
      totalOperatingExpenses: expenseSummary.totalAll,
      netLiquidity,
      expenseByCategory: expenseSummary.byCategory,
    },
    projects: projectOverviews,
    byCompany: Array.from(companyMap.values()).sort((a, b) => b.totalDue - a.totalDue),
  };
}
