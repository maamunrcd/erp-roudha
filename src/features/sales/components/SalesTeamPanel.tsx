"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/i18n/format";

interface AgentRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  defaultCommissionPct: number;
  notes: string | null;
  _count: { customers: number; leads: number; commissions: number };
}

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  defaultCommissionPct: "2",
  notes: "",
  isActive: true,
};

export function SalesTeamPanel() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/sales-agents");
    if (res.ok) {
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(agent: AgentRow) {
    setEditingId(agent.id);
    setForm({
      fullName: agent.fullName,
      phone: agent.phone,
      email: agent.email ?? "",
      defaultCommissionPct: String(agent.defaultCommissionPct),
      notes: agent.notes ?? "",
      isActive: agent.isActive,
    });
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email || undefined,
      defaultCommissionPct: Number(form.defaultCommissionPct),
      notes: form.notes || undefined,
      isActive: form.isActive,
    };
    const res = await fetch(editingId ? `/api/sales-agents/${editingId}` : "/api/sales-agents", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
      return;
    }
    resetForm();
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sales agent?")) return;
    const res = await fetch(`/api/sales-agents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  async function toggleActive(agent: AgentRow) {
    await fetch(`/api/sales-agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">{editingId ? "Edit agent" : "Add sales agent"}</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="agent-name">Full name</Label>
            <Input
              id="agent-name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="agent-phone">Phone</Label>
            <Input
              id="agent-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="agent-email">Email</Label>
            <Input
              id="agent-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="agent-rate">Default commission %</Label>
            <Input
              id="agent-rate"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.defaultCommissionPct}
              onChange={(e) => setForm({ ...form, defaultCommissionPct: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="agent-notes">Notes</Label>
            <Input
              id="agent-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-3">{error}</p>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update agent" : "Add agent"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Customers</th>
              <th className="px-4 py-3">Commissions</th>
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
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-text">
                  No sales agents yet.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{agent.fullName}</p>
                    <p className="text-xs text-muted-text">{agent.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gold">{agent.defaultCommissionPct}%</td>
                  <td className="px-4 py-3">{agent._count.leads}</td>
                  <td className="px-4 py-3">{agent._count.customers}</td>
                  <td className="px-4 py-3">{agent._count.commissions}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        agent.isActive ? "bg-emerald/20 text-emerald" : "bg-surface-alt text-muted-text"
                      }`}
                    >
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(agent)} className="text-xs text-emerald hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => toggleActive(agent)} className="text-xs text-gold hover:underline">
                        {agent.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" onClick={() => handleDelete(agent.id)} className="text-xs text-red-400 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-text">
        On enrollment, commission is auto-calculated as agent rate × customer downpayment (status: Pending).
        Example: {formatCurrency(100000, "en")} downpayment at 2% = {formatCurrency(2000, "en")}.
      </p>
    </div>
  );
}
