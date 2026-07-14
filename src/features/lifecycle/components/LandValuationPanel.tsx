"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/i18n/format";

interface ProjectOpt {
  id: string;
  prefix: string;
  name: string;
  landBuyPrice?: number | null;
  targetSellPrice?: number | null;
}

interface ValuationRow {
  id: string;
  projectId: string;
  valuedAt: string;
  landValue: number;
  notes: string | null;
  project: ProjectOpt;
  recordedBy: { id: string; name: string | null };
}

interface Growth {
  buyPrice: number;
  targetSellPrice: number | null;
  latestValue: number;
  growthPct: number | null;
  points: { at: string; value: number; label: string }[];
}

export function LandValuationPanel() {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [projectId, setProjectId] = useState("");
  const [valuedAt, setValuedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [landValue, setLandValue] = useState("");
  const [notes, setNotes] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const qs = filterProject ? `?projectId=${filterProject}` : "";
    const [pRes, vRes] = await Promise.all([
      fetch("/api/projects"),
      fetch(`/api/land-valuations${qs}`),
    ]);
    if (pRes.ok) {
      const data = await pRes.json();
      const list = Array.isArray(data) ? data : data.projects ?? [];
      setProjects(list.map((p: ProjectOpt) => ({ id: p.id, prefix: p.prefix, name: p.name, landBuyPrice: p.landBuyPrice, targetSellPrice: p.targetSellPrice })));
    }
    if (vRes.ok) {
      const data = await vRes.json();
      setRows(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [filterProject]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!filterProject) {
      setGrowth(null);
      return;
    }
    fetch(`/api/land-valuations?projectId=${filterProject}&growth=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setGrowth(data));
  }, [filterProject, rows]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/land-valuations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        valuedAt,
        landValue: Number(landValue),
        notes: notes || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Save failed");
      return;
    }
    setLandValue("");
    setNotes("");
    setFilterProject(projectId);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this valuation?")) return;
    const res = await fetch(`/api/land-valuations/${id}`, { method: "DELETE" });
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
        <CardTitle className="mb-4">Record land valuation</CardTitle>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="lv-project">Project</Label>
            <select
              id="lv-project"
              className="w-full rounded-lg border border-card-border bg-surface-alt px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
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
            <Label htmlFor="lv-date">Valued at</Label>
            <Input id="lv-date" type="date" value={valuedAt} onChange={(e) => setValuedAt(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="lv-value">Land value (BDT)</Label>
            <Input
              id="lv-value"
              type="number"
              min={0}
              step="1"
              value={landValue}
              onChange={(e) => setLandValue(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="lv-notes">Notes</Label>
            <Input id="lv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400 sm:col-span-2 lg:col-span-4">{error}</p>}
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add valuation"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="lv-filter">Filter by project</Label>
          <select
            id="lv-filter"
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
        {growth && (
          <Card className="flex-1">
            <CardTitle className="mb-2">Growth snapshot</CardTitle>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-text">Buy</p>
                <p>{formatCurrency(growth.buyPrice, "en")}</p>
              </div>
              <div>
                <p className="text-muted-text">Latest</p>
                <p>{formatCurrency(growth.latestValue, "en")}</p>
              </div>
              <div>
                <p className="text-muted-text">Growth</p>
                <p className={growth.growthPct != null && growth.growthPct >= 0 ? "text-emerald" : "text-red-400"}>
                  {growth.growthPct != null ? `${growth.growthPct}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-text">Target sell</p>
                <p>{growth.targetSellPrice != null ? formatCurrency(growth.targetSellPrice, "en") : "—"}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-text">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase text-muted-text">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Recorded by</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-text">
                    No valuations yet
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-card-border">
                  <td className="px-4 py-3">{new Date(row.valuedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {row.project.prefix} — {row.project.name}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(row.landValue, "en")}</td>
                  <td className="px-4 py-3">{row.recordedBy.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-text">{row.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                      Delete
                    </Button>
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
