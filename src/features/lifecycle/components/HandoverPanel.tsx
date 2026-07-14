"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

interface ProjectOpt {
  id: string;
  prefix: string;
  name: string;
}

interface CustomerOpt {
  id: string;
  trackingId: string;
  fullName: string;
  projectId: string;
}

interface FlatOpt {
  id: string;
  code: string;
  projectId: string;
  customerId: string | null;
}

interface HandoverRow {
  id: string;
  projectId: string;
  customerId: string;
  flatId: string | null;
  status: string;
  keysDelivered: boolean;
  documentsDelivered: boolean;
  snagNotes: string | null;
  notes: string | null;
  handedOverAt: string | null;
  project: ProjectOpt;
  customer: {
    id: string;
    trackingId: string;
    fullName: string;
    phone: string;
    registrationStage: string;
  };
  flat: { id: string; code: string; building: string | null; floor: number | null } | null;
  recordedBy: { id: string; name: string | null } | null;
}

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;

const emptyForm = {
  customerId: "",
  flatId: "",
  status: "IN_PROGRESS" as (typeof STATUSES)[number],
  keysDelivered: false,
  documentsDelivered: false,
  snagNotes: "",
  notes: "",
  handedOverAt: "",
};

export function HandoverPanel() {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [flats, setFlats] = useState<FlatOpt[]>([]);
  const [rows, setRows] = useState<HandoverRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [filterProject, setFilterProject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [pRes, hRes, cRes, fRes] = await Promise.all([
      fetch("/api/projects"),
      fetch(`/api/handovers${qs}`),
      fetch("/api/customers"),
      fetch(`/api/flats${qs}`),
    ]);
    if (pRes.ok) {
      const data = await pRes.json();
      setProjects(
        (Array.isArray(data) ? data : []).map((p: ProjectOpt) => ({
          id: p.id,
          prefix: p.prefix,
          name: p.name,
        })),
      );
    }
    if (hRes.ok) {
      const data = await hRes.json();
      setRows(Array.isArray(data) ? data : []);
    }
    if (cRes.ok) {
      const data = await cRes.json();
      const list = Array.isArray(data) ? data : data.customers ?? [];
      setCustomers(
        list.map((c: CustomerOpt) => ({
          id: c.id,
          trackingId: c.trackingId,
          fullName: c.fullName,
          projectId: c.projectId,
        })),
      );
    }
    if (fRes.ok) {
      const data = await fRes.json();
      setFlats(
        (Array.isArray(data) ? data : []).map((f: FlatOpt) => ({
          id: f.id,
          code: f.code,
          projectId: f.projectId,
          customerId: f.customerId,
        })),
      );
    }
    setLoading(false);
  }, [filterProject]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const customerFlats = selectedCustomer
    ? flats.filter(
        (f) =>
          f.projectId === selectedCustomer.projectId &&
          (!f.customerId || f.customerId === selectedCustomer.id),
      )
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.customerId,
        flatId: form.flatId || null,
        status: form.status,
        keysDelivered: form.keysDelivered,
        documentsDelivered: form.documentsDelivered,
        snagNotes: form.snagNotes || null,
        notes: form.notes || null,
        handedOverAt: form.handedOverAt || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
      return;
    }
    setForm(emptyForm);
    await load();
  }

  async function quickComplete(row: HandoverRow) {
    if (!confirm(`Mark handover complete for ${row.customer.fullName}?`)) return;
    const res = await fetch("/api/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: row.customerId,
        flatId: row.flatId,
        status: "COMPLETED",
        keysDelivered: true,
        documentsDelivered: true,
        snagNotes: row.snagNotes,
        notes: row.notes,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Complete failed");
      return;
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this handover record?")) return;
    const res = await fetch(`/api/handovers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">Record / update handover</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="ho-customer">Customer</Label>
            <select
              id="ho-customer"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value, flatId: "" })}
              required
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trackingId} — {c.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ho-flat">Flat (optional)</Label>
            <select
              id="ho-flat"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={form.flatId}
              onChange={(e) => setForm({ ...form, flatId: e.target.value })}
            >
              <option value="">Auto / none</option>
              {customerFlats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ho-status">Status</Label>
            <select
              id="ho-status"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as (typeof STATUSES)[number] })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ho-date">Handed over at</Label>
            <Input
              id="ho-date"
              type="date"
              value={form.handedOverAt}
              onChange={(e) => setForm({ ...form, handedOverAt: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.keysDelivered}
              onChange={(e) => setForm({ ...form, keysDelivered: e.target.checked })}
            />
            Keys delivered
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.documentsDelivered}
              onChange={(e) => setForm({ ...form, documentsDelivered: e.target.checked })}
            />
            Documents delivered
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="ho-snag">Snag notes</Label>
            <Input
              id="ho-snag"
              value={form.snagNotes}
              onChange={(e) => setForm({ ...form, snagNotes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label htmlFor="ho-notes">Notes</Label>
            <Input
              id="ho-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-3">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save handover"}
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <Label htmlFor="ho-filter">Filter by project</Label>
        <select
          id="ho-filter"
          className="mt-1 block min-w-[220px] rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.prefix} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-text">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Flat</th>
                <th className="px-4 py-3">Checklist</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-text">
                    No handovers yet
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {row.customer.trackingId} — {row.customer.fullName}
                    </p>
                    <p className="text-xs text-muted-text">{row.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.project.prefix} — {row.project.name}
                  </td>
                  <td className="px-4 py-3">{row.flat?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>Keys: {row.keysDelivered ? "Yes" : "No"}</p>
                    <p>Docs: {row.documentsDelivered ? "Yes" : "No"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.status.replace(/_/g, " ")}
                    {row.handedOverAt && (
                      <p className="text-xs text-muted-text">
                        {new Date(row.handedOverAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.status !== "COMPLETED" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => quickComplete(row)}>
                        Complete
                      </Button>
                    )}
                    {row.status !== "COMPLETED" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
