"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/i18n/format";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ProjectOverview } from "@/lib/services/dashboard.service";

function MetricBar({
  label,
  percent,
  detail,
  color,
}: {
  label: string;
  percent: number;
  detail: string;
  color: "emerald" | "gold" | "red";
}) {
  const fill =
    color === "emerald" ? "bg-emerald" : color === "gold" ? "bg-gold" : "bg-red-400";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-text">{label}</span>
        <span className="font-medium text-foreground">{detail}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function ProjectOverviewChart({ project }: { project: ProjectOverview }) {
  const collectionTotal = project.customerCollected + project.customerRemaining;
  const collectedPercent =
    collectionTotal > 0 ? Math.round((project.customerCollected / collectionTotal) * 100) : 0;

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-emerald!">{project.prefix}</CardTitle>
            <span className="text-xs text-muted-text">{project.status}</span>
          </div>
          <p className="mt-0.5 font-medium">{project.name}</p>
        </div>
        <Link href={`/admin/projects/${project.id}`}>
          <Button size="sm" variant="ghost">
            Details
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <MetricBar
          label="Shares sold"
          percent={project.sharesSoldPercent}
          detail={`${project.soldShares} / ${project.totalShares}`}
          color="emerald"
        />
        <MetricBar
          label="Land paid"
          percent={project.companyPaidPercent}
          detail={`${formatCurrency(project.companyPaid, "en")} paid`}
          color="emerald"
        />
        <MetricBar
          label="Collected"
          percent={collectedPercent}
          detail={`${formatCurrency(project.customerCollected, "en")} · ${formatCurrency(project.customerRemaining, "en")} due`}
          color="gold"
        />
      </div>
    </Card>
  );
}
