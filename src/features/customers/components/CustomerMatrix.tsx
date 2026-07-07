"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PaymentEntryModal } from "@/features/payments/components/PaymentEntryModal";
import { formatCurrency } from "@/lib/i18n/format";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { customerStatusClass, customerStatusLabel } from "@/lib/constants/customer-status";
import { CustomerStatusSelect } from "@/features/customers/components/CustomerStatusSelect";

interface ProjectBadge {
  trackingId: string;
  prefix: string;
  isCurrent: boolean;
}

interface CustomerRow {
  id: string;
  trackingId: string;
  fullName: string;
  phone: string;
  shareCount: number;
  downpaymentStatus: string;
  paidInstallments: number;
  totalInstallments: number;
  totalDue: number;
  totalPaid: number;
  remaining: number;
  overdueAmount: number;
  status: string;
  settlementStatus: string;
  allProjects: ProjectBadge[];
  project: { prefix: string; name: string };
  contract?: { pricingMode: string };
}

interface ProjectOption {
  id: string;
  prefix: string;
  name: string;
}

export function CustomerMatrix() {
  const searchParams = useSearchParams();
  const [prefix, setPrefix] = useState(searchParams.get("prefix") ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [paymentCustomer, setPaymentCustomer] = useState<CustomerRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((list: ProjectOption[]) => setProjects(list));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (prefix) params.set("prefix", prefix);
    if (search) params.set("search", search);
    fetch(`/api/customers?${params}`)
      .then(async (r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [prefix, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const filteredRows = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

  const handleDelete = async (row: CustomerRow) => {
    if (!confirm(`Delete enrollment ${row.trackingId} for ${row.fullName}? Shares will be released. Only allowed with no payments.`)) {
      return;
    }
    setDeletingId(row.id);
    const res = await fetch(`/api/customers/${row.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Label htmlFor="project">Project</Label>
          <Select
            id="project"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="max-w-xs"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.prefix}>
                {p.prefix} — {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[220px]">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Name, phone, NID, tracking ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="min-w-[180px]">
          <Label htmlFor="statusFilter">Filter status</Label>
          <CustomerStatusSelect
            id="statusFilter"
            value={statusFilter}
            onChange={setStatusFilter}
            allowAll
          />
        </div>
        <Button variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <TableSkeleton rows={8} cols={9} />
      ) : (
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
            <tr>
              <th className="px-4 py-3">Tracking ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Shares</th>
              <th className="px-4 py-3">Total paid</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Installments</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className="border-t border-card-border hover:bg-surface-alt/50">
                <td className="px-4 py-3 font-mono text-emerald-light">{r.trackingId}</td>
                <td className="px-4 py-3">
                  <p>{r.fullName}</p>
                  <p className="text-xs text-muted-text">{r.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.allProjects ?? [{ prefix: r.project.prefix, trackingId: r.trackingId, isCurrent: true }]).map((p) => (
                      <span
                        key={p.trackingId}
                        className={`rounded px-2 py-0.5 text-xs font-mono ${
                          p.isCurrent ? "bg-emerald/20 text-emerald" : "bg-surface-alt text-muted-text"
                        }`}
                        title={p.trackingId}
                      >
                        {p.prefix}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{r.shareCount} share{r.shareCount !== 1 ? "s" : ""}</td>
                <td className="px-4 py-3 text-emerald">{formatCurrency(r.totalPaid, "en")}</td>
                <td className="px-4 py-3 text-gold">{formatCurrency(r.remaining, "en")}</td>
                <td className="px-4 py-3">
                  {r.paidInstallments}/{r.totalInstallments}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${customerStatusClass(r.status)}`}>
                    {customerStatusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" onClick={() => setPaymentCustomer(r)}>
                      Pay
                    </Button>
                    <Link href={`/admin/customers/${r.id}/edit`}>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={deletingId === r.id}
                      onClick={() => handleDelete(r)}
                    >
                      {deletingId === r.id ? "…" : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredRows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-text">No customers found.</p>
        )}
      </div>
      )}
      {paymentCustomer && (
        <PaymentEntryModal
          customer={paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={() => {
            setPaymentCustomer(null);
            load();
          }}
        />
      )}
    </div>
  );
}
