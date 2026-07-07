"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/i18n/format";
import { PURPOSE_LABELS } from "@/features/payments/utils/purpose-labels";
import { BRAND } from "@/lib/constants/brand";
import { PortalDashboardSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { LogOut, Download, Settings } from "lucide-react";
import { PaymentJourneyCard } from "@/features/portal/components/PaymentJourneyCard";
import { PortalDocuments } from "@/features/portal/components/PortalDocuments";

interface ProjectSummary {
  customerId: string;
  projectId: string;
  prefix: string;
  name: string;
  trackingId: string;
  shareCount: number;
  status: string;
  totalPaid: number;
  remaining: number;
  progressPercent: number;
  journeyMilestone: string;
}

interface EnrollmentDetail {
  customerId: string;
  trackingId: string;
  fullName: string;
  status: string;
  settlementStatus: string;
  shareCount: number;
  project: { name: string; prefix: string; installmentMonths: number };
  downpaymentStatus: string;
  paidInstallments: number;
  totalInstallments: number;
  totalPaid: number;
  remaining: number;
  progressPercent: number;
  journeyMilestone: string;
  ledger: Array<{
    id: string;
    purpose: string;
    installmentIndex: number | null;
    amountDue: number;
    amountPaid: number;
    status: string;
    dueDate: string | null;
  }>;
  receipts: Array<{
    receiptSlNo: number;
    purpose: string;
    installmentIndex: number | null;
    amount: number;
    issuedAt: string;
  }>;
}

interface PortalData {
  fullName: string;
  phone: string;
  email: string | null;
  projects: ProjectSummary[];
  summary: {
    projectCount: number;
    totalShares: number;
    totalPaid: number;
    totalRemaining: number;
    totalDue: number;
    overallProgressPercent: number;
    journeyMilestone: string;
  };
  address: string | null;
  enrollment: EnrollmentDetail | null;
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<"en" | "bn">("en");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(
    async (customerId?: string) => {
      setLoading(true);
      const url = customerId ? `/api/portal/me?customerId=${customerId}` : "/api/portal/me";
      const r = await fetch(url);
      if (r.status === 401) {
        router.push("/portal/login");
        return;
      }
      const d = await r.json();
      if (r.status === 403 && d.code === "PASSWORD_CHANGE_REQUIRED") {
        router.push("/portal/change-password");
        return;
      }
      if (!r.ok) {
        setError(d.error ?? "Failed to load account");
        setLoading(false);
        return;
      }
      if (!Array.isArray(d.projects)) {
        setError("Invalid account data. Please sign in again.");
        router.push("/portal/login");
        return;
      }
      setData(d);
      setError("");
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    loadData(selectedCustomerId || undefined);
  }, [loadData, selectedCustomerId]);

  const logout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
    router.refresh();
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-text">
        <p>{error}</p>
        <Button onClick={() => router.push("/portal/login")}>Sign in again</Button>
      </div>
    );
  }

  if (!data || loading) {
    return <PortalDashboardSkeleton />;
  }

  const viewingAll = !selectedCustomerId;
  const enrollment = data.enrollment;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs text-emerald">Customer Portal</p>
            <h1 className="text-lg font-semibold">{BRAND.nameEn}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === "en" ? "bn" : "en")}
              className="rounded border border-card-border px-2 py-1 text-xs text-muted-text hover:text-foreground"
            >
              {locale === "en" ? "বাংলা" : "EN"}
            </button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={14} className="mr-1" /> Sign out
            </Button>
            <Link
              href="/portal/settings"
              className="inline-flex items-center gap-1 rounded border border-card-border px-2 py-1 text-xs text-muted-text hover:text-foreground"
            >
              <Settings size={12} /> Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{data.fullName}</h2>
            <p className="text-sm text-muted-text">{data.phone}</p>
            {data.email && <p className="text-sm text-muted-text">{data.email}</p>}
          </div>
          <div className="min-w-[200px]">
            <label htmlFor="project" className="mb-1 block text-xs text-muted-text">
              Project
            </label>
            <select
              id="project"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              <option value="">All projects ({data.projects.length})</option>
              {data.projects.map((p) => (
                <option key={p.customerId} value={p.customerId}>
                  {p.prefix} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {viewingAll ? (
          <>
            <PaymentJourneyCard
              progressPercent={data.summary.overallProgressPercent}
              milestone={data.summary.journeyMilestone}
              totalPaid={data.summary.totalPaid}
              remaining={data.summary.totalRemaining}
              locale={locale}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardTitle>Projects</CardTitle>
                <CardValue>{data.summary.projectCount}</CardValue>
              </Card>
              <Card>
                <CardTitle>Total Shares</CardTitle>
                <CardValue>{data.summary.totalShares}</CardValue>
              </Card>
              <Card>
                <CardTitle>Remaining</CardTitle>
                <CardValue className="text-gold">{formatCurrency(data.summary.totalRemaining, locale)}</CardValue>
              </Card>
            </div>

            <section className="space-y-3">
              <h3 className="text-lg font-medium">Your Projects</h3>
              {data.projects.map((p) => (
                <Card key={p.customerId} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-emerald">{p.prefix}</p>
                    <p>{p.name}</p>
                    <p className="text-xs text-muted-text">
                      {p.shareCount} share{p.shareCount !== 1 ? "s" : ""} · {p.status} · {p.progressPercent}%
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-emerald">{formatCurrency(p.totalPaid, locale)} paid</p>
                    <p className="text-gold">{formatCurrency(p.remaining, locale)} due</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1"
                      onClick={() => setSelectedCustomerId(p.customerId)}
                    >
                      View details
                    </Button>
                  </div>
                </Card>
              ))}
            </section>

            <PortalDocuments />
          </>
        ) : (
          enrollment && <ProjectDetail enrollment={enrollment} locale={locale} />
        )}
      </main>
    </div>
  );
}

function ProjectDetail({ enrollment, locale }: { enrollment: EnrollmentDetail; locale: "en" | "bn" }) {
  const installments = enrollment.ledger.filter((l) => l.purpose === "INSTALLMENT");
  const otherFees = enrollment.ledger.filter((l) => !["DOWNPAYMENT", "INSTALLMENT"].includes(l.purpose));

  return (
    <>
      <PaymentJourneyCard
        progressPercent={enrollment.progressPercent}
        milestone={enrollment.journeyMilestone}
        totalPaid={enrollment.totalPaid}
        remaining={enrollment.remaining}
        locale={locale}
        paidInstallments={enrollment.paidInstallments}
        totalInstallments={enrollment.totalInstallments}
      />

      <div>
        <p className="font-mono text-emerald-light">{enrollment.trackingId}</p>
        <p className="text-sm text-muted-text">{enrollment.project.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Shares</CardTitle>
          <CardValue>{enrollment.shareCount}</CardValue>
        </Card>
        <Card>
          <CardTitle>Downpayment</CardTitle>
          <CardValue className={enrollment.downpaymentStatus === "PAID" ? "text-emerald" : "text-gold"}>
            {enrollment.downpaymentStatus}
          </CardValue>
        </Card>
        <Card>
          <CardTitle>Installments</CardTitle>
          <CardValue>
            {enrollment.paidInstallments}/{enrollment.totalInstallments}
          </CardValue>
        </Card>
        <Card>
          <CardTitle>Remaining</CardTitle>
          <CardValue className="text-gold">{formatCurrency(enrollment.remaining, locale)}</CardValue>
        </Card>
      </div>

      <section>
        <h3 className="mb-3 text-lg font-medium">Installment Schedule</h3>
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-2">{row.installmentIndex}</td>
                  <td className="px-4 py-2">{formatCurrency(row.amountDue, locale)}</td>
                  <td className="px-4 py-2">{formatCurrency(row.amountPaid, locale)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        row.status === "PAID"
                          ? "bg-emerald/20 text-emerald"
                          : row.status === "OVERDUE"
                            ? "bg-red-900/30 text-red-400"
                            : "bg-gold/20 text-gold"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-text">
                    {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {otherFees.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-medium">Other Payments</h3>
          <div className="space-y-2">
            {otherFees.map((row) => (
              <Card key={row.id} className="flex items-center justify-between py-3">
                <span>{PURPOSE_LABELS[row.purpose]?.[locale] ?? row.purpose}</span>
                <span className={row.status === "PAID" ? "text-emerald" : "text-gold"}>
                  {formatCurrency(row.amountPaid, locale)} / {formatCurrency(row.amountDue, locale)} — {row.status}
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-lg font-medium">Payment Receipts</h3>
        {enrollment.receipts.length === 0 ? (
          <p className="text-sm text-muted-text">No receipts yet.</p>
        ) : (
          <div className="space-y-2">
            {enrollment.receipts.map((r) => (
              <Card key={r.receiptSlNo} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Receipt #{r.receiptSlNo}</p>
                  <p className="text-xs text-muted-text">
                    {PURPOSE_LABELS[r.purpose]?.[locale] ?? r.purpose}
                    {r.installmentIndex ? ` — Month ${r.installmentIndex}` : ""} ·{" "}
                    {formatCurrency(r.amount, locale)}
                  </p>
                  <p className="text-xs text-muted-text">{new Date(r.issuedAt).toLocaleString()}</p>
                </div>
                <a
                  href={`/api/portal/receipt?slNo=${r.receiptSlNo}`}
                  download
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald/30 px-3 py-1.5 text-xs text-emerald hover:bg-emerald/10"
                >
                  <Download size={14} /> Download
                </a>
              </Card>
            ))}
          </div>
        )}
      </section>

      <PortalDocuments customerId={enrollment.customerId} />
    </>
  );
}
