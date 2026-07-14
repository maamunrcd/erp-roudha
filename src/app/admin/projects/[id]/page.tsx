"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/i18n/format";
import { ProjectDetailSkeleton } from "@/components/ui/Skeleton";
import { ProjectCustomerTable, type ProjectCustomerRow } from "@/features/projects/components/ProjectCustomerTable";
import { ProjectOverviewChart } from "@/features/dashboard/components/ProjectOverviewChart";
import { ShareInventoryGrid, type ShareGridItem } from "@/features/projects/components/ShareInventoryGrid";
import { DocumentVault } from "@/features/documents/components/DocumentVault";

interface ProjectDetail {
  project: {
    id: string;
    prefix: string;
    name: string;
    nameBn?: string;
    status: string;
    installmentMonths: number;
    totalShares: number;
    publicShares: number;
    vendorCompany?: { id: string; name: string; phone?: string } | null;
    landBuyPrice?: number | null;
    targetSellPrice?: number | null;
    companyPaidAmount?: number;
    companyDue?: number;
    dealStartDate?: string | null;
    dealEndDate?: string | null;
    acquisitionNotes?: string | null;
  };
  stats: {
    sharesSold: number;
    sharesAvailable: number;
    sharesTotal: number;
    customerCount: number;
    totalDue: number;
    totalPaid: number;
    remaining: number;
  };
  customers: ProjectCustomerRow[];
  shares: ShareGridItem[];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this project? Only allowed when no customers are enrolled.")) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/admin/projects");
      return;
    }
    const data = await res.json();
    alert(data.error ?? "Delete failed");
  };

  if (loading) return <ProjectDetailSkeleton />;
  if (!detail?.project) return <p className="text-red-400">Project not found</p>;

  const { project, stats, customers, shares } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-text">{project.prefix}</p>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.nameBn && <p className="font-bengali text-muted-text">{project.nameBn}</p>}
          <p className="mt-1 text-sm text-muted-text">Status: {project.status} · {project.installmentMonths}-month plan</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/projects/${id}/customers/new`}>
            <Button>Add customer</Button>
          </Link>
          <Link href={`/admin/projects/${id}/edit`}>
            <Button variant="ghost">Edit</Button>
          </Link>
          <Link href={`/admin/land-value`}>
            <Button variant="ghost">Land value</Button>
          </Link>
          <Link href={`/admin/developers`}>
            <Button variant="ghost">Developers</Button>
          </Link>
          <Link href={`/admin/flats`}>
            <Button variant="ghost">Flats</Button>
          </Link>
          <Link href={`/admin/handovers`}>
            <Button variant="ghost">Handovers</Button>
          </Link>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Shares sold</CardTitle>
          <CardValue>{stats.sharesSold} / {stats.sharesTotal}</CardValue>
        </Card>
        <Card>
          <CardTitle>Company due</CardTitle>
          <CardValue className="text-red-400">{formatCurrency(project.companyDue ?? 0, "en")}</CardValue>
          <p className="mt-1 text-xs text-muted-text">
            Paid {formatCurrency(project.companyPaidAmount ?? 0, "en")} of {formatCurrency(project.landBuyPrice ?? 0, "en")}
          </p>
        </Card>
        <Card>
          <CardTitle>Customers</CardTitle>
          <CardValue>{stats.customerCount}</CardValue>
        </Card>
        <Card>
          <CardTitle>Collected</CardTitle>
          <CardValue>{formatCurrency(stats.totalPaid, "en")}</CardValue>
          <p className="mt-1 text-xs text-muted-text">Remaining {formatCurrency(stats.remaining, "en")}</p>
        </Card>
      </div>

      {project.vendorCompany && (
        <Card>
          <CardTitle>Land Company</CardTitle>
          <p className="mt-2 text-lg font-medium text-gold">{project.vendorCompany.name}</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-text">Buy price</p>
              <p>{formatCurrency(project.landBuyPrice ?? 0, "en")}</p>
            </div>
            <div>
              <p className="text-muted-text">Target sell</p>
              <p>{formatCurrency(project.targetSellPrice ?? 0, "en")}</p>
            </div>
            <div>
              <p className="text-muted-text">Deal period</p>
              <p>
                {project.dealStartDate ? new Date(project.dealStartDate).toLocaleDateString() : "—"}
                {" → "}
                {project.dealEndDate ? new Date(project.dealEndDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-text">Company due</p>
              <p className="text-red-400">{formatCurrency(project.companyDue ?? 0, "en")}</p>
            </div>
          </div>
          {project.acquisitionNotes && (
            <p className="mt-3 text-xs text-muted-text">{project.acquisitionNotes}</p>
          )}
        </Card>
      )}

      <ProjectOverviewChart
        project={{
          id: project.id,
          prefix: project.prefix,
          name: project.name,
          status: project.status,
          vendorCompany: project.vendorCompany ?? null,
          totalShares: stats.sharesTotal,
          soldShares: stats.sharesSold,
          availableShares: stats.sharesAvailable,
          landBuyPrice: project.landBuyPrice ?? 0,
          targetSellPrice: project.targetSellPrice ?? 0,
          companyPaid: project.companyPaidAmount ?? 0,
          companyDue: project.companyDue ?? 0,
          customerCollected: stats.totalPaid,
          customerRemaining: stats.remaining,
          dealStartDate: project.dealStartDate ?? null,
          dealEndDate: project.dealEndDate ?? null,
          sharesSoldPercent: stats.sharesTotal > 0 ? Math.round((stats.sharesSold / stats.sharesTotal) * 100) : 0,
          companyPaidPercent:
            (project.landBuyPrice ?? 0) > 0
              ? Math.round(((project.companyPaidAmount ?? 0) / (project.landBuyPrice ?? 1)) * 100)
              : 0,
        }}
      />

      <section>
        <h2 className="mb-3 text-lg font-medium">Share inventory</h2>
        <Card>
          <ShareInventoryGrid shares={shares} />
        </Card>
      </section>

      <DocumentVault projectId={project.id} />

      <div>
        <h2 className="mb-3 text-lg font-medium">Customer ledger</h2>
        <ProjectCustomerTable customers={customers} projectPrefix={project.prefix} />
      </div>
    </div>
  );
}
