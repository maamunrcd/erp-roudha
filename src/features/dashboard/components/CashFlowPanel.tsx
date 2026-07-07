"use client";

import { formatCurrency } from "@/lib/i18n/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants/expense-categories";
import type { ExpenseCategory } from "@prisma/client";

interface CashFlowProps {
  totalInflow: number;
  totalProjectCosts: number;
  totalCompanyOverhead: number;
  netLiquidity: number;
  expenseByCategory: Array<{ category: ExpenseCategory; total: number; count: number }>;
}

export function CashFlowPanel({
  totalInflow,
  totalProjectCosts,
  totalCompanyOverhead,
  netLiquidity,
  expenseByCategory,
}: CashFlowProps) {
  const rows = [
    { label: "Total Inflow (customer payments)", value: totalInflow, sign: "+" as const, color: "text-emerald" },
    { label: "Project costs (land paid + dev expenses)", value: totalProjectCosts, sign: "−" as const, color: "text-red-400" },
    { label: "Company overhead", value: totalCompanyOverhead, sign: "−" as const, color: "text-gold" },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Net Liquidity</h2>
        <p className="text-xs text-muted-text">
          Inflow − Project costs − Company overhead = Net liquidity
        </p>
      </div>

      <Card className="border-emerald/20 bg-surface-alt/30">
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-text">
                <span className="mr-2 font-mono text-xs">{row.sign}</span>
                {row.label}
              </span>
              <span className={`font-medium ${row.color}`}>{formatCurrency(row.value, "en")}</span>
            </div>
          ))}
          <div className="border-t border-card-border pt-3 flex items-center justify-between">
            <span className="font-medium">Net liquidity</span>
            <span className={`text-xl font-semibold ${netLiquidity >= 0 ? "text-emerald" : "text-red-400"}`}>
              {formatCurrency(netLiquidity, "en")}
            </span>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-alt">
          <div className="flex h-full">
            {totalInflow > 0 && (
              <div
                className="bg-emerald/80"
                style={{ width: `${Math.min(100, (totalInflow / (totalInflow + totalProjectCosts + totalCompanyOverhead || 1)) * 100)}%` }}
              />
            )}
            {totalProjectCosts > 0 && (
              <div
                className="bg-red-500/70"
                style={{ width: `${Math.min(100, (totalProjectCosts / (totalInflow + totalProjectCosts + totalCompanyOverhead || 1)) * 100)}%` }}
              />
            )}
            {totalCompanyOverhead > 0 && (
              <div
                className="bg-gold/80"
                style={{ width: `${Math.min(100, (totalCompanyOverhead / (totalInflow + totalProjectCosts + totalCompanyOverhead || 1)) * 100)}%` }}
              />
            )}
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-[10px] text-muted-text">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald" /> Inflow</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Project</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gold" /> Overhead</span>
        </div>
      </Card>

      {expenseByCategory.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {expenseByCategory.map((row) => (
            <Card key={row.category} className="py-3">
              <CardTitle className="text-[10px]">{EXPENSE_CATEGORY_LABELS[row.category].en}</CardTitle>
              <p className="mt-1 text-lg font-semibold text-gold">{formatCurrency(row.total, "en")}</p>
              <p className="text-xs text-muted-text">{row.count} entries</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
