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

interface FlatRow {
  id: string;
  projectId: string;
  code: string;
  building: string | null;
  floor: number | null;
  flatNumber: string | null;
  sizeSqft: number | null;
  bedrooms: number | null;
  status: string;
  customerId: string | null;
  notes: string | null;
  project: ProjectOpt;
  customer: { id: string; trackingId: string; fullName: string; shareCount: number } | null;
  shareLinks: { id: string; share: { id: string; shareNumber: number } }[];
}

const STATUSES = ["PLANNED", "AVAILABLE", "RESERVED", "ALLOCATED", "HANDED_OVER"] as const;

const emptyForm = {
  projectId: "",
  code: "",
  building: "",
  floor: "",
  flatNumber: "",
  sizeSqft: "",
  bedrooms: "",
  status: "PLANNED" as (typeof STATUSES)[number],
  notes: "",
};

export function FlatInventoryPanel() {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [rows, setRows] = useState<FlatRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [filterProject, setFilterProject] = useState("");
  const [allocateFlatId, setAllocateFlatId] = useState<string | null>(null);
  const [allocateCustomerId, setAllocateCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [pRes, fRes, cRes] = await Promise.all([
      fetch("/api/projects"),
      fetch(`/api/flats${qs}`),
      fetch("/api/customers"),
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
    if (fRes.ok) {
      const data = await fRes.json();
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
    setLoading(false);
  }, [filterProject]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/flats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        code: form.code,
        building: form.building || undefined,
        floor: form.floor === "" ? null : Number(form.floor),
        flatNumber: form.flatNumber || undefined,
        sizeSqft: form.sizeSqft === "" ? null : Number(form.sizeSqft),
        bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
        status: form.status,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
      return;
    }
    setForm({ ...emptyForm, projectId: form.projectId });
    setFilterProject(form.projectId);
    await load();
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!allocateFlatId || !allocateCustomerId) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/flats/${allocateFlatId}/allocate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: allocateCustomerId }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Allocate failed");
      return;
    }
    setAllocateFlatId(null);
    setAllocateCustomerId("");
    await load();
  }

  async function handleUnallocate(id: string) {
    if (!confirm("Unallocate this flat?")) return;
    const res = await fetch(`/api/flats/${id}/allocate`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Unallocate failed");
      return;
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this flat?")) return;
    const res = await fetch(`/api/flats/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Delete failed");
      return;
    }
    await load();
  }

  const allocateFlat = rows.find((r) => r.id === allocateFlatId);
  const allocateCustomers = allocateFlat
    ? customers.filter((c) => c.projectId === allocateFlat.projectId)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="mb-4">Add flat</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="fl-project">Project</Label>
            <select
              id="fl-project"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              required
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prefix} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="fl-code">Code</Label>
            <Input
              id="fl-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="A-301"
              required
            />
          </div>
          <div>
            <Label htmlFor="fl-building">Building</Label>
            <Input
              id="fl-building"
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="fl-floor">Floor</Label>
            <Input
              id="fl-floor"
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="fl-num">Flat number</Label>
            <Input
              id="fl-num"
              value={form.flatNumber}
              onChange={(e) => setForm({ ...form, flatNumber: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="fl-sqft">Size (sqft)</Label>
            <Input
              id="fl-sqft"
              type="number"
              min={0}
              value={form.sizeSqft}
              onChange={(e) => setForm({ ...form, sizeSqft: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="fl-beds">Bedrooms</Label>
            <Input
              id="fl-beds"
              type="number"
              min={0}
              value={form.bedrooms}
              onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="fl-status">Status</Label>
            <select
              id="fl-status"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as (typeof STATUSES)[number] })}
            >
              {STATUSES.filter((s) => s !== "ALLOCATED" && s !== "HANDED_OVER").map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          {error && !allocateFlatId && (
            <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-4">{error}</p>
          )}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add flat"}
            </Button>
          </div>
        </form>
      </Card>

      {allocateFlatId && (
        <Card>
          <CardTitle className="mb-4">
            Allocate {allocateFlat?.code} → customer
          </CardTitle>
          <form onSubmit={handleAllocate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="fl-alloc-cust">Customer</Label>
              <select
                id="fl-alloc-cust"
                className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
                value={allocateCustomerId}
                onChange={(e) => setAllocateCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {allocateCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.trackingId} — {c.fullName}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              Allocate
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAllocateFlatId(null);
                setAllocateCustomerId("");
                setError("");
              }}
            >
              Cancel
            </Button>
            {error && <p className="w-full text-sm text-red-400">{error}</p>}
          </form>
        </Card>
      )}

      <div>
        <Label htmlFor="fl-filter">Filter by project</Label>
        <select
          id="fl-filter"
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
                <th className="px-4 py-3">Flat</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Customer / shares</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-text">
                    No flats yet
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.code}</p>
                    <p className="text-xs text-muted-text">
                      {[row.building, row.floor != null ? `Fl ${row.floor}` : null, row.flatNumber]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {row.project.prefix} — {row.project.name}
                  </td>
                  <td className="px-4 py-3">
                    {row.sizeSqft != null ? `${row.sizeSqft} sqft` : "—"}
                    {row.bedrooms != null ? ` · ${row.bedrooms} BR` : ""}
                  </td>
                  <td className="px-4 py-3">{row.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {row.customer ? (
                      <>
                        <p>
                          {row.customer.trackingId} — {row.customer.fullName}
                        </p>
                        <p className="text-xs text-muted-text">
                          Shares:{" "}
                          {row.shareLinks.length
                            ? row.shareLinks.map((l) => l.share.shareNumber).join(", ")
                            : "all linked on allocate"}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!row.customerId && row.status !== "HANDED_OVER" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAllocateFlatId(row.id);
                          setAllocateCustomerId("");
                          setError("");
                        }}
                      >
                        Allocate
                      </Button>
                    )}
                    {row.customerId && row.status !== "HANDED_OVER" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleUnallocate(row.id)}>
                        Unallocate
                      </Button>
                    )}
                    {!row.customerId && row.status !== "HANDED_OVER" && (
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
