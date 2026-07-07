"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/i18n/format";
import {
  APPROVING_PARTNER_LABELS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
} from "@/lib/constants/expense-categories";
import type { ApprovingPartner, ExpenseCategory } from "@prisma/client";

interface ProjectOption {
  id: string;
  prefix: string;
  name: string;
}

interface ExpenseRow {
  id: string;
  voucherNo: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expenseDate: string;
  isProjectExpense: boolean;
  approvedBy: ApprovingPartner;
  project: { id: string; prefix: string; name: string } | null;
  recordedBy: { name: string };
}

const emptyForm = {
  voucherNo: "",
  category: "OFFICE_OPERATIONS" as ExpenseCategory,
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  isProjectExpense: false,
  projectId: "",
  approvedBy: "ADMIN" as ApprovingPartner,
};

export function ExpensePanel() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<"all" | "overhead" | "project">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === "overhead") params.set("isProjectExpense", "false");
    if (filter === "project") params.set("isProjectExpense", "true");
    const [expRes, projRes] = await Promise.all([
      fetch(`/api/expenses?${params}`),
      fetch("/api/projects"),
    ]);
    setExpenses(await expRes.json());
    const projData = await projRes.json();
    setProjects(
      (Array.isArray(projData) ? projData : []).map((p: { id: string; prefix: string; name: string }) => ({
        id: p.id,
        prefix: p.prefix,
        name: p.name,
      })),
    );
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voucherNo: form.voucherNo,
        category: form.category,
        description: form.description || undefined,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        isProjectExpense: form.isProjectExpense,
        projectId: form.isProjectExpense ? form.projectId : null,
        approvedBy: form.approvedBy,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save expense");
      return;
    }
    setForm(emptyForm);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense entry?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    await load();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">Record expense</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="voucherNo">Voucher no.</Label>
            <Input
              id="voucherNo"
              value={form.voucherNo}
              onChange={(e) => setForm({ ...form, voucherNo: e.target.value })}
              placeholder="EXP-2026-001"
              required
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount (BDT)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="expenseDate">Date</Label>
            <Input
              id="expenseDate"
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              {EXPENSE_CATEGORY_ORDER.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat].en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="approvedBy">Approved by</Label>
            <select
              id="approvedBy"
              value={form.approvedBy}
              onChange={(e) => setForm({ ...form, approvedBy: e.target.value as ApprovingPartner })}
              className="w-full rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
            >
              {Object.entries(APPROVING_PARTNER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Office rent — March"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isProjectExpense}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isProjectExpense: e.target.checked,
                    projectId: e.target.checked ? form.projectId : "",
                  })
                }
              />
              Project development expense
            </label>
            {form.isProjectExpense && (
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="rounded-lg border border-card-border bg-input-bg px-3 py-2 text-sm"
                required
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.prefix} — {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-3">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save expense"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "overhead", "project"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                filter === f ? "bg-emerald/15 text-emerald" : "text-muted-text hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "overhead" ? "Overhead" : "Project-tagged"}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-text">
          Showing total: <span className="font-medium text-gold">{formatCurrency(total, "en")}</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
            <tr>
              <th className="px-4 py-3">Voucher</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-text">
                  Loading…
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-text">
                  No expenses recorded yet.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="border-t border-card-border">
                  <td className="px-4 py-3 font-mono text-xs">{e.voucherNo}</td>
                  <td className="px-4 py-3">{new Date(e.expenseDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{EXPENSE_CATEGORY_LABELS[e.category].en}</td>
                  <td className="px-4 py-3 text-muted-text">{e.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    {e.isProjectExpense ? (
                      <span className="text-emerald">{e.project?.prefix ?? "Project"}</span>
                    ) : (
                      <span className="text-muted-text">Overhead</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{APPROVING_PARTNER_LABELS[e.approvedBy]}</td>
                  <td className="px-4 py-3 font-medium text-gold">{formatCurrency(e.amount, "en")}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
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
