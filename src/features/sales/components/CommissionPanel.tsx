"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/i18n/format";
import {
  COMMISSION_BASIS_OPTIONS,
  COMMISSION_STATUS_OPTIONS,
  commissionBasisLabel,
  commissionStatusClass,
  commissionStatusLabel,
} from "@/lib/constants/commission";

interface AgentOption {
  id: string;
  fullName: string;
  defaultCommissionPct: number;
}

interface CommissionRow {
  id: string;
  basis: string;
  status: string;
  ratePercent: number;
  baseAmount: number;
  amount: number;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  agent: { id: string; fullName: string; phone: string };
  customer: { id: string; trackingId: string; fullName: string } | null;
  project: { id: string; prefix: string; name: string } | null;
}

interface Summary {
  pending: { count: number; total: number };
  approved: { count: number; total: number };
  paid: { count: number; total: number };
  cancelled: { count: number; total: number };
}

export function CommissionPanel() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    agentId: "",
    basis: "MANUAL",
    ratePercent: "2",
    baseAmount: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (agentFilter) params.set("agentId", agentFilter);
    const [listRes, sumRes, agentRes] = await Promise.all([
      fetch(`/api/commissions?${params}`),
      fetch("/api/commissions?summary=1"),
      fetch("/api/sales-agents?active=1"),
    ]);
    if (listRes.ok) {
      const data = await listRes.json();
      setRows(Array.isArray(data) ? data : []);
    }
    if (sumRes.ok) setSummary(await sumRes.json());
    if (agentRes.ok) {
      const data = await agentRes.json();
      setAgents(
        (Array.isArray(data) ? data : []).map((a: AgentOption) => ({
          id: a.id,
          fullName: a.fullName,
          defaultCommissionPct: a.defaultCommissionPct,
        })),
      );
    }
    setLoading(false);
  }, [statusFilter, agentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const agent = agents.find((a) => a.id === form.agentId);
    if (agent && !form.ratePercent) {
      setForm((f) => ({ ...f, ratePercent: String(agent.defaultCommissionPct) }));
    }
  }, [form.agentId, agents, form.ratePercent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: form.agentId,
        basis: form.basis,
        ratePercent: Number(form.ratePercent),
        baseAmount: Number(form.baseAmount),
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create commission");
      return;
    }
    setForm({ agentId: "", basis: "MANUAL", ratePercent: "2", baseAmount: "", notes: "" });
    await load();
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/commissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Update failed");
      return;
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this commission?")) return;
    const res = await fetch(`/api/commissions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  const preview =
    form.baseAmount && form.ratePercent
      ? Math.round(Number(form.baseAmount) * (Number(form.ratePercent) / 100) * 100) / 100
      : 0;

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Pending", summary.pending, "text-gold"],
              ["Approved", summary.approved, "text-blue-300"],
              ["Paid", summary.paid, "text-emerald"],
              ["Cancelled", summary.cancelled, "text-muted-text"],
            ] as const
          ).map(([label, bucket, color]) => (
            <Card key={label}>
              <p className="text-xs uppercase text-muted-text">{label}</p>
              <p className={`mt-1 text-xl font-semibold ${color}`}>{formatCurrency(bucket.total, "en")}</p>
              <p className="text-xs text-muted-text">{bucket.count} entries</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardTitle className="mb-4">Manual commission entry</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="comm-agent">Agent</Label>
            <select
              id="comm-agent"
              value={form.agentId}
              onChange={(e) => {
                const agent = agents.find((a) => a.id === e.target.value);
                setForm({
                  ...form,
                  agentId: e.target.value,
                  ratePercent: agent ? String(agent.defaultCommissionPct) : form.ratePercent,
                });
              }}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
              required
            >
              <option value="">Select agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} ({a.defaultCommissionPct}%)
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="comm-basis">Basis</Label>
            <select
              id="comm-basis"
              value={form.basis}
              onChange={(e) => setForm({ ...form, basis: e.target.value })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              {COMMISSION_BASIS_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="comm-rate">Rate %</Label>
            <Input
              id="comm-rate"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.ratePercent}
              onChange={(e) => setForm({ ...form, ratePercent: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="comm-base">Base amount (BDT)</Label>
            <Input
              id="comm-base"
              type="number"
              min={0}
              value={form.baseAmount}
              onChange={(e) => setForm({ ...form, baseAmount: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="comm-notes">Notes</Label>
            <Input
              id="comm-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-muted-text">
              Commission: <span className="font-medium text-gold">{formatCurrency(preview, "en")}</span>
            </p>
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-4">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving || !form.agentId}>
              {saving ? "Saving…" : "Add commission"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {COMMISSION_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Basis</th>
              <th className="px-4 py-3">Calc</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-text">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-text">
                  No commissions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.agent.fullName}</p>
                    <p className="text-xs text-muted-text">{row.project?.prefix ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.customer ? (
                      <Link
                        href={`/admin/customers/${row.customer.id}/edit`}
                        className="font-mono text-xs text-emerald-light hover:underline"
                      >
                        {row.customer.trackingId}
                      </Link>
                    ) : (
                      <span className="text-muted-text">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{commissionBasisLabel(row.basis)}</td>
                  <td className="px-4 py-3 text-xs text-muted-text">
                    {row.ratePercent}% of {formatCurrency(row.baseAmount, "en")}
                  </td>
                  <td className="px-4 py-3 font-medium text-gold">{formatCurrency(row.amount, "en")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${commissionStatusClass(row.status)}`}>
                      {commissionStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => setStatus(row.id, "APPROVED")}
                          className="text-xs text-emerald hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      {(row.status === "PENDING" || row.status === "APPROVED") && (
                        <button
                          type="button"
                          onClick={() => setStatus(row.id, "PAID")}
                          className="text-xs text-gold hover:underline"
                        >
                          Mark paid
                        </button>
                      )}
                      {row.status !== "PAID" && row.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() => setStatus(row.id, "CANCELLED")}
                          className="text-xs text-muted-text hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      {row.status !== "PAID" && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
