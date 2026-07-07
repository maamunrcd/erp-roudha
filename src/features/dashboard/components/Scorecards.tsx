"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/i18n/format";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { ProjectOverviewChart } from "@/features/dashboard/components/ProjectOverviewChart";
import { CashFlowPanel } from "@/features/dashboard/components/CashFlowPanel";
import { useEffect, useState } from "react";
import type { CompanyOverview, ProjectOverview } from "@/lib/services/dashboard.service";
import type { ExpenseCategory } from "@prisma/client";

interface DashboardData {
  summary: {
    totalProjects: number;
    totalCompanyBuyPrice: number;
    totalCompanyPaid: number;
    totalCompanyDue: number;
    totalCustomerCollected: number;
    totalCustomerRemaining: number;
    totalShares: number;
    totalSoldShares: number;
    totalInvested: number;
    pendingMonthly: number;
    activeCustomers: number;
    transferredCustomers: number;
    totalInflow: number;
    totalProjectCosts: number;
    totalCompanyOverhead: number;
    totalOperatingExpenses: number;
    netLiquidity: number;
    expenseByCategory: Array<{ category: ExpenseCategory; total: number; count: number }>;
  };
  projects: ProjectOverview[];
  byCompany: CompanyOverview[];
}

export function Scorecards() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <DashboardSkeleton />;

  const { summary, projects, byCompany } = data;

  const cards = [
    { title: "Total Projects", value: String(summary.totalProjects) },
    { title: "Company Due (All)", value: formatCurrency(summary.totalCompanyDue, "en"), accent: "text-red-400" },
    { title: "Company Paid", value: formatCurrency(summary.totalCompanyPaid, "en"), accent: "text-emerald" },
    { title: "Shares Sold", value: `${summary.totalSoldShares} / ${summary.totalShares}` },
    { title: "Customer Collected", value: formatCurrency(summary.totalCustomerCollected, "en"), accent: "text-emerald" },
    { title: "Customer Remaining", value: formatCurrency(summary.totalCustomerRemaining, "en"), accent: "text-gold" },
    { title: "Active Customers", value: String(summary.activeCustomers) },
    { title: "Pending Installments", value: formatCurrency(summary.pendingMonthly, "en"), accent: "text-gold" },
  ];

  return (
    <div className="space-y-8">
      <CashFlowPanel
        totalInflow={summary.totalInflow}
        totalProjectCosts={summary.totalProjectCosts}
        totalCompanyOverhead={summary.totalCompanyOverhead}
        netLiquidity={summary.netLiquidity}
        expenseByCategory={summary.expenseByCategory}
      />

      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {cards.map((c) => (
          <motion.div key={c.title} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card>
              <CardTitle>{c.title}</CardTitle>
              <CardValue className={c.accent}>{c.value}</CardValue>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {byCompany.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Company-wise Overview</h2>
          <div className="overflow-x-auto rounded-xl border border-card-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Projects</th>
                  <th className="px-4 py-3">Total buy price</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Project breakdown</th>
                </tr>
              </thead>
              <tbody>
                {byCompany.map((c) => (
                  <tr key={c.id} className="border-t border-card-border">
                    <td className="px-4 py-3 font-medium text-gold">{c.name}</td>
                    <td className="px-4 py-3">{c.projectCount}</td>
                    <td className="px-4 py-3">{formatCurrency(c.totalBuyPrice, "en")}</td>
                    <td className="px-4 py-3 text-emerald">{formatCurrency(c.totalPaid, "en")}</td>
                    <td className="px-4 py-3 text-red-400">{formatCurrency(c.totalDue, "en")}</td>
                    <td className="px-4 py-3 text-xs text-muted-text">
                      {c.projects.map((p) => (
                        <Link key={p.id} href={`/admin/projects/${p.id}`} className="mr-2 hover:text-emerald">
                          {p.prefix} ({formatCurrency(p.companyDue, "en")} due)
                        </Link>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Project Overview</h2>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted-text">
            No projects yet.{" "}
            <Link href="/admin/projects/new" className="text-emerald hover:underline">
              Create your first project
            </Link>{" "}
            to see inventory and collections here.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((p) => (
              <ProjectOverviewChart key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
